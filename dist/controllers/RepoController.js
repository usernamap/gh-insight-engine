"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RepoController = void 0;
const errorHandler_1 = require("@/middleware/errorHandler");
const errorHandler_2 = require("@/middleware/errorHandler");
const DatabaseService_1 = require("@/services/DatabaseService");
const GitHubService_1 = require("@/services/GitHubService");
const logger_1 = require("@/utils/logger");
class RepoController {}
exports.RepoController = RepoController;
_a = RepoController;
RepoController.getRepository = (0, errorHandler_1.asyncHandler)(
  async (req, res) => {
    const { owner, repo } = req.params;
    const nameWithOwner = `${owner}/${repo}`;
    const authenticatedUser = req.user;
    logger_1.logWithContext.api("get_repository", req.path, true, {
      nameWithOwner,
      requesterId: authenticatedUser?.id,
    });
    try {
      const repositoryData =
        await DatabaseService_1.databaseService.getRepository(nameWithOwner);
      if (!repositoryData) {
        if (authenticatedUser?.githubToken) {
          try {
            logger_1.logWithContext.github(
              "fetch_repository_from_api",
              nameWithOwner,
              true,
            );
            throw errorHandler_2.createError.notFound("Repository");
          } catch (error) {
            throw errorHandler_2.createError.notFound("Repository");
          }
        } else {
          throw errorHandler_2.createError.notFound("Repository");
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
          repositoryData.githubActions ||
          repositoryData.security ||
          repositoryData.packages ||
          repositoryData.branchProtection
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
      logger_1.logWithContext.api("get_repository", req.path, true, {
        nameWithOwner,
        hasDevOpsData: !!responseData.devops,
      });
      res.status(200).json(responseData);
    } catch (error) {
      logger_1.logWithContext.api("get_repository", req.path, false, {
        nameWithOwner,
        error: error.message,
      });
      throw error;
    }
  },
);
RepoController.searchRepositories = (0, errorHandler_1.asyncHandler)(
  async (req, res) => {
    const searchParams = req.query;
    const authenticatedUser = req.user;
    logger_1.logWithContext.api("search_repositories", req.path, true, {
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
      const searchFilters = {};
      if (searchParams.query) {
        searchFilters.$or = [
          { name: { $regex: searchParams.query, $options: "i" } },
          { nameWithOwner: { $regex: searchParams.query, $options: "i" } },
          { description: { $regex: searchParams.query, $options: "i" } },
          { topics: { $in: [new RegExp(searchParams.query, "i")] } },
        ];
      }
      if (searchParams.language) {
        searchFilters.$or = [
          ...(searchFilters.$or || []),
          { primaryLanguage: { $regex: searchParams.language, $options: "i" } },
          {
            "languages.nodes.name": {
              $regex: searchParams.language,
              $options: "i",
            },
          },
        ];
      }
      if (searchParams.topic) {
        searchFilters.topics = { $in: [new RegExp(searchParams.topic, "i")] };
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
      const result = await DatabaseService_1.databaseService.searchRepositories(
        {
          filters: searchFilters,
          page: searchParams.page,
          limit: searchParams.limit,
          sortBy: searchParams.sortBy,
          sortOrder: searchParams.sortOrder,
        },
      );
      logger_1.logWithContext.api("search_repositories", req.path, true, {
        resultsCount: result.repositories.length,
        totalCount: result.totalCount,
        searchQuery: searchParams.query,
      });
      res.status(200).json({
        repositories: result.repositories.map((repo) => ({
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
          hasNextPage:
            searchParams.page * searchParams.limit < result.totalCount,
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
    } catch (error) {
      logger_1.logWithContext.api("search_repositories", req.path, false, {
        error: error.message,
        searchQuery: searchParams.query,
      });
      throw error;
    }
  },
);
RepoController.enrichRepository = (0, errorHandler_1.asyncHandler)(
  async (req, res) => {
    const { owner, repo } = req.params;
    const nameWithOwner = `${owner}/${repo}`;
    const authenticatedUser = req.user;
    if (!authenticatedUser?.githubToken) {
      throw errorHandler_2.createError.authentication(
        "Token GitHub requis pour l'enrichissement",
      );
    }
    logger_1.logWithContext.api("enrich_repository", req.path, true, {
      nameWithOwner,
      requesterId: authenticatedUser.id,
    });
    try {
      const existingRepo =
        await DatabaseService_1.databaseService.getRepository(nameWithOwner);
      if (!existingRepo) {
        throw errorHandler_2.createError.notFound(
          "Repository non trouvé en base de données",
        );
      }
      const enrichedData =
        await GitHubService_1.githubService.enrichWithDevOpsData(
          owner,
          repo,
          authenticatedUser.githubToken,
        );
      if (!enrichedData) {
        throw errorHandler_2.createError.externalService(
          "GitHub API",
          new Error("Impossible d'enrichir le repository"),
        );
      }
      const updatedRepo =
        await DatabaseService_1.databaseService.enrichRepository(
          nameWithOwner,
          {
            githubActions: enrichedData.githubActions,
            security: enrichedData.security,
            packages: enrichedData.packages,
            branchProtection: enrichedData.branchProtection,
            community: enrichedData.community,
            traffic: enrichedData.traffic,
          },
        );
      logger_1.logWithContext.api("enrich_repository", req.path, true, {
        nameWithOwner,
        enrichedFields: Object.keys(enrichedData).filter(
          (key) => !!enrichedData[key],
        ),
      });
      res.status(200).json({
        message: "Repository enrichi avec succès",
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
    } catch (error) {
      logger_1.logWithContext.api("enrich_repository", req.path, false, {
        nameWithOwner,
        error: error.message,
      });
      throw error;
    }
  },
);
RepoController.getLanguagesStats = (0, errorHandler_1.asyncHandler)(
  async (req, res) => {
    const authenticatedUser = req.user;
    logger_1.logWithContext.api("get_languages_stats", req.path, true, {
      requesterId: authenticatedUser?.id,
    });
    try {
      const stats = await DatabaseService_1.databaseService.getGlobalStats();
      const languageStats = stats.topLanguages.map((lang) => ({
        language: lang._id || lang.language,
        count: lang.count,
        percentage: ((lang.count / stats.totalRepositories) * 100).toFixed(2),
      }));
      res.status(200).json({
        languages: languageStats,
        summary: {
          totalRepositories: stats.totalRepositories,
          uniqueLanguages: languageStats.length,
          topLanguage: languageStats[0]?.language || null,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger_1.logWithContext.api("get_languages_stats", req.path, false, {
        error: error.message,
      });
      throw error;
    }
  },
);
RepoController.getTrendingRepositories = (0, errorHandler_1.asyncHandler)(
  async (req, res) => {
    const { period = "7d", limit = 10, language } = req.query;
    const authenticatedUser = req.user;
    logger_1.logWithContext.api("get_trending_repositories", req.path, true, {
      requesterId: authenticatedUser?.id,
      period,
      language,
    });
    try {
      const now = new Date();
      let sinceDate = new Date();
      switch (period) {
        case "1d":
          sinceDate.setDate(now.getDate() - 1);
          break;
        case "7d":
          sinceDate.setDate(now.getDate() - 7);
          break;
        case "30d":
          sinceDate.setDate(now.getDate() - 30);
          break;
        default:
          sinceDate.setDate(now.getDate() - 7);
      }
      const trendingFilters = {
        updatedAt: { $gte: sinceDate },
        isArchived: false,
        stargazerCount: { $gte: 1 },
      };
      if (language) {
        trendingFilters.primaryLanguage = language;
      }
      const trendingRepos =
        await DatabaseService_1.databaseService.searchRepositories({
          filters: trendingFilters,
          page: 1,
          limit: Number(limit),
          sortBy: "stargazerCount",
          sortOrder: "desc",
        });
      const recentRepos =
        await DatabaseService_1.databaseService.searchRepositories({
          filters: language
            ? { primaryLanguage: language, isArchived: false }
            : { isArchived: false },
          page: 1,
          limit: Number(limit),
          sortBy: "createdAt",
          sortOrder: "desc",
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
          totalCount: trendingRepos.totalCount,
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
    } catch (error) {
      logger_1.logWithContext.api(
        "get_trending_repositories",
        req.path,
        false,
        {
          error: error.message,
          period,
          language,
        },
      );
      throw error;
    }
  },
);
exports.default = RepoController;
//# sourceMappingURL=RepoController.js.map
