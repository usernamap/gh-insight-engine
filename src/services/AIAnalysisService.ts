import { DatasetModel } from '@/models/Dataset';
import { UserModel } from '@/models/User';
import { RepositoryModel } from '@/models/Repository';
import openaiConfig from '@/config/openai';
import logger from '@/utils/logger';
import { InsightsExtension, AIInsightsSummary } from '@/types/insights';

// Types helpers pour le typage strict
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

// Interface pour les données d'entrée de l'analyse IA
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
    };
}

export interface AIAnalysisResult {
    qualityScore: number; // 0-100
    maintenabilityScore: number; // 0-100
    securityScore: number; // 0-100
    innovationScore: number; // 0-100
    overallHealthScore: number; // 0-10

    estimatedVulnerabilities: number;
    estimatedBugs: number;
    estimatedBuildTime: number; // seconds
    estimatedTestCoverage: number; // 0-100

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

/**
 * Service d'analyse IA pour les données GitHub
 */
export class AIAnalysisService {
  /**
         * Lance une analyse IA complète d'un utilisateur
         */
  public static async analyzeUser(username: string): Promise<AIAnalysisResult> {
    const startTime = Date.now();

    logger.info('Début analyse IA utilisateur', { username });

    if (openaiConfig.isAvailable() === false) {
      throw new Error(
        'Service OpenAI non disponible. Vérifiez OPENAI_API_KEY.',
      );
    }

    try {
      // 1. Récupération des données utilisateur
      const userData = await UserModel.findByLogin(username);
      if (userData === null) {
        throw new Error(`Utilisateur ${username} non trouvé`);
      }

      // 2. Récupération des repositories
      const repositoriesResult = await RepositoryModel.findByUserId(
        userData.id,
        {
          limit: 200,
          includePrivate: true,
        },
      );

      if (repositoriesResult.repositories.length === 0) {
        throw new Error(`Aucun repository trouvé pour ${username}`);
      }

      // 3. Préparation des données pour l'IA
      const analysisInput = this.prepareAnalysisInput(
        userData,
        repositoriesResult.repositories,
      );

      // 4. Analyse IA
      const aiResult = await this.performAIAnalysis(analysisInput);

      // 5. Sauvegarde des résultats
      await this.saveAIAnalysis(username, aiResult);

      const processingTime = Date.now() - startTime;
      logger.info('Analyse IA terminée', {
        username,
        processingTime: `${processingTime}ms`,
        qualityScore: aiResult.qualityScore,
      });

      return aiResult;
    } catch (error) {
      logger.error('Erreur analyse IA', { username, error: String(error) });
      throw error;
    }
  }

  /**
         * Récupère une analyse IA existante depuis la base de données
         */
  public static async getExistingAnalysis(username: string): Promise<AIAnalysisResult | null> {
    try {
      // Trouver l'utilisateur par username
      const userData = await UserModel.findByLogin(username);

      if (userData === null) {
        logger.debug('Utilisateur non trouvé pour récupération analyse IA', { username });
        return null;
      }

      // Trouver le dataset le plus récent avec une analyse IA
      const latestDataset = await DatasetModel.findLatestByUserId(userData.id);

      if (latestDataset?.aiInsights == null) {
        logger.debug('Aucune analyse IA trouvée', { username, userId: userData.id });
        return null;
      }

      // Extraire les données d'analyse IA
      const aiInsights = latestDataset.aiInsights as unknown as { aiInsights: AIInsightsSummary };

      // Reconvertir vers notre format AIAnalysisResult
      const analysisResult: AIAnalysisResult = {
        qualityScore: this.extractScoreFromHighlights(aiInsights.aiInsights.executiveSummary.keyHighlights, 'qualité'),
        maintenabilityScore: Math.round(aiInsights.aiInsights.confidence * 0.9),
        securityScore: this.extractScoreFromHighlights(aiInsights.aiInsights.executiveSummary.keyHighlights, 'sécurité'),
        innovationScore: this.extractScoreFromHighlights(aiInsights.aiInsights.executiveSummary.keyHighlights, 'innovation'),
        overallHealthScore: Math.min(10, Math.round(aiInsights.aiInsights.confidence / 10)),
        estimatedVulnerabilities: 10, // Valeur par défaut, à améliorer
        estimatedBugs: 50, // Valeur par défaut, à améliorer
        estimatedBuildTime: 120,
        estimatedTestCoverage: 65,
        qualityByOrganization: {
          personal: 60,
          organization: 70,
          school: 50,
        },
        repositoryScores: aiInsights.aiInsights.skills.technical.map(skill => ({
          name: skill.skill,
          qualityScore: skill.confidence,
          recommendation: skill.evidence[0] ?? 'Continuer à développer',
          strengths: skill.evidence,
          improvementAreas: ['Tests unitaires', 'Documentation'],
        })),
        insights: {
          summary: aiInsights.aiInsights.personality.description,
          strengths: aiInsights.aiInsights.executiveSummary.majorStrengths,
          weaknesses: [], // À améliorer si nécessaire
          recommendations: aiInsights.aiInsights.executiveSummary.primaryRecommendations,
          careerAdvice: aiInsights.aiInsights.skills.leadership.indicators,
        },
        metadata: {
          analysisDate: aiInsights.aiInsights.generatedAt,
          model: aiInsights.aiInsights.model,
          confidenceScore: aiInsights.aiInsights.confidence,
          analysisVersion: aiInsights.aiInsights.metadata.analysisVersion,
        },
      };

      logger.info('Analyse IA récupérée avec succès', {
        username,
        datasetId: latestDataset.id,
        analysisDate: aiInsights.aiInsights.generatedAt,
      });

      return analysisResult;
    } catch (error) {
      logger.error('Erreur lors de la récupération analyse IA', {
        username,
        error: String(error),
      });
      return null;
    }
  }

