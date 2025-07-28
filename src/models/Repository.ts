import { Prisma, Repository as PrismaRepository } from '@prisma/client';
import { GitHubRepo } from '@/types';
import databaseConfig from '@/config/database';
import logger from '@/utils/logger';
import {
  REPOSITORY_ERROR_MESSAGES,
  REPOSITORY_LOG_MESSAGES,
  REPOSITORY_DEFAULTS,
  REPOSITORY_SORT_OPTIONS,
  REPOSITORY_FIELD_MAPPINGS,
} from '@/constants';

const toJson = (value: unknown): Prisma.InputJsonValue =>
  value !== undefined
    ? JSON.parse(JSON.stringify(value))
    : (null as unknown as Prisma.InputJsonValue);

export class RepositoryModel {
  static async create(repoData: GitHubRepo, userId: string): Promise<PrismaRepository> {
    const prisma = databaseConfig.getPrismaClient();
    if (prisma == null) {
      throw new Error(REPOSITORY_ERROR_MESSAGES.DATABASE_NOT_INITIALIZED);
    }

    try {
      const repository = await prisma.repository.create({
        data: {
          nameWithOwner: repoData.nameWithOwner,
          name: repoData.name,
          description: repoData.description ?? null,
          isPrivate: repoData.isPrivate,
          isArchived: repoData.isArchived,
          isFork: repoData.isFork,
          isTemplate: repoData.isTemplate,
          stargazerCount: repoData.stargazerCount,
          forkCount: repoData.forkCount,
          watchersCount: repoData.watchersCount,
          subscriberCount: repoData.subscriberCount ?? null,
          networkCount: repoData.networkCount ?? null,
          openIssuesCount: repoData.openIssuesCount,
          primaryLanguage: repoData.primaryLanguage ?? null,
          languages: repoData.languages as unknown as Prisma.InputJsonValue,
          topics: repoData.topics,
          pushedAt: repoData.pushedAt ?? null,
          updatedAt: repoData.updatedAt,
          createdAt: repoData.createdAt,
          homepageUrl: repoData.homepageUrl ?? null,
          size: repoData.size,
          defaultBranchRef: repoData.defaultBranchRef ?? null,
          license: toJson(repoData.license),
          hasIssuesEnabled: repoData.hasIssuesEnabled,
          hasProjectsEnabled: repoData.hasProjectsEnabled,
          hasWikiEnabled: repoData.hasWikiEnabled,
          hasPages: repoData.hasPages ?? null,
          hasDownloads: repoData.hasDownloads ?? null,
          hasDiscussions: repoData.hasDiscussions ?? null,
          vulnerabilityAlertsEnabled: repoData.vulnerabilityAlertsEnabled ?? null,
          securityPolicyEnabled: repoData.securityPolicyEnabled ?? null,
          codeOfConductEnabled: repoData.codeOfConductEnabled ?? null,
          contributingGuidelinesEnabled: repoData.contributingGuidelinesEnabled ?? null,
          readmeEnabled: repoData.readmeEnabled ?? null,
          deployments: repoData.deployments,
          environments: repoData.environments,
          commits: toJson(repoData.commits),
          releases: repoData.releases,
          issues: repoData.issues,
          pullRequests: repoData.pullRequests,
          branchProtectionRules: repoData.branchProtectionRules,
          collaborators: repoData.collaborators,
          githubActions: toJson(repoData.githubActions),
          security: toJson(repoData.security),
          packages: toJson(repoData.packages),
          branchProtection: toJson(repoData.branchProtection),
          community: toJson(repoData.community),
          traffic: toJson(repoData.traffic),
          diskUsage: repoData.diskUsage ?? null,
          owner: toJson(repoData.owner),
          userId,
        },
      });

      logger.info(REPOSITORY_LOG_MESSAGES.CREATED_SUCCESS, {
        repositoryId: repository.id,
        nameWithOwner: repository.nameWithOwner,
        userId,
      });

      return repository;
    } catch (_error: unknown) {
      logger.error(REPOSITORY_LOG_MESSAGES.ERROR_CREATING, {
        nameWithOwner: repoData.nameWithOwner,
        error: (_error as Error).message,
      });
      throw new Error(`${REPOSITORY_ERROR_MESSAGES.CREATION_FAILED}${(_error as Error).message}`);
    }
  }

