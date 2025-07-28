import { Prisma, PrismaClient, User as PrismaUser } from '@prisma/client';
import { UserProfile } from '@/types';
import databaseConfig from '@/config/database';
import logger from '@/utils/logger';
import {
  USER_DEFAULTS,
  QUERY_MODES,
  SORT_ORDERS,
  OPERATORS,
  AI_MESSAGES,
  USER_ERROR_MESSAGES,
} from '@/constants';

export class UserModel {
  static async create(userData: UserProfile): Promise<PrismaUser> {
    const prisma = databaseConfig.getPrismaClient();
    if (prisma == null) {
      throw new Error(AI_MESSAGES.DATABASE_NOT_INITIALIZED);
    }

    try {
      const user = await prisma.user.create({
        data: {
          login: userData.login,
          name: userData.name ?? USER_DEFAULTS.EMPTY_STRING,
          email: userData.email ?? USER_DEFAULTS.EMPTY_STRING,
          avatarUrl: userData.avatar_url ?? USER_DEFAULTS.EMPTY_STRING,
          bio: userData.bio,
          company: userData.company,
          location: userData.location,
          blog: userData.blog,
          twitterUsername: userData.twitter_username,
          followers: userData.followers ?? USER_DEFAULTS.ZERO,
          following: userData.following ?? USER_DEFAULTS.ZERO,
          publicRepos: userData.public_repos ?? USER_DEFAULTS.ZERO,
          publicGists: userData.public_gists ?? USER_DEFAULTS.ZERO,
          ownedPrivateRepos: userData.owned_private_repos,
          totalPrivateRepos: userData.total_private_repos,
          collaborators: userData.collaborators,
          createdAt: userData.created_at ?? new Date(),
          updatedAt: userData.updated_at ?? new Date(),
          type: userData.type ?? USER_DEFAULTS.DEFAULT_TYPE,
          siteAdmin: userData.site_admin ?? USER_DEFAULTS.DEFAULT_SITE_ADMIN,
          hireable: userData.hireable,
          organizations: userData.organizations as unknown as Prisma.InputJsonValue,
        },
      });

      logger.info(AI_MESSAGES.USER_CREATED_SUCCESS, {
        userId: user.id,
        login: user.login,
      });

      return user;
    } catch (_error: unknown) {
      logger.error(AI_MESSAGES.ERROR_CREATING_USER, {
        login: userData.login,
        error: (_error as Error).message,
      });
      throw new Error(`${AI_MESSAGES.USER_CREATION_FAILED}${(_error as Error).message}`);
    }
  }

  static async findByLogin(login: string): Promise<PrismaUser | null> {
    const prisma = databaseConfig.getPrismaClient();
    if (prisma == null) {
      throw new Error(AI_MESSAGES.DATABASE_NOT_INITIALIZED);
    }

    try {
      const user = await prisma.user.findUnique({
        where: { login },
        include: {
          repositories: {
            take: USER_DEFAULTS.DEFAULT_REPOSITORIES_LIMIT,
            orderBy: { pushedAt: SORT_ORDERS.DESC },
          },
        },
      });

      logger.debug(AI_MESSAGES.SEARCHING_USER_BY_LOGIN, {
        login,
        found: user != null,
      });

      return user;
    } catch (_error: unknown) {
      logger.error(AI_MESSAGES.ERROR_SEARCHING_USER, {
        login,
        error: (_error as Error).message,
      });
      throw _error as Error;
    }
  }

