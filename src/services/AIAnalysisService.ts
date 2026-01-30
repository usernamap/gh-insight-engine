import { UserModel, RepositoryModel, AIAnalysisModel } from '@/models';
import openaiConfig from '@/config/openai';
import logger from '@/utils/logger';
import {
  OPENAI_CONSTANTS,
  AI_ANALYSIS_ERROR_MESSAGES,
  AI_ANALYSIS_LOG_MESSAGES,
  AI_ANALYSIS_DEFAULT_INSIGHTS,
} from '@/constants';

interface GitHubLicense {
  key?: string;
  name?: string;
  url?: string;
  spdx_id?: string;
}

interface CommitData {
  totalCount: number;
}

interface LanguageData {
  totalSize: number;
  nodes: Array<{ name: string; size: number }>;
}

export interface AIAnalysisInput {
  userProfile: {
    login: string;
    name: string | null;
    bio: string | null;
    company: string | null;
    location: string | null;
    publicRepos: number;
    followers: number;
    following: number;
    createdAt: Date;
  };
  repositories: Array<{
    name: string;
    description: string | null;
    primaryLanguage: string | null;
    languages: Record<string, number>;
    stargazerCount: number;
    forkCount: number;
    openIssuesCount: number;
    topics: string[];
    createdAt: Date;
    updatedAt: Date;
    pushedAt: Date | null;
    size: number;
    hasIssuesEnabled: boolean;
    hasWikiEnabled: boolean;
    hasProjectsEnabled: boolean;
    readmeEnabled: boolean | null;
    license: GitHubLicense | null;
  }>;
  statistics: {
    totalRepositories: number;
    totalStars: number;
    totalForks: number;
    totalCommits: number;
    totalLanguages: number;
    totalLinesOfCode: number;
    activeProjects: number;
    repositoryBreakdown: {
      personal: number;
      organization: number;
      school: number;
    };
  };
}

export interface AIAnalysisResult {
  qualityScore: number;
  maintenabilityScore: number;
  securityScore: number;
  innovationScore: number;
  overallHealthScore: number;

  estimatedVulnerabilities: number;
  estimatedBugs: number;
  estimatedBuildTime: number;
  estimatedTestCoverage: number;

  qualityByOrganization: {
    personal: number;
    organization: number;
    school: number;
  };

  repositoryScores: Array<{
    name: string;
    qualityScore: number;
    recommendation: string;
    strengths: string[];
    improvementAreas: string[];
  }>;

  insights: {
    summary: string;
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
    careerAdvice: string[];
  };

  metadata: {
    analysisDate: Date;
    model: string;
    confidenceScore: number;
    analysisVersion: string;
  };
}

export class AIAnalysisService {
  public static async analyzeUser(username: string): Promise<AIAnalysisResult> {
    const startTime = Date.now();

    logger.info(AI_ANALYSIS_LOG_MESSAGES.STARTING_ANALYSIS, { username });

    if (openaiConfig.isAvailable() === false) {
      throw new Error(AI_ANALYSIS_ERROR_MESSAGES.OPENAI_SERVICE_UNAVAILABLE);
    }

    try {
      const userData = await UserModel.findByLogin(username);
      if (userData === null) {
        throw new Error(AI_ANALYSIS_ERROR_MESSAGES.USER_NOT_FOUND(username));
      }

      const repositoriesResult = await RepositoryModel.findByUserId(userData.id, {
        limit: OPENAI_CONSTANTS.REPOSITORY_LIMITS.MAX_REPOSITORIES,
        includePrivate: true,
      });

      if (repositoriesResult.repositories.length === 0) {
        throw new Error(AI_ANALYSIS_ERROR_MESSAGES.NO_REPOSITORY_FOUND(username));
      }

      const analysisInput = this.prepareAnalysisInput(userData, repositoriesResult.repositories);

      const aiResult = await this.performAIAnalysis(analysisInput);

      await this.saveAIAnalysis(username, aiResult);

      const processingTime = Date.now() - startTime;
      logger.info(AI_ANALYSIS_LOG_MESSAGES.ANALYSIS_COMPLETED, {
        username,
        processingTime: `${processingTime}ms`,
        qualityScore: aiResult.qualityScore,
      });

      return aiResult;
    } catch (error) {
      logger.error(AI_ANALYSIS_LOG_MESSAGES.ANALYSIS_ERROR, { username, error: String(error) });
      throw error;
    }
  }

