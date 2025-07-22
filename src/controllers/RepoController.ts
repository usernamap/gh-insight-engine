import { Request, Response } from 'express';
import { asyncHandler } from '@/middleware/errorHandler';
import { createError } from '@/middleware/errorHandler';
import { databaseService } from '@/services/DatabaseService';
import { logWithContext } from '@/utils/logger';
import { RepositoryModel } from '@/models/Repository';
import { AuthenticatedUser, GitHubRepo } from '@/types/github';

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
 * Contrôleur des repositories
 */
export class RepoController {
  /**
   * Récupération des détails d'un repository
   * GET /api/repositories/:owner/:repo
   */
  static getRepository = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { owner, repo } = req.params;
      const nameWithOwner = `${owner}/${repo}`;
      const authenticatedUser = req.user as AuthenticatedUser;

      logWithContext.api('get_repository', req.path, true, {
        nameWithOwner,
        requesterId: authenticatedUser?.id,
      });

      try {
        // Récupération du repository depuis la base de données
        const repositoryData =
          await RepositoryModel.findByNameWithOwner(nameWithOwner);

        if (!repositoryData) {
          // Si le repository n'existe pas en base, essayer de le récupérer depuis GitHub
          if (authenticatedUser?.githubToken) {
            try {
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
            vulnerabilityAlertsEnabled:
              repositoryData.vulnerabilityAlertsEnabled,
            securityPolicyEnabled: repositoryData.securityPolicyEnabled,
            codeOfConductEnabled: repositoryData.codeOfConductEnabled,
            contributingGuidelinesEnabled:
              repositoryData.contributingGuidelinesEnabled,
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
          devops:
            (repositoryData.githubActions ??
              repositoryData.security ??
              repositoryData.packages ??
              repositoryData.branchProtection)
              ? {
                githubActions: repositoryData.githubActions,
                security: repositoryData.security,
                packages: repositoryData.packages,
                branchProtection: repositoryData.branchProtection,
                community: repositoryData.community,
                traffic: repositoryData.traffic,
              }
              : null,
          timestamp: new Date().toISOString(),
        };

        logWithContext.api('get_repository', req.path, true, {
          nameWithOwner,
          hasDevOpsData: !!responseData.devops,
        });

        res.status(200).json(responseData);
        return;
      } catch (_error: unknown) {
        logWithContext.api('get_repository', req.path, false, {
          nameWithOwner,
          error: String(_error),
        });

        throw _error;
      }
    },
  );

  /**
   * Recherche de repositories
   * GET /api/repositories/search
   */
  static searchRepositories = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const searchParams = req.query as unknown as RepoSearchQuery;
      const authenticatedUser = req.user as AuthenticatedUser;

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
        const searchFilters: Record<string, unknown> = {};

        if (searchParams.query) {
          searchFilters.$or = [
            { name: { $regex: searchParams.query, $options: 'i' } },
            { nameWithOwner: { $regex: searchParams.query, $options: 'i' } },
            { description: { $regex: searchParams.query, $options: 'i' } },
            { topics: { $in: [new RegExp(searchParams.query, 'i')] } },
          ];
        }

        if (searchParams.language) {
          const orArray = Array.isArray(searchFilters.$or)
            ? searchFilters.$or
            : searchFilters.$or
              ? [searchFilters.$or]
              : [];
          searchFilters.$or = [
            ...orArray,
            {
              primaryLanguage: { $regex: searchParams.language, $options: 'i' },
            },
            {
              'languages.nodes.name': {
                $regex: searchParams.language,
                $options: 'i',
              },
            },
          ];
        }

        if (searchParams.topic) {
          searchFilters.topics = { $in: [new RegExp(searchParams.topic, 'i')] };
        }

        if (searchParams.minStars !== undefined) {
          searchFilters.stargazerCount = { $gte: searchParams.minStars };
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
        const result = await RepositoryModel.search({
          search: searchParams.query,
          language: searchParams.language,
          topics: searchParams.topic ? [searchParams.topic] : undefined,
          minStars: searchParams.minStars,
          isPrivate: searchParams.isPrivate,
          limit: searchParams.limit,
          offset: (searchParams.page - 1) * searchParams.limit,
        });

        logWithContext.api('search_repositories', req.path, true, {
          resultsCount: result.repositories.length,
          totalCount: result.total,
          searchQuery: searchParams.query,
        });

        // Correction stricte du typage pour garantir la compatibilité avec GitHubRepo
        const repositories: GitHubRepo[] = (result.repositories as unknown[])
          .filter((repo): repo is GitHubRepo => {
            const r = repo as Partial<GitHubRepo>;
            return (
              r &&
              typeof r.nameWithOwner === 'string' &&
              typeof r.name === 'string' &&
              typeof r.description !== 'undefined' &&
              r.languages !== undefined &&
              typeof r.languages.totalSize === 'number' &&
              Array.isArray(r.languages.nodes)
            );
          })
          .map((repo) => ({
            ...repo,
            description: repo.description ?? '',
            languages: {
              totalSize: repo.languages.totalSize,
              nodes: repo.languages.nodes,
            },
          }));
        const responseData = {
          repositories: repositories.map((repo) => ({
            _id: repo._id,
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
            subscriberCount: repo.subscriberCount,
            networkCount: repo.networkCount,
            openIssuesCount: repo.openIssuesCount,
            primaryLanguage: repo.primaryLanguage,
            languages: repo.languages,
            topics: repo.topics,
            pushedAt: repo.pushedAt,
            updatedAt: repo.updatedAt,
            createdAt: repo.createdAt,
            homepageUrl: repo.homepageUrl,
            size: repo.size,
            defaultBranchRef: repo.defaultBranchRef,
            license: repo.license,
            hasIssuesEnabled: repo.hasIssuesEnabled,
            hasProjectsEnabled: repo.hasProjectsEnabled,
            hasWikiEnabled: repo.hasWikiEnabled,
            hasPages: repo.hasPages,
            hasDownloads: repo.hasDownloads,
            hasDiscussions: repo.hasDiscussions,
            vulnerabilityAlertsEnabled: repo.vulnerabilityAlertsEnabled,
            securityPolicyEnabled: repo.securityPolicyEnabled,
            codeOfConductEnabled: repo.codeOfConductEnabled,
            contributingGuidelinesEnabled: repo.contributingGuidelinesEnabled,
            readmeEnabled: repo.readmeEnabled,
            deployments: repo.deployments,
            environments: repo.environments,
            commits: repo.commits,
            releases: repo.releases,
            issues: repo.issues,
            pullRequests: repo.pullRequests,
            branchProtectionRules: repo.branchProtectionRules,
            collaborators: repo.collaborators,
            githubActions: repo.githubActions,
            security: repo.security,
            packages: repo.packages,
            branchProtection: repo.branchProtection,
            community: repo.community,
            traffic: repo.traffic,
            diskUsage: repo.diskUsage,
            owner: repo.owner,
            userId: repo.userId,
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
            language: searchParams.language,
            topic: searchParams.topic,
            minStars: searchParams.minStars,
            isPrivate: searchParams.isPrivate,
            isFork: searchParams.isFork,
          },
          timestamp: new Date().toISOString(),
        };
        res.status(200).json(responseData);
        return;
      } catch (_error: unknown) {
        logWithContext.api('search_repositories', req.path, false, {
          error: String(_error),
          searchQuery: searchParams.query,
        });

        throw _error;
      }
    },
  );

  /**
   * Enrichissement DevOps d'un repository
   * POST /api/repositories/:owner/:repo/enrich
   */
  static enrichRepository = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { owner, repo } = req.params;
      const nameWithOwner = `${owner}/${repo}`;
      const authenticatedUser = req.user as AuthenticatedUser;

      if (!authenticatedUser?.githubToken) {
        throw createError.authentication(
          "Token GitHub requis pour l'enrichissement",
        );
      }

      logWithContext.api('enrich_repository', req.path, true, {
        nameWithOwner,
        requesterId: authenticatedUser.id,
      });

