"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RepositoryModel = void 0;
const database_1 = __importDefault(require("@/config/database"));
const logger_1 = __importDefault(require("@/utils/logger"));
class RepositoryModel {
    static async create(repoData, userId) {
        const prisma = database_1.default.getPrismaClient();
        if (!prisma) {
            throw new Error('Base de données non initialisée');
        }
        try {
            const repository = await prisma.repository.create({
                data: {
                    nameWithOwner: repoData.nameWithOwner,
                    name: repoData.name,
                    description: repoData.description || null,
                    isPrivate: repoData.isPrivate,
                    isArchived: repoData.isArchived,
                    isFork: repoData.isFork,
                    isTemplate: repoData.isTemplate,
                    stargazerCount: repoData.stargazerCount,
                    forkCount: repoData.forkCount,
                    watchersCount: repoData.watchersCount,
                    subscriberCount: repoData.subscriberCount || null,
                    networkCount: repoData.networkCount || null,
                    openIssuesCount: repoData.openIssuesCount,
                    primaryLanguage: repoData.primaryLanguage || null,
                    languages: repoData.languages,
                    topics: repoData.topics,
                    pushedAt: repoData.pushedAt || null,
                    updatedAt: repoData.updatedAt,
                    createdAt: repoData.createdAt,
                    homepageUrl: repoData.homepageUrl || null,
                    size: repoData.size,
                    defaultBranchRef: repoData.defaultBranchRef || null,
                    license: repoData.license || null,
                    hasIssuesEnabled: repoData.hasIssuesEnabled,
                    hasProjectsEnabled: repoData.hasProjectsEnabled,
                    hasWikiEnabled: repoData.hasWikiEnabled,
                    hasPages: repoData.hasPages || null,
                    hasDownloads: repoData.hasDownloads || null,
                    hasDiscussions: repoData.hasDiscussions || null,
                    vulnerabilityAlertsEnabled: repoData.vulnerabilityAlertsEnabled || null,
                    securityPolicyEnabled: repoData.securityPolicyEnabled || null,
                    codeOfConductEnabled: repoData.codeOfConductEnabled || null,
                    contributingGuidelinesEnabled: repoData.contributingGuidelinesEnabled || null,
                    readmeEnabled: repoData.readmeEnabled || null,
                    deployments: repoData.deployments,
                    environments: repoData.environments,
                    commits: repoData.commits,
                    releases: repoData.releases,
                    issues: repoData.issues,
                    pullRequests: repoData.pullRequests,
                    branchProtectionRules: repoData.branchProtectionRules,
                    collaborators: repoData.collaborators,
                    githubActions: repoData.githubActions || null,
                    security: repoData.security || null,
                    packages: repoData.packages || null,
                    branchProtection: repoData.branchProtection || null,
                    community: repoData.community || null,
                    traffic: repoData.traffic || null,
                    diskUsage: repoData.diskUsage || null,
                    owner: repoData.owner,
                    userId,
                },
            });
            logger_1.default.info('Repository créé avec succès', {
                repositoryId: repository.id,
                nameWithOwner: repository.nameWithOwner,
                userId,
            });
            return repository;
        }
        catch (error) {
            logger_1.default.error('Erreur lors de la création du repository', {
                nameWithOwner: repoData.nameWithOwner,
                error: error.message,
            });
            throw new Error(`Création repository échouée: ${error.message}`);
        }
    }
    static async findByNameWithOwner(nameWithOwner) {
        const prisma = database_1.default.getPrismaClient();
        if (!prisma) {
            throw new Error('Base de données non initialisée');
        }
        try {
            const repository = await prisma.repository.findUnique({
                where: { nameWithOwner },
                include: {
                    user: true,
                },
            });
            logger_1.default.debug('Recherche repository par nameWithOwner', {
                nameWithOwner,
                found: !!repository,
            });
            return repository;
        }
        catch (error) {
            logger_1.default.error('Erreur lors de la recherche repository', {
                nameWithOwner,
                error: error.message,
            });
            throw error;
        }
    }
    static async findByUserId(userId, options = {}) {
        const prisma = database_1.default.getPrismaClient();
        if (!prisma) {
            throw new Error('Base de données non initialisée');
        }
        try {
            const { limit = 10, offset = 0, includePrivate = true, sortBy = 'updated', sortOrder = 'desc' } = options;
            const where = { userId };
            if (!includePrivate) {
                where.isPrivate = false;
            }
            let orderBy;
            switch (sortBy) {
                case 'stars':
                    orderBy = { stargazerCount: sortOrder };
                    break;
                case 'forks':
                    orderBy = { forkCount: sortOrder };
                    break;
                case 'created':
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
            logger_1.default.debug('Recherche repositories par utilisateur', {
                userId,
                count: repositories.length,
                total,
                options,
            });
            return { repositories, total };
        }
        catch (error) {
            logger_1.default.error('Erreur lors de la recherche repositories par utilisateur', {
                userId,
                error: error.message,
            });
            throw error;
        }
    }
    static async update(id, updateData) {
        const prisma = database_1.default.getPrismaClient();
        if (!prisma) {
            throw new Error('Base de données non initialisée');
        }
        try {
            const data = { updatedAt: new Date() };
            const fieldMappings = [
                'description', 'stargazerCount', 'forkCount', 'watchersCount',
                'openIssuesCount', 'primaryLanguage', 'languages', 'topics',
                'pushedAt', 'homepageUrl', 'size', 'hasIssuesEnabled',
                'hasProjectsEnabled', 'hasWikiEnabled', 'deployments',
                'environments', 'commits', 'releases', 'issues', 'pullRequests',
                'githubActions', 'security', 'packages', 'branchProtection',
                'community', 'traffic'
            ];
            fieldMappings.forEach(field => {
                if (updateData[field] !== undefined) {
                    data[field] = updateData[field];
                }
            });
            const repository = await prisma.repository.update({
                where: { id },
                data,
            });
            logger_1.default.info('Repository mis à jour', {
                repositoryId: repository.id,
                nameWithOwner: repository.nameWithOwner,
            });
            return repository;
        }
        catch (error) {
            logger_1.default.error('Erreur lors de la mise à jour repository', {
                id,
                error: error.message,
            });
            throw new Error(`Mise à jour repository échouée: ${error.message}`);
        }
    }
    static async enrichWithDevOpsData(id, devOpsData) {
        const prisma = database_1.default.getPrismaClient();
        if (!prisma) {
            throw new Error('Base de données non initialisée');
        }
        try {
            const repository = await prisma.repository.update({
                where: { id },
                data: {
                    ...devOpsData,
                    updatedAt: new Date(),
                },
            });
            logger_1.default.info('Repository enrichi avec données DevOps', {
                repositoryId: repository.id,
                nameWithOwner: repository.nameWithOwner,
                enrichedFields: Object.keys(devOpsData),
            });
            return repository;
        }
        catch (error) {
            logger_1.default.error('Erreur lors de l\'enrichissement DevOps', {
                id,
                error: error.message,
            });
            throw error;
        }
    }
    static async delete(id) {
        const prisma = database_1.default.getPrismaClient();
        if (!prisma) {
            throw new Error('Base de données non initialisée');
        }
        try {
            await prisma.repository.delete({
                where: { id },
            });
            logger_1.default.info('Repository supprimé avec succès', { repositoryId: id });
        }
        catch (error) {
            logger_1.default.error('Erreur lors de la suppression repository', {
                id,
                error: error.message,
            });
            throw new Error(`Suppression repository échouée: ${error.message}`);
        }
    }
    static async search(filters) {
        const prisma = database_1.default.getPrismaClient();
        if (!prisma) {
            throw new Error('Base de données non initialisée');
        }
        try {
            const where = {};
            if (filters.search) {
                where.OR = [
                    { name: { contains: filters.search, mode: 'insensitive' } },
                    { description: { contains: filters.search, mode: 'insensitive' } },
                    { nameWithOwner: { contains: filters.search, mode: 'insensitive' } },
                ];
            }
            if (filters.language) {
                where.primaryLanguage = filters.language;
            }
            if (filters.topics && filters.topics.length > 0) {
                where.topics = { hasEvery: filters.topics };
            }
            if (filters.minStars !== undefined || filters.maxStars !== undefined) {
                where.stargazerCount = {};
                if (filters.minStars !== undefined) {
                    where.stargazerCount.gte = filters.minStars;
                }
                if (filters.maxStars !== undefined) {
                    where.stargazerCount.lte = filters.maxStars;
                }
            }
            if (filters.isPrivate !== undefined) {
                where.isPrivate = filters.isPrivate;
            }
            if (filters.hasActions) {
                where.githubActions = { not: null };
            }
            if (filters.hasSecurityAlerts) {
                where.security = { not: null };
            }
            const [repositories, total] = await Promise.all([
                prisma.repository.findMany({
                    where,
                    take: filters.limit || 10,
                    skip: filters.offset || 0,
                    orderBy: { stargazerCount: 'desc' },
                    include: {
                        user: { select: { login: true, avatarUrl: true } },
                    },
                }),
                prisma.repository.count({ where }),
            ]);
            logger_1.default.debug('Recherche avancée repositories', {
                filtersCount: Object.keys(filters).length,
                resultsCount: repositories.length,
                total,
            });
            return { repositories, total };
        }
        catch (error) {
            logger_1.default.error('Erreur lors de la recherche avancée repositories', {
                filters,
                error: error.message,
            });
            throw error;
        }
    }
    static async getStats() {
        const prisma = database_1.default.getPrismaClient();
        if (!prisma) {
            throw new Error('Base de données non initialisée');
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
                    orderBy: { _count: { primaryLanguage: 'desc' } },
                    take: 10,
                }),
                Promise.all([
                    prisma.repository.count({ where: { githubActions: { not: null } } }),
                    prisma.repository.count({ where: { security: { not: null } } }),
                    prisma.repository.count({ where: { packages: { not: null } } }),
                    prisma.repository.count({ where: { branchProtection: { not: null } } }),
                ]),
            ]);
            const topLanguages = languageStats.map(stat => ({
                language: stat.primaryLanguage || 'Unknown',
                count: stat._count.primaryLanguage,
            }));
            return {
                totalRepositories,
                totalStars: aggregates._sum.stargazerCount || 0,
                totalForks: aggregates._sum.forkCount || 0,
                topLanguages,
                devOpsAdoption: {
                    githubActions: devOpsStats[0],
                    security: devOpsStats[1],
                    packages: devOpsStats[2],
                    branchProtection: devOpsStats[3],
                },
            };
        }
        catch (error) {
            logger_1.default.error('Erreur lors du calcul des statistiques repositories', {
                error: error.message,
            });
            throw error;
        }
    }
    static async upsert(repoData, userId) {
        const prisma = database_1.default.getPrismaClient();
        if (!prisma) {
            throw new Error('Base de données non initialisée');
        }
        try {
            const repository = await prisma.repository.upsert({
                where: { nameWithOwner: repoData.nameWithOwner },
                update: {
                    description: repoData.description || null,
                    stargazerCount: repoData.stargazerCount,
                    forkCount: repoData.forkCount,
                    watchersCount: repoData.watchersCount,
                    openIssuesCount: repoData.openIssuesCount,
                    primaryLanguage: repoData.primaryLanguage || null,
                    languages: repoData.languages,
                    topics: repoData.topics,
                    pushedAt: repoData.pushedAt || null,
                    updatedAt: new Date(),
                    homepageUrl: repoData.homepageUrl || null,
                    size: repoData.size,
                    commits: repoData.commits,
                    releases: repoData.releases,
                    issues: repoData.issues,
                    pullRequests: repoData.pullRequests,
                    ...(repoData.githubActions && { githubActions: repoData.githubActions }),
                    ...(repoData.security && { security: repoData.security }),
                    ...(repoData.packages && { packages: repoData.packages }),
                    ...(repoData.branchProtection && { branchProtection: repoData.branchProtection }),
                    ...(repoData.community && { community: repoData.community }),
                    ...(repoData.traffic && { traffic: repoData.traffic }),
                },
                create: {
                    nameWithOwner: repoData.nameWithOwner,
                    name: repoData.name,
                    description: repoData.description || null,
                    isPrivate: repoData.isPrivate,
                    isArchived: repoData.isArchived,
                    isFork: repoData.isFork,
                    isTemplate: repoData.isTemplate,
                    stargazerCount: repoData.stargazerCount,
                    forkCount: repoData.forkCount,
                    watchersCount: repoData.watchersCount,
                    subscriberCount: repoData.subscriberCount || null,
                    networkCount: repoData.networkCount || null,
                    openIssuesCount: repoData.openIssuesCount,
                    primaryLanguage: repoData.primaryLanguage || null,
                    languages: repoData.languages,
                    topics: repoData.topics,
                    pushedAt: repoData.pushedAt || null,
                    updatedAt: repoData.updatedAt,
                    createdAt: repoData.createdAt,
                    homepageUrl: repoData.homepageUrl || null,
                    size: repoData.size,
                    defaultBranchRef: repoData.defaultBranchRef || null,
                    license: repoData.license || null,
                    hasIssuesEnabled: repoData.hasIssuesEnabled,
                    hasProjectsEnabled: repoData.hasProjectsEnabled,
                    hasWikiEnabled: repoData.hasWikiEnabled,
                    hasPages: repoData.hasPages || null,
                    hasDownloads: repoData.hasDownloads || null,
                    hasDiscussions: repoData.hasDiscussions || null,
                    vulnerabilityAlertsEnabled: repoData.vulnerabilityAlertsEnabled || null,
                    securityPolicyEnabled: repoData.securityPolicyEnabled || null,
                    codeOfConductEnabled: repoData.codeOfConductEnabled || null,
                    contributingGuidelinesEnabled: repoData.contributingGuidelinesEnabled || null,
                    readmeEnabled: repoData.readmeEnabled || null,
                    deployments: repoData.deployments,
                    environments: repoData.environments,
                    commits: repoData.commits,
                    releases: repoData.releases,
                    issues: repoData.issues,
                    pullRequests: repoData.pullRequests,
                    branchProtectionRules: repoData.branchProtectionRules,
                    collaborators: repoData.collaborators,
                    githubActions: repoData.githubActions || null,
                    security: repoData.security || null,
                    packages: repoData.packages || null,
                    branchProtection: repoData.branchProtection || null,
                    community: repoData.community || null,
                    traffic: repoData.traffic || null,
                    diskUsage: repoData.diskUsage || null,
                    owner: repoData.owner,
                    userId,
                },
            });
            logger_1.default.info('Repository upsert réussi', {
                repositoryId: repository.id,
                nameWithOwner: repository.nameWithOwner,
                userId,
            });
            return repository;
        }
        catch (error) {
            logger_1.default.error('Erreur lors de l\'upsert repository', {
                nameWithOwner: repoData.nameWithOwner,
                error: error.message,
            });
            throw new Error(`Upsert repository échoué: ${error.message}`);
        }
    }
}
exports.RepositoryModel = RepositoryModel;
//# sourceMappingURL=Repository.js.map