  public static async getExistingAnalysis(username: string): Promise<AIAnalysisResult | null> {
    try {
      const aiAnalysis = await AIAnalysisModel.findLatestByUsername(username);

      if (aiAnalysis === null) {
        logger.debug(AI_ANALYSIS_LOG_MESSAGES.NO_ANALYSIS_FOUND, { username });
        return null;
      }

      const analysisResult = AIAnalysisModel.toAIAnalysisResult(aiAnalysis);

      logger.info(AI_ANALYSIS_LOG_MESSAGES.ANALYSIS_RETRIEVED, {
        username,
        aiAnalysisId: aiAnalysis.id,
        analysisDate: aiAnalysis.createdAt,
      });

      return analysisResult;
    } catch (error) {
      logger.error(AI_ANALYSIS_LOG_MESSAGES.ERROR_RETRIEVING_ANALYSIS, {
        username,
        error: String(error),
      });
      return null;
    }
  }

  public static async deleteAllUserAnalyses(username: string): Promise<number> {
    logger.info(AI_ANALYSIS_LOG_MESSAGES.STARTING_ANALYSIS, {
      username,
      action: 'deleteAllUserAnalyses',
    });
    try {
      const deletedCount = await AIAnalysisModel.deleteByUsername(username);
      logger.info(AI_ANALYSIS_LOG_MESSAGES.ANALYSIS_DELETED_SUCCESS, { username, deletedCount });
      return deletedCount;
    } catch (error) {
      logger.error(AI_ANALYSIS_LOG_MESSAGES.ERROR_DELETING_AI_ANALYSIS, {
        username,
        error: String(error),
      });
      throw error;
    }
  }

  private static prepareAnalysisInput(
    userData: { [key: string]: unknown },
    repositories: { [key: string]: unknown }[]
  ): AIAnalysisInput {
    const totalCommits = repositories.reduce((sum, repo) => {
      if (repo.commits !== null && repo.commits !== undefined && typeof repo.commits === 'object') {
        const commits = repo.commits as CommitData;
        return sum + (commits.totalCount ?? 0);
      }
      return sum;
    }, 0);

    const totalLinesOfCode = repositories.reduce((sum, repo) => {
      if (
        repo.languages !== null &&
        repo.languages !== undefined &&
        typeof repo.languages === 'object'
      ) {
        const languages = repo.languages as LanguageData;
        return sum + (languages.totalSize ?? 0);
      }
      return sum;
    }, 0);

    const activeProjects = repositories.filter(repo => {
      if (repo.pushedAt === null || repo.pushedAt === undefined) return false;
      const thirtyDaysAgo = new Date(Date.now() - OPENAI_CONSTANTS.TIME_CONSTANTS.THIRTY_DAYS_MS);
      return new Date(repo.pushedAt as string) > thirtyDaysAgo;
    }).length;

    // Categorize repositories by type (personal, organization, school)
    const repositoryCategories = this.categorizeRepositories(repositories);

    return {
      userProfile: {
        login: userData.login as string,
        name: userData.name as string | null,
        bio: userData.bio as string | null,
        company: userData.company as string | null,
        location: userData.location as string | null,
        publicRepos: userData.publicRepos as number,
        followers: userData.followers as number,
        following: userData.following as number,
        createdAt: userData.createdAt as Date,
      },
      repositories: repositories.map(repo => ({
        name: repo.name as string,
        description: repo.description as string | null,
        primaryLanguage: repo.primaryLanguage as string | null,
        languages: this.extractLanguages(repo.languages),
        stargazerCount: repo.stargazerCount as number,
        forkCount: repo.forkCount as number,
        openIssuesCount: repo.openIssuesCount as number,
        topics: (repo.topics as string[]) ?? [],
        createdAt: repo.createdAt as Date,
        updatedAt: repo.updatedAt as Date,
        pushedAt: repo.pushedAt as Date | null,
        size: repo.size as number,
        hasIssuesEnabled: repo.hasIssuesEnabled as boolean,
        hasWikiEnabled: repo.hasWikiEnabled as boolean,
        hasProjectsEnabled: repo.hasProjectsEnabled as boolean,
        readmeEnabled: repo.readmeEnabled as boolean | null,
        license: repo.license as GitHubLicense | null,
      })),
      statistics: {
        totalRepositories: repositories.length,
        totalStars: repositories.reduce((sum, repo) => sum + (repo.stargazerCount as number), 0),
        totalForks: repositories.reduce((sum, repo) => sum + (repo.forkCount as number), 0),
        totalCommits,
        totalLanguages: new Set(repositories.map(repo => repo.primaryLanguage).filter(Boolean))
          .size,
        totalLinesOfCode,
        activeProjects,
        repositoryBreakdown: {
          personal: repositoryCategories.personal,
          organization: repositoryCategories.organization,
          school: repositoryCategories.school,
        },
      },
    };
  }

