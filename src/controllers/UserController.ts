import { Request, Response } from 'express';
import { asyncHandler } from '@/middleware/errorHandler';
import { createError } from '@/middleware/errorHandler';
import { databaseService } from '@/services/DatabaseService';
import { logWithContext } from '@/utils/logger';
import {
  Repository as PrismaRepository,
  User as PrismaUser,
} from '@/generated/prisma';
import { UserModel } from '@/models/User';
import { AuthenticatedUser } from '@/types/github';

/**
 * Interface pour les paramètres de recherche
 */
interface UserSearchQuery {
  query?: string;
  location?: string;
  language?: string;
  minFollowers?: number;
  minRepos?: number;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}



/**
 * Contrôleur des utilisateurs
 */
export class UserController {
  /**
   * Récupération du profil d'un utilisateur
   * GET /api/users/:username
   */
  static getUserProfile = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { username } = req.params;
      const authenticatedUser = req.user as AuthenticatedUser;

      logWithContext.api('get_user_profile', req.path, true, {
        targetUsername: username,
        requesterId: authenticatedUser?.id,
      });

      try {
        // Récupération des données utilisateur
        const userData = await UserModel.findByLogin(username);

        if (!userData) {
          throw createError.notFound('Utilisateur');
        }

        // Récupération du dataset le plus récent
        const latestDataset =
          await databaseService.getLatestUserDataset(username);

        const responseData = {
          user: {
            id: userData.id,
            username: userData.login,
            name: userData.name,
            email: userData.email,
            avatarUrl: userData.avatarUrl,
            bio: userData.bio,
            company: userData.company,
            location: userData.location,
            blog: userData.blog,
            twitterUsername: userData.twitterUsername,
            publicRepos: userData.publicRepos,
            privateRepos: userData.privateRepos,
            ownedPrivateRepos: userData.ownedPrivateRepos,
            totalPrivateRepos: userData.totalPrivateRepos,
            publicGists: userData.publicGists,
            followers: userData.followers,
            following: userData.following,
            collaborators: userData.collaborators,
            hireable: userData.hireable,
            type: userData.type,
            siteAdmin: userData.siteAdmin,
            organizations: userData.organizations,
            createdAt: userData.createdAt,
            updatedAt: userData.updatedAt,
          },
          dataset: latestDataset
            ? {
              id: latestDataset.dataset.id,
              createdAt: latestDataset.dataset.createdAt,
              updatedAt: latestDataset.dataset.updatedAt,
              metadata: latestDataset.dataset.metadata,
              repositoriesCount: Array.isArray(
                latestDataset.dataset.repositories,
              )
                ? latestDataset.dataset.repositories.length
                : 0,
              hasAnalytics: latestDataset.dataset.analytics != null,
              hasAiInsights: latestDataset.dataset.aiInsights != null,
            }
            : null,
          timestamp: new Date().toISOString(),
        };

        logWithContext.api('get_user_profile', req.path, true, {
          targetUsername: username,
          hasDataset: !!latestDataset,
        });

        res.status(200).json(responseData);
        return;
      } catch (_error: unknown) {
        logWithContext.api('get_user_profile', req.path, false, {
          targetUsername: username,
          error: String(_error),
        });

        throw _error;
      }
    },
  );

  /**
   * Recherche d'utilisateurs
   * GET /api/users/search
   */
  static searchUsers = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const searchParams = req.query as unknown as UserSearchQuery;
      const authenticatedUser = req.user as AuthenticatedUser;

      logWithContext.api('search_users', req.path, true, {
        searchQuery: searchParams.query,
        requesterId: authenticatedUser?.id,
        filters: {
          location: searchParams.location,
          language: searchParams.language,
          minFollowers: searchParams.minFollowers,
          minRepos: searchParams.minRepos,
        },
      });

      try {
        // Construction des filtres de recherche
        const searchFilters: Record<string, unknown> = {};

        if (searchParams.query != null && searchParams.query !== '') {
          searchFilters.$or = [
            { login: { $regex: searchParams.query, $options: 'i' } },
            { name: { $regex: searchParams.query, $options: 'i' } },
            { bio: { $regex: searchParams.query, $options: 'i' } },
          ];
        }

        if (searchParams.location != null && searchParams.location !== '') {
          searchFilters.location = {
            $regex: searchParams.location,
            $options: 'i',
          };
        }

        if (searchParams.minFollowers !== undefined) {
          searchFilters.followers = { $gte: searchParams.minFollowers };
        }

        // Exécution de la recherche avec pagination
        const result = await databaseService.searchUsersWithStats({
          search: searchParams.query,
          location: searchParams.location,
          minFollowers: searchParams.minFollowers,
          limit: searchParams.limit,
          offset: (searchParams.page - 1) * searchParams.limit,
        });

        logWithContext.api('search_users', req.path, true, {
          resultsCount: result.users.length,
          totalCount: result.total,
          searchQuery: searchParams.query,
        });

        res.status(200).json({
          users: result.users.map((user: PrismaUser) => ({
            id: user.id,
            username: user.login,
            name: user.name,
            avatarUrl: user.avatarUrl,
            bio: user.bio,
            company: user.company,
            location: user.location,
            publicRepos: user.publicRepos,
            followers: user.followers,
            following: user.following,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
          })),
          pagination: {
            page: searchParams.page,
            limit: searchParams.limit,
            totalCount: result.total,
            totalPages: Math.ceil(result.total / searchParams.limit),
            hasNextPage: searchParams.page * searchParams.limit < result.total,
            hasPreviousPage: searchParams.page > 1,
          },
          filters: {
            query: searchParams.query,
            location: searchParams.location,
            language: searchParams.language,
            minFollowers: searchParams.minFollowers,
            minRepos: searchParams.minRepos,
          },
          timestamp: new Date().toISOString(),
        });
        return;
      } catch (_error: unknown) {
        logWithContext.api('search_users', req.path, false, {
          error: String(_error),
          searchQuery: searchParams.query,
        });

        throw _error;
      }
    },
  );

  /**
   * Récupération des repositories d'un utilisateur
   * GET /api/users/:username/repositories
   */
  static getUserRepositories = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { username } = req.params;
      const { page = 1, limit = 20 } = req.query;
      const authenticatedUser = req.user as AuthenticatedUser;

      logWithContext.api('get_user_repositories', req.path, true, {
        targetUsername: username,
        requesterId: authenticatedUser?.id,
        pagination: { page: Number(page), limit: Number(limit) },
      });

      try {
        // Vérification de l'existence de l'utilisateur
        const userData = await UserModel.findByLogin(username);

        if (!userData) {
          throw createError.notFound('Utilisateur');
        }

        // Récupération des repositories avec pagination
        const result = await databaseService.searchRepositoriesWithUserInfo({
          search: userData.login,
          limit: Number(limit),
          offset: (Number(page) - 1) * Number(limit),
        });

        logWithContext.api('get_user_repositories', req.path, true, {
          targetUsername: username,
          repositoriesCount: result.repositories.length,
          totalCount: result.total,
        });

        res.status(200).json({
          repositories: result.repositories.map((repo: PrismaRepository) => ({
            id: repo.id,
            nameWithOwner: repo.nameWithOwner,
            name: repo.name,
            description: repo.description,
            isPrivate: repo.isPrivate,
            isArchived: repo.isArchived,
            isFork: repo.isFork,
            isTemplate: repo.isTemplate,
            stargazerCount: repo.stargazerCount,
            forkCount: repo.forkCount,
            watchersCount: repo.watchersCount,
            openIssuesCount: repo.openIssuesCount,
            primaryLanguage: repo.primaryLanguage,
            languages: repo.languages,
            topics: repo.topics,
            license: repo.license,
            homepageUrl: repo.homepageUrl,
            pushedAt: repo.pushedAt,
            createdAt: repo.createdAt,
            updatedAt: repo.updatedAt,
            hasIssuesEnabled: repo.hasIssuesEnabled,
            hasProjectsEnabled: repo.hasProjectsEnabled,
            hasWikiEnabled: repo.hasWikiEnabled,
          })),
          user: {
            id: userData.id,
            username: userData.login,
            name: userData.name,
            avatarUrl: userData.avatarUrl,
          },
          pagination: {
            page: Number(page),
            limit: Number(limit),
            totalCount: result.total,
            totalPages: Math.ceil(result.total / Number(limit)),
            hasNextPage: Number(page) * Number(limit) < result.total,
            hasPreviousPage: Number(page) > 1,
          },
          timestamp: new Date().toISOString(),
        });
        return;
      } catch (_error: unknown) {
        logWithContext.api('get_user_repositories', req.path, false, {
          targetUsername: username,
          error: String(_error),
        });

        throw _error;
      }
    },
  );

  /**
   * Statut de l'analyse d'un utilisateur
   * GET /api/users/:username/status
   */
  static getUserAnalysisStatus = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { username } = req.params;
      const authenticatedUser = req.user as AuthenticatedUser;

      logWithContext.api('get_user_analysis_status', req.path, true, {
        targetUsername: username,
        requesterId: authenticatedUser?.id,
      });

      try {
        // Vérification de l'existence de l'utilisateur
        const userData = await UserModel.findByLogin(username);

        if (!userData) {
          throw createError.notFound('Utilisateur');
        }

        // Récupération du dataset le plus récent
        const latestDataset =
          await databaseService.getLatestUserDataset(username);

        // Vérification de la fraîcheur des analyses
        const analysisAge = await databaseService.areUserAnalyticsUpToDate(
          userData.id,
        );

        const responseData = {
          user: {
            id: userData.id,
            username: userData.login,
            name: userData.name,
            avatarUrl: userData.avatarUrl,
          },
          analysis: {
            hasDataset: !!latestDataset,
            datasetId: latestDataset?.dataset.id,
            lastAnalyzed: latestDataset?.dataset.updatedAt,
            hasAnalytics: latestDataset?.dataset.analytics != null,
            hasAiInsights: latestDataset?.dataset.aiInsights != null,
            isUpToDate: analysisAge.analyticsUpToDate,
            lastUpdate: analysisAge.lastUpdate,
            needsUpdate: !analysisAge.analyticsUpToDate,
          },
          repositories: {
            total: latestDataset?.dataset.repositories?.length ?? 0,
            analyzed: latestDataset
              ? Array.isArray(latestDataset.dataset.repositories)
                ? latestDataset.dataset.repositories.length
                : 0
              : 0,
          },
          metadata: latestDataset?.dataset.metadata ?? null,
          timestamp: new Date().toISOString(),
        };

        logWithContext.api('get_user_analysis_status', req.path, true, {
          targetUsername: username,
          hasDataset: !!latestDataset,
          isUpToDate: analysisAge.analyticsUpToDate,
          lastUpdate: analysisAge.lastUpdate,
        });

        res.status(200).json(responseData);
        return;
      } catch (_error: unknown) {
        logWithContext.api('get_user_analysis_status', req.path, false, {
          targetUsername: username,
          error: String(_error),
        });

        throw _error;
      }
    },
  );

  /**
   * Suppression des données utilisateur (GDPR)
   * DELETE /api/users/:username
   */
  static deleteUserData = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { username } = req.params;
      const authenticatedUser = req.user as AuthenticatedUser;

      // Vérification que l'utilisateur ne peut supprimer que ses propres données
      if (authenticatedUser.username !== username) {
        throw createError.authorization(
          'Vous ne pouvez supprimer que vos propres données',
        );
      }

      logWithContext.api('delete_user_data', req.path, true, {
        targetUsername: username,
        requesterId: authenticatedUser.id,
      });

      try {
        // Suppression complète des données utilisateur
        const deletionResult =
          await databaseService.deleteAllUserData(username);

        logWithContext.api('delete_user_data', req.path, true, {
          targetUsername: username,
          deletedUsers: deletionResult.deletedUsers,
          deletedRepositories: deletionResult.deletedRepositories,
          deletedDatasets: deletionResult.deletedDatasets,
        });

        res.status(200).json({
          message: 'Données utilisateur supprimées avec succès',
          deleted: {
            user: deletionResult.deletedUsers,
            repositories: deletionResult.deletedRepositories,
            datasets: deletionResult.deletedDatasets,
          },
          compliance: 'GDPR',
          timestamp: new Date().toISOString(),
        });
        return;
      } catch (_error: unknown) {
        logWithContext.api('delete_user_data', req.path, false, {
          targetUsername: username,
          error: String(_error),
        });

        throw _error;
      }
    },
  );

  /**
   * Statistiques globales des utilisateurs
   * GET /api/users/stats
   */
  static getUsersStats = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const authenticatedUser = req.user as AuthenticatedUser;

      logWithContext.api('get_users_stats', req.path, true, {
        requesterId: authenticatedUser?.id,
      });

      try {
        const stats = await databaseService.getPlatformStats();

        res.status(200).json({
          users: {
            total: stats.users.total,
            withDatasets: stats.users.withDatasets,
            averageFollowers: stats.users.averageFollowers,
            topLanguages: stats.users.topLanguages,
          },
          activity: {
            recentAnalyses: stats.datasets.recentActivity.last24h,
            totalAnalyses: stats.datasets.total,
          },
          timestamp: new Date().toISOString(),
        });
        return;
      } catch (_error: unknown) {
        logWithContext.api('get_users_stats', req.path, false, {
          error: String(_error),
        });

        throw _error;
      }
    },
  );
}

export default UserController;
