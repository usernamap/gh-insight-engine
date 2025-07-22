import { Request, Response } from 'express';
import { asyncHandler } from '@/middleware/errorHandler';
import { createError } from '@/middleware/errorHandler';
import { databaseService } from '@/services/DatabaseService';
import { aiService } from '@/services/AIService';
import { logWithContext } from '@/utils/logger';
import { UserModel } from '@/models/User';
import { AuthenticatedUser } from '@/types/github';

// Type guards for repository properties
interface DeploymentData {
  totalCount: number;
}

interface EnvironmentData {
  totalCount: number;
}

interface CommitData {
  totalCount: number;
  recent: Array<{
    oid: string;
    message: string;
    committedDate: Date;
  }>;
}

interface ReleaseData {
  totalCount: number;
  latestRelease: {
    name: string;
    tagName: string;
    publishedAt: Date;
    isLatest: boolean;
  } | null;
}

interface IssueData {
  totalCount: number;
  openCount: number;
  closedCount: number;
}

// Type guard functions
function isDeploymentData(obj: unknown): obj is DeploymentData {
  return typeof obj === 'object' && obj !== null && 'totalCount' in obj;
}

function isEnvironmentData(obj: unknown): obj is EnvironmentData {
  return typeof obj === 'object' && obj !== null && 'totalCount' in obj;
}

function isCommitData(obj: unknown): obj is CommitData {
  return typeof obj === 'object' && obj !== null && 'totalCount' in obj && 'recent' in obj;
}

function isReleaseData(obj: unknown): obj is ReleaseData {
  return typeof obj === 'object' && obj !== null && 'totalCount' in obj;
}

function isIssueData(obj: unknown): obj is IssueData {
  return typeof obj === 'object' && obj !== null && 'totalCount' in obj;
}


/**
 * Contrôleur d'insights IA (analyses qualitatives)
 */
export class InsightsController {
  /**
   * Génération d'insights IA pour un utilisateur
   * POST /api/insights/:username/generate
   */
  static generateInsights = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { username } = req.params;
      const authenticatedUser = req.user as AuthenticatedUser;

      // Vérification des permissions : seul le propriétaire peut générer ses insights
      if (authenticatedUser.username !== username) {
        throw createError.authorization(
          'Vous ne pouvez générer des insights que pour votre propre profil',
        );
      }

      logWithContext.api('generate_insights_start', req.path, true, {
        requesterId: authenticatedUser.id,
      });