  /**
   * Categorizes repositories into personal, organization, and school types
   */
  private static categorizeRepositories(repositories: { [key: string]: unknown }[]): {
    personal: number;
    organization: number;
    school: number;
  } {
    const userLogin = repositories.length > 0 ? (repositories[0].nameWithOwner as string)?.split('/')[0] : '';

    const categorization = {
      personal: 0,
      organization: 0,
      school: 0,
    };

    repositories.forEach(repo => {
      if (repo.owner != null && typeof repo.owner === 'object') {
        const owner = repo.owner as { type?: string; login?: string; name?: string };
        const ownerName = (owner.name ?? owner.login ?? '').toLowerCase();

        // Personal repositories (user owns them)
        if (owner.type === 'User' || owner.login === userLogin) {
          categorization.personal++;
        }
        // School/Educational repositories
        else if (
          owner.type === 'Organization' &&
          (ownerName.includes('school') ||
            ownerName.includes('university') ||
            ownerName.includes('college') ||
            ownerName.includes('edu') ||
            ownerName.includes('academy') ||
            ownerName.includes('institute') ||
            ownerName.includes('epitech') ||
            ownerName.includes('42') ||
            ownerName.includes('formation') ||
            ownerName.includes('apprentissage') ||
            ownerName.includes('student') ||
            ownerName.includes('promo') ||
            ownerName.includes('web') && ownerName.includes('academie'))
        ) {
          categorization.school++;
        }
        // Organization repositories
        else if (owner.type === 'Organization') {
          categorization.organization++;
        }
        // Default to personal if unclear
        else {
          categorization.personal++;
        }
      } else {
        // Default to personal if no owner info
        categorization.personal++;
      }
    });

    return categorization;
  }

  private static extractLanguages(languages: unknown): Record<string, number> {
    if (languages === null || languages === undefined || typeof languages !== 'object') {
      return {};
    }

    const result: Record<string, number> = {};
    const languageData = languages as LanguageData;
    if (
      languageData.nodes !== null &&
      languageData.nodes !== undefined &&
      Array.isArray(languageData.nodes)
    ) {
      languageData.nodes.forEach(lang => {
        if (lang.name !== null && lang.name !== undefined && typeof lang.size === 'number') {
          result[lang.name] = lang.size;
        }
      });
    }

    return result;
  }

