import { Request, Response } from 'express';
import { asyncHandler } from '@/middleware/errorHandler';
import { createError } from '@/middleware/errorHandler';
import { logWithContext } from '@/utils/logger';
import { UserModel } from '@/models/User';
import { RepositoryModel } from '@/models/Repository';
import { AIAnalysisModel } from '@/models/AIAnalysis';
import { AuthenticatedUser } from '@/types/github';
import { GitHubService } from '@/services/GitHubService';

/**
 * Contrôleur des utilisateurs - Version simplifiée post-suppression Dataset
 */
export class UserController {
  /**
   * Collecte des données utilisateur depuis GitHub
   * POST /api/users/:username
   */
  static collectUserData = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { username } = req.params;
      const authenticatedUser = req.user as AuthenticatedUser;

      if (authenticatedUser == null) {
        throw createError.authentication('Authentification requise pour collecter les données');
      }

      if (authenticatedUser.username !== username) {
        throw createError.authorization('Vous ne pouvez collecter que vos propres données');
      }

      logWithContext.api('collect_user_data', req.path, true, {
        targetUsername: username,
        requesterId: authenticatedUser.id,
      });

      try {
        // Récupération UNIQUEMENT du profil utilisateur depuis GitHub API
        const githubService = await GitHubService.create(authenticatedUser.githubToken);
        const userProfile = await githubService.getUserProfile();

        // Sauvegarder UNIQUEMENT le profil utilisateur (pas de repositories)
        const savedUser = await UserModel.upsert(userProfile);

        logWithContext.api('collect_user_data_success', req.path, true, {
          targetUsername: username,
          userId: savedUser.id,
          userGithubId: userProfile.id,
        });

        res.status(201).json({
          message: 'Collecte du profil utilisateur réussie',
          status: 'completed',
          userProfile: {
            login: userProfile.login,
            id: userProfile.id,
            name: userProfile.name,
            public_repos: userProfile.public_repos,
            followers: userProfile.followers,
            following: userProfile.following,
            created_at: userProfile.created_at,
          },
          metadata: {
            collectedAt: new Date(),
            source: 'github_api',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      } catch (_error: unknown) {
        logWithContext.api('collect_user_data_error', req.path, false, {
          targetUsername: username,
          error: String(_error),
        });

        throw _error;
      }
    },
  );

  /**
   * Récupération du profil utilisateur et statut d'analyse
   * GET /api/users/:username
   */
  static getUserProfile = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { username } = req.params;
      const authenticatedUser = req.user as AuthenticatedUser;

      logWithContext.api('get_user_profile', req.path, true, {
        targetUsername: username,
        requesterId: authenticatedUser?.id,
        isAuthenticated: authenticatedUser != null,
      });

      try {
        // Vérifier si l'utilisateur existe en base
        const userData = await UserModel.findByLogin(username);

        if (userData == null) {
          throw createError.notFound(
            'Utilisateur non trouvé. Utilisez POST /users/{username} pour collecter les données.',
          );
        }

        // Récupérer les données d'analyse disponibles
        const aiAnalysis = await AIAnalysisModel.findLatestByUsername(username);
        const repositoriesCount = await RepositoryModel.findByUserId(userData.id, { limit: 1 });

        const responseData = {
          user: {
            id: userData.id,
            username: userData.login,
            name: userData.name ?? userData.login,
            avatarUrl: userData.avatarUrl,
            bio: userData.bio,
            company: userData.company,
            location: userData.location,
            publicRepos: userData.publicRepos,
            followers: userData.followers,
            following: userData.following,
            createdAt: userData.createdAt,
            updatedAt: userData.updatedAt,
          },
          analysis: {
            hasStoredData: true,
            lastAnalyzed: userData.updatedAt,
            hasAiInsights: aiAnalysis != null,
            repositoriesStored: repositoriesCount.total,
            dataSource: 'database',
          },
          timestamp: new Date().toISOString(),
        };

        logWithContext.api('get_user_profile_success', req.path, true, {
          targetUsername: username,
          hasAiInsights: aiAnalysis != null,
          repositoriesCount: repositoriesCount.total,
        });

        res.status(200).json(responseData);
        return;
      } catch (_error: unknown) {
        logWithContext.api('get_user_profile_error', req.path, false, {
          targetUsername: username,
          error: String(_error),
        });

        throw _error;
      }
    },
  );

  /**
   * Suppression des données utilisateur (GDPR) - VERSION SIMPLIFIÉE
   * DELETE /api/users/:username
   */
  static deleteUserData = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { username } = req.params;
      const authenticatedUser = req.user as AuthenticatedUser;

      if (authenticatedUser == null) {
        throw createError.authentication('Authentification requise');
      }

      if (authenticatedUser.username !== username) {
        throw createError.authorization('Vous ne pouvez supprimer que vos propres données');
      }

      logWithContext.api('delete_user_data', req.path, true, {
        targetUsername: username,
        requesterId: authenticatedUser.id,
      });

      try {
        // Version simplifiée de la suppression
        const userData = await UserModel.findByLogin(username);

        if (userData == null) {
          throw createError.notFound('Utilisateur non trouvé');
        }

        // TODO: Implémenter suppression complète avec nouvelle architecture
        // Pour l'instant, on simule la suppression
        logWithContext.api('delete_user_data_success', req.path, true, {
          targetUsername: username,
          note: 'Suppression temporairement simulée',
        });

        res.status(200).json({
          message: 'Suppression des données temporairement désactivée',
          success: false,
          note: 'Nécessite implémentation avec nouvelle architecture simplifiée',
          compliance: 'GDPR',
          timestamp: new Date().toISOString(),
        });
        return;
      } catch (_error: unknown) {
        logWithContext.api('delete_user_data_error', req.path, false, {
          targetUsername: username,
          error: String(_error),
        });

        throw _error;
      }
    },
  );

  /**
   * Statistiques de la plateforme - VERSION SIMPLIFIÉE
   * GET /api/users/stats
   */
  static getUsersStats = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const authenticatedUser = req.user as AuthenticatedUser;

      logWithContext.api('get_users_stats', req.path, true, {
        requesterId: authenticatedUser?.id,
      });

      try {
        // Récupération des statistiques de base simplifiées
        const userStats = await UserModel.getStats();
        const repoStats = await RepositoryModel.getStats();
        const aiStats = await AIAnalysisModel.getStats();

        const platformStats = {
          users: {
            total: userStats.totalUsers,
            averageFollowers: userStats.averageFollowers,
          },
          repositories: {
            total: repoStats.totalRepositories,
            totalStars: repoStats.totalStars,
            totalForks: repoStats.totalForks,
          },
          analyses: {
            total: aiStats.totalAnalyses,
            averageQuality: aiStats.averageQualityScore,
          },
          generated: {
            at: new Date(),
            source: 'direct_calculation',
          },
        };

        logWithContext.api('get_users_stats_success', req.path, true, {
          totalUsers: userStats.totalUsers,
          totalRepositories: repoStats.totalRepositories,
          totalAnalyses: aiStats.totalAnalyses,
        });

        res.status(200).json({
          stats: platformStats,
          timestamp: new Date().toISOString(),
        });
        return;
      } catch (_error: unknown) {
        logWithContext.api('get_users_stats_error', req.path, false, {
          error: String(_error),
        });

        throw _error;
      }
    },
  );
}