      try {
        // 1. Vérification de l'existence de l'utilisateur et du dataset
        const userData = await UserModel.findByLogin(username);
        if (!userData) {
          throw createError.notFound('Utilisateur');
        }

        const latestDataset =
          await databaseService.getLatestUserDataset(username);
        if (!latestDataset) {
          throw createError.notFound(
            "Aucun dataset trouvé. Veuillez d'abord lancer une analyse",
          );
        }

        // Validation stricte du champ analytics (doit être un objet avec au moins une clé connue)
        const analytics =
          latestDataset.dataset.analytics &&
            typeof latestDataset.dataset.analytics === 'object' &&
            'overview' in latestDataset.dataset.analytics
            ? (latestDataset.dataset
              .analytics as unknown as import('@/types/analytics').AnalyticsOverview)
            : undefined;
        if (!analytics) {
          throw createError.validation(
            'Les métriques analytiques sont requises avant de générer des insights IA',
          );
        }

        // 2. Vérification si les insights existent déjà et sont récents
        if (latestDataset.dataset.aiInsights) {
          const insightsAge =
            Date.now() - new Date(latestDataset.dataset.updatedAt).getTime();
          const maxAge = 24 * 60 * 60 * 1000; // 24 heures

          if (insightsAge < maxAge) {
            logWithContext.api('generate_insights_cached', req.path, true, {
              ageHours: Math.round(insightsAge / (60 * 60 * 1000)),
            });

            res.status(200).json({
              message: 'Insights déjà générés et à jour',
              insights: {
                cached: true,
                ageHours: Math.round(insightsAge / (60 * 60 * 1000)),
                lastGenerated: latestDataset.dataset.updatedAt,
              },
              timestamp: new Date().toISOString(),
            });
            return;
          }
        }

        // 3. Récupération des repositories pour contexte
        const repositories = latestDataset.repositories;

        // 4. Génération des insights IA
        logWithContext.api('ai_analysis_start', req.path, true);

        // Correction du typage UserProfile pour l'appel IA
        const userProfileStrict = {
          ...userData,
          bio: userData.bio ?? '',
          company: userData.company ?? '',
          location: userData.location ?? '',
          blog: userData.blog ?? '',
          twitterUsername: userData.twitterUsername ?? '',
          privateRepos: userData.privateRepos ?? 0,
          ownedPrivateRepos: userData.ownedPrivateRepos ?? 0,
          totalPrivateRepos: userData.totalPrivateRepos ?? 0,
          collaborators: userData.collaborators ?? 0,
          hireable: userData.hireable ?? false,
          organizations:
            userData.organizations &&
              typeof userData.organizations === 'object' &&
              'totalCount' in userData.organizations &&
              'nodes' in userData.organizations
              ? (userData.organizations as unknown as {
                totalCount: number;
                nodes: import('@/types/github').GitHubOrganization[];
              })
              : { totalCount: 0, nodes: [] },
        };
        // Helper local pour valider les objets complexes
        function isValid(obj: unknown, keys: string[]): boolean {
          return (
            !!obj &&
            typeof obj === 'object' &&
            keys.every((k) => k in (obj as object))
          );
        }
        const repositoriesStrict = repositories.map((repo) => ({
          ...repo,
          description: repo.description ?? '',
          subscriberCount: repo.subscriberCount ?? 0,
          networkCount: repo.networkCount ?? 0,
          primaryLanguage: repo.primaryLanguage ?? '',
          pushedAt: repo.pushedAt ?? new Date(),
          homepageUrl: repo.homepageUrl ?? '',
          defaultBranchRef: repo.defaultBranchRef ?? '',
          license:
            typeof repo.license === 'object' &&
              repo.license !== null &&
              !Array.isArray(repo.license) &&
              typeof repo.license.name === 'string' &&
              typeof repo.license.spdxId === 'string' &&
              typeof repo.license.url === 'string'
              ? {
                name: String(repo.license.name),
                spdxId: String(repo.license.spdxId),
                url: String(repo.license.url),
              }
              : null,
          hasPages: repo.hasPages ?? false,
          hasDownloads: repo.hasDownloads ?? false,
          hasDiscussions: repo.hasDiscussions ?? false,
          hasIssuesEnabled: repo.hasIssuesEnabled ?? false,
          hasProjectsEnabled: repo.hasProjectsEnabled ?? false,
          hasWikiEnabled: repo.hasWikiEnabled ?? false,
          vulnerabilityAlertsEnabled: repo.vulnerabilityAlertsEnabled ?? false,
          securityPolicyEnabled: repo.securityPolicyEnabled ?? false,
          codeOfConductEnabled: repo.codeOfConductEnabled ?? false,
          contributingGuidelinesEnabled:
            repo.contributingGuidelinesEnabled ?? false,
          readmeEnabled: repo.readmeEnabled ?? false,
          deployments:
            repo.deployments &&
              typeof repo.deployments === 'object' &&
              isDeploymentData(repo.deployments)
              ? { totalCount: repo.deployments.totalCount }
              : { totalCount: 0 },
          environments:
            repo.environments &&
              typeof repo.environments === 'object' &&
              isEnvironmentData(repo.environments)
              ? { totalCount: repo.environments.totalCount }
              : { totalCount: 0 },
          commits:
            repo.commits &&
              typeof repo.commits === 'object' &&
              isCommitData(repo.commits)
              ? {
                totalCount: repo.commits.totalCount,
                recent: repo.commits.recent,
              }
              : { totalCount: 0, recent: [] },
          releases:
            repo.releases &&
              typeof repo.releases === 'object' &&
              isReleaseData(repo.releases)
              ? {
                totalCount: repo.releases.totalCount,
                latestRelease: repo.releases.latestRelease,
              }
              : { totalCount: 0, latestRelease: null },
          issues:
            repo.issues &&
              typeof repo.issues === 'object' &&
              isIssueData(repo.issues)
              ? {
                totalCount: repo.issues.totalCount,
                openCount: repo.issues.openCount,
                closedCount: repo.issues.closedCount,
              }
              : { totalCount: 0, openCount: 0, closedCount: 0 },
          pullRequests:
            repo.pullRequests &&
              typeof repo.pullRequests === 'object' &&
              'totalCount' in repo.pullRequests
              ? {
                totalCount: (repo.pullRequests as { totalCount: number; openCount: number; closedCount: number; mergedCount: number }).totalCount ?? 0,
                openCount: (repo.pullRequests as { totalCount: number; openCount: number; closedCount: number; mergedCount: number }).openCount ?? 0,
                closedCount: (repo.pullRequests as { totalCount: number; openCount: number; closedCount: number; mergedCount: number }).closedCount ?? 0,
                mergedCount: (repo.pullRequests as { totalCount: number; openCount: number; closedCount: number; mergedCount: number }).mergedCount ?? 0,
              }
              : { totalCount: 0, openCount: 0, closedCount: 0, mergedCount: 0 },
          branchProtectionRules:
            repo.branchProtectionRules &&
              typeof repo.branchProtectionRules === 'object' &&
              'totalCount' in repo.branchProtectionRules
              ? {
                totalCount:
                  (repo.branchProtectionRules as { totalCount: number }).totalCount ?? 0,
              }
              : { totalCount: 0 },
          collaborators:
            repo.collaborators &&
              typeof repo.collaborators === 'object' &&
              'totalCount' in repo.collaborators
              ? { totalCount: (repo.collaborators as { totalCount: number }).totalCount ?? 0 }
              : { totalCount: 0 },
          githubActions: isValid(repo.githubActions, [
            'workflowsCount',
            'lastRunStatus',
            'workflows',
            'runs',
          ])
            ? (repo.githubActions as unknown as import('@/types/github').GitHubActions)
            : undefined,
          security: isValid(repo.security, [
            'dependabotAlerts',
            'secretScanning',
            'codeScanning',
            'hasSecurityPolicy',
            'hasVulnerabilityAlertsEnabled',
          ])
            ? (repo.security as unknown as import('@/types/github').GitHubSecurity)
            : undefined,
          packages: isValid(repo.packages, ['totalCount', 'types'])
            ? (repo.packages as unknown as import('@/types/github').GitHubPackages)
            : undefined,
          branchProtection: isValid(repo.branchProtection, ['rules'])
            ? (repo.branchProtection as unknown as import('@/types/github').GitHubBranchProtection)
            : undefined,
          community: isValid(repo.community, [
            'healthPercentage',
            'hasReadme',
            'hasLicense',
            'hasContributing',
            'hasCodeOfConduct',
            'hasIssueTemplate',
            'hasPullRequestTemplate',
          ])
            ? (repo.community as unknown as import('@/types/github').GitHubCommunity)
            : undefined,
          traffic: isValid(repo.traffic, ['views', 'clones', 'popularPaths'])
            ? (repo.traffic as unknown as import('@/types/github').GitHubTraffic)
            : undefined,
          diskUsage: repo.diskUsage ?? 0,
          languages:
            repo.languages &&
              typeof repo.languages === 'object' &&
              'totalSize' in repo.languages &&
              'nodes' in repo.languages
              ? (repo.languages as unknown as {
                totalSize: number;
                nodes: import('@/types/github').GitHubLanguage[];
              })
              : { totalSize: 0, nodes: [] },
          owner:
            repo.owner &&
              typeof repo.owner === 'object' &&
              'login' in repo.owner &&
              'type' in repo.owner &&
              'avatarUrl' in repo.owner
              ? {
                login: (repo.owner as { login: string; type: string; avatarUrl: string }).login ?? '',
                type: (repo.owner as { login: string; type: string; avatarUrl: string }).type ?? '',
                avatarUrl: (repo.owner as { login: string; type: string; avatarUrl: string }).avatarUrl ?? '',
              }
              : { login: '', type: '', avatarUrl: '' },
        }));
        const aiInsights = await aiService.generateCompleteInsights(
          userProfileStrict,
          repositoriesStrict,
          analytics,
        );

        // Correction InsightsExtension
        await databaseService.updateDatasetAnalyses(
          latestDataset.dataset.id,
          undefined,
          { aiInsights, updatedAt: new Date() },
        );

        logWithContext.api('generate_insights_complete', req.path, true, {
          datasetId: latestDataset.dataset.id,
          insightsGenerated: true,
        });

        res.status(200).json({
          message: 'Insights IA générés avec succès',
          insights: {
            generated: true,
            fresh: true,
          },
          summary: {
            developerPersonality: {
              archetype: aiInsights.personality.archetype,
              description: aiInsights.personality.description,
              strengths: aiInsights.personality.strengths,
              workingStyle: aiInsights.personality.workingStyle,
              motivations: aiInsights.personality.motivations,
              potentialChallenges: aiInsights.personality.potentialChallenges,
            },
            mainStrengths: aiInsights.strengths.core,
            keyRecommendations: aiInsights.recommendations.immediate.slice(
              0,
              3,
            ),
            overallAssessment: aiInsights.executiveSummary,
          },
          metadata: {
            datasetId: latestDataset.dataset.id,
            generatedAt: new Date().toISOString(),
            repositoriesAnalyzed: repositories.length,
          },
          timestamp: new Date().toISOString(),
        });
        return;
      } catch (_error: unknown) {
        logWithContext.api('generate_insights_failed', req.path, false, {
          error: String(_error),
          errorType: (_error as Error).constructor.name,
        });

        throw _error;
      }
    },
  );

  /**
   * Résumé des insights IA d'un utilisateur
   * GET /api/insights/:username/summary
   */
  static getInsightsSummary = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { username } = req.params;
      const authenticatedUser = req.user as AuthenticatedUser;

      logWithContext.api('get_insights_summary', req.path, true, {
        targetUsername: username,
        requesterId: authenticatedUser?.id,
      });

      try {
        const userData = await UserModel.findByLogin(username);
        if (!userData) {
          throw createError.notFound('Utilisateur');
        }

        const latestDataset =
          await databaseService.getLatestUserDataset(username);
        if (!latestDataset?.dataset.aiInsights) {
          throw createError.notFound(
            'Aucun insight IA trouvé pour cet utilisateur',
          );
        }

        const aiInsights = latestDataset.dataset
          .aiInsights as unknown as import('@/types/insights').AIInsightsSummary;

        res.status(200).json({
          user: {
            username: userData.login,
            name: userData.name,
            avatarUrl: userData.avatarUrl,
          },
          summary: {
            overall: aiInsights.executiveSummary,
            personality: {
              archetype: aiInsights.personality.archetype,
              description: aiInsights.personality.description,
              strengths: aiInsights.personality.strengths,
              workingStyle: aiInsights.personality.workingStyle,
              motivations: aiInsights.personality.motivations,
              potentialChallenges: aiInsights.personality.potentialChallenges,
            },
            keyStrengths: aiInsights.strengths.core,
            topSkills: aiInsights.skills.technical.slice(0, 5),
            careerLevel: aiInsights.career.currentLevel,
            experience: aiInsights.career.trajectory,
          },
          highlights: {
            bestQualities: aiInsights.personality.strengths,
            topRecommendations: aiInsights.recommendations.immediate.slice(
              0,
              3,
            ),
            growthAreas: aiInsights.growth.skills.slice(0, 3),
          },
          metadata: {
            generatedAt: latestDataset.dataset.updatedAt,
            confidence: aiInsights.confidence ?? 0.8,
            repositoriesAnalyzed: Array.isArray(
              latestDataset.dataset.repositories,
            )
              ? latestDataset.dataset.repositories.length
              : 0,
          },
          timestamp: new Date().toISOString(),
        });
        return;
      } catch (_error: unknown) {
        logWithContext.api('get_insights_summary', req.path, false, {
          targetUsername: username,
          error: String(_error),
        });

        throw _error;
      }
    },
  );

  /**
   * Personnalité de développeur analysée par IA
   * GET /api/insights/:username/personality
   */
  static getDeveloperPersonality = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { username } = req.params;
      const authenticatedUser = req.user as AuthenticatedUser;

      logWithContext.api('get_developer_personality', req.path, true, {
        targetUsername: username,
        requesterId: authenticatedUser?.id,
      });

      try {
        const userData = await UserModel.findByLogin(username);
        if (!userData) {
          throw createError.notFound('Utilisateur');
        }

        const latestDataset =
          await databaseService.getLatestUserDataset(username);
        if (!latestDataset?.dataset.aiInsights) {
          throw createError.notFound('Aucune analyse de personnalité trouvée');
        }

        const aiInsights = latestDataset.dataset
          .aiInsights as unknown as import('@/types/insights').AIInsightsSummary;
        const personality = aiInsights.personality;

        res.status(200).json({
          user: {
            username: userData.login,
            name: userData.name,
          },
          personality: {
            archetype: personality.archetype,
            description: personality.description,
            strengths: personality.strengths,
            workingStyle: personality.workingStyle,
            motivations: personality.motivations,
            potentialChallenges: personality.potentialChallenges,
          },
          insights: {},
          metadata: {
            analysisDate: latestDataset.dataset.updatedAt,
          },
          timestamp: new Date().toISOString(),
        });
        return;
      } catch (_error: unknown) {
        logWithContext.api('get_developer_personality', req.path, false, {
          targetUsername: username,
          error: String(_error),
        });

        throw _error;
      }
    },
  );

  /**
   * Recommandations IA pour amélioration
   * GET /api/insights/:username/recommendations
   */
  static getRecommendations = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { username } = req.params;
      const { category } = req.query; // 'immediate', 'shortTerm', 'longTerm'
      const authenticatedUser = req.user as AuthenticatedUser;

      logWithContext.api('get_recommendations', req.path, true, {
        targetUsername: username,
        category,
        requesterId: authenticatedUser?.id,
      });

      try {
        const userData = await UserModel.findByLogin(username);
        if (!userData) {
          throw createError.notFound('Utilisateur');
        }

        const latestDataset =
          await databaseService.getLatestUserDataset(username);
        if (!latestDataset?.dataset.aiInsights) {
          throw createError.notFound('Aucune recommandation trouvée');
        }

        const aiInsights = latestDataset.dataset
          .aiInsights as unknown as import('@/types/insights').AIInsightsSummary;
        const recommendations = aiInsights.recommendations;

        // Ne pas filtrer recommendations par catégorie (pas d'indexation dynamique sur TechnicalRecommendations)
        res.status(200).json({
          user: {
            username: userData.login,
            name: userData.name,
          },
          recommendations: {
            immediate: recommendations.immediate ?? [],
            shortTerm: recommendations.shortTerm ?? [],
            longTerm: recommendations.longTerm ?? [],
          },
          prioritized: {},
          actionPlan: {},
          metadata: {
            generatedAt: latestDataset.dataset.updatedAt,
          },
          timestamp: new Date().toISOString(),
        });
        return;
      } catch (_error: unknown) {
        logWithContext.api('get_recommendations', req.path, false, {
          targetUsername: username,
          error: String(_error),
        });

        throw _error;
      }
    },
  );

  /**
   * Forces et points forts identifiés par l'IA
   * GET /api/insights/:username/strengths
   */
  static getStrengths = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { username } = req.params;
      const authenticatedUser = req.user as AuthenticatedUser;

      logWithContext.api('get_strengths', req.path, true, {
        targetUsername: username,
        requesterId: authenticatedUser?.id,
      });

      try {
        const userData = await UserModel.findByLogin(username);
        if (!userData) {
          throw createError.notFound('Utilisateur');
        }

        const latestDataset =
          await databaseService.getLatestUserDataset(username);
        if (!latestDataset?.dataset.aiInsights) {
          throw createError.notFound('Aucune analyse des forces trouvée');
        }

        const aiInsights = latestDataset.dataset
          .aiInsights as unknown as import('@/types/insights').AIInsightsSummary;
        const strengths = aiInsights.strengths;

        res.status(200).json({
          user: {
            username: userData.login,
            name: userData.name,
          },
          strengths: {
            core: strengths.core,
            emerging: strengths.emerging,
            unique: strengths.unique,
          },
          evidence: {},
          differentiators: {},
          metadata: {
            analysisDate: latestDataset.dataset.updatedAt,
          },
          timestamp: new Date().toISOString(),
        });
        return;
      } catch (_error: unknown) {
        logWithContext.api('get_strengths', req.path, false, {
          targetUsername: username,
          error: String(_error),
        });

        throw _error;
      }
    },
  );

  /**
   * Opportunités de croissance identifiées par l'IA
   * GET /api/insights/:username/growth
   */
  static getGrowthOpportunities = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { username } = req.params;
      const authenticatedUser = req.user as AuthenticatedUser;

      logWithContext.api('get_growth_opportunities', req.path, true, {
        targetUsername: username,
        requesterId: authenticatedUser?.id,
      });

      try {
        const userData = await UserModel.findByLogin(username);
        if (!userData) {
          throw createError.notFound('Utilisateur');
        }

        const latestDataset =
          await databaseService.getLatestUserDataset(username);
        if (!latestDataset?.dataset.aiInsights) {
          throw createError.notFound(
            'Aucune analyse des opportunités de croissance trouvée',
          );
        }

        const aiInsights = latestDataset.dataset
          .aiInsights as unknown as import('@/types/insights').AIInsightsSummary;
        const growth = aiInsights.growth;

        res.status(200).json({
          user: {
            username: userData.login,
            name: userData.name,
          },
          growth: {
            skills: growth.skills,
            experiences: growth.experiences,
            relationships: growth.relationships,
          },
          opportunities: {},
          roadmap: {},
          resources: {},
          metadata: {
            analysisDate: latestDataset.dataset.updatedAt,
          },
          timestamp: new Date().toISOString(),
        });
        return;
      } catch (_error: unknown) {
        logWithContext.api('get_growth_opportunities', req.path, false, {
          targetUsername: username,
          error: String(_error),
        });

        throw _error;
      }
    },
  );

  /**
   * Évaluation des compétences par l'IA
   * GET /api/insights/:username/skills
   */
  static getSkillAssessment = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { username } = req.params;
      const authenticatedUser = req.user as AuthenticatedUser;

      logWithContext.api('get_skill_assessment', req.path, true, {
        targetUsername: username,
        requesterId: authenticatedUser?.id,
      });

      try {
        const userData = await UserModel.findByLogin(username);
        if (!userData) {
          throw createError.notFound('Utilisateur');
        }

        const latestDataset =
          await databaseService.getLatestUserDataset(username);
        if (!latestDataset?.dataset.aiInsights) {
          throw createError.notFound(
            'Aucune évaluation des compétences trouvée',
          );
        }

        const aiInsights = latestDataset.dataset
          .aiInsights as unknown as import('@/types/insights').AIInsightsSummary;
        const skills = aiInsights.skills;

        res.status(200).json({
          user: {
            username: userData.login,
            name: userData.name,
          },
          skills: {
            technical: skills.technical,
            soft: skills.soft,
            leadership: skills.leadership,
          },
          assessment: {},
          marketability: {},
          progression: {},
          metadata: {
            analysisDate: latestDataset.dataset.updatedAt,
          },
          timestamp: new Date().toISOString(),
        });
        return;
      } catch (_error: unknown) {
        logWithContext.api('get_skill_assessment', req.path, false, {
          targetUsername: username,
          error: String(_error),
        });

        throw _error;
      }
    },
  );

  /**
   * Insights de carrière par l'IA
   * GET /api/insights/:username/career
   */
  static getCareerInsights = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { username } = req.params;
      const authenticatedUser = req.user as AuthenticatedUser;

      logWithContext.api('get_career_insights', req.path, true, {
        targetUsername: username,
        requesterId: authenticatedUser?.id,
      });

      try {
        const userData = await UserModel.findByLogin(username);
        if (!userData) {
          throw createError.notFound('Utilisateur');
        }

        const latestDataset =
          await databaseService.getLatestUserDataset(username);
        if (!latestDataset?.dataset.aiInsights) {
          throw createError.notFound('Aucun insight de carrière trouvé');
        }

        const aiInsights = latestDataset.dataset
          .aiInsights as unknown as import('@/types/insights').AIInsightsSummary;
        const career = aiInsights.career;

        res.status(200).json({
          user: {
            username: userData.login,
            name: userData.name,
          },
          career: {
            currentLevel: career.currentLevel,
            experienceIndicators: career.experienceIndicators,
            trajectory: career.trajectory,
            suitableRoles: career.suitableRoles,
            marketPosition: career.marketPosition,
          },
          insights: {},
          metadata: {
            analysisDate: latestDataset.dataset.updatedAt,
          },
          timestamp: new Date().toISOString(),
        });
        return;
      } catch (_error: unknown) {
        logWithContext.api('get_career_insights', req.path, false, {
          targetUsername: username,
          error: String(_error),
        });

        throw _error;
      }
    },
  );
}

export default InsightsController;