  static async findById(id: string): Promise<PrismaUser | null> {
    const prisma = databaseConfig.getPrismaClient();
    if (prisma == null) {
      throw new Error(AI_MESSAGES.DATABASE_NOT_INITIALIZED);
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id },
      });

      logger.debug(AI_MESSAGES.SEARCHING_USER_BY_ID, {
        id,
        found: user != null,
      });

      return user;
    } catch (_error: unknown) {
      logger.error(AI_MESSAGES.ERROR_SEARCHING_USER_BY_ID, {
        id,
        error: (_error as Error).message,
      });
      throw _error as Error;
    }
  }

  static async update(id: string, updateData: Partial<UserProfile>): Promise<PrismaUser> {
    const prisma = databaseConfig.getPrismaClient();
    if (prisma == null) {
      throw new Error(AI_MESSAGES.DATABASE_NOT_INITIALIZED);
    }

    try {
      const user = await prisma.user.update({
        where: { id },
        data: {
          ...(updateData.name != null && { name: updateData.name }),
          ...(updateData.email != null && { email: updateData.email }),
          ...(updateData.avatar_url != null && { avatarUrl: updateData.avatar_url }),
          ...(updateData.bio !== undefined && { bio: updateData.bio }),
          ...(updateData.company !== undefined && {
            company: updateData.company,
          }),
          ...(updateData.location !== undefined && {
            location: updateData.location,
          }),
          ...(updateData.blog !== undefined && { blog: updateData.blog }),
          ...(updateData.twitter_username !== undefined && {
            twitterUsername: updateData.twitter_username,
          }),
          ...(updateData.followers !== undefined && {
            followers: updateData.followers,
          }),
          ...(updateData.following !== undefined && {
            following: updateData.following,
          }),
          ...(updateData.public_repos !== undefined && {
            publicRepos: updateData.public_repos,
          }),
          ...(updateData.public_gists !== undefined && {
            publicGists: updateData.public_gists,
          }),
          ...(updateData.hireable !== undefined && {
            hireable: updateData.hireable,
          }),
          ...(updateData.organizations && {
            organizations: updateData.organizations as unknown as Prisma.InputJsonValue,
          }),
          updatedAt: new Date(),
        },
      });

      logger.info(AI_MESSAGES.USER_UPDATED, {
        userId: user.id,
        login: user.login,
      });

      return user;
    } catch (_error: unknown) {
      logger.error(AI_MESSAGES.ERROR_UPDATING_USER, {
        id,
        error: (_error as Error).message,
      });
      throw new Error(`${AI_MESSAGES.USER_UPDATE_FAILED}${(_error as Error).message}`);
    }
  }

  static async delete(id: string): Promise<void> {
    const prisma = databaseConfig.getPrismaClient();
    if (prisma == null) {
      throw new Error(AI_MESSAGES.DATABASE_NOT_INITIALIZED);
    }

    try {
      await databaseConfig.transaction(async (tx: PrismaClient) => {
        await tx.repository.deleteMany({
          where: { userId: id },
        });

        await tx.user.delete({
          where: { id },
        });
      });

      logger.info(AI_MESSAGES.USER_DELETED_SUCCESS, { userId: id });
    } catch (_error: unknown) {
      logger.error(AI_MESSAGES.ERROR_DELETING_USER, {
        id,
        error: (_error as Error).message,
      });
      throw new Error(`${AI_MESSAGES.USER_DELETION_FAILED}${(_error as Error).message}`);
    }
  }

  static async deleteWithCascade(id: string): Promise<{
    userDeleted: boolean;
    repositoriesDeleted: number;
    aiAnalysesDeleted: number;
  }> {
    const prisma = databaseConfig.getPrismaClient();
    if (prisma == null) {
      throw new Error(USER_ERROR_MESSAGES.DATABASE_NOT_INITIALIZED);
    }

    try {
      let repositoriesDeleted = 0;
      let aiAnalysesDeleted = 0;

      await databaseConfig.transaction(async (tx: PrismaClient) => {
        const repoResult = await tx.repository.deleteMany({
          where: { userId: id },
        });
        repositoriesDeleted = repoResult.count;

        const aiResult = await tx.aIAnalysis.deleteMany({
          where: { userId: id },
        });
        aiAnalysesDeleted = aiResult.count;

        await tx.user.delete({
          where: { id },
        });
      });

      logger.info(AI_MESSAGES.USER_DELETED_SUCCESS, {
        userId: id,
        repositoriesDeleted,
        aiAnalysesDeleted,
      });

      return {
        userDeleted: true,
        repositoriesDeleted,
        aiAnalysesDeleted,
      };
    } catch (_error: unknown) {
      logger.error(AI_MESSAGES.ERROR_DELETING_USER, {
        id,
        error: (_error as Error).message,
      });
      throw new Error(`${USER_ERROR_MESSAGES.CASCADE_DELETION_FAILED}${(_error as Error).message}`);
    }
  }

  static async search(filters: {
    search?: string;
    location?: string;
    company?: string;
    minFollowers?: number;
    maxFollowers?: number;
    limit?: number;
    offset?: number;
  }): Promise<{ users: PrismaUser[]; total: number }> {
    const prisma = databaseConfig.getPrismaClient();
    if (prisma == null) {
      throw new Error('Database not initialized');
    }

    try {
      const where: Record<string, unknown> = {};

      if (filters.search != null) {
        where.OR = [
          { login: { contains: filters.search, mode: QUERY_MODES.INSENSITIVE } },
          { name: { contains: filters.search, mode: QUERY_MODES.INSENSITIVE } },
          { bio: { contains: filters.search, mode: QUERY_MODES.INSENSITIVE } },
        ];
      }

      if (filters.location != null) {
        where.location = { contains: filters.location, mode: QUERY_MODES.INSENSITIVE };
      }

      if (filters.company != null) {
        where.company = { contains: filters.company, mode: QUERY_MODES.INSENSITIVE };
      }

      if (filters.minFollowers !== undefined || filters.maxFollowers !== undefined) {
        where.followers = {};
        if (filters.minFollowers !== undefined) {
          (where.followers as { gte?: number }).gte = filters.minFollowers;
        }
        if (filters.maxFollowers !== undefined) {
          (where.followers as { lte?: number }).lte = filters.maxFollowers;
        }
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          take: filters.limit ?? USER_DEFAULTS.DEFAULT_SEARCH_LIMIT,
          skip: filters.offset ?? USER_DEFAULTS.DEFAULT_SEARCH_OFFSET,
          orderBy: { followers: SORT_ORDERS.DESC },
        }),
        prisma.user.count({ where }),
      ]);

      logger.debug(AI_MESSAGES.SEARCHING_USERS, {
        filtersCount: Object.keys(filters).length,
        resultsCount: users.length,
        total,
      });

      return { users, total };
    } catch (_error: unknown) {
      logger.error(AI_MESSAGES.ERROR_SEARCHING_USERS, {
        filters,
        error: (_error as Error).message,
      });
      throw _error as Error;
    }
  }

  static async getStats(): Promise<{
    totalUsers: number;
    totalRepositories: number;
    averageFollowers: number;
    topLanguages: Array<{ language: string; count: number }>;
  }> {
    const prisma = databaseConfig.getPrismaClient();
    if (prisma == null) {
      throw new Error('Database not initialized');
    }

    try {
      const [totalUsers, totalRepositories, avgFollowers] = await Promise.all([
        prisma.user.count(),
        prisma.repository.count(),
        prisma.user.aggregate({
          _avg: { followers: true },
        }),
      ]);

      const repositories = await prisma.repository.findMany({
        where: { primaryLanguage: { [OPERATORS.NOT]: null } },
        select: { primaryLanguage: true },
      });

      const languageCount = repositories.reduce(
        (acc: Record<string, number>, repo: { primaryLanguage: string | null }) => {
          if (repo.primaryLanguage != null) {
            acc[repo.primaryLanguage] = (acc[repo.primaryLanguage] ?? 0) + 1;
          }
          return acc;
        },
        {}
      );

      const topLanguages = Object.entries(languageCount)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, USER_DEFAULTS.DEFAULT_TOP_LANGUAGES_LIMIT)
        .map(([language, count]) => ({ language, count: count as number }));

      return {
        totalUsers,
        totalRepositories,
        averageFollowers: Math.round(avgFollowers._avg.followers ?? USER_DEFAULTS.ZERO),
        topLanguages,
      };
    } catch (_error: unknown) {
      logger.error(AI_MESSAGES.ERROR_CALCULATING_STATISTICS, {
        error: (_error as Error).message,
      });
      throw _error as Error;
    }
  }

  static async exists(login: string): Promise<boolean> {
    const prisma = databaseConfig.getPrismaClient();
    if (prisma == null) {
      throw new Error(AI_MESSAGES.DATABASE_NOT_INITIALIZED);
    }

    try {
      const user = await prisma.user.findUnique({
        where: { login },
        select: { id: true },
      });

      return user != null;
    } catch (_error: unknown) {
      logger.error(AI_MESSAGES.ERROR_CHECKING_USER_EXISTENCE, {
        login,
        error: (_error as Error).message,
      });
      return false;
    }
  }

  static async upsert(userData: UserProfile): Promise<PrismaUser> {
    const prisma = databaseConfig.getPrismaClient();
    if (prisma == null) {
      throw new Error(AI_MESSAGES.DATABASE_NOT_INITIALIZED);
    }

    try {
      const user = await prisma.user.upsert({
        where: { login: userData.login },
        update: {
          githubId: userData.id,
          nodeId: userData.node_id,
          avatarUrl: userData.avatar_url ?? USER_DEFAULTS.EMPTY_STRING,
          gravatarId: userData.gravatar_id,
          url: userData.url,
          htmlUrl: userData.html_url,
          followersUrl: userData.followers_url,
          followingUrl: userData.following_url,
          gistsUrl: userData.gists_url,
          starredUrl: userData.starred_url,
          subscriptionsUrl: userData.subscriptions_url,
          organizationsUrl: userData.organizations_url,
          reposUrl: userData.repos_url,
          eventsUrl: userData.events_url,
          receivedEventsUrl: userData.received_events_url,
          type: userData.type,
          siteAdmin: userData.site_admin,
          name: userData.name ?? USER_DEFAULTS.EMPTY_STRING,
          email: userData.email ?? USER_DEFAULTS.EMPTY_STRING,
          bio: userData.bio,
          company: userData.company,
          location: userData.location,
          blog: userData.blog,
          twitterUsername: userData.twitter_username,
          followers: userData.followers ?? USER_DEFAULTS.ZERO,
          following: userData.following ?? USER_DEFAULTS.ZERO,
          publicRepos: userData.public_repos ?? USER_DEFAULTS.ZERO,
          publicGists: userData.public_gists ?? USER_DEFAULTS.ZERO,
          hireable: userData.hireable,
          organizations: userData.organizations as unknown as Prisma.InputJsonValue,
        },
        create: {
          login: userData.login,
          githubId: userData.id,
          nodeId: userData.node_id,
          avatarUrl: userData.avatar_url ?? USER_DEFAULTS.EMPTY_STRING,
          gravatarId: userData.gravatar_id,
          url: userData.url,
          htmlUrl: userData.html_url,
          followersUrl: userData.followers_url,
          followingUrl: userData.following_url,
          gistsUrl: userData.gists_url,
          starredUrl: userData.starred_url,
          subscriptionsUrl: userData.subscriptions_url,
          organizationsUrl: userData.organizations_url,
          reposUrl: userData.repos_url,
          eventsUrl: userData.events_url,
          receivedEventsUrl: userData.received_events_url,
          type: userData.type,
          siteAdmin: userData.site_admin ?? USER_DEFAULTS.DEFAULT_SITE_ADMIN,
          name: userData.name ?? USER_DEFAULTS.EMPTY_STRING,
          email: userData.email ?? USER_DEFAULTS.EMPTY_STRING,
          bio: userData.bio,
          company: userData.company,
          location: userData.location,
          blog: userData.blog,
          twitterUsername: userData.twitter_username,
          followers: userData.followers ?? USER_DEFAULTS.ZERO,
          following: userData.following ?? USER_DEFAULTS.ZERO,
          publicRepos: userData.public_repos ?? USER_DEFAULTS.ZERO,
          publicGists: userData.public_gists ?? USER_DEFAULTS.ZERO,
          hireable: userData.hireable,
          ownedPrivateRepos: userData.owned_private_repos,
          totalPrivateRepos: userData.total_private_repos,
          collaborators: userData.collaborators,
          createdAt: userData.created_at ?? new Date(),
          updatedAt: userData.updated_at ?? new Date(),
          privateGists: userData.private_gists,
          diskUsage: userData.disk_usage,
          twoFactorAuth: userData.two_factor_authentication,
          plan: userData.plan as unknown as Prisma.InputJsonValue,
          organizations: userData.organizations as unknown as Prisma.InputJsonValue,
        },
      });

      logger.info(AI_MESSAGES.USER_UPSERT_SUCCESS, {
        userId: user.id,
        login: user.login,
      });

      return user;
    } catch (_error: unknown) {
      logger.error(AI_MESSAGES.ERROR_UPSERTING_USER, {
        login: userData.login,
        error: (_error as Error).message,
      });
      throw new Error(`${AI_MESSAGES.USER_UPSERT_FAILED}${(_error as Error).message}`);
    }
  }
}
