import { Request, Response } from 'express';
import { asyncHandler } from '@/middleware/errorHandler';
import { createError } from '@/middleware/errorHandler';
import { databaseService } from '@/services/DatabaseService';
import { logWithContext } from '@/utils/logger';

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
 * Interface pour l'utilisateur authentifié
 */
interface AuthenticatedUser {
  id: string;
  username: string;
  githubToken: string;
}

/**
 * Contrôleur des utilisateurs
 */
export class UserController {
  /**
   * Récupération du profil d'un utilisateur
   * GET /api/users/:username
   */
  static getUserProfile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { username } = req.params;
    const authenticatedUser = (req as any).user as AuthenticatedUser;

    logWithContext.api('get_user_profile', req.path, true, {
      targetUsername: username,
      requesterId: authenticatedUser?.id,
    });

    try {
      // Récupération des données utilisateur
      const userData = await databaseService.getUser(username);

      if (!userData) {
        throw createError.notFound('Utilisateur');
      }

      // Récupération du dataset le plus récent
      const latestDataset = await databaseService.getLatestDatasetForUser(userData.id);

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
        dataset: latestDataset ? {
          id: latestDataset.id,
          createdAt: latestDataset.createdAt,
          updatedAt: latestDataset.updatedAt,
          metadata: latestDataset.metadata,
          repositoriesCount: Array.isArray(latestDataset.repositories) ? latestDataset.repositories.length : 0,
          hasAnalytics: !!latestDataset.analytics,
          hasAiInsights: !!latestDataset.aiInsights,
        } : null,
        timestamp: new Date().toISOString(),
      };

      logWithContext.api('get_user_profile', req.path, true, {
        targetUsername: username,
        hasDataset: !!latestDataset,
      });

      res.status(200).json(responseData);

    } catch (error: any) {
      logWithContext.api('get_user_profile', req.path, false, {
        targetUsername: username,
        error: error.message,
      });

      throw error;
    }
  });

  /**
   * Recherche d'utilisateurs
   * GET /api/users/search
   */
  static searchUsers = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const searchParams = req.query as unknown as UserSearchQuery;
    const authenticatedUser = (req as any).user as AuthenticatedUser;

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
      const searchFilters: any = {};

      if (searchParams.query) {
        searchFilters.$or = [
          { login: { $regex: searchParams.query, $options: 'i' } },
          { name: { $regex: searchParams.query, $options: 'i' } },
          { bio: { $regex: searchParams.query, $options: 'i' } },
        ];
      }

      if (searchParams.location) {
        searchFilters.location = { $regex: searchParams.location, $options: 'i' };
      }

      if (searchParams.minFollowers !== undefined) {
        searchFilters.followers = { $gte: searchParams.minFollowers };
      }

      if (searchParams.minRepos !== undefined) {
        searchFilters.publicRepos = { $gte: searchParams.minRepos };
      }

      // Exécution de la recherche avec pagination
      const result = await databaseService.searchUsers({
        filters: searchFilters,
        page: searchParams.page,
        limit: searchParams.limit,
        sortBy: searchParams.sortBy,
        sortOrder: searchParams.sortOrder,
      });

      logWithContext.api('search_users', req.path, true, {
        resultsCount: result.users.length,
        totalCount: result.totalCount,
        searchQuery: searchParams.query,
      });

      res.status(200).json({
        users: result.users.map(user => ({
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
          totalCount: result.totalCount,
          totalPages: Math.ceil(result.totalCount / searchParams.limit),
          hasNextPage: searchParams.page * searchParams.limit < result.totalCount,
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

    } catch (error: any) {
      logWithContext.api('search_users', req.path, false, {
        error: error.message,
        searchQuery: searchParams.query,
      });

      throw error;
    }
  });

  /**
   * Récupération des repositories d'un utilisateur
   * GET /api/users/:username/repositories
   */
  static getUserRepositories = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { username } = req.params;
    const { page = 1, limit = 20, sortBy = 'updatedAt', sortOrder = 'desc' } = req.query;
    const authenticatedUser = (req as any).user as AuthenticatedUser;

    logWithContext.api('get_user_repositories', req.path, true, {
      targetUsername: username,
      requesterId: authenticatedUser?.id,
      pagination: { page: Number(page), limit: Number(limit) },
    });

    try {
      // Vérification de l'existence de l'utilisateur
      const userData = await databaseService.getUser(username);

      if (!userData) {
        throw createError.notFound('Utilisateur');
      }

      // Récupération des repositories avec pagination
      const result = await databaseService.searchRepositories({
        filters: { userId: userData.id },
        page: Number(page),
        limit: Number(limit),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
      });

      logWithContext.api('get_user_repositories', req.path, true, {
        targetUsername: username,
        repositoriesCount: result.repositories.length,
        totalCount: result.totalCount,
      });

      res.status(200).json({
        repositories: result.repositories.map(repo => ({
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
          totalCount: result.totalCount,
          totalPages: Math.ceil(result.totalCount / Number(limit)),
          hasNextPage: Number(page) * Number(limit) < result.totalCount,
          hasPreviousPage: Number(page) > 1,
        },
        timestamp: new Date().toISOString(),
      });

    } catch (error: any) {
      logWithContext.api('get_user_repositories', req.path, false, {
        targetUsername: username,
        error: error.message,
      });

      throw error;
    }
  });

  /**
   * Statut de l'analyse d'un utilisateur
   * GET /api/users/:username/status
   */
  static getUserAnalysisStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { username } = req.params;
    const authenticatedUser = (req as any).user as AuthenticatedUser;

    logWithContext.api('get_user_analysis_status', req.path, true, {
      targetUsername: username,
      requesterId: authenticatedUser?.id,
    });

    try {
      // Vérification de l'existence de l'utilisateur
      const userData = await databaseService.getUser(username);

      if (!userData) {
        throw createError.notFound('Utilisateur');
      }

      // Récupération du dataset le plus récent
      const latestDataset = await databaseService.getLatestDatasetForUser(userData.id);

      // Vérification de la fraîcheur des analyses
      const analysisAge = await databaseService.checkAnalysisFreshness(userData.id);

      const responseData = {
        user: {
          id: userData.id,
          username: userData.login,
          name: userData.name,
          avatarUrl: userData.avatarUrl,
        },
        analysis: {
          hasDataset: !!latestDataset,
          datasetId: latestDataset?.id,
          lastAnalyzed: latestDataset?.updatedAt,
          hasAnalytics: !!latestDataset?.analytics,
          hasAiInsights: !!latestDataset?.aiInsights,
          isUpToDate: analysisAge.isUpToDate,
          ageHours: analysisAge.ageHours,
          needsUpdate: !analysisAge.isUpToDate,
        },
        repositories: {
          total: latestDataset?.repositories?.length || 0,
          analyzed: latestDataset ? Array.isArray(latestDataset.repositories) ? latestDataset.repositories.length : 0 : 0,
        },
        metadata: latestDataset?.metadata || null,
        timestamp: new Date().toISOString(),
      };

      logWithContext.api('get_user_analysis_status', req.path, true, {
        targetUsername: username,
        hasDataset: !!latestDataset,
        isUpToDate: analysisAge.isUpToDate,
        ageHours: analysisAge.ageHours,
      });

      res.status(200).json(responseData);

    } catch (error: any) {
      logWithContext.api('get_user_analysis_status', req.path, false, {
        targetUsername: username,
        error: error.message,
      });

      throw error;
    }
  });

  /**
   * Suppression des données utilisateur (GDPR)
   * DELETE /api/users/:username
   */
  static deleteUserData = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { username } = req.params;
    const authenticatedUser = (req as any).user as AuthenticatedUser;

    // Vérification que l'utilisateur ne peut supprimer que ses propres données
    if (authenticatedUser.username !== username) {
      throw createError.authorization('Vous ne pouvez supprimer que vos propres données');
    }

    logWithContext.api('delete_user_data', req.path, true, {
      targetUsername: username,
      requesterId: authenticatedUser.id,
    });

    try {
      // Suppression complète des données utilisateur
      const deletionResult = await databaseService.deleteUserData(username);

      logWithContext.api('delete_user_data', req.path, true, {
        targetUsername: username,
        deletedUser: deletionResult.deletedUser,
        deletedRepositories: deletionResult.deletedRepositories,
        deletedDatasets: deletionResult.deletedDatasets,
      });

      res.status(200).json({
        message: 'Données utilisateur supprimées avec succès',
        deleted: {
          user: deletionResult.deletedUser,
          repositories: deletionResult.deletedRepositories,
          datasets: deletionResult.deletedDatasets,
        },
        compliance: 'GDPR',
        timestamp: new Date().toISOString(),
      });

    } catch (error: any) {
      logWithContext.api('delete_user_data', req.path, false, {
        targetUsername: username,
        error: error.message,
      });

      throw error;
    }
  });

  /**
   * Statistiques globales des utilisateurs
   * GET /api/users/stats
   */
  static getUsersStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const authenticatedUser = (req as any).user as AuthenticatedUser;

    logWithContext.api('get_users_stats', req.path, true, {
      requesterId: authenticatedUser?.id,
    });

    try {
      const stats = await databaseService.getGlobalStats();

      res.status(200).json({
        users: {
          total: stats.totalUsers,
          withDatasets: stats.totalUsersWithDatasets,
          averageFollowers: stats.averageFollowers,
          topLanguages: stats.topLanguages,
        },
        activity: {
          recentAnalyses: stats.recentAnalyses,
          totalAnalyses: stats.totalDatasets,
        },
        timestamp: new Date().toISOString(),
      });

    } catch (error: any) {
      logWithContext.api('get_users_stats', req.path, false, {
        error: error.message,
      });

      throw error;
    }
  });
}

export default UserController; 