  static async findByNameWithOwner(nameWithOwner: string): Promise<PrismaRepository | null> {
    const prisma = databaseConfig.getPrismaClient();
    if (prisma == null) {
      throw new Error(REPOSITORY_ERROR_MESSAGES.DATABASE_NOT_INITIALIZED);
    }

    try {
      const repository = await prisma.repository.findUnique({
        where: { nameWithOwner },
        include: {
          user: true,
        },
      });

      logger.debug(REPOSITORY_LOG_MESSAGES.SEARCHING_BY_NAME, {
        nameWithOwner,
        found: repository != null,
      });

      return repository;
    } catch (_error: unknown) {
      logger.error(REPOSITORY_LOG_MESSAGES.ERROR_SEARCHING, {
        nameWithOwner,
        error: (_error as Error).message,
      });
      throw _error as Error;
    }
  }

  static async findByUserId(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      includePrivate?: boolean;
      sortBy?: 'stars' | 'forks' | 'updated' | 'created';
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<{ repositories: PrismaRepository[]; total: number }> {
    const prisma = databaseConfig.getPrismaClient();
    if (prisma == null) {
      throw new Error(REPOSITORY_ERROR_MESSAGES.DATABASE_NOT_INITIALIZED);
    }

    try {
      const {
        limit = REPOSITORY_DEFAULTS.LIMIT,
        offset = REPOSITORY_DEFAULTS.OFFSET,
        includePrivate = REPOSITORY_DEFAULTS.INCLUDE_PRIVATE,
        sortBy = REPOSITORY_DEFAULTS.SORT_BY,
        sortOrder = REPOSITORY_DEFAULTS.SORT_ORDER,
      } = options;

      const where: Record<string, unknown> = { userId };

      if (!includePrivate) {
        where.isPrivate = false;
      }

      let orderBy:
        | Prisma.RepositoryOrderByWithRelationInput
        | Prisma.RepositoryOrderByWithRelationInput[]
        | undefined;
      switch (sortBy) {
        case REPOSITORY_SORT_OPTIONS.STARS:
          orderBy = { stargazerCount: sortOrder };
          break;
        case REPOSITORY_SORT_OPTIONS.FORKS:
          orderBy = { forkCount: sortOrder };
          break;
        case REPOSITORY_SORT_OPTIONS.CREATED:
          orderBy = { createdAt: sortOrder };
          break;
        default:
          orderBy = { updatedAt: sortOrder };
      }

      const [repositories, total] = await Promise.all([
        prisma.repository.findMany({
          where,
          take: limit,
          skip: offset,
          orderBy,
        }),
        prisma.repository.count({ where }),
      ]);

      logger.debug(REPOSITORY_LOG_MESSAGES.SEARCHING_BY_USER, {
        userId,
        count: repositories.length,
        total,
        options,
      });

      return { repositories, total };
    } catch (_error: unknown) {
      logger.error(REPOSITORY_LOG_MESSAGES.ERROR_SEARCHING_BY_USER, {
        userId,
        error: (_error as Error).message,
      });
      throw _error as Error;
    }
  }

  static async update(id: string, updateData: Partial<GitHubRepo>): Promise<PrismaRepository> {
    const prisma = databaseConfig.getPrismaClient();
    if (prisma == null) {
      throw new Error(REPOSITORY_ERROR_MESSAGES.DATABASE_NOT_INITIALIZED);
    }

    try {
      const data: Record<string, unknown> = { updatedAt: new Date() };
      const fieldMappings = REPOSITORY_FIELD_MAPPINGS;

      fieldMappings.forEach(field => {
        if (updateData[field as keyof GitHubRepo] !== undefined) {
          data[field] = updateData[field as keyof GitHubRepo];
        }
      });

      const repository = await prisma.repository.update({
        where: { id },
        data,
      });

      logger.info(REPOSITORY_LOG_MESSAGES.UPDATED, {
        repositoryId: repository.id,
        nameWithOwner: repository.nameWithOwner,
      });

      return repository;
    } catch (_error: unknown) {
      logger.error(REPOSITORY_LOG_MESSAGES.ERROR_UPDATING, {
        id,
        error: (_error as Error).message,
      });
      throw new Error(`${REPOSITORY_ERROR_MESSAGES.UPDATE_FAILED}${(_error as Error).message}`);
    }
  }

  static async enrichWithDevOpsData(
    id: string,
    devOpsData: {
      githubActions?: import('@/types/github').GitHubActions;
      security?: import('@/types/github').GitHubSecurity;
      packages?: import('@/types/github').GitHubPackages;
      branchProtection?: import('@/types/github').GitHubBranchProtection;
      community?: import('@/types/github').GitHubCommunity;
      traffic?: import('@/types/github').GitHubTraffic;
    }
  ): Promise<PrismaRepository> {
    const prisma = databaseConfig.getPrismaClient();
    if (prisma == null) {
      throw new Error(REPOSITORY_ERROR_MESSAGES.DATABASE_NOT_INITIALIZED);
    }

    try {
      const data: Record<string, unknown> = { updatedAt: new Date() };

      if (devOpsData.githubActions) {
        data.githubActions = toJson(devOpsData.githubActions);
      }
      if (devOpsData.security) {
        data.security = toJson(devOpsData.security);
      }
      if (devOpsData.packages) {
        data.packages = toJson(devOpsData.packages);
      }
      if (devOpsData.branchProtection) {
        data.branchProtection = toJson(devOpsData.branchProtection);
      }
      if (devOpsData.community) {
        data.community = toJson(devOpsData.community);
      }
      if (devOpsData.traffic) {
        data.traffic = toJson(devOpsData.traffic);
      }

      const repository = await prisma.repository.update({
        where: { id },
        data,
        include: {
          user: true,
        },
      });

      logger.info(REPOSITORY_LOG_MESSAGES.ENRICHED_DEV_OPS, {
        repositoryId: repository.id,
        nameWithOwner: repository.nameWithOwner,
        enrichedFields: Object.keys(devOpsData),
      });

      return repository;
    } catch (_error: unknown) {
      logger.error(REPOSITORY_LOG_MESSAGES.ERROR_DEV_OPS_ENRICHMENT, {
        id,
        error: (_error as Error).message,
      });
      throw _error as Error;
    }
  }

  static async delete(id: string): Promise<void> {
    const prisma = databaseConfig.getPrismaClient();
    if (prisma == null) {
      throw new Error(REPOSITORY_ERROR_MESSAGES.DATABASE_NOT_INITIALIZED);
    }

    try {
      await prisma.repository.delete({
        where: { id },
      });

      logger.info(REPOSITORY_LOG_MESSAGES.DELETED_SUCCESS, { repositoryId: id });
    } catch (_error: unknown) {
      logger.error(REPOSITORY_LOG_MESSAGES.ERROR_DELETING, {
        id,
        error: (_error as Error).message,
      });
      throw new Error(`${REPOSITORY_ERROR_MESSAGES.DELETION_FAILED}${(_error as Error).message}`);
    }
  }

  static async search(filters: {
    search?: string;
    language?: string;
    topics?: string[];
    minStars?: number;
    maxStars?: number;
    isPrivate?: boolean;
    hasActions?: boolean;
    hasSecurityAlerts?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ repositories: PrismaRepository[]; total: number }> {
    const prisma = databaseConfig.getPrismaClient();
    if (prisma == null) {
      throw new Error(REPOSITORY_ERROR_MESSAGES.DATABASE_NOT_INITIALIZED);
    }

    try {
      const where: Record<string, unknown> = {};

      if (filters.search != null) {
        where.OR = [
          { name: { contains: filters.search, mode: REPOSITORY_DEFAULTS.SEARCH_MODE } },
          { description: { contains: filters.search, mode: REPOSITORY_DEFAULTS.SEARCH_MODE } },
          { nameWithOwner: { contains: filters.search, mode: REPOSITORY_DEFAULTS.SEARCH_MODE } },
        ];
      }

      if (filters.language != null) {
        where.primaryLanguage = filters.language;
      }

      if (filters.topics && filters.topics.length > 0) {
        where.topics = { hasEvery: filters.topics };
      }

      if (filters.minStars !== undefined || filters.maxStars !== undefined) {
        where.stargazerCount = {};
        if (filters.minStars !== undefined) {
          (where.stargazerCount as { gte?: number }).gte = filters.minStars;
        }
        if (filters.maxStars !== undefined) {
          (where.stargazerCount as { lte?: number }).lte = filters.maxStars;
        }
      }

      if (filters.isPrivate !== undefined) {
        where.isPrivate = filters.isPrivate;
      }

      if (filters.hasActions === true) {
        where.githubActions = { not: null };
      }

      if (filters.hasSecurityAlerts === true) {
        where.security = { not: null };
      }

      const [repositories, total] = await Promise.all([
        prisma.repository.findMany({
          where,
          take: filters.limit ?? REPOSITORY_DEFAULTS.LIMIT,
          skip: filters.offset ?? REPOSITORY_DEFAULTS.OFFSET,
          orderBy: { stargazerCount: REPOSITORY_DEFAULTS.SORT_ORDER },
          include: {
            user: { select: { login: true, avatarUrl: true } },
          },
        }),
        prisma.repository.count({ where }),
      ]);

      logger.debug(REPOSITORY_LOG_MESSAGES.ADVANCED_SEARCH, {
        filtersCount: Object.keys(filters).length,
        resultsCount: repositories.length,
        total,
      });

      return { repositories, total };
    } catch (_error: unknown) {
      logger.error(REPOSITORY_LOG_MESSAGES.ERROR_ADVANCED_SEARCH, {
        filters,
        error: (_error as Error).message,
      });
      throw _error as Error;
    }
  }

  static async getStats(): Promise<{
    totalRepositories: number;
    totalStars: number;
    totalForks: number;
    topLanguages: Array<{ language: string; count: number }>;
    devOpsAdoption: {
      githubActions: number;
      security: number;
      packages: number;
      branchProtection: number;
    };
  }> {
    const prisma = databaseConfig.getPrismaClient();
    if (prisma == null) {
      throw new Error(REPOSITORY_ERROR_MESSAGES.DATABASE_NOT_INITIALIZED);
    }

    try {
      const [totalRepositories, aggregates, languageStats, devOpsStats] = await Promise.all([
        prisma.repository.count(),
        prisma.repository.aggregate({
          _sum: {
            stargazerCount: true,
            forkCount: true,
          },
        }),
        prisma.repository.groupBy({
          by: ['primaryLanguage'],
          _count: { primaryLanguage: true },
          where: { primaryLanguage: { not: null } },
          orderBy: { _count: { primaryLanguage: REPOSITORY_DEFAULTS.SORT_ORDER } },
          take: REPOSITORY_DEFAULTS.TOP_LANGUAGES_LIMIT,
        }),
        Promise.all([
          prisma.repository.count({
            where: { githubActions: { not: null } },
          }),
          prisma.repository.count({ where: { security: { not: null } } }),
          prisma.repository.count({ where: { packages: { not: null } } }),
          prisma.repository.count({
            where: { branchProtection: { not: null } },
          }),
        ]),
      ]);

      const topLanguages = languageStats.map(
        (stat: { primaryLanguage: string | null; _count: { primaryLanguage: number } }) => ({
          language: stat.primaryLanguage ?? REPOSITORY_DEFAULTS.UNKNOWN_LANGUAGE,
          count: stat._count.primaryLanguage,
        })
      );

      return {
        totalRepositories,
        totalStars: aggregates._sum.stargazerCount ?? 0,
        totalForks: aggregates._sum.forkCount ?? 0,
        topLanguages,
        devOpsAdoption: {
          githubActions: devOpsStats[0],
          security: devOpsStats[1],
          packages: devOpsStats[2],
          branchProtection: devOpsStats[3],
        },
      };
    } catch (_error: unknown) {
      logger.error(REPOSITORY_LOG_MESSAGES.ERROR_CALCULATING_STATS, {
        error: (_error as Error).message,
      });
      throw _error as Error;
    }
  }

  static async upsert(repoData: GitHubRepo, userId: string): Promise<PrismaRepository> {
    const prisma = databaseConfig.getPrismaClient();
    if (prisma == null) {
      throw new Error(REPOSITORY_ERROR_MESSAGES.DATABASE_NOT_INITIALIZED);
    }

    try {
      const repository = await prisma.repository.upsert({
        where: { nameWithOwner: repoData.nameWithOwner },
        update: {
          description: repoData.description ?? null,
          stargazerCount: repoData.stargazerCount,
          forkCount: repoData.forkCount,
          watchersCount: repoData.watchersCount,
          openIssuesCount: repoData.openIssuesCount,
          primaryLanguage: repoData.primaryLanguage ?? null,
          languages: repoData.languages as unknown as Prisma.InputJsonValue,
          topics: repoData.topics,
          pushedAt: repoData.pushedAt ?? null,
          updatedAt: new Date(),
          homepageUrl: repoData.homepageUrl ?? null,
          size: repoData.size,
          commits: toJson(repoData.commits),
          releases: repoData.releases,
          issues: repoData.issues,
          pullRequests: repoData.pullRequests,
          ...(repoData.githubActions && {
            githubActions: toJson(repoData.githubActions),
          }),
          ...(repoData.security && { security: toJson(repoData.security) }),
          ...(repoData.packages && { packages: toJson(repoData.packages) }),
          ...(repoData.branchProtection && {
            branchProtection: toJson(repoData.branchProtection),
          }),
          ...(repoData.community && { community: toJson(repoData.community) }),
          ...(repoData.traffic && { traffic: toJson(repoData.traffic) }),
        },
        create: {
          nameWithOwner: repoData.nameWithOwner,
          name: repoData.name,
          description: repoData.description ?? null,
          isPrivate: repoData.isPrivate,
          isArchived: repoData.isArchived,
          isFork: repoData.isFork,
          isTemplate: repoData.isTemplate,
          stargazerCount: repoData.stargazerCount,
          forkCount: repoData.forkCount,
          watchersCount: repoData.watchersCount,
          subscriberCount: repoData.subscriberCount ?? null,
          networkCount: repoData.networkCount ?? null,
          openIssuesCount: repoData.openIssuesCount,
          primaryLanguage: repoData.primaryLanguage ?? null,
          languages: repoData.languages as unknown as Prisma.InputJsonValue,
          topics: repoData.topics,
          pushedAt: repoData.pushedAt ?? null,
          updatedAt: repoData.updatedAt,
          createdAt: repoData.createdAt,
          homepageUrl: repoData.homepageUrl ?? null,
          size: repoData.size,
          defaultBranchRef: repoData.defaultBranchRef ?? null,
          license: toJson(repoData.license),
          hasIssuesEnabled: repoData.hasIssuesEnabled,
          hasProjectsEnabled: repoData.hasProjectsEnabled,
          hasWikiEnabled: repoData.hasWikiEnabled,
          hasPages: repoData.hasPages ?? null,
          hasDownloads: repoData.hasDownloads ?? null,
          hasDiscussions: repoData.hasDiscussions ?? null,
          vulnerabilityAlertsEnabled: repoData.vulnerabilityAlertsEnabled ?? null,
          securityPolicyEnabled: repoData.securityPolicyEnabled ?? null,
          codeOfConductEnabled: repoData.codeOfConductEnabled ?? null,
          contributingGuidelinesEnabled: repoData.contributingGuidelinesEnabled ?? null,
          readmeEnabled: repoData.readmeEnabled ?? null,
          deployments: repoData.deployments,
          environments: repoData.environments,
          commits: toJson(repoData.commits),
          releases: repoData.releases,
          issues: repoData.issues,
          pullRequests: repoData.pullRequests,
          branchProtectionRules: repoData.branchProtectionRules,
          collaborators: repoData.collaborators,
          githubActions: toJson(repoData.githubActions),
          security: toJson(repoData.security),
          packages: toJson(repoData.packages),
          branchProtection: toJson(repoData.branchProtection),
          community: toJson(repoData.community),
          traffic: toJson(repoData.traffic),
          diskUsage: repoData.diskUsage ?? null,
          owner: toJson(repoData.owner),
          userId,
        },
      });

      logger.info(REPOSITORY_LOG_MESSAGES.UPSERT_SUCCESS, {
        repositoryId: repository.id,
        nameWithOwner: repository.nameWithOwner,
        userId,
      });

      return repository;
    } catch (_error: unknown) {
      logger.error(REPOSITORY_LOG_MESSAGES.ERROR_UPSERTING, {
        nameWithOwner: repoData.nameWithOwner,
        error: (_error as Error).message,
      });
      throw new Error(`${REPOSITORY_ERROR_MESSAGES.UPSERT_FAILED}${(_error as Error).message}`);
    }
  }

  static async deleteByUserId(userId: string): Promise<void> {
    const prisma = databaseConfig.getPrismaClient();
    if (prisma == null) {
      throw new Error(REPOSITORY_ERROR_MESSAGES.DATABASE_NOT_INITIALIZED);
    }

    try {
      const deletedCount = await prisma.repository.deleteMany({
        where: { userId },
      });

      logger.info(REPOSITORY_LOG_MESSAGES.DELETED_BY_USER_SUCCESS, {
        userId,
        deletedCount: deletedCount.count,
      });
    } catch (_error: unknown) {
      logger.error(REPOSITORY_LOG_MESSAGES.ERROR_DELETING_BY_USER, {
        userId,
        error: (_error as Error).message,
      });
      throw new Error(
        `${REPOSITORY_ERROR_MESSAGES.DELETION_BY_USER_FAILED}${(_error as Error).message}`
      );
    }
  }
}
