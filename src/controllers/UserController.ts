import { Request, Response } from 'express';
import { User as PrismaUser } from '@prisma/client';
import { asyncHandler, createError } from '@/middleware';
import { logWithContext } from '@/utils/logger';
import { UserModel, RepositoryModel, AIAnalysisModel } from '@/models';
import { AuthenticatedUser, UserProfile } from '@/types';
import { GitHubService } from '@/services';
import { USER_MESSAGES, USER_LOG_MESSAGES } from '@/constants';

export class UserController {
  static async collectUserDataInternal(
    githubToken: string
  ): Promise<{ userProfile: UserProfile; savedUser: PrismaUser }> {
    const githubService = await GitHubService.create(githubToken);
    const userProfile = await githubService.getUserProfile();
    const savedUser = await UserModel.upsert(userProfile);

    return { userProfile, savedUser };
  }

  /**
   * Collects user data from GitHub
   * POST /api/users/:username
   */
  static collectUserData = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { username } = req.params;
    const authenticatedUser = req.user as AuthenticatedUser;

    if (authenticatedUser == null) {
      throw createError.authentication(USER_MESSAGES.AUTH_REQUIRED_COLLECT_DATA);
    }

    if (authenticatedUser.username !== username) {
      throw createError.authorization(USER_MESSAGES.AUTH_ONLY_OWN_DATA);
    }

    logWithContext.api(USER_LOG_MESSAGES.COLLECT_USER_DATA, req.path, true, {
      targetUsername: username,
      requesterId: authenticatedUser.id,
    });

    try {
      const { userProfile, savedUser } = await UserController.collectUserDataInternal(
        authenticatedUser.githubToken
      );

      logWithContext.api(USER_LOG_MESSAGES.COLLECT_USER_DATA_SUCCESS, req.path, true, {
        targetUsername: username,
        userId: savedUser.id,
        userGithubId: userProfile.id,
      });

      res.status(201).json({
        message: USER_MESSAGES.USER_PROFILE_COLLECTION_SUCCESS,
        status: USER_MESSAGES.COMPLETED,
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
          source: USER_LOG_MESSAGES.GITHUB_API,
        },
        timestamp: new Date().toISOString(),
      });
      return;
    } catch (_error: unknown) {
      logWithContext.api(USER_LOG_MESSAGES.COLLECT_USER_DATA_ERROR, req.path, false, {
        targetUsername: username,
        error: String(_error),
      });

      throw _error;
    }
  });

  /**
   * Retrieves user profile and analysis status
   * GET /api/users/:username
   */
  static getUserProfile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { username } = req.params;
    const authenticatedUser = req.user as AuthenticatedUser;

    logWithContext.api(USER_LOG_MESSAGES.GET_USER_PROFILE, req.path, true, {
      targetUsername: username,
      requesterId: authenticatedUser?.id,
      isAuthenticated: authenticatedUser != null,
    });

    try {
      const userData = await UserModel.findByLogin(String(username));

      if (userData == null) {
        throw createError.notFound(USER_MESSAGES.USER_NOT_FOUND_COLLECT);
      }

      const aiAnalysis = await AIAnalysisModel.findLatestByUsername(String(username));
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
          dataSource: USER_LOG_MESSAGES.DATABASE,
        },
        timestamp: new Date().toISOString(),
      };

      logWithContext.api(USER_LOG_MESSAGES.GET_USER_PROFILE_SUCCESS, req.path, true, {
        targetUsername: username,
        hasAiInsights: aiAnalysis != null,
        repositoriesCount: repositoriesCount.total,
      });

      res.status(200).json(responseData);
      return;
    } catch (_error: unknown) {
      logWithContext.api(USER_LOG_MESSAGES.GET_USER_PROFILE_ERROR, req.path, false, {
        targetUsername: username,
        error: String(_error),
      });

      throw _error;
    }
  });

  /**
   * Deletes user data with cascade (GDPR)
   * DELETE /api/users/:username
   */
  static deleteUserData = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { username } = req.params;
    const authenticatedUser = req.user as AuthenticatedUser;

    if (authenticatedUser == null) {
      throw createError.authentication(USER_MESSAGES.AUTH_REQUIRED_COLLECT_DATA);
    }

    if (authenticatedUser.username !== username) {
      throw createError.authorization(USER_MESSAGES.AUTH_ONLY_OWN_DATA);
    }

    logWithContext.api(USER_LOG_MESSAGES.DELETE_USER_CASCADE, req.path, true, {
      targetUsername: username,
      requesterId: authenticatedUser.id,
    });

    try {
      const userData = await UserModel.findByLogin(String(username));

      if (userData == null) {
        throw createError.notFound(USER_MESSAGES.USER_NOT_FOUND_COLLECT);
      }

      const cascadeResult = await UserModel.deleteWithCascade(userData.id);

      logWithContext.api(USER_LOG_MESSAGES.DELETE_USER_CASCADE_SUCCESS, req.path, true, {
        targetUsername: username,
        repositoriesDeleted: cascadeResult.repositoriesDeleted,
        aiAnalysesDeleted: cascadeResult.aiAnalysesDeleted,
      });

      res.status(200).json({
        message: USER_MESSAGES.USER_DELETION_CASCADE_SUCCESS,
        status: USER_MESSAGES.COMPLETED,
        summary: {
          username,
          userDeleted: cascadeResult.userDeleted,
          repositoriesDeleted: cascadeResult.repositoriesDeleted,
          aiAnalysesDeleted: cascadeResult.aiAnalysesDeleted,
          dataFreshness: USER_LOG_MESSAGES.DATABASE,
        },
        metadata: {
          deletedAt: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      });
      return;
    } catch (_error: unknown) {
      logWithContext.api(USER_LOG_MESSAGES.DELETE_USER_CASCADE_ERROR, req.path, false, {
        targetUsername: username,
        error: String(_error),
      });

      throw _error;
    }
  });

  /**
   * Platform statistics - SIMPLIFIED VERSION
   * GET /api/users/stats
   */
  static getUsersStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const authenticatedUser = req.user as AuthenticatedUser;

    logWithContext.api(USER_LOG_MESSAGES.GET_USERS_STATS, req.path, true, {
      requesterId: authenticatedUser?.id,
    });

    try {
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
          source: USER_LOG_MESSAGES.DIRECT_CALCULATION,
        },
      };

      logWithContext.api(USER_LOG_MESSAGES.GET_USERS_STATS_SUCCESS, req.path, true, {
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
      logWithContext.api(USER_LOG_MESSAGES.GET_USERS_STATS_ERROR, req.path, false, {
        error: String(_error),
      });

      throw _error;
    }
  });
}
