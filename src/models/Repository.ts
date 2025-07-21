/**
 * Modèle Repository - Collection repositories
 * CRUD operations et enrichissement DevOps pour les repositories GitHub
 */

import { Repository as PrismaRepository } from '@/generated/prisma';
import { GitHubRepo } from '@/types/github';
import databaseConfig from '@/config/database';
import logger from '@/utils/logger';

export class RepositoryModel {
    /**
     * Crée un nouveau repository
     */
    static async create(repoData: GitHubRepo, userId: string): Promise<PrismaRepository> {
        const prisma = databaseConfig.getPrismaClient();
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
                    // DevOps data (optionnel)
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

            logger.info('Repository créé avec succès', {
                repositoryId: repository.id,
                nameWithOwner: repository.nameWithOwner,
                userId,
            });

            return repository;
        } catch (error: any) {
            logger.error('Erreur lors de la création du repository', {
                nameWithOwner: repoData.nameWithOwner,
                error: error.message,
            });
            throw new Error(`Création repository échouée: ${error.message}`);
        }
    }

    /**
     * Trouve un repository par nameWithOwner
     */
    static async findByNameWithOwner(nameWithOwner: string): Promise<PrismaRepository | null> {
        const prisma = databaseConfig.getPrismaClient();
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

            logger.debug('Recherche repository par nameWithOwner', {
                nameWithOwner,
                found: !!repository,
            });

            return repository;
        } catch (error: any) {
            logger.error('Erreur lors de la recherche repository', {
                nameWithOwner,
                error: error.message,
            });
            throw error;
        }
    }

    /**
     * Trouve des repositories par utilisateur
     */
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
        if (!prisma) {
            throw new Error('Base de données non initialisée');
        }

        try {
            const {
                limit = 10,
                offset = 0,
                includePrivate = true,
                sortBy = 'updated',
                sortOrder = 'desc'
            } = options;

            const where: any = { userId };

            if (!includePrivate) {
                where.isPrivate = false;
            }

            // Configuration du tri
            let orderBy: any;
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

            logger.debug('Recherche repositories par utilisateur', {
                userId,
                count: repositories.length,
                total,
                options,
            });

            return { repositories, total };
        } catch (error: any) {
            logger.error('Erreur lors de la recherche repositories par utilisateur', {
                userId,
                error: error.message,
            });
            throw error;
        }
    }

    /**
     * Met à jour un repository
     */
    static async update(id: string, updateData: Partial<GitHubRepo>): Promise<PrismaRepository> {
        const prisma = databaseConfig.getPrismaClient();
        if (!prisma) {
            throw new Error('Base de données non initialisée');
        }

        try {
            // Construction dynamique de l'objet data
            const data: any = { updatedAt: new Date() };

            // Mise à jour sélective des champs
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
                if (updateData[field as keyof GitHubRepo] !== undefined) {
                    data[field] = updateData[field as keyof GitHubRepo];
                }
            });

            const repository = await prisma.repository.update({
                where: { id },
                data,
            });

            logger.info('Repository mis à jour', {
                repositoryId: repository.id,
                nameWithOwner: repository.nameWithOwner,
            });

            return repository;
        } catch (error: any) {
            logger.error('Erreur lors de la mise à jour repository', {
                id,
                error: error.message,
            });
            throw new Error(`Mise à jour repository échouée: ${error.message}`);
        }
    }

    /**
     * Enrichit un repository avec des données DevOps
     */
    static async enrichWithDevOpsData(
        id: string,
        devOpsData: {
            githubActions?: any;
            security?: any;
            packages?: any;
            branchProtection?: any;
            community?: any;
            traffic?: any;
        }
    ): Promise<PrismaRepository> {
        const prisma = databaseConfig.getPrismaClient();
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

            logger.info('Repository enrichi avec données DevOps', {
                repositoryId: repository.id,
                nameWithOwner: repository.nameWithOwner,
                enrichedFields: Object.keys(devOpsData),
            });

            return repository;
        } catch (error: any) {
            logger.error('Erreur lors de l\'enrichissement DevOps', {
                id,
                error: error.message,
            });
            throw error;
        }
    }

    /**
     * Supprime un repository
     */
    static async delete(id: string): Promise<void> {
        const prisma = databaseConfig.getPrismaClient();
        if (!prisma) {
            throw new Error('Base de données non initialisée');
        }

        try {
            await prisma.repository.delete({
                where: { id },
            });

            logger.info('Repository supprimé avec succès', { repositoryId: id });
        } catch (error: any) {
            logger.error('Erreur lors de la suppression repository', {
                id,
                error: error.message,
            });
            throw new Error(`Suppression repository échouée: ${error.message}`);
        }
    }

    /**
     * Recherche avancée de repositories
     */
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
        if (!prisma) {
            throw new Error('Base de données non initialisée');
        }

        try {
            const where: any = {};

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

            logger.debug('Recherche avancée repositories', {
                filtersCount: Object.keys(filters).length,
                resultsCount: repositories.length,
                total,
            });

            return { repositories, total };
        } catch (error: any) {
            logger.error('Erreur lors de la recherche avancée repositories', {
                filters,
                error: error.message,
            });
            throw error;
        }
    }

    /**
     * Statistiques des repositories
     */
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
        if (!prisma) {
            throw new Error('Base de données non initialisée');
        }

        try {
            const [
                totalRepositories,
                aggregates,
                languageStats,
                devOpsStats
            ] = await Promise.all([
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
        } catch (error: any) {
            logger.error('Erreur lors du calcul des statistiques repositories', {
                error: error.message,
            });
            throw error;
        }
    }

    /**
     * Crée ou met à jour un repository (upsert)
     */
    static async upsert(repoData: GitHubRepo, userId: string): Promise<PrismaRepository> {
        const prisma = databaseConfig.getPrismaClient();
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
                    // Mise à jour des données DevOps si présentes
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

            logger.info('Repository upsert réussi', {
                repositoryId: repository.id,
                nameWithOwner: repository.nameWithOwner,
                userId,
            });

            return repository;
        } catch (error: any) {
            logger.error('Erreur lors de l\'upsert repository', {
                nameWithOwner: repoData.nameWithOwner,
                error: error.message,
            });
            throw new Error(`Upsert repository échoué: ${error.message}`);
        }
    }
} 