  private static async performAIAnalysis(input: AIAnalysisInput): Promise<AIAnalysisResult> {
    const client = openaiConfig.getClient();
    if (client === null) {
      throw new Error(AI_ANALYSIS_ERROR_MESSAGES.OPENAI_CLIENT_NOT_AVAILABLE);
    }

    const config = openaiConfig.getDefaultConfig();
    const prompt = this.buildAnalysisPrompt(input);

    try {
      const response = await client.chat.completions.create({
        model: config.model,
        messages: [
          {
            role: OPENAI_CONSTANTS.ROLES.SYSTEM,
            content: OPENAI_CONSTANTS.SYSTEM_PROMPT,
          },
          {
            role: OPENAI_CONSTANTS.ROLES.USER,
            content: prompt,
          },
        ],
        max_completion_tokens: config.max_completion_tokens,
        // Note: temperature parameter removed - gpt-5-mini only supports default (1)
      });

      const content = response.choices[0]?.message?.content;
      if (
        content === null ||
        content === undefined ||
        content.trim() === OPENAI_CONSTANTS.DEFAULT_VALUES.EMPTY_STRING
      ) {
        throw new Error(AI_ANALYSIS_ERROR_MESSAGES.EMPTY_OPENAI_RESPONSE);
      }

      const aiResult = JSON.parse(content) as Partial<AIAnalysisResult>;

      return this.validateAndCompleteResult(aiResult, input);
    } catch (error) {
      logger.error(AI_ANALYSIS_LOG_MESSAGES.OPENAI_API_ERROR, { error: String(error) });

      return this.generateFallbackResult(input);
    }
  }

  private static buildAnalysisPrompt(input: AIAnalysisInput): string {
    const yearsOfActivity = Math.floor(
      (Date.now() - input.userProfile.createdAt.getTime()) /
      OPENAI_CONSTANTS.TIME_CONSTANTS.ONE_YEAR_MS
    );

    const topRepositories = input.repositories
      .slice(0, OPENAI_CONSTANTS.REPOSITORY_LIMITS.TOP_REPOSITORIES)
      .map(repo =>
        OPENAI_CONSTANTS.PROMPT_TEMPLATES.REPOSITORY_TEMPLATE.replace('{name}', repo.name)
          .replace('{primaryLanguage}', repo.primaryLanguage ?? OPENAI_CONSTANTS.DEFAULT_VALUES.N_A)
          .replace('{stargazerCount}', repo.stargazerCount.toString())
          .replace('{size}', repo.size.toString())
          .replace('{description}', repo.description ?? OPENAI_CONSTANTS.DEFAULT_VALUES.NONE)
          .replace('{topics}', repo.topics.join(', ') || OPENAI_CONSTANTS.DEFAULT_VALUES.NONE)
      )
      .join('\n');

    return OPENAI_CONSTANTS.PROMPT_TEMPLATES.ANALYSIS_PROMPT.replace(
      '{login}',
      input.userProfile.login
    )
      .replace('{name}', input.userProfile.name ?? OPENAI_CONSTANTS.DEFAULT_VALUES.N_A)
      .replace('{bio}', input.userProfile.bio ?? OPENAI_CONSTANTS.DEFAULT_VALUES.N_A)
      .replace('{company}', input.userProfile.company ?? OPENAI_CONSTANTS.DEFAULT_VALUES.N_A)
      .replace('{publicRepos}', input.userProfile.publicRepos.toString())
      .replace('{followers}', input.userProfile.followers.toString())
      .replace('{yearsOfActivity}', yearsOfActivity.toString())
      .replace('{totalRepositories}', input.statistics.totalRepositories.toString())
      .replace('{totalStars}', input.statistics.totalStars.toString())
      .replace('{totalCommits}', input.statistics.totalCommits.toString())
      .replace('{totalLanguages}', input.statistics.totalLanguages.toString())
      .replace('{totalLinesOfCode}', input.statistics.totalLinesOfCode.toString())
      .replace('{activeProjects}', input.statistics.activeProjects.toString())
      .replace('{personalRepos}', input.statistics.repositoryBreakdown.personal.toString())
      .replace('{organizationRepos}', input.statistics.repositoryBreakdown.organization.toString())
      .replace('{schoolRepos}', input.statistics.repositoryBreakdown.school.toString())
      .replace('{topRepositories}', topRepositories)
      .replace('{repositoryBreakdown}',
        `REPOSITORY BREAKDOWN:\n` +
        `- Personal repositories: ${input.statistics.repositoryBreakdown.personal}\n` +
        `- Organization repositories: ${input.statistics.repositoryBreakdown.organization}\n` +
        `- School/Educational repositories: ${input.statistics.repositoryBreakdown.school}\n`
      )
      .replace(/{maxQuality}/g, OPENAI_CONSTANTS.SCORE_LIMITS.MAX_QUALITY.toString())
      .replace('{maxOverallHealth}', OPENAI_CONSTANTS.SCORE_LIMITS.MAX_OVERALL_HEALTH.toString())
      .replace('{maxVulnerabilities}', OPENAI_CONSTANTS.SCORE_LIMITS.MAX_VULNERABILITIES.toString())
      .replace('{maxBugs}', OPENAI_CONSTANTS.SCORE_LIMITS.MAX_BUGS.toString())
      .replace('{minBuildTime}', OPENAI_CONSTANTS.SCORE_LIMITS.MIN_BUILD_TIME.toString())
      .replace('{maxBuildTime}', OPENAI_CONSTANTS.SCORE_LIMITS.MAX_BUILD_TIME.toString())
      .replace('{maxTestCoverage}', OPENAI_CONSTANTS.SCORE_LIMITS.MAX_TEST_COVERAGE.toString());
  }

