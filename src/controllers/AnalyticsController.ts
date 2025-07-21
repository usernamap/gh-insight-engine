import { Request, Response } from 'express';
import { asyncHandler } from '@/middleware/errorHandler';
import { createError } from '@/middleware/errorHandler';
import { databaseService } from '@/services/DatabaseService';
import { analyticsService } from '@/services/AnalyticsService';
import { githubService } from '@/services/GitHubService';
import { logWithContext } from '@/utils/logger';

/**
 * Interface pour les paramètres d'analyse
 */
interface AnalysisQuery {
    includePrivate: boolean;
    forceRefresh: boolean;
    maxAge: number;
}

/**
 * Interface pour l'utilisateur authentifié
 */
interface AuthenticatedUser {
    id: string;
    username: string;
    githubToken: string;
}

/**
 * Contrôleur d'analytics (métriques quantitatives)
 */
export class AnalyticsController {
  /**
     * Lancement d'une analyse complète d'un utilisateur
     * POST /api/users/:username/analyze
     */
  static analyzeUser = asyncHandler(async (req: Request, _res: Response): Promise<void> => {
    const { username } = req.params;
    const analysisParams = req.query as AnalysisQuery;
    const authenticatedUser = req.user as AuthenticatedUser;

    if (!authenticatedUser?.githubToken) {
      throw createError.authentication('Token GitHub requis pour l\'analyse');
    }

    // Vérification des permissions : seul le propriétaire peut analyser son profil
    if (authenticatedUser.username !== username) {
      throw createError.authorization('Vous ne pouvez analyser que votre propre profil');
    }

    logWithContext.api('analyze_user_start', req.path, true, {
      targetUsername: username,
      requesterId: authenticatedUser.id,
      includePrivate: analysisParams.includePrivate,
      forceRefresh: analysisParams.forceRefresh,
    });

    try {
      // 1. Vérification de la fraîcheur des analyses existantes
      const existingUser = await databaseService.getUser(username);
      if (!existingUser) {
        throw createError.notFound('Utilisateur');
      }

      const analysisFreshness = await databaseService.checkAnalysisFreshness(existingUser.id);

      if (analysisFreshness.isUpToDate && !analysisParams.forceRefresh) {
        const latestDataset = await databaseService.getLatestDatasetForUser(existingUser.id);

        logWithContext.api('analyze_user_cached', req.path, true, {
          targetUsername: username,
          ageHours: analysisFreshness.ageHours,
        });

        res.status(200).json({
          message: 'Analyse déjà à jour',
          analysis: {
            cached: true,
            ageHours: analysisFreshness.ageHours,
            lastAnalyzed: latestDataset?.updatedAt,
          },
          dataset: {
            id: latestDataset?.id,
            hasAnalytics: !!latestDataset?.analytics,
            repositoriesCount: Array.isArray(latestDataset?.repositories) ? latestDataset.repositories.length : 0,
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // 2. Récupération des données depuis GitHub API
      logWithContext.github('fetch_user_data_start', username, true);

      // Récupération du profil utilisateur
      const userProfile = await githubService.getUserProfile(username, authenticatedUser.githubToken);
      if (!userProfile) {
        throw createError.notFound('Profil utilisateur GitHub');
      }

      // Récupération des repositories
      const repositories = await githubService.getUserRepos(
        username,
        authenticatedUser.githubToken,
        analysisParams.includePrivate,
      );

      logWithContext.github('fetch_user_data_complete', username, true, {
        repositoriesCount: repositories.length,
        includePrivate: analysisParams.includePrivate,
      });

      // 3. Sauvegarde des données brutes
      const savedDataset = await databaseService.saveUserDataset({
        userProfile,
        repositories,
        metadata: {
          datasetId: `dataset_${username}_${Date.now()}`,
          collectionDate: new Date(),
          githubUsername: username,
          fullName: userProfile.name,
          scope: analysisParams.includePrivate ? 'user_repositories' : 'public_repositories',
          totalRepositories: repositories.length,
          analysisVersion: '1.0.0',
          dataVersion: '1.0.0',
          settings: {
            includePrivateRepos: analysisParams.includePrivate,
            includeForkedRepos: true,
            includeArchivedRepos: false,
            analysisDepth: 'standard',
            aiAnalysisEnabled: true,
          },
        },
      });

      // 4. Génération des analytics quantitatives
      logWithContext.analytics('generate_analytics_start', username, true);

      const analyticsOverview = await analyticsService.generateAnalyticsOverview(
        userProfile,
        repositories,
      );

      // Sauvegarde des analytics
      await databaseService.updateDatasetAnalytics(savedDataset.id, analyticsOverview);

      logWithContext.analytics('generate_analytics_complete', username, true, {
        datasetId: savedDataset.id,
        performanceScore: analyticsOverview.performance.overallScore,
        productivityScore: analyticsOverview.productivity.overallScore,
        languagesCount: analyticsOverview.languages.languages.length,
      });

      res.status(200).json({
        message: 'Analyse terminée avec succès',
        analysis: {
          completed: true,
          duration: Date.now() - new Date(savedDataset.createdAt).getTime(),
          fresh: true,
        },
        dataset: {
          id: savedDataset.id,
          createdAt: savedDataset.createdAt,
          repositoriesCount: repositories.length,
          hasAnalytics: true,
          hasAiInsights: false, // Sera mis à jour par InsightsController
        },
        _analytics: {
          performance: {
            overallScore: analyticsOverview.performance.overallScore,
            codeQuality: analyticsOverview.performance.codeQualityScore,
            consistency: analyticsOverview.performance.consistencyScore,
          },
          productivity: {
            overallScore: analyticsOverview.productivity.overallScore,
            commitFrequency: analyticsOverview.productivity.commitFrequency,
            averageCommitsPerRepo: analyticsOverview.productivity.averageCommitsPerRepo,
          },
          languages: {
            primaryLanguage: analyticsOverview.languages.primaryLanguage,
            totalLanguages: analyticsOverview.languages.languages.length,
            diversity: analyticsOverview.languages.diversityIndex,
          },
        },
        timestamp: new Date().toISOString(),
      });

    } catch (_error: unknown) {
      logWithContext.api('analyze_user_failed', req.path, false, {
        targetUsername: username,
        _error: error.message,
        errorType: error.constructor.name,
      });

      throw error;
    }
  });

  /**
     * Vue d'ensemble des métriques d'un utilisateur
     * GET /api/analytics/:username/overview
     */
  static getAnalyticsOverview = asyncHandler(async (req: Request, _res: Response): Promise<void> => {
    const { username } = req.params;
    const authenticatedUser = (req as any).user as AuthenticatedUser;

    logWithContext.api('get_analytics_overview', req.path, true, {
      targetUsername: username,
      requesterId: authenticatedUser?.id,
    });

    try {
      // Récupération de l'utilisateur
      const userData = await databaseService.getUser(username);
      if (!userData) {
        throw createError.notFound('Utilisateur');
      }

      // Récupération du dataset avec analytics
      const latestDataset = await databaseService.getLatestDatasetForUser(userData.id);
      if (!latestDataset?.analytics) {
        throw createError.notFound('Aucune analyse trouvée pour cet utilisateur');
      }

      const analytics = latestDataset.analytics as any; // Cast pour éviter les erreurs de type

      logWithContext.api('get_analytics_overview', req.path, true, {
        targetUsername: username,
        datasetAge: Date.now() - new Date(latestDataset.updatedAt).getTime(),
      });

      res.status(200).json({
        user: {
          username: userData.login,
          name: userData.name,
          avatarUrl: userData.avatarUrl,
        },
        _analytics: {
          performance: analytics.performance,
          productivity: analytics.productivity,
          languages: analytics.languages,
          activity: analytics.activity,
          complexity: analytics.complexity,
          devops: analytics.devops,
          collaboration: analytics.collaboration,
        },
        metadata: {
          datasetId: latestDataset.id,
          analyzedAt: latestDataset.updatedAt,
          repositoriesAnalyzed: Array.isArray(latestDataset.repositories) ? latestDataset.repositories.length : 0,
          settings: latestDataset.metadata.settings,
        },
        timestamp: new Date().toISOString(),
      });

    } catch (_error: unknown) {
      logWithContext.api('get_analytics_overview', req.path, false, {
        targetUsername: username,
        _error: error.message,
      });

      throw error;
    }
  });

  /**
     * Métriques de performance détaillées
     * GET /api/analytics/:username/performance
     */
  static getPerformanceMetrics = asyncHandler(async (req: Request, _res: Response): Promise<void> => {
    const { username } = req.params;
    const authenticatedUser = (req as any).user as AuthenticatedUser;

    logWithContext.api('get_performance_metrics', req.path, true, {
      targetUsername: username,
      requesterId: authenticatedUser?.id,
    });

    try {
      const userData = await databaseService.getUser(username);
      if (!userData) {
        throw createError.notFound('Utilisateur');
      }

      const latestDataset = await databaseService.getLatestDatasetForUser(userData.id);
      if (!latestDataset?.analytics) {
        throw createError.notFound('Aucune analyse de performance trouvée');
      }

      const analytics = latestDataset.analytics as any;
      const performance = analytics.performance;

      res.status(200).json({
        user: {
          username: userData.login,
          name: userData.name,
        },
        performance: {
          overall: {
            score: performance.overallScore,
            grade: performance.overallScore >= 80 ? 'A' :
              performance.overallScore >= 60 ? 'B' :
                performance.overallScore >= 40 ? 'C' : 'D',
          },
          codeQuality: {
            score: performance.codeQualityScore,
            metrics: {
              documentationCoverage: performance.documentationCoverage,
              testCoverage: performance.testCoverage ?? 0,
              codeReusability: performance.codeReusability,
            },
          },
          consistency: {
            score: performance.consistencyScore,
            metrics: {
              commitMessageQuality: performance.commitMessageQuality,
              namingConsistency: performance.namingConsistency,
              projectStructure: performance.projectStructureScore,
            },
          },
          efficiency: {
            score: performance.efficiencyScore,
            metrics: {
              averageCommitSize: performance.averageCommitSize,
              issueResolutionTime: performance.issueResolutionTime ?? 0,
              pullRequestEfficiency: performance.pullRequestEfficiency ?? 0,
            },
          },
        },
        metadata: {
          analyzedAt: latestDataset.updatedAt,
          repositoriesCount: Array.isArray(latestDataset.repositories) ? latestDataset.repositories.length : 0,
        },
        timestamp: new Date().toISOString(),
      });

    } catch (_error: unknown) {
      logWithContext.api('get_performance_metrics', req.path, false, {
        targetUsername: username,
        _error: error.message,
      });

      throw error;
    }
  });

  /**
     * Analyse des langages de programmation
     * GET /api/analytics/:username/languages
     */
  static getLanguageAnalytics = asyncHandler(async (req: Request, _res: Response): Promise<void> => {
    const { username } = req.params;
    const authenticatedUser = (req as any).user as AuthenticatedUser;

    logWithContext.api('get_language_analytics', req.path, true, {
      targetUsername: username,
      requesterId: authenticatedUser?.id,
    });

    try {
      const userData = await databaseService.getUser(username);
      if (!userData) {
        throw createError.notFound('Utilisateur');
      }

      const latestDataset = await databaseService.getLatestDatasetForUser(userData.id);
      if (!latestDataset?.analytics) {
        throw createError.notFound('Aucune analyse de langages trouvée');
      }

      const analytics = latestDataset.analytics as any;
      const languages = analytics.languages;

      res.status(200).json({
        user: {
          username: userData.login,
          name: userData.name,
        },
        languages: {
          primary: languages.primaryLanguage,
          diversity: {
            _index: languages.diversityIndex,
            totalLanguages: languages.languages.length,
            description: languages.diversityIndex > 0.7 ? 'Très diversifié' :
              languages.diversityIndex > 0.5 ? 'Diversifié' :
                languages.diversityIndex > 0.3 ? 'Modérément diversifié' : 'Peu diversifié',
          },
          distribution: languages.languages,
          trends: languages.trendAnalysis,
          experience: {
            senior: languages.languages.filter((l: unknown) => l.experienceLevel === 'Senior').length,
            intermediate: languages.languages.filter((l: unknown) => l.experienceLevel === 'Intermediate').length,
            beginner: languages.languages.filter((l: unknown) => l.experienceLevel === 'Beginner').length,
          },
          recommendations: languages.recommendations,
        },
        metadata: {
          analyzedAt: latestDataset.updatedAt,
          repositoriesAnalyzed: Array.isArray(latestDataset.repositories) ? latestDataset.repositories.length : 0,
        },
        timestamp: new Date().toISOString(),
      });

    } catch (_error: unknown) {
      logWithContext.api('get_language_analytics', req.path, false, {
        targetUsername: username,
        _error: error.message,
      });

      throw error;
    }
  });

  /**
     * Patterns d'activité
     * GET /api/analytics/:username/activity
     */
  static getActivityPatterns = asyncHandler(async (req: Request, _res: Response): Promise<void> => {
    const { username } = req.params;
    const authenticatedUser = (req as any).user as AuthenticatedUser;

    logWithContext.api('get_activity_patterns', req.path, true, {
      targetUsername: username,
      requesterId: authenticatedUser?.id,
    });

    try {
      const userData = await databaseService.getUser(username);
      if (!userData) {
        throw createError.notFound('Utilisateur');
      }

      const latestDataset = await databaseService.getLatestDatasetForUser(userData.id);
      if (!latestDataset?.analytics) {
        throw createError.notFound('Aucune analyse d\'activité trouvée');
      }

      const analytics = latestDataset.analytics as any;
      const activity = analytics.activity;

      res.status(200).json({
        user: {
          username: userData.login,
          name: userData.name,
        },
        activity: {
          patterns: {
            weeklyPattern: activity.weeklyPattern,
            monthlyPattern: activity.monthlyPattern,
            yearlyPattern: activity.yearlyTrend,
          },
          peaks: {
            mostActiveDay: activity.peakActivityDay,
            mostActiveMonth: activity.peakActivityMonth,
            averageDailyCommits: activity.averageDailyCommits,
          },
          consistency: {
            score: activity.consistencyScore,
            streaks: {
              longest: activity.longestStreak,
              current: activity.currentStreak,
            },
            regularity: activity.commitRegularity,
          },
          seasonal: {
            trends: activity.seasonalTrends,
            preferences: activity.workingHoursPattern,
          },
        },
        metadata: {
          analyzedAt: latestDataset.updatedAt,
          timeRange: activity.analysisTimeRange,
        },
        timestamp: new Date().toISOString(),
      });

    } catch (_error: unknown) {
      logWithContext.api('get_activity_patterns', req.path, false, {
        targetUsername: username,
        _error: error.message,
      });

      throw error;
    }
  });

  /**
     * Score de productivité
     * GET /api/analytics/:username/productivity
     */
  static getProductivityScore = asyncHandler(async (req: Request, _res: Response): Promise<void> => {
    const { username } = req.params;
    const authenticatedUser = (req as any).user as AuthenticatedUser;

    logWithContext.api('get_productivity_score', req.path, true, {
      targetUsername: username,
      requesterId: authenticatedUser?.id,
    });

    try {
      const userData = await databaseService.getUser(username);
      if (!userData) {
        throw createError.notFound('Utilisateur');
      }

      const latestDataset = await databaseService.getLatestDatasetForUser(userData.id);
      if (!latestDataset?.analytics) {
        throw createError.notFound('Aucune analyse de productivité trouvée');
      }

      const analytics = latestDataset.analytics as any;
      const productivity = analytics.productivity;

      res.status(200).json({
        user: {
          username: userData.login,
          name: userData.name,
        },
        productivity: {
          overall: {
            score: productivity.overallScore,
            level: productivity.overallScore >= 80 ? 'Très élevée' :
              productivity.overallScore >= 60 ? 'Élevée' :
                productivity.overallScore >= 40 ? 'Modérée' : 'Faible',
          },
          commits: {
            frequency: productivity.commitFrequency,
            averagePerRepo: productivity.averageCommitsPerRepo,
            averagePerWeek: productivity.averageCommitsPerWeek,
            consistency: productivity.commitConsistency,
          },
          projects: {
            activeProjects: productivity.activeProjects,
            completedProjects: productivity.completedProjects,
            averageProjectDuration: productivity.averageProjectDuration,
            multiProjectBalance: productivity.multiProjectBalance,
          },
          impact: {
            codeImpact: productivity.codeImpact,
            communityImpact: productivity.communityImpact,
            innovationIndex: productivity.innovationIndex,
          },
          efficiency: {
            outputQuality: productivity.outputQuality,
            deliverySpeed: productivity.deliverySpeed,
            technicalDebt: productivity.technicalDebt,
          },
        },
        metadata: {
          analyzedAt: latestDataset.updatedAt,
          repositoriesCount: Array.isArray(latestDataset.repositories) ? latestDataset.repositories.length : 0,
        },
        timestamp: new Date().toISOString(),
      });

    } catch (_error: unknown) {
      logWithContext.api('get_productivity_score', req.path, false, {
        targetUsername: username,
        _error: error.message,
      });

      throw error;
    }
  });

  /**
     * Maturité DevOps
     * GET /api/analytics/:username/devops
     */
  static getDevOpsMaturity = asyncHandler(async (req: Request, _res: Response): Promise<void> => {
    const { username } = req.params;
    const authenticatedUser = (req as any).user as AuthenticatedUser;

    logWithContext.api('get_devops_maturity', req.path, true, {
      targetUsername: username,
      requesterId: authenticatedUser?.id,
    });

    try {
      const userData = await databaseService.getUser(username);
      if (!userData) {
        throw createError.notFound('Utilisateur');
      }

      const latestDataset = await databaseService.getLatestDatasetForUser(userData.id);
      if (!latestDataset?.analytics) {
        throw createError.notFound('Aucune analyse DevOps trouvée');
      }

      const analytics = latestDataset.analytics as any;
      const devops = analytics.devops;

      res.status(200).json({
        user: {
          username: userData.login,
          name: userData.name,
        },
        devops: {
          maturity: {
            overall: devops.maturityLevel,
            score: devops.overallScore,
          },
          cicd: {
            adoption: devops.cicdAdoption,
            sophistication: devops.cicdSophistication,
            automation: devops.automationLevel,
          },
          security: {
            score: devops.securityScore,
            practices: devops.securityPractices,
            vulnerabilities: devops.vulnerabilityManagement,
          },
          monitoring: {
            level: devops.monitoringLevel,
            practices: devops.monitoringPractices,
          },
          documentation: {
            coverage: devops.documentationCoverage,
            quality: devops.documentationQuality,
          },
          collaboration: {
            practices: devops.collaborationPractices,
            toolsUsage: devops.toolsUsage,
          },
        },
        recommendations: devops.recommendations,
        metadata: {
          analyzedAt: latestDataset.updatedAt,
          repositoriesWithDevOps: devops.repositoriesWithDevOpsCount,
        },
        timestamp: new Date().toISOString(),
      });

    } catch (_error: unknown) {
      logWithContext.api('get_devops_maturity', req.path, false, {
        targetUsername: username,
        _error: error.message,
      });

      throw error;
    }
  });
}

export default AnalyticsController;