  /**
         * Prépare les données pour l'analyse IA
         */
  private static prepareAnalysisInput(
    userData: { [key: string]: unknown },
    repositories: { [key: string]: unknown }[],
  ): AIAnalysisInput {
    // Calcul des statistiques
    const totalCommits = repositories.reduce((sum, repo) => {
      if (
        repo.commits !== null &&
                repo.commits !== undefined &&
                typeof repo.commits === 'object'
      ) {
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

    const activeProjects = repositories.filter((repo) => {
      if (repo.pushedAt === null || repo.pushedAt === undefined) return false;
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      return new Date(repo.pushedAt as string) > thirtyDaysAgo;
    }).length;

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
      repositories: repositories.map((repo) => ({
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
        totalStars: repositories.reduce(
          (sum, repo) => sum + (repo.stargazerCount as number),
          0,
        ),
        totalForks: repositories.reduce(
          (sum, repo) => sum + (repo.forkCount as number),
          0,
        ),
        totalCommits,
        totalLanguages: new Set(
          repositories.map((repo) => repo.primaryLanguage).filter(Boolean),
        ).size,
        totalLinesOfCode,
        activeProjects,
      },
    };
  }

  /**
         * Extrait les langages d'un repository
         */
  private static extractLanguages(languages: unknown): Record<string, number> {
    if (
      languages === null ||
            languages === undefined ||
            typeof languages !== 'object'
    ) {
      return {};
    }

    const result: Record<string, number> = {};
    const languageData = languages as LanguageData;
    if (
      languageData.nodes !== null &&
            languageData.nodes !== undefined &&
            Array.isArray(languageData.nodes)
    ) {
      languageData.nodes.forEach((lang) => {
        if (
          lang.name !== null &&
                    lang.name !== undefined &&
                    typeof lang.size === 'number'
        ) {
          result[lang.name] = lang.size;
        }
      });
    }

    return result;
  }

  /**
         * Effectue l'analyse IA avec GPT-4o-mini
         */
  private static async performAIAnalysis(
    input: AIAnalysisInput,
  ): Promise<AIAnalysisResult> {
    const client = openaiConfig.getClient();
    if (client === null) {
      throw new Error('Client OpenAI non disponible');
    }

    const config = openaiConfig.getDefaultConfig();
    const prompt = this.buildAnalysisPrompt(input);

    try {
      const response = await client.chat.completions.create({
        model: config.model,
        messages: [
          {
            role: 'system',
            content:
                            'Tu es un expert en analyse de code et développement logiciel. Tu analyses les profils GitHub pour fournir des insights précis sur la qualité, la sécurité et les performances. Réponds UNIQUEMENT en JSON valide selon le schéma demandé.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: config.max_tokens,
        temperature: config.temperature,
      });

      const content = response.choices[0]?.message?.content;
      if (content === null || content === undefined || content.trim() === '') {
        throw new Error('Réponse vide de OpenAI');
      }

      // Parse et validation de la réponse JSON
      const aiResult = JSON.parse(content) as Partial<AIAnalysisResult>;

      // Complétion avec des valeurs par défaut si nécessaire
      return this.validateAndCompleteResult(aiResult, input);
    } catch (error) {
      logger.error('Erreur appel OpenAI', { error: String(error) });

      // Fallback: génération de scores basiques
      return this.generateFallbackResult(input);
    }
  }

  /**
         * Construit le prompt pour l'analyse IA
         */
  private static buildAnalysisPrompt(input: AIAnalysisInput): string {
    return `
Analyse ce profil GitHub et génère un JSON avec les métriques suivantes:

PROFIL UTILISATEUR:
- Login: ${input.userProfile.login}
- Nom: ${input.userProfile.name ?? 'N/A'}
- Bio: ${input.userProfile.bio ?? 'N/A'}
- Entreprise: ${input.userProfile.company ?? 'N/A'}
- Repositories publics: ${input.userProfile.publicRepos}
- Followers: ${input.userProfile.followers}
- Années d'activité: ${Math.floor((Date.now() - input.userProfile.createdAt.getTime()) / (365 * 24 * 60 * 60 * 1000))}

STATISTIQUES:
- Total repositories: ${input.statistics.totalRepositories}
- Total stars: ${input.statistics.totalStars}
- Total commits: ${input.statistics.totalCommits}
- Langages: ${input.statistics.totalLanguages}
- Lignes de code: ${input.statistics.totalLinesOfCode}
- Projets actifs: ${input.statistics.activeProjects}

TOP REPOSITORIES:
${input.repositories
    .slice(0, 10)
    .map(
      (repo) => `
- ${repo.name}: ${repo.primaryLanguage ?? 'N/A'}, ${repo.stargazerCount} stars, ${repo.size} KB
  Description: ${repo.description ?? 'Aucune'}
  Topics: ${repo.topics.join(', ') || 'Aucun'}
`,
    )
    .join('')}

Génère UNIQUEMENT ce JSON (sans markdown):
{
  "qualityScore": 0-100,
  "maintenabilityScore": 0-100,
  "securityScore": 0-100,
  "innovationScore": 0-100,
  "overallHealthScore": 0-10,
  "estimatedVulnerabilities": 0-200,
  "estimatedBugs": 0-500,
  "estimatedBuildTime": 30-300,
  "estimatedTestCoverage": 0-100,
  "qualityByOrganization": {
    "personal": 0-100,
    "organization": 0-100,
    "school": 0-100
  },
  "repositoryScores": [
    {
      "name": "repo-name",
      "qualityScore": 0-100,
      "recommendation": "conseil-court",
      "strengths": ["force1", "force2"],
      "improvementAreas": ["amélioration1", "amélioration2"]
    }
  ],
  "insights": {
    "summary": "résumé-profil-en-2-phrases",
    "strengths": ["force1", "force2", "force3"],
    "weaknesses": ["faiblesse1", "faiblesse2"],
    "recommendations": ["recommandation1", "recommandation2", "recommandation3"],
    "careerAdvice": ["conseil-carrière1", "conseil-carrière2"]
  }
}`;
  }

  /**
         * Valide et complète le résultat IA
         */
  private static validateAndCompleteResult(
    aiResult: Partial<AIAnalysisResult>,
    input: AIAnalysisInput,
  ): AIAnalysisResult {
    return {
      qualityScore: Math.min(100, Math.max(0, aiResult.qualityScore ?? 50)),
      maintenabilityScore: Math.min(
        100,
        Math.max(0, aiResult.maintenabilityScore ?? 50),
      ),
      securityScore: Math.min(100, Math.max(0, aiResult.securityScore ?? 50)),
      innovationScore: Math.min(
        100,
        Math.max(0, aiResult.innovationScore ?? 50),
      ),
      overallHealthScore: Math.min(
        10,
        Math.max(0, aiResult.overallHealthScore ?? 5),
      ),

      estimatedVulnerabilities: Math.max(
        0,
        aiResult.estimatedVulnerabilities ?? 0,
      ),
      estimatedBugs: Math.max(0, aiResult.estimatedBugs ?? 0),
      estimatedBuildTime: Math.max(30, aiResult.estimatedBuildTime ?? 120),
      estimatedTestCoverage: Math.min(
        100,
        Math.max(0, aiResult.estimatedTestCoverage ?? 30),
      ),

      qualityByOrganization: {
        personal: Math.min(
          100,
          Math.max(0, aiResult.qualityByOrganization?.personal ?? 60),
        ),
        organization: Math.min(
          100,
          Math.max(0, aiResult.qualityByOrganization?.organization ?? 70),
        ),
        school: Math.min(
          100,
          Math.max(0, aiResult.qualityByOrganization?.school ?? 50),
        ),
      },

      repositoryScores: aiResult.repositoryScores?.slice(0, 10) ?? [],

      insights: {
        summary:
                    aiResult.insights?.summary ??
                    `Développeur avec ${input.statistics.totalRepositories} repositories et ${input.statistics.totalStars} stars.`,
        strengths: aiResult.insights?.strengths ?? [
          'Activité régulière',
          'Diversité technologique',
        ],
        weaknesses: aiResult.insights?.weaknesses ?? [
          'Documentation à améliorer',
        ],
        recommendations: aiResult.insights?.recommendations ?? [
          "Contribuer à l'open source",
          'Améliorer la documentation',
        ],
        careerAdvice: aiResult.insights?.careerAdvice ?? [
          'Continuer à développer ses compétences',
        ],
      },

      metadata: {
        analysisDate: new Date(),
        model: 'gpt-4o-mini',
        confidenceScore: Math.min(
          100,
          Math.max(50, aiResult.qualityScore ?? 75),
        ),
        analysisVersion: '1.0.0',
      },
    };
  }

  /**
         * Génère un résultat de fallback en cas d'erreur IA
         */
  private static generateFallbackResult(
    input: AIAnalysisInput,
  ): AIAnalysisResult {
    const avgStarsPerRepo =
            input.statistics.totalRepositories > 0
              ? input.statistics.totalStars / input.statistics.totalRepositories
              : 0;

    const qualityScore = Math.min(
      100,
      Math.round(
        avgStarsPerRepo * 20 +
                input.statistics.activeProjects * 5 +
                input.statistics.totalLanguages * 3 +
                Math.min(30, input.userProfile.followers),
      ),
    );

    return {
      qualityScore,
      maintenabilityScore: Math.max(30, qualityScore - 10),
      securityScore: Math.max(40, qualityScore - 20),
      innovationScore: Math.max(20, qualityScore - 15),
      overallHealthScore: Math.min(
        10,
        Math.max(3, Math.round(qualityScore / 10)),
      ),

      estimatedVulnerabilities: Math.round(
        input.statistics.totalRepositories * 0.5,
      ),
      estimatedBugs: Math.round(input.statistics.totalRepositories * 1.2),
      estimatedBuildTime: 120,
      estimatedTestCoverage: 30,

      qualityByOrganization: {
        personal: qualityScore,
        organization: Math.min(100, qualityScore + 10),
        school: Math.max(20, qualityScore - 20),
      },

      repositoryScores: input.repositories.slice(0, 5).map((repo) => ({
        name: repo.name,
        qualityScore: Math.min(
          100,
          Math.max(
            20,
            repo.stargazerCount * 15 +
                        (repo.description !== null && repo.description !== undefined
                          ? 20
                          : 0),
          ),
        ),
        recommendation: 'Améliorer la documentation',
        strengths:
                    repo.description !== null && repo.description !== undefined
                      ? ['Documentation présente']
                      : [],
        improvementAreas: ['Tests automatisés', 'CI/CD'],
      })),

      insights: {
        summary: `Développeur actif avec ${input.statistics.totalRepositories} repositories et une expertise en ${input.statistics.totalLanguages} technologies.`,
        strengths: ['Activité constante', 'Diversité technologique'],
        weaknesses: ['Visibilité communautaire'],
        recommendations: [
          'Améliorer la documentation',
          "Contribuer à l'open source",
        ],
        careerAdvice: [
          'Développer une spécialisation',
          'Participer à des projets collaboratifs',
        ],
      },

      metadata: {
        analysisDate: new Date(),
        model: 'fallback',
        confidenceScore: 60,
        analysisVersion: '1.0.0',
      },
    };
  }

  /**
         * Sauvegarde l'analyse IA dans la base de données
         */
  private static async saveAIAnalysis(
    username: string,
    analysisResult: AIAnalysisResult,
  ): Promise<void> {
    try {
      // Trouver le dataset le plus récent de l'utilisateur
      const userData = await UserModel.findByLogin(username);

      if (userData === null) {
        logger.warn('Utilisateur non trouvé pour sauvegarde analyse IA', { username });
        return;
      }

      const latestDataset = await DatasetModel.findLatestByUserId(userData.id);

      if (latestDataset === null) {
        logger.warn('Aucun dataset trouvé pour sauvegarde analyse IA', { username, userId: userData.id });
        return;
      }

      // Convertir notre format vers InsightsExtension
      const insightsExtension = this.convertToInsightsExtension(analysisResult);

      // Sauvegarder l'analyse IA
      await DatasetModel.updateInsights(latestDataset.id, insightsExtension);

      logger.info('Analyse IA sauvegardée avec succès', {
        username,
        datasetId: latestDataset.id,
        qualityScore: analysisResult.qualityScore,
        securityScore: analysisResult.securityScore,
      });
    } catch (error) {
      logger.error('Erreur lors de la sauvegarde analyse IA', {
        username,
        error: String(error),
      });
      // Ne pas lancer l'erreur pour ne pas interrompre le processus principal
    }
  }

  /**
         * Convertit notre format d'analyse vers InsightsExtension
         */
  private static convertToInsightsExtension(analysisResult: AIAnalysisResult): InsightsExtension {
    const now = new Date();

    // Créer un format compatible avec AIInsightsSummary
    const aiInsightsSummary: AIInsightsSummary = {
      userId: 'temp_user_id', // Sera mis à jour par le DatasetModel
      generatedAt: now,
      model: 'gpt-4o-mini',
      confidence: analysisResult.metadata?.confidenceScore ?? 50,

      // Mapper nos données vers le format attendu
      personality: {
        archetype: 'builder',
        description: analysisResult.insights?.summary ?? 'Analyse du profil développeur',
        strengths: analysisResult.insights?.strengths ?? [],
        workingStyle: {
          preferredProjectSize: 'mixed',
          collaborationStyle: 'contributor',
          learningApproach: 'hands_on',
          problemSolving: 'analytical',
        },
        motivations: analysisResult.insights?.strengths ?? [],
        potentialChallenges: analysisResult.insights?.recommendations ?? [],
      },

      skills: {
        technical: (analysisResult.repositoryScores ?? []).slice(0, 5).map(repo => ({
          skill: repo.name,
          proficiency: repo.qualityScore > 70 ? 'proficient' : repo.qualityScore > 50 ? 'competent' : 'advanced_beginner' as const,
          confidence: repo.qualityScore,
          evidenceStrength: repo.qualityScore > 70 ? 'strong' : repo.qualityScore > 50 ? 'moderate' : 'weak' as const,
          evidence: repo.strengths ?? [],
          growthPotential: 'moderate' as const,
          marketDemand: 'moderate' as const,
        })),
        soft: [
          {
            skill: 'Problem Solving',
            level: 'competent' as const,
            indicators: analysisResult.insights?.strengths ?? [],
            impactOnCareer: 'significant' as const,
          },
        ],
        leadership: {
          current: 'individual_contributor' as const,
          potential: 'emerging' as const,
          indicators: analysisResult.insights?.careerAdvice ?? [],
        },
      },

      career: {
        currentLevel: analysisResult.qualityScore > 80 ? 'senior' : analysisResult.qualityScore > 60 ? 'mid_level' : 'junior' as const,
        experienceIndicators: analysisResult.insights?.strengths ?? [],
        trajectory: {
          direction: 'ascending' as const,
          velocity: 'steady' as const,
          confidence: analysisResult.metadata?.confidenceScore ?? 50,
        },
        suitableRoles: (analysisResult.insights?.careerAdvice ?? []).map(advice => ({
          role: advice,
          fit: 75,
          reasoning: 'Basé sur l\'analyse des compétences',
          requirements: [],
          growthPath: 'Continue learning and practicing',
        })),
        marketPosition: {
          competitiveness: analysisResult.qualityScore > 70 ? 'above_average' : 'average' as const,
          uniqueValueProposition: analysisResult.insights?.summary ?? '',
          differentiators: analysisResult.insights?.strengths ?? [],
          gaps: analysisResult.insights?.recommendations ?? [],
        },
      },

      productivity: {
        patterns: {
          peakPerformance: {
            timeOfDay: 'Matin',
            dayOfWeek: 'Jours de semaine',
            seasonality: 'Constante',
            reasoning: 'Basé sur l\'analyse des commits',
          },
          consistency: {
            level: 'consistent' as const,
            factors: ['Engagement régulier'],
            recommendations: analysisResult.insights?.recommendations ?? [],
          },
        },
        efficiency: {
          codeToImpactRatio: analysisResult.qualityScore > 70 ? 'high' : 'moderate' as const,
          problemSolvingSpeed: 'steady' as const,
          qualityConsistency: 'consistent' as const,
          analysis: analysisResult.insights?.summary ?? '',
        },
        workLifeBalance: {
          sustainabilityScore: Math.max(50, analysisResult.qualityScore),
          riskFactors: [],
          positiveIndicators: analysisResult.insights?.strengths ?? [],
          recommendations: analysisResult.insights?.recommendations ?? [],
        },
      },

      recommendations: {
        immediate: (analysisResult.insights?.recommendations ?? []).slice(0, 3).map(rec => ({
          category: 'skill' as const,
          recommendation: rec,
          reasoning: 'Amélioration prioritaire identifiée',
          expectedImpact: 'moderate' as const,
          effort: 'medium' as const,
          resources: [],
        })),
        shortTerm: [
          {
            goal: 'Amélioration de la qualité du code',
            timeframe: '3-6 mois',
            steps: analysisResult.insights?.recommendations ?? [],
            metrics: ['Couverture de tests', 'Complexité du code'],
          },
        ],
        longTerm: [
          {
            vision: 'Développeur expérimenté',
            milestones: analysisResult.insights?.careerAdvice ?? [],
            skills: [],
            experience: [],
          },
        ],
      },

      strengths: {
        core: (analysisResult.insights?.strengths ?? []).map(strength => ({
          strength,
          manifestation: ['Visible dans les projets'],
          evidence: ['Analyse des repositories'],
          leverageOpportunities: ['Projets plus complexes'],
        })),
        emerging: [],
        unique: [],
      },

      growth: {
        skills: (analysisResult.insights?.recommendations ?? []).map(rec => ({
          skill: rec,
          currentGap: 'moderate' as const,
          importance: 'beneficial' as const,
          learningPath: ['Formation', 'Pratique'],
          timeToCompetency: '3-6 mois',
          careerImpact: 'Amélioration des opportunités',
        })),
        experiences: [],
        relationships: [],
      },

      executiveSummary: {
        keyHighlights: [
          `Score de qualité: ${analysisResult.qualityScore}%`,
          `Score de sécurité: ${analysisResult.securityScore}%`,
          `Score d'innovation: ${analysisResult.innovationScore}%`,
        ],
        majorStrengths: analysisResult.insights?.strengths ?? [],
        primaryRecommendations: analysisResult.insights?.recommendations ?? [],
        careerOutlook: analysisResult.insights?.summary ?? '',
      },

      metadata: {
        analysisVersion: analysisResult.metadata?.analysisVersion ?? '1.0.0',
        dataPoints: (analysisResult.repositoryScores ?? []).length,
        processingTime: 10, // Approximation
        tokens: {
          input: 1000,
          output: 500,
          total: 1500,
        },
      },
    };

    return {
      aiInsights: aiInsightsSummary,
      updatedAt: now,
    };
  }

  /**
         * Extrait un score numérique depuis les highlights
         */
  private static extractScoreFromHighlights(highlights: string[], keyword: string): number {
    const highlight = highlights.find(h => h.toLowerCase().includes(keyword.toLowerCase()));
    if (highlight != null) {
      const match = highlight.match(/(\d+)%?/);
      if (match != null) {
        return parseInt(match[1], 10);
      }
    }
    return 50; // Valeur par défaut
  }
}

export default AIAnalysisService;