  private static validateAndCompleteResult(
    aiResult: Partial<AIAnalysisResult>,
    input: AIAnalysisInput
  ): AIAnalysisResult {
    return {
      qualityScore: Math.min(
        OPENAI_CONSTANTS.SCORE_LIMITS.MAX_QUALITY,
        Math.max(
          OPENAI_CONSTANTS.SCORE_LIMITS.MIN_QUALITY,
          aiResult.qualityScore ?? OPENAI_CONSTANTS.DEFAULT_SCORES.QUALITY
        )
      ),
      maintenabilityScore: Math.min(
        OPENAI_CONSTANTS.SCORE_LIMITS.MAX_QUALITY,
        Math.max(
          OPENAI_CONSTANTS.SCORE_LIMITS.MIN_QUALITY,
          aiResult.maintenabilityScore ?? OPENAI_CONSTANTS.DEFAULT_SCORES.MAINTAINABILITY
        )
      ),
      securityScore: Math.min(
        OPENAI_CONSTANTS.SCORE_LIMITS.MAX_QUALITY,
        Math.max(
          OPENAI_CONSTANTS.SCORE_LIMITS.MIN_QUALITY,
          aiResult.securityScore ?? OPENAI_CONSTANTS.DEFAULT_SCORES.SECURITY
        )
      ),
      innovationScore: Math.min(
        OPENAI_CONSTANTS.SCORE_LIMITS.MAX_QUALITY,
        Math.max(
          OPENAI_CONSTANTS.SCORE_LIMITS.MIN_QUALITY,
          aiResult.innovationScore ?? OPENAI_CONSTANTS.DEFAULT_SCORES.INNOVATION
        )
      ),
      overallHealthScore: Math.min(
        OPENAI_CONSTANTS.SCORE_LIMITS.MAX_OVERALL_HEALTH,
        Math.max(
          OPENAI_CONSTANTS.SCORE_LIMITS.MIN_OVERALL_HEALTH,
          aiResult.overallHealthScore ?? OPENAI_CONSTANTS.DEFAULT_SCORES.OVERALL_HEALTH
        )
      ),

      estimatedVulnerabilities: Math.max(
        OPENAI_CONSTANTS.SCORE_LIMITS.MIN_QUALITY,
        aiResult.estimatedVulnerabilities ?? OPENAI_CONSTANTS.SCORE_LIMITS.MIN_QUALITY
      ),
      estimatedBugs: Math.max(
        OPENAI_CONSTANTS.SCORE_LIMITS.MIN_QUALITY,
        aiResult.estimatedBugs ?? OPENAI_CONSTANTS.SCORE_LIMITS.MIN_QUALITY
      ),
      estimatedBuildTime: Math.max(
        OPENAI_CONSTANTS.SCORE_LIMITS.MIN_BUILD_TIME,
        aiResult.estimatedBuildTime ?? OPENAI_CONSTANTS.DEFAULT_SCORES.BUILD_TIME
      ),
      estimatedTestCoverage: Math.min(
        OPENAI_CONSTANTS.SCORE_LIMITS.MAX_TEST_COVERAGE,
        Math.max(
          OPENAI_CONSTANTS.SCORE_LIMITS.MIN_TEST_COVERAGE,
          aiResult.estimatedTestCoverage ?? OPENAI_CONSTANTS.DEFAULT_SCORES.TEST_COVERAGE
        )
      ),

      qualityByOrganization: {
        personal: Math.min(
          OPENAI_CONSTANTS.SCORE_LIMITS.MAX_QUALITY,
          Math.max(
            OPENAI_CONSTANTS.SCORE_LIMITS.MIN_QUALITY,
            aiResult.qualityByOrganization?.personal ??
            OPENAI_CONSTANTS.ORGANIZATION_DEFAULTS.PERSONAL
          )
        ),
        organization: Math.min(
          OPENAI_CONSTANTS.SCORE_LIMITS.MAX_QUALITY,
          Math.max(
            OPENAI_CONSTANTS.SCORE_LIMITS.MIN_QUALITY,
            aiResult.qualityByOrganization?.organization ??
            OPENAI_CONSTANTS.ORGANIZATION_DEFAULTS.ORGANIZATION
          )
        ),
        school: Math.min(
          OPENAI_CONSTANTS.SCORE_LIMITS.MAX_QUALITY,
          Math.max(
            OPENAI_CONSTANTS.SCORE_LIMITS.MIN_QUALITY,
            aiResult.qualityByOrganization?.school ?? OPENAI_CONSTANTS.ORGANIZATION_DEFAULTS.SCHOOL
          )
        ),
      },

      repositoryScores:
        aiResult.repositoryScores ?? [],

      insights: {
        summary:
          aiResult.insights?.summary ??
          AI_ANALYSIS_DEFAULT_INSIGHTS.FALLBACK_SUMMARY_TEMPLATE(
            input.statistics.totalRepositories,
            input.statistics.totalStars
          ),
        strengths: aiResult.insights?.strengths ?? [
          AI_ANALYSIS_DEFAULT_INSIGHTS.STRENGTHS.REGULAR_ACTIVITY,
          AI_ANALYSIS_DEFAULT_INSIGHTS.STRENGTHS.TECHNOLOGY_DIVERSITY,
        ],
        weaknesses: aiResult.insights?.weaknesses ?? [
          AI_ANALYSIS_DEFAULT_INSIGHTS.WEAKNESSES.DOCUMENTATION_TO_IMPROVE,
        ],
        recommendations: aiResult.insights?.recommendations ?? [
          AI_ANALYSIS_DEFAULT_INSIGHTS.RECOMMENDATIONS.CONTRIBUTE_OPEN_SOURCE,
          AI_ANALYSIS_DEFAULT_INSIGHTS.RECOMMENDATIONS.IMPROVE_DOCUMENTATION,
        ],
        careerAdvice: aiResult.insights?.careerAdvice ?? [
          AI_ANALYSIS_DEFAULT_INSIGHTS.CAREER_ADVICE.CONTINUE_DEVELOP_SKILLS,
        ],
      },

      metadata: {
        analysisDate: new Date(),
        model: OPENAI_CONSTANTS.MODEL,
        confidenceScore: Math.min(
          OPENAI_CONSTANTS.SCORE_LIMITS.MAX_QUALITY,
          Math.max(
            OPENAI_CONSTANTS.SCORE_LIMITS.MIN_QUALITY,
            aiResult.qualityScore ?? OPENAI_CONSTANTS.DEFAULT_SCORES.CONFIDENCE
          )
        ),
        analysisVersion: OPENAI_CONSTANTS.ANALYSIS_VERSION,
      },
    };
  }