      try {
        // Vérifier que le repository existe en base
        const existingRepo =
          await RepositoryModel.findByNameWithOwner(nameWithOwner);

        if (!existingRepo) {
          throw createError.notFound(
            'Repository non trouvé en base de données',
          );
        }

        // Enrichissement avec les données DevOps
        const enrichedData = await RepositoryModel.enrichWithDevOpsData(
          existingRepo.id,
          {
            githubActions: existingRepo.githubActions as unknown as import('@/types/github').GitHubActions | undefined,
            security: existingRepo.security as unknown as import('@/types/github').GitHubSecurity | undefined,
            packages: existingRepo.packages as unknown as import('@/types/github').GitHubPackages | undefined,
            branchProtection: existingRepo.branchProtection as unknown as import('@/types/github').GitHubBranchProtection | undefined,
            community: existingRepo.community as unknown as import('@/types/github').GitHubCommunity | undefined,
            traffic: existingRepo.traffic as unknown as import('@/types/github').GitHubTraffic | undefined,
          },
        );

        if (!enrichedData) {
          throw createError.externalService(
            'GitHub API',
            new Error("Impossible d'enrichir le repository"),
          );
        }

        // Mise à jour en base de données
        await RepositoryModel.enrichWithDevOpsData(nameWithOwner, {
          githubActions: enrichedData.githubActions as unknown as import('@/types/github').GitHubActions | undefined,
          security: enrichedData.security as unknown as import('@/types/github').GitHubSecurity | undefined,
          packages: enrichedData.packages as unknown as import('@/types/github').GitHubPackages | undefined,
          branchProtection: enrichedData.branchProtection as unknown as import('@/types/github').GitHubBranchProtection | undefined,
          community: enrichedData.community as unknown as import('@/types/github').GitHubCommunity | undefined,
          traffic: enrichedData.traffic as unknown as import('@/types/github').GitHubTraffic | undefined,
        });

        logWithContext.api('enrich_repository', req.path, true, {
          nameWithOwner,
          enrichedFields: Object.keys(enrichedData).filter(
            (key) => !!enrichedData[key as keyof typeof enrichedData],
          ),
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
        return;
      } catch (_error: unknown) {
        logWithContext.api('enrich_repository', req.path, false, {
          nameWithOwner,
          error: String(_error),
        });

        throw _error;
      }
    },
  );

  /**
   * Statistiques des langages de programmation
   * GET /api/repositories/languages/stats
   */
  static getLanguagesStats = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const authenticatedUser = req.user as AuthenticatedUser;

      logWithContext.api('get_languages_stats', req.path, true, {
        requesterId: authenticatedUser?.id,
      });

      try {
        const stats = await databaseService.getPlatformStats();

        // Traitement des statistiques de langages
        const languageStats = stats.repositories.topLanguages.map(
          (lang: { language: string; count: number }) => ({
            language: lang.language,
            count: lang.count,
            percentage: ((lang.count / stats.repositories.total) * 100).toFixed(
              2,
            ),
          }),
        );

        res.status(200).json({
          languages: languageStats,
          summary: {
            totalRepositories: stats.repositories.total,
            uniqueLanguages: languageStats.length,
            topLanguage: languageStats[0]?.language ?? null,
          },
          timestamp: new Date().toISOString(),
        });
        return;
      } catch (_error: unknown) {
        logWithContext.api('get_languages_stats', req.path, false, {
          error: String(_error),
        });

        throw _error;
      }
    },
  );

  /**
   * Tendances des repositories (plus populaires, récents, etc.)
   * GET /api/repositories/trending
   */
  static getTrendingRepositories = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { period = '7d', limit = 10, language } = req.query;
      const authenticatedUser = req.user as AuthenticatedUser;

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
        const trendingFilters: Record<string, unknown> = {
          updatedAt: { $gte: sinceDate },
          isArchived: false,
          stargazerCount: { $gte: 1 }, // Au moins 1 star
        };

        if (language) {
          trendingFilters.primaryLanguage = language;
        }

        // Recherche des repositories tendance
        const trendingRepos = await RepositoryModel.search({
          limit: Number(limit),
        });

        // Recherche des repositories récents
        const recentRepos = await RepositoryModel.search({
          limit: Number(limit),
        });

        res.status(200).json({
          trending: {
            period,
            repositories: trendingRepos.repositories.map((repo) => ({
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
            totalCount: trendingRepos.total,
          },
          recent: {
            repositories: recentRepos.repositories
              .slice(0, Number(limit))
              .map((repo) => ({
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
        return;
      } catch (_error: unknown) {
        logWithContext.api('get_trending_repositories', req.path, false, {
          error: String(_error),
          period,
          language,
        });

        throw _error;
      }
    },
  );
}

export default RepoController;
