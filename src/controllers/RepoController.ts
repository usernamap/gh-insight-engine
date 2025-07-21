import { Request, Response } from 'express';
import { asyncHandler } from '@/middleware/errorHandler';
import { createError } from '@/middleware/errorHandler';
import { databaseService } from '@/services/DatabaseService';
import { githubService } from '@/services/GitHubService';
import { logWithContext } from '@/utils/logger';

/**
 * Interface pour les paramètres de recherche de repositories
 */
interface RepoSearchQuery {
  query?: string;
  language?: string;
  topic?: string;
  minStars?: number;
  minForks?: number;
  isPrivate?: boolean;
  isFork?: boolean;
  isArchived?: boolean;
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
 * Contrôleur des repositories
 */
export class RepoController {
  /**
   * Récupération des détails d'un repository
   * GET /api/repositories/:owner/:repo
   */
  static getRepository = asyncHandler(async (req: Request, _res: Response): Promise<void> => {
    const { owner, repo } = req.params;
    const nameWithOwner = `${owner}/${repo}`;
    const authenticatedUser = (req as any).user as AuthenticatedUser;

    logWithContext.api('get_repository', req.path, true, {
      nameWithOwner,
      requesterId: authenticatedUser?.id,
    });

    try {
      // Récupération du repository depuis la base de données
      const repositoryData = await databaseService.getRepository(nameWithOwner);

      if (!repositoryData) {
        // Si le repository n'existe pas en base, essayer de le récupérer depuis GitHub
        if (authenticatedUser?.githubToken) {
          try {
            logWithContext.github('fetch_repository_from_api', nameWithOwner, true);

            // Note: Cette implémentation nécessiterait d'étendre GitHubService
            // pour récupérer un repository spécifique
            throw createError.notFound('Repository');
          } catch (_error) {
            throw createError.notFound('Repository');
          }
        } else {
          throw createError.notFound('Repository');
        }
      }

      const responseData = {
        repository: {
          id: repositoryData.id,
          nameWithOwner: repositoryData.nameWithOwner,
          name: repositoryData.name,
          description: repositoryData.description,
          owner: repositoryData.owner,
          isPrivate: repositoryData.isPrivate,
          isArchived: repositoryData.isArchived,
          isFork: repositoryData.isFork,
          isTemplate: repositoryData.isTemplate,
          stargazerCount: repositoryData.stargazerCount,
          forkCount: repositoryData.forkCount,
          watchersCount: repositoryData.watchersCount,
          subscriberCount: repositoryData.subscriberCount,
          networkCount: repositoryData.networkCount,
          openIssuesCount: repositoryData.openIssuesCount,
          size: repositoryData.size,
          diskUsage: repositoryData.diskUsage,
          primaryLanguage: repositoryData.primaryLanguage,
          languages: repositoryData.languages,
          topics: repositoryData.topics,
          license: repositoryData.license,
          homepageUrl: repositoryData.homepageUrl,
          defaultBranchRef: repositoryData.defaultBranchRef,
          hasIssuesEnabled: repositoryData.hasIssuesEnabled,
          hasProjectsEnabled: repositoryData.hasProjectsEnabled,
          hasWikiEnabled: repositoryData.hasWikiEnabled,
          hasPages: repositoryData.hasPages,
          hasDownloads: repositoryData.hasDownloads,
          hasDiscussions: repositoryData.hasDiscussions,
          vulnerabilityAlertsEnabled: repositoryData.vulnerabilityAlertsEnabled,
          securityPolicyEnabled: repositoryData.securityPolicyEnabled,
          codeOfConductEnabled: repositoryData.codeOfConductEnabled,
          contributingGuidelinesEnabled: repositoryData.contributingGuidelinesEnabled,
          readmeEnabled: repositoryData.readmeEnabled,
          createdAt: repositoryData.createdAt,
          updatedAt: repositoryData.updatedAt,
          pushedAt: repositoryData.pushedAt,
        },
        statistics: {
          commits: repositoryData.commits,
          releases: repositoryData.releases,
          issues: repositoryData.issues,
          pullRequests: repositoryData.pullRequests,
          deployments: repositoryData.deployments,
          environments: repositoryData.environments,
          collaborators: repositoryData.collaborators,
          branchProtectionRules: repositoryData.branchProtectionRules,
        },
        devops: repositoryData.githubActions ?? repositoryData.security ?? repositoryData.packages ?? repositoryData.branchProtection ? {
          githubActions: repositoryData.githubActions,
          security: repositoryData.security,
          packages: repositoryData.packages,
          branchProtection: repositoryData.branchProtection,
          community: repositoryData.community,
          traffic: repositoryData.traffic,
        } : null,
        timestamp: new Date().toISOString(),
      };

      logWithContext.api('get_repository', req.path, true, {
        nameWithOwner,
        hasDevOpsData: !!responseData.devops,
      });

      res.status(200).json(responseData);

    } catch (_error: unknown) {
      logWithContext.api('get_repository', req.path, false, {
        nameWithOwner,
        _error: error.message,
      });

      throw error;
    }
  });

  /**
   * Recherche de repositories
   * GET /api/repositories/search
   */
  static searchRepositories = asyncHandler(async (req: Request, _res: Response): Promise<void> => {
    const searchParams = req.query as unknown as RepoSearchQuery;
    const authenticatedUser = (req as any).user as AuthenticatedUser;

    logWithContext.api('search_repositories', req.path, true, {
      searchQuery: searchParams.query,
      requesterId: authenticatedUser?.id,
      filters: {
        language: searchParams.language,
        topic: searchParams.topic,
        minStars: searchParams.minStars,
        minForks: searchParams.minForks,
        isPrivate: searchParams.isPrivate,
        isFork: searchParams.isFork,
        isArchived: searchParams.isArchived,
      },
    });

    try {
      // Construction des filtres de recherche
      const searchFilters: unknown = {};

      if (searchParams.query) {
        searchFilters.$or = [
          { name: { $regex: searchParams.query, $options: 'i' } },
          { nameWithOwner: { $regex: searchParams.query, $options: 'i' } },
          { description: { $regex: searchParams.query, $options: 'i' } },
          { topics: { $in: [new RegExp(searchParams.query, 'i')] } },
        ];
      }

      if (searchParams.language) {
        searchFilters.$or = [
          ...(searchFilters.$or ?? []),
          { primaryLanguage: { $regex: searchParams.language, $options: 'i' } },
          { 'languages.nodes.name': { $regex: searchParams.language, $options: 'i' } },
        ];
      }

      if (searchParams.topic) {
        searchFilters.topics = { $in: [new RegExp(searchParams.topic, 'i')] };
      }

      if (searchParams.minStars !== undefined) {
        searchFilters.stargazerCount = { $gte: searchParams.minStars };
      }

      if (searchParams.minForks !== undefined) {
        searchFilters.forkCount = { $gte: searchParams.minForks };
      }

      if (searchParams.isPrivate !== undefined) {
        searchFilters.isPrivate = searchParams.isPrivate;
      }

      if (searchParams.isFork !== undefined) {
        searchFilters.isFork = searchParams.isFork;
      }

      if (searchParams.isArchived !== undefined) {
        searchFilters.isArchived = searchParams.isArchived;
      }

      // Exécution de la recherche avec pagination
      const result = await databaseService.searchRepositories({
        filters: searchFilters,
        page: searchParams.page,
        limit: searchParams.limit,
        sortBy: searchParams.sortBy,
        sortOrder: searchParams.sortOrder,
      });

      logWithContext.api('search_repositories', req.path, true, {
        resultsCount: result.repositories.length,
        totalCount: result.totalCount,
        searchQuery: searchParams.query,
      });

      res.status(200).json({
        repositories: result.repositories.map(repo => ({
          id: repo.id,
          nameWithOwner: repo.nameWithOwner,
          name: repo.name,
          description: repo.description,
          owner: repo.owner,
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
          createdAt: repo.createdAt,
          updatedAt: repo.updatedAt,
          pushedAt: repo.pushedAt,
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
          language: searchParams.language,
          topic: searchParams.topic,
          minStars: searchParams.minStars,
          minForks: searchParams.minForks,
          isPrivate: searchParams.isPrivate,
          isFork: searchParams.isFork,
          isArchived: searchParams.isArchived,
        },
        timestamp: new Date().toISOString(),
      });

    } catch (_error: unknown) {
      logWithContext.api('search_repositories', req.path, false, {
        _error: error.message,
        searchQuery: searchParams.query,
      });

      throw error;
    }
  });

  /**
   * Enrichissement DevOps d'un repository
   * POST /api/repositories/:owner/:repo/enrich
   */
  static enrichRepository = asyncHandler(async (req: Request, _res: Response): Promise<void> => {
    const { owner, repo } = req.params;
    const nameWithOwner = `${owner}/${repo}`;
    const authenticatedUser = (req as any).user as AuthenticatedUser;

    if (!authenticatedUser?.githubToken) {
      throw createError.authentication('Token GitHub requis pour l\'enrichissement');
    }

    logWithContext.api('enrich_repository', req.path, true, {
      nameWithOwner,
      requesterId: authenticatedUser.id,
    });

    try {
      // Vérifier que le repository existe en base
      const existingRepo = await databaseService.getRepository(nameWithOwner);

      if (!existingRepo) {
        throw createError.notFound('Repository non trouvé en base de données');
      }

      // Enrichissement avec les données DevOps
      const enrichedData = await githubService.enrichWithDevOpsData(
        owner,
        repo,
        authenticatedUser.githubToken,
      );

      if (!enrichedData) {
        throw createError.externalService('GitHub API', new Error('Impossible d\'enrichir le repository'));
      }

      // Mise à jour en base de données
      const _updatedRepo = await databaseService.enrichRepository(nameWithOwner, {
        githubActions: enrichedData.githubActions,
        security: enrichedData.security,
        packages: enrichedData.packages,
        branchProtection: enrichedData.branchProtection,
        community: enrichedData.community,
        traffic: enrichedData.traffic,
      });

      logWithContext.api('enrich_repository', req.path, true, {
        nameWithOwner,
        enrichedFields: Object.keys(enrichedData).filter(key => !!enrichedData[key as keyof typeof enrichedData]),
      });

      res.status(200).json({
        message: 'Repository enrichi avec succès',
        repository: {
          nameWithOwner,
          enrichedAt: new Date().toISOString(),
        },
        devops: {
          githubActions: enrichedData.githubActions,
          security: enrichedData.security,
          packages: enrichedData.packages,
          branchProtection: enrichedData.branchProtection,
          community: enrichedData.community,
          traffic: enrichedData.traffic,
        },
        timestamp: new Date().toISOString(),
      });

    } catch (_error: unknown) {
      logWithContext.api('enrich_repository', req.path, false, {
        nameWithOwner,
        _error: error.message,
      });

      throw error;
    }
  });

  /**
   * Statistiques des langages de programmation
   * GET /api/repositories/languages/stats
   */
  static getLanguagesStats = asyncHandler(async (req: Request, _res: Response): Promise<void> => {
    const authenticatedUser = (req as any).user as AuthenticatedUser;

    logWithContext.api('get_languages_stats', req.path, true, {
      requesterId: authenticatedUser?.id,
    });

    try {
      const stats = await databaseService.getGlobalStats();

      // Traitement des statistiques de langages
      const languageStats = stats.topLanguages.map((lang: unknown) => ({
        language: lang._id ?? lang.language,
        count: lang.count,
        percentage: ((lang.count / stats.totalRepositories) * 100).toFixed(2),
      }));

      res.status(200).json({
        languages: languageStats,
        summary: {
          totalRepositories: stats.totalRepositories,
          uniqueLanguages: languageStats.length,
          topLanguage: languageStats[0]?.language ?? null,
        },
        timestamp: new Date().toISOString(),
      });

    } catch (_error: unknown) {
      logWithContext.api('get_languages_stats', req.path, false, {
        _error: error.message,
      });

      throw error;
    }
  });

  /**
   * Tendances des repositories (plus populaires, récents, etc.)
   * GET /api/repositories/trending
   */
  static getTrendingRepositories = asyncHandler(async (req: Request, _res: Response): Promise<void> => {
    const { period = '7d', limit = 10, language } = req.query;
    const authenticatedUser = (req as any).user as AuthenticatedUser;

    logWithContext.api('get_trending_repositories', req.path, true, {
      requesterId: authenticatedUser?.id,
      period,
      language,
    });

    try {
      // Calcul de la date limite selon la période
      const now = new Date();
      const sinceDate = new Date();

      switch (period) {
      case '1d':
        sinceDate.setDate(now.getDate() - 1);
        break;
      case '7d':
        sinceDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        sinceDate.setDate(now.getDate() - 30);
        break;
      default:
        sinceDate.setDate(now.getDate() - 7);
      }

      // Filtres pour les repositories tendance
      const trendingFilters: unknown = {
        updatedAt: { $gte: sinceDate },
        isArchived: false,
        stargazerCount: { $gte: 1 }, // Au moins 1 star
      };

      if (language) {
        trendingFilters.primaryLanguage = language;
      }

      // Recherche des repositories tendance
      const trendingRepos = await databaseService.searchRepositories({
        filters: trendingFilters,
        page: 1,
        limit: Number(limit),
        sortBy: 'stargazerCount',
        sortOrder: 'desc',
      });

      // Recherche des repositories récents
      const recentRepos = await databaseService.searchRepositories({
        filters: language ? { primaryLanguage: language, isArchived: false } : { isArchived: false },
        page: 1,
        limit: Number(limit),
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      res.status(200).json({
        trending: {
          period,
          repositories: trendingRepos.repositories.map(repo => ({
            nameWithOwner: repo.nameWithOwner,
            name: repo.name,
            description: repo.description,
            owner: repo.owner,
            stargazerCount: repo.stargazerCount,
            forkCount: repo.forkCount,
            primaryLanguage: repo.primaryLanguage,
            topics: repo.topics,
            updatedAt: repo.updatedAt,
          })),
          totalCount: trendingRepos.totalCount,
        },
        recent: {
          repositories: recentRepos.repositories.slice(0, Number(limit)).map(repo => ({
            nameWithOwner: repo.nameWithOwner,
            name: repo.name,
            description: repo.description,
            owner: repo.owner,
            stargazerCount: repo.stargazerCount,
            primaryLanguage: repo.primaryLanguage,
            createdAt: repo.createdAt,
          })),
        },
        filters: {
          period,
          language,
          since: sinceDate.toISOString(),
        },
        timestamp: new Date().toISOString(),
      });

    } catch (_error: unknown) {
      logWithContext.api('get_trending_repositories', req.path, false, {
        _error: error.message,
        period,
        language,
      });

      throw error;
    }
  });
}

export default RepoController;