  private static generateFallbackResult(input: AIAnalysisInput): AIAnalysisResult {
    const avgStarsPerRepo =
      input.statistics.totalRepositories > 0
        ? input.statistics.totalStars / input.statistics.totalRepositories
        : 0;

    const qualityScore = Math.min(
      OPENAI_CONSTANTS.SCORE_LIMITS.MAX_QUALITY,
      Math.round(
        avgStarsPerRepo * OPENAI_CONSTANTS.FALLBACK_COEFFICIENTS.STARS_MULTIPLIER +
        input.statistics.activeProjects *
        OPENAI_CONSTANTS.FALLBACK_COEFFICIENTS.ACTIVE_PROJECTS_MULTIPLIER +
        input.statistics.totalLanguages *
        OPENAI_CONSTANTS.FALLBACK_COEFFICIENTS.LANGUAGES_MULTIPLIER +
        Math.min(
          OPENAI_CONSTANTS.FALLBACK_COEFFICIENTS.MAX_FOLLOWERS_BONUS,
          input.userProfile.followers
        )
      )
    );

    return {
      qualityScore,
      maintenabilityScore: Math.max(
        OPENAI_CONSTANTS.FALLBACK_COEFFICIENTS.MAINTAINABILITY_OFFSET,
        qualityScore - OPENAI_CONSTANTS.FALLBACK_COEFFICIENTS.MAINTAINABILITY_OFFSET
      ),
      securityScore: Math.max(
        OPENAI_CONSTANTS.FALLBACK_COEFFICIENTS.SECURITY_OFFSET,
        qualityScore - OPENAI_CONSTANTS.FALLBACK_COEFFICIENTS.SECURITY_OFFSET
      ),
      innovationScore: Math.max(
        OPENAI_CONSTANTS.FALLBACK_COEFFICIENTS.INNOVATION_OFFSET,
        qualityScore - OPENAI_CONSTANTS.FALLBACK_COEFFICIENTS.INNOVATION_OFFSET
      ),
      overallHealthScore: Math.min(
        OPENAI_CONSTANTS.SCORE_LIMITS.MAX_OVERALL_HEALTH,
        Math.max(
          OPENAI_CONSTANTS.FALLBACK_COEFFICIENTS.OVERALL_HEALTH_MIN,
          Math.round(qualityScore / OPENAI_CONSTANTS.FALLBACK_COEFFICIENTS.OVERALL_HEALTH_DIVISOR)
        )
      ),

      estimatedVulnerabilities: Math.round(
        input.statistics.totalRepositories *
        OPENAI_CONSTANTS.FALLBACK_COEFFICIENTS.VULNERABILITIES_COEFFICIENT
      ),
      estimatedBugs: Math.round(
        input.statistics.totalRepositories * OPENAI_CONSTANTS.FALLBACK_COEFFICIENTS.BUGS_COEFFICIENT
      ),
      estimatedBuildTime: OPENAI_CONSTANTS.DEFAULT_SCORES.BUILD_TIME,
      estimatedTestCoverage: OPENAI_CONSTANTS.DEFAULT_SCORES.TEST_COVERAGE,

      qualityByOrganization: {
        personal: qualityScore,
        organization: Math.min(
          OPENAI_CONSTANTS.SCORE_LIMITS.MAX_QUALITY,
          qualityScore + OPENAI_CONSTANTS.FALLBACK_COEFFICIENTS.ORGANIZATION_BONUS
        ),
        school: Math.max(
          OPENAI_CONSTANTS.FALLBACK_COEFFICIENTS.SCHOOL_MALUS,
          qualityScore - OPENAI_CONSTANTS.FALLBACK_COEFFICIENTS.SCHOOL_MALUS
        ),
      },

      repositoryScores: input.repositories
        .map(repo => ({
          name: repo.name,
          qualityScore: Math.min(
            OPENAI_CONSTANTS.SCORE_LIMITS.MAX_QUALITY,
            Math.max(
              OPENAI_CONSTANTS.FALLBACK_COEFFICIENTS.REPO_MIN_SCORE,
              repo.stargazerCount * OPENAI_CONSTANTS.FALLBACK_COEFFICIENTS.REPO_QUALITY_MULTIPLIER +
              (repo.description !== null && repo.description !== undefined
                ? OPENAI_CONSTANTS.FALLBACK_COEFFICIENTS.DESCRIPTION_BONUS
                : 0)
            )
          ),
          recommendation: AI_ANALYSIS_DEFAULT_INSIGHTS.RECOMMENDATIONS.IMPROVE_DOCUMENTATION,
          strengths:
            repo.description !== null && repo.description !== undefined
              ? [AI_ANALYSIS_DEFAULT_INSIGHTS.STRENGTHS.GOOD_DOCUMENTATION]
              : [],
          improvementAreas: [
            AI_ANALYSIS_DEFAULT_INSIGHTS.IMPROVEMENT_AREAS.AUTOMATED_TESTS,
            AI_ANALYSIS_DEFAULT_INSIGHTS.IMPROVEMENT_AREAS.CI_CD,
          ],
        })),

      insights: {
        summary: AI_ANALYSIS_DEFAULT_INSIGHTS.FALLBACK_ACTIVE_SUMMARY_TEMPLATE(
          input.statistics.totalRepositories,
          input.statistics.totalLanguages
        ),
        strengths: [
          AI_ANALYSIS_DEFAULT_INSIGHTS.STRENGTHS.REGULAR_ACTIVITY,
          AI_ANALYSIS_DEFAULT_INSIGHTS.STRENGTHS.TECHNOLOGY_DIVERSITY,
        ],
        weaknesses: [AI_ANALYSIS_DEFAULT_INSIGHTS.WEAKNESSES.COMMUNITY_VISIBILITY],
        recommendations: [
          AI_ANALYSIS_DEFAULT_INSIGHTS.RECOMMENDATIONS.IMPROVE_DOCUMENTATION,
          AI_ANALYSIS_DEFAULT_INSIGHTS.RECOMMENDATIONS.CONTRIBUTE_OPEN_SOURCE,
        ],
        careerAdvice: [
          AI_ANALYSIS_DEFAULT_INSIGHTS.CAREER_ADVICE.DEVELOP_SPECIALIZATION,
          AI_ANALYSIS_DEFAULT_INSIGHTS.CAREER_ADVICE.PARTICIPATE_COLLABORATIVE,
        ],
      },

      metadata: {
        analysisDate: new Date(),
        model: OPENAI_CONSTANTS.FALLBACK_MODEL,
        confidenceScore: OPENAI_CONSTANTS.FALLBACK_COEFFICIENTS.FALLBACK_CONFIDENCE,
        analysisVersion: OPENAI_CONSTANTS.ANALYSIS_VERSION,
      },
    };
  }

  private static async saveAIAnalysis(
    username: string,
    analysisResult: AIAnalysisResult
  ): Promise<void> {
    try {
      const userData = await UserModel.findByLogin(username);

      if (userData === null) {
        logger.warn(AI_ANALYSIS_LOG_MESSAGES.USER_NOT_FOUND_SAVE, { username });
        return;
      }

      await AIAnalysisModel.upsert(username, userData.id, analysisResult);

      logger.info(AI_ANALYSIS_LOG_MESSAGES.ANALYSIS_SAVED, {
        username,
        userId: userData.id,
        qualityScore: analysisResult.qualityScore,
        securityScore: analysisResult.securityScore,
      });
    } catch (error) {
      logger.error(AI_ANALYSIS_LOG_MESSAGES.ERROR_SAVING_ANALYSIS, {
        username,
        error: String(error),
      });
    }
  }
}

export default AIAnalysisService;
