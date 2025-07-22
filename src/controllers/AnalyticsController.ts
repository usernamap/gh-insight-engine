import { Request, Response } from 'express';
import { asyncHandler } from '@/middleware/errorHandler';
import { createError } from '@/middleware/errorHandler';
import { databaseService } from '@/services/DatabaseService';
import { analyticsService } from '@/services/AnalyticsService';
import { githubService } from '@/services/GitHubService';
import { logWithContext } from '@/utils/logger';
import { UserModel } from '@/models/User';
import { AuthenticatedUser } from '@/types/github';

interface AnalysisQuery {
  includePrivate: boolean;
  forceRefresh: boolean;
  maxAge: number;
}



export class AnalyticsController {
  static analyzeUser = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { username } = req.params;
      const analysisParams = req.query as unknown as AnalysisQuery;
      const authenticatedUser = req.user as AuthenticatedUser;

      if (!authenticatedUser?.githubToken) {
        throw createError.authentication("Token GitHub requis pour l'analyse");
      }
      if (authenticatedUser.username !== username) {
        throw createError.authorization(
          'Vous ne pouvez analyser que votre propre profil',
        );
      }
      logWithContext.api('analyze_user_start', req.path, true, {
        targetUsername: username,
        requesterId: authenticatedUser.id,
        includePrivate: analysisParams.includePrivate,
        forceRefresh: analysisParams.forceRefresh,
      });
      try {
        const user = await UserModel.findByLogin(username);
        if (!user) {
          throw createError.notFound('Utilisateur');
        }
        const freshness =
          await databaseService.areUserAnalyticsUpToDate(username);
        if (freshness.analyticsUpToDate && !analysisParams.forceRefresh) {
          const latest = await databaseService.getLatestUserDataset(username);
          logWithContext.api('analyze_user_cached', req.path, true, {
            targetUsername: username,
            ageHours: freshness.lastUpdate
              ? (Date.now() - new Date(freshness.lastUpdate).getTime()) /
              3600000
              : null,
          });
          res.status(200).json({
            message: 'Analyse déjà à jour',
            analysis: {
              cached: true,
              ageHours: freshness.lastUpdate
                ? (Date.now() - new Date(freshness.lastUpdate).getTime()) /
                3600000
                : null,
              lastAnalyzed: latest?.dataset.updatedAt,
            },
            dataset: {
              id: latest?.dataset.id,
              hasAnalytics: latest?.dataset?.analytics != null,
              repositoriesCount: Array.isArray(latest?.dataset.repositories)
                ? latest.dataset.repositories.length
                : 0,
            },
            timestamp: new Date().toISOString(),
          });
          return;
        }
        // Récupération du profil utilisateur (pour l'utilisateur authentifié)
        const userProfile = await githubService.getUserProfile();
        if (userProfile == null) {
          throw createError.notFound('Profil utilisateur GitHub');
        }
        // Récupération des repositories (pour l'utilisateur authentifié)
        const repositories = await githubService.getUserRepos();
        // Construction stricte du DatasetMetadata
        const organizations = Array.isArray(userProfile.organizations?.nodes)
          ? userProfile.organizations.nodes.map(
            (org: { login: string }) => org.login,
          )
          : [];
        const breakdown = {
          userRepositories: repositories.length,
          organizationRepositories: {},
          privateRepositories: repositories.filter((r) => r.isPrivate).length,
          publicRepositories: repositories.filter((r) => !r.isPrivate).length,
          forkedRepositories: repositories.filter((r) => r.isFork).length,
          archivedRepositories: repositories.filter((r) => r.isArchived).length,
          templateRepositories: repositories.filter((r) => r.isTemplate).length,
        };
        const statistics = {
          totalStars: repositories.reduce(
            (sum, r) => sum + (r.stargazerCount || 0),
            0,
          ),
          totalForks: repositories.reduce(
            (sum, r) => sum + (r.forkCount || 0),
            0,
          ),
          totalWatchers: repositories.reduce(
            (sum, r) => sum + (r.watchersCount || 0),
            0,
          ),
          totalIssues: repositories.reduce(
            (sum, r) => sum + (r.issues?.totalCount || 0),
            0,
          ),
          totalPullRequests: repositories.reduce(
            (sum, r) => sum + (r.pullRequests?.totalCount || 0),
            0,
          ),
          totalReleases: repositories.reduce(
            (sum, r) => sum + (r.releases?.totalCount || 0),
            0,
          ),
          totalCommits: repositories.reduce(
            (sum, r) => sum + (r.commits?.totalCount || 0),
            0,
          ),
          totalDeployments: repositories.reduce(
            (sum, r) => sum + (r.deployments?.totalCount || 0),
            0,
          ),
          totalEnvironments: repositories.reduce(
            (sum, r) => sum + (r.environments?.totalCount || 0),
            0,
          ),
          totalLanguages: repositories.reduce(
            (sum, r) => sum + (r.languages?.nodes?.length || 0),
            0,
          ),
          averageRepoSize:
            repositories.length > 0
              ? Math.round(
                repositories.reduce((sum, r) => sum + (r.size || 0), 0) /
                repositories.length,
              )
              : 0,
          mostUsedLanguages: [],
          topTopics: [],
          repositoriesWithWebsite: repositories.filter((r) => !!r.homepageUrl)
            .length,
          repositoriesWithDeployments: repositories.filter(
            (r) => r.deployments?.totalCount > 0,
          ).length,
          repositoriesWithActions: repositories.filter((r) => r.githubActions)
            .length,
          repositoriesWithSecurityAlerts: repositories.filter((r) => r.security)
            .length,
          repositoriesWithPackages: repositories.filter((r) => r.packages)
            .length,
          repositoriesWithBranchProtection: repositories.filter(
            (r) => r.branchProtection,
          ).length,
          averageCommunityHealth: 0,
        };
        const metadata = {
          generatedAt: new Date(),
          totalRepositories: repositories.length,
          organizations,
          dataCollectionScope: ['user'],
          breakdown,
          statistics,
        };
        const saved = await databaseService.saveCompleteUserDataset(
          userProfile,
          repositories,
          metadata,
        );
        // Génération des analytics quantitatives
        logWithContext.api('generate_analytics_start', username, true);
        const analyticsOverview =
          await analyticsService.generateAnalyticsOverview(
            userProfile,
            repositories,
          );
        const analyticsExtension = {
          analytics: analyticsOverview,
          benchmarks: {
            commits: {
              percentile: 0,
              category: 'beginner' as 'beginner',
              comparisonGroup: 'all_developers' as 'all_developers',
              strengths: [],
              improvementAreas: [],
            },
            repositories: {
              percentile: 0,
              category: 'beginner' as 'beginner',
              comparisonGroup: 'all_developers' as 'all_developers',
              strengths: [],
              improvementAreas: [],
            },
            languages: {
              percentile: 0,
              category: 'beginner' as 'beginner',
              comparisonGroup: 'all_developers' as 'all_developers',
              strengths: [],
              improvementAreas: [],
            },
            stars: {
              percentile: 0,
              category: 'beginner' as 'beginner',
              comparisonGroup: 'all_developers' as 'all_developers',
              strengths: [],
              improvementAreas: [],
            },
            collaboration: {
              percentile: 0,
              category: 'beginner' as 'beginner',
              comparisonGroup: 'all_developers' as 'all_developers',
              strengths: [],
              improvementAreas: [],
            },
            consistency: {
              percentile: 0,
              category: 'beginner' as 'beginner',
              comparisonGroup: 'all_developers' as 'all_developers',
              strengths: [],
              improvementAreas: [],
            },
          },
          trends: [],
          alerts: [],
          recommendations: [],
          updatedAt: new Date(),
        };
        await databaseService.updateDatasetAnalyses(
          saved.dataset.id,
          analyticsExtension,
        );
        logWithContext.api('generate_analytics_complete', username, true, {
          datasetId: saved.dataset.id,
          performanceScore: analyticsOverview.performance,
          productivityScore: analyticsOverview.productivity,
          languagesCount: analyticsOverview.languages.distribution.length,
        });
        res.status(200).json({
          message: 'Analyse terminée avec succès',
          analysis: {
            completed: true,
            duration: Date.now() - new Date(saved.dataset.createdAt).getTime(),
            fresh: true,
          },
          dataset: {
            id: saved.dataset.id,
            createdAt: saved.dataset.createdAt,
            repositoriesCount: repositories.length,
            hasAnalytics: true,
            hasAiInsights: false,
          },
          _analytics: analyticsOverview,
          timestamp: new Date().toISOString(),
        });
        return;
      } catch (_error: unknown) {
        logWithContext.api('analyze_user_failed', req.path, false, {
          targetUsername: username,
          error: String(_error),
          errorType: (_error as Error).constructor.name,
        });
        throw _error;
      }
    },
  );

  static getAnalyticsOverview = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { username } = req.params;
      const authenticatedUser = req.user as AuthenticatedUser;
      logWithContext.api('get_analytics_overview', req.path, true, {
        targetUsername: username,
        requesterId: authenticatedUser?.id,
      });
      try {
        const user = await UserModel.findByLogin(username);
        if (!user) {
          throw createError.notFound('Utilisateur');
        }
        const latest = await databaseService.getLatestUserDataset(username);
        if (latest?.dataset?.analytics == null) {
          throw createError.notFound(
            'Aucune analyse trouvée pour cet utilisateur',
          );
        }
        const analytics = latest.dataset
          .analytics as unknown as import('@/types/analytics').AnalyticsOverview;
        res.status(200).json({
          user: {
            username: user.login,
            name: user.name,
            avatarUrl: user.avatarUrl,
          },
          _analytics: analytics,
          metadata: {
            datasetId: latest.dataset.id,
            analyzedAt: latest.dataset.updatedAt,
            repositoriesAnalyzed: Array.isArray(latest.dataset.repositories)
              ? latest.dataset.repositories.length
              : 0,
            settings:
              typeof latest.dataset.metadata === 'object' &&
                latest.dataset.metadata &&
                'settings' in latest.dataset.metadata
                ? (latest.dataset.metadata as unknown as { settings: unknown }).settings
                : undefined,
          },
          timestamp: new Date().toISOString(),
        });
        return;
      } catch (_error: unknown) {
        logWithContext.api('get_analytics_overview', req.path, false, {
          targetUsername: username,
          error: String(_error),
        });
        throw _error;
      }
    },
  );

  static getPerformanceMetrics = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { username } = req.params;
      const authenticatedUser = req.user as AuthenticatedUser;
      logWithContext.api('get_performance_metrics', req.path, true, {
        targetUsername: username,
        requesterId: authenticatedUser?.id,
      });
      try {
        const user = await UserModel.findByLogin(username);
        if (!user) {
          throw createError.notFound('Utilisateur');
        }
        const latest = await databaseService.getLatestUserDataset(username);
        if (latest?.dataset?.analytics == null) {
          throw createError.notFound('Aucune analyse de performance trouvée');
        }
        const analytics = latest.dataset
          .analytics as unknown as import('@/types/analytics').AnalyticsOverview;
        const performance = analytics.performance;
        res.status(200).json({
          user: {
            username: user.login,
            name: user.name,
          },
          performance,
          metadata: {
            analyzedAt: latest.dataset.updatedAt,
            repositoriesCount: Array.isArray(latest.dataset.repositories)
              ? latest.dataset.repositories.length
              : 0,
          },
          timestamp: new Date().toISOString(),
        });
        return;
      } catch (_error: unknown) {
        logWithContext.api('get_performance_metrics', req.path, false, {
          targetUsername: username,
          error: String(_error),
        });
        throw _error;
      }
    },
  );

  static getLanguageAnalytics = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { username } = req.params;
      const authenticatedUser = req.user as AuthenticatedUser;
      logWithContext.api('get_language_analytics', req.path, true, {
        targetUsername: username,
        requesterId: authenticatedUser?.id,
      });
      try {
        const user = await UserModel.findByLogin(username);
        if (!user) {
          throw createError.notFound('Utilisateur');
        }
        const latest = await databaseService.getLatestUserDataset(username);
        if (latest?.dataset?.analytics == null) {
          throw createError.notFound('Aucune analyse de langages trouvée');
        }
        const languages = (
          latest.dataset
            .analytics as unknown as import('@/types/analytics').AnalyticsOverview
        ).languages;
        const repositories = Array.isArray(latest.repositories) && latest.repositories.length > 0 ? latest.repositories : [];
        res.status(200).json({
          user: {
            username: user.login,
            name: user.name,
          },
          languages: {
            primary: languages.primary,
            diversity: {
              _index:
                languages.distribution.length > 0
                  ? languages.distribution.length / repositories.length
                  : 0,
              totalLanguages: languages.distribution.length,
              description:
                languages.distribution.length > 10
                  ? 'Très diversifié'
                  : languages.distribution.length > 5
                    ? 'Diversifié'
                    : languages.distribution.length > 2
                      ? 'Modérément diversifié'
                      : 'Peu diversifié',
            },
            distribution: languages.distribution,
            trends: languages.trends,
            experience: {
              senior:
                languages.expertise.advanced.length +
                languages.expertise.expert.length,
              intermediate: languages.expertise.intermediate.length,
              beginner: languages.expertise.beginner.length,
            },
            recommendations: [], // LanguageAnalytics n'a pas recommendations, donc valeur par défaut
          },
          metadata: {
            analyzedAt: latest.dataset.updatedAt,
            repositoriesAnalyzed: Array.isArray(latest.dataset.repositories)
              ? latest.dataset.repositories.length
              : 0,
          },
          timestamp: new Date().toISOString(),
        });
        return;
      } catch (_error: unknown) {
        logWithContext.api('get_language_analytics', req.path, false, {
          targetUsername: username,
          error: String(_error),
        });
        throw _error;
      }
    },
  );

  static getActivityPatterns = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { username } = req.params;
      const authenticatedUser = req.user as AuthenticatedUser;
      logWithContext.api('get_activity_patterns', req.path, true, {
        targetUsername: username,
        requesterId: authenticatedUser?.id,
      });
      try {
        const user = await UserModel.findByLogin(username);
        if (!user) {
          throw createError.notFound('Utilisateur');
        }
        const latest = await databaseService.getLatestUserDataset(username);
        if (latest?.dataset?.analytics == null) {
          throw createError.notFound("Aucune analyse d'activité trouvée");
        }
        const activity = (
          latest.dataset
            .analytics as unknown as import('@/types/analytics').AnalyticsOverview
        ).activity;
        res.status(200).json({
          user: {
            username: user.login,
            name: user.name,
          },
          activity: {
            patterns: {
              hourly: activity.hourlyDistribution,
              daily: activity.dailyDistribution,
              monthly: activity.monthlyDistribution,
            },
            seasonality: activity.seasonality,
          },
          metadata: {
            analyzedAt: latest.dataset.updatedAt,
            timeRange: activity.seasonality != null
              ? activity.seasonality.mostActiveQuarter
              : undefined,
          },
          timestamp: new Date().toISOString(),
        });
        return;
      } catch (_error: unknown) {
        logWithContext.api('get_activity_patterns', req.path, false, {
          targetUsername: username,
          error: String(_error),
        });
        throw _error;
      }
    },
  );

  static getProductivityScore = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { username } = req.params;
      const authenticatedUser = req.user as AuthenticatedUser;
      logWithContext.api('get_productivity_score', req.path, true, {
        targetUsername: username,
        requesterId: authenticatedUser?.id,
      });
      try {
        const user = await UserModel.findByLogin(username);
        if (!user) {
          throw createError.notFound('Utilisateur');
        }
        const latest = await databaseService.getLatestUserDataset(username);
        if (latest?.dataset?.analytics == null) {
          throw createError.notFound('Aucune analyse de productivité trouvée');
        }
        const productivity = (
          latest.dataset
            .analytics as unknown as import('@/types/analytics').AnalyticsOverview
        ).productivity;
        res.status(200).json({
          user: {
            username: user.login,
            name: user.name,
          },
          productivity,
          metadata: {
            analyzedAt: latest.dataset.updatedAt,
            repositoriesCount: Array.isArray(latest.dataset.repositories)
              ? latest.dataset.repositories.length
              : 0,
          },
          timestamp: new Date().toISOString(),
        });
        return;
      } catch (_error: unknown) {
        logWithContext.api('get_productivity_score', req.path, false, {
          targetUsername: username,
          error: String(_error),
        });
        throw _error;
      }
    },
  );

  static getDevOpsMaturity = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { username } = req.params;
      const authenticatedUser = req.user as AuthenticatedUser;
      logWithContext.api('get_devops_maturity', req.path, true, {
        targetUsername: username,
        requesterId: authenticatedUser?.id,
      });
      try {
        const user = await UserModel.findByLogin(username);
        if (!user) {
          throw createError.notFound('Utilisateur');
        }
        const latest = await databaseService.getLatestUserDataset(username);
        if (latest?.dataset?.analytics == null) {
          throw createError.notFound('Aucune analyse DevOps trouvée');
        }
        const devops = (
          latest.dataset
            .analytics as unknown as import('@/types/analytics').AnalyticsOverview
        ).devops;
        res.status(200).json({
          user: {
            username: user.login,
            name: user.name,
          },
          devops,
          metadata: {
            analyzedAt: latest.dataset.updatedAt,
            repositoriesWithDevOps: 0,
          },
          timestamp: new Date().toISOString(),
        });
        return;
      } catch (_error: unknown) {
        logWithContext.api('get_devops_maturity', req.path, false, {
          targetUsername: username,
          error: String(_error),
        });
        throw _error;
      }
    },
  );
}

export default AnalyticsController;
