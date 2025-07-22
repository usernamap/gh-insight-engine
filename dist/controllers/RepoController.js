"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RepoController = void 0;
const errorHandler_1 = require("@/middleware/errorHandler");
const errorHandler_2 = require("@/middleware/errorHandler");
const DatabaseService_1 = require("@/services/DatabaseService");
const logger_1 = require("@/utils/logger");
const Repository_1 = require("@/models/Repository");
class RepoController {
}
exports.RepoController = RepoController;
_a = RepoController;
RepoController.getRepository = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { owner, repo } = req.params;
    const nameWithOwner = `${owner}/${repo}`;
    const authenticatedUser = req.user;
    logger_1.logWithContext.api('get_repository', req.path, true, {
        nameWithOwner,
        requesterId: authenticatedUser?.id,
    });
    try {
        const repositoryData = await Repository_1.RepositoryModel.findByNameWithOwner(nameWithOwner);
        if (!repositoryData) {
            if (authenticatedUser?.githubToken) {
                try {
                    throw errorHandler_2.createError.notFound('Repository');
                }
                catch (_error) {
                    throw errorHandler_2.createError.notFound('Repository');
                }
            }
            else {
                throw errorHandler_2.createError.notFound('Repository');
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
            devops: (repositoryData.githubActions ??
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
        logger_1.logWithContext.api('get_repository', req.path, true, {
            nameWithOwner,
            hasDevOpsData: !!responseData.devops,
        });
        res.status(200).json(responseData);
        return;
    }
    catch (_error) {
        logger_1.logWithContext.api('get_repository', req.path, false, {
            nameWithOwner,
            error: String(_error),
        });
        throw _error;
    }
});
RepoController.searchRepositories = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const searchParams = req.query;
    const authenticatedUser = req.user;
    logger_1.logWithContext.api('search_repositories', req.path, true, {
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
        const result = await Repository_1.RepositoryModel.search({
            search: searchParams.query,
            language: searchParams.language,
            topics: searchParams.topic ? [searchParams.topic] : undefined,
            minStars: searchParams.minStars,
            isPrivate: searchParams.isPrivate,
            limit: searchParams.limit,
            offset: (searchParams.page - 1) * searchParams.limit,
        });
        logger_1.logWithContext.api('search_repositories', req.path, true, {
            resultsCount: result.repositories.length,
            totalCount: result.total,
            searchQuery: searchParams.query,
        });
        const repositories = result.repositories
            .filter((repo) => {
            const r = repo;
            return (r &&
                typeof r.nameWithOwner === 'string' &&
                typeof r.name === 'string' &&
                typeof r.description !== 'undefined' &&
                r.languages !== undefined &&
                typeof r.languages.totalSize === 'number' &&
                Array.isArray(r.languages.nodes));
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
    }
    catch (_error) {
        logger_1.logWithContext.api('search_repositories', req.path, false, {
            error: String(_error),
            searchQuery: searchParams.query,
        });
        throw _error;
    }
});
RepoController.enrichRepository = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { owner, repo } = req.params;
    const nameWithOwner = `${owner}/${repo}`;
    const authenticatedUser = req.user;
    if (!authenticatedUser?.githubToken) {
        throw errorHandler_2.createError.authentication("Token GitHub requis pour l'enrichissement");
    }
    logger_1.logWithContext.api('enrich_repository', req.path, true, {
        nameWithOwner,
        requesterId: authenticatedUser.id,
    });
    try {
        const existingRepo = await Repository_1.RepositoryModel.findByNameWithOwner(nameWithOwner);
        if (!existingRepo) {
            throw errorHandler_2.createError.notFound('Repository non trouvé en base de données');
        }
        const enrichedData = await Repository_1.RepositoryModel.enrichWithDevOpsData(existingRepo.id, {
            githubActions: existingRepo.githubActions,
            security: existingRepo.security,
            packages: existingRepo.packages,
            branchProtection: existingRepo.branchProtection,
            community: existingRepo.community,
            traffic: existingRepo.traffic,
        });
        if (!enrichedData) {
            throw errorHandler_2.createError.externalService('GitHub API', new Error("Impossible d'enrichir le repository"));
        }
        await Repository_1.RepositoryModel.enrichWithDevOpsData(nameWithOwner, {
            githubActions: enrichedData.githubActions,
            security: enrichedData.security,
            packages: enrichedData.packages,
            branchProtection: enrichedData.branchProtection,
            community: enrichedData.community,
            traffic: enrichedData.traffic,
        });
        logger_1.logWithContext.api('enrich_repository', req.path, true, {
            nameWithOwner,
            enrichedFields: Object.keys(enrichedData).filter((key) => !!enrichedData[key]),
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
    }
    catch (_error) {
        logger_1.logWithContext.api('enrich_repository', req.path, false, {
            nameWithOwner,
            error: String(_error),
        });
        throw _error;
    }
});
RepoController.getLanguagesStats = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const authenticatedUser = req.user;
    logger_1.logWithContext.api('get_languages_stats', req.path, true, {
        requesterId: authenticatedUser?.id,
    });
    try {
        const stats = await DatabaseService_1.databaseService.getPlatformStats();
        const languageStats = stats.repositories.topLanguages.map((lang) => ({
            language: lang.language,
            count: lang.count,
            percentage: ((lang.count / stats.repositories.total) * 100).toFixed(2),
        }));
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
    }
    catch (_error) {
        logger_1.logWithContext.api('get_languages_stats', req.path, false, {
            error: String(_error),
        });
        throw _error;
    }
});
RepoController.getTrendingRepositories = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { period = '7d', limit = 10, language } = req.query;
    const authenticatedUser = req.user;
    logger_1.logWithContext.api('get_trending_repositories', req.path, true, {
        requesterId: authenticatedUser?.id,
        period,
        language,
    });
    try {
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
        const trendingFilters = {
            updatedAt: { $gte: sinceDate },
            isArchived: false,
            stargazerCount: { $gte: 1 },
        };
        if (language) {
            trendingFilters.primaryLanguage = language;
        }
        const trendingRepos = await Repository_1.RepositoryModel.search({
            limit: Number(limit),
        });
        const recentRepos = await Repository_1.RepositoryModel.search({
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
    }
    catch (_error) {
        logger_1.logWithContext.api('get_trending_repositories', req.path, false, {
            error: String(_error),
            period,
            language,
        });
        throw _error;
    }
});
exports.default = RepoController;
//# sourceMappingURL=RepoController.js.map