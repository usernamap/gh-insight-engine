"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.databaseService = exports.DatabaseService = void 0;
const models_1 = require("@/models");
const models_2 = require("@/models");
const models_3 = require("@/models");
const database_1 = __importDefault(require("@/config/database"));
const logger_1 = __importDefault(require("@/utils/logger"));
class DatabaseService {
    async saveCompleteUserDataset(userProfile, repositories, metadata, analytics, insights) {
        const startTime = Date.now();
        try {
            logger_1.default.info('Début sauvegarde dataset complet', {
                username: userProfile.login,
                repositoriesCount: repositories.length,
            });
            return await database_1.default.transaction(async () => {
                const user = await models_3.UserModel.upsert(userProfile);
                const savedRepositories = [];
                for (const repo of repositories) {
                    const savedRepo = await models_2.RepositoryModel.upsert(repo, user.id);
                    savedRepositories.push(savedRepo);
                }
                const repositoryIds = savedRepositories.map((repo) => repo.id);
                let dataset = await models_1.DatasetModel.create(user.id, metadata, repositoryIds);
                if (analytics) {
                    dataset = await models_1.DatasetModel.updateAnalytics(dataset.id, analytics);
                }
                if (insights) {
                    dataset = await models_1.DatasetModel.updateInsights(dataset.id, insights);
                }
                const processingTime = (Date.now() - startTime) / 1000;
                logger_1.default.info('Dataset complet sauvegardé avec succès', {
                    username: userProfile.login,
                    userId: user.id,
                    datasetId: dataset.id,
                    repositoriesCount: savedRepositories.length,
                    processingTime: `${processingTime}s`,
                });
                return {
                    user,
                    repositories: savedRepositories,
                    dataset,
                };
            });
        }
        catch (_error) {
            logger_1.default.error('Erreur sauvegarde dataset complet', {
                username: userProfile.login,
                error: _error.message,
            });
            throw new Error(`Sauvegarde dataset échouée: ${_error.message}`);
        }
    }
    async getCompleteDataset(datasetId) {
        try {
            const dataset = await models_1.DatasetModel.findById(datasetId);
            if (!dataset) {
                return null;
            }
            const [user, repositories] = await Promise.all([
                models_3.UserModel.findById(dataset.userProfileId),
                this.getRepositoriesByIds(dataset.repositories),
            ]);
            if (!user) {
                throw new Error('Utilisateur associé au dataset non trouvé');
            }
            return {
                dataset,
                user,
                repositories,
            };
        }
        catch (_error) {
            logger_1.default.error('Erreur récupération dataset complet', {
                datasetId,
                error: _error.message,
            });
            throw new Error(`Erreur récupération dataset complet: ${_error.message}`);
        }
    }
    async getLatestUserDataset(username) {
        try {
            const user = await models_3.UserModel.findByLogin(username);
            if (!user) {
                return null;
            }
            const dataset = await models_1.DatasetModel.findLatestByUserId(user.id);
            if (!dataset) {
                return null;
            }
            const repositories = await this.getRepositoriesByIds(dataset.repositories);
            return {
                dataset,
                user,
                repositories,
            };
        }
        catch (_error) {
            logger_1.default.error('Erreur récupération dernier dataset utilisateur', {
                username,
                error: _error.message,
            });
            throw new Error(`Erreur récupération dernier dataset utilisateur: ${_error.message}`);
        }
    }
    async updateDatasetAnalyses(datasetId, analytics, insights) {
        try {
            let dataset = await models_1.DatasetModel.findById(datasetId);
            if (!dataset) {
                throw new Error('Dataset non trouvé');
            }
            if (analytics) {
                dataset = await models_1.DatasetModel.updateAnalytics(datasetId, analytics);
            }
            if (insights) {
                dataset = await models_1.DatasetModel.updateInsights(datasetId, insights);
            }
            logger_1.default.info('Analyses dataset mises à jour', {
                datasetId,
                hasAnalytics: !!analytics,
                hasInsights: !!insights,
            });
            return dataset;
        }
        catch (_error) {
            logger_1.default.error('Erreur mise à jour analyses dataset', {
                datasetId,
                error: _error.message,
            });
            throw new Error(`Erreur mise à jour analyses dataset: ${_error.message}`);
        }
    }
    async enrichRepositoriesWithDevOpsData(repositoryIds, devOpsDataMap) {
        try {
            const enrichedRepositories = [];
            for (const repositoryId of repositoryIds) {
                const devOpsData = devOpsDataMap[repositoryId];
                if (devOpsData != null) {
                    const enrichedRepo = await models_2.RepositoryModel.enrichWithDevOpsData(repositoryId, devOpsData);
                    enrichedRepositories.push(enrichedRepo);
                }
            }
            logger_1.default.info('Repositories enrichis avec données DevOps', {
                count: enrichedRepositories.length,
                total: repositoryIds.length,
            });
            return enrichedRepositories;
        }
        catch (_error) {
            logger_1.default.error('Erreur enrichissement repositories DevOps', {
                error: _error.message,
            });
            throw new Error(`Erreur enrichissement repositories DevOps: ${_error.message}`);
        }
    }
    async searchUsersWithStats(filters) {
        try {
            const { users, total } = await models_3.UserModel.search(filters);
            const enrichedUsers = await Promise.all(users.map(async (user) => {
                const [repositoriesResult, datasetsResult] = await Promise.all([
                    models_2.RepositoryModel.findByUserId(user.id, { limit: 1 }),
                    models_1.DatasetModel.findByUserId(user.id, { limit: 1 }),
                ]);
                const stats = {
                    repositoriesCount: repositoriesResult.total,
                    datasetsCount: datasetsResult.total,
                    lastActivity: repositoriesResult.repositories[0]?.pushedAt ?? undefined,
                };
                return {
                    ...user,
                    stats,
                };
            }));
            return {
                users: enrichedUsers,
                total,
            };
        }
        catch (_error) {
            logger_1.default.error('Erreur recherche utilisateurs avec stats', {
                filters,
                error: _error.message,
            });
            throw new Error(`Erreur recherche utilisateurs avec stats: ${_error.message}`);
        }
    }
    async searchRepositoriesWithUserInfo(filters) {
        try {
            const { repositories, total } = await models_2.RepositoryModel.search(filters);
            const enrichedRepositories = await Promise.all(repositories.map(async (repo) => {
                const user = await models_3.UserModel.findById(repo.userId);
                return {
                    ...repo,
                    user: {
                        login: user?.login ?? 'Unknown',
                        name: user?.name ?? 'Unknown',
                        avatarUrl: user?.avatarUrl ?? '',
                    },
                };
            }));
            return {
                repositories: enrichedRepositories,
                total,
            };
        }
        catch (_error) {
            logger_1.default.error('Erreur recherche repositories avec info utilisateur', {
                filters,
                error: _error.message,
            });
            throw new Error(`Erreur recherche repositories avec info utilisateur: ${_error.message}`);
        }
    }
    async getPlatformStats() {
        try {
            const [userStats, repositoryStats, datasetStats] = await Promise.all([
                models_3.UserModel.getStats(),
                models_2.RepositoryModel.getStats(),
                models_1.DatasetModel.getStats(),
            ]);
            const usersWithDatasets = await this.countUsersWithDatasets();
            return {
                users: {
                    total: userStats.totalUsers,
                    withDatasets: usersWithDatasets,
                    averageFollowers: userStats.averageFollowers,
                    topLanguages: userStats.topLanguages,
                },
                repositories: {
                    total: repositoryStats.totalRepositories,
                    totalStars: repositoryStats.totalStars,
                    totalForks: repositoryStats.totalForks,
                    topLanguages: repositoryStats.topLanguages,
                    devOpsAdoption: repositoryStats.devOpsAdoption,
                },
                datasets: {
                    total: datasetStats.totalDatasets,
                    withAnalytics: datasetStats.datasetsWithAnalytics,
                    withInsights: datasetStats.datasetsWithInsights,
                    averageRepositoriesPerDataset: datasetStats.averageRepositoriesPerDataset,
                    recentActivity: datasetStats.recentActivity,
                },
            };
        }
        catch (_error) {
            logger_1.default.error('Erreur récupération statistiques plateforme', {
                error: _error.message,
            });
            throw new Error(`Erreur récupération statistiques plateforme: ${_error.message}`);
        }
    }
    async areUserAnalyticsUpToDate(username, maxAgeMinutes = 60) {
        try {
            const latestDataset = await this.getLatestUserDataset(username);
            if (!latestDataset) {
                return {
                    hasDataset: false,
                    hasAnalytics: false,
                    hasInsights: false,
                    analyticsUpToDate: false,
                    insightsUpToDate: false,
                };
            }
            const freshness = await models_1.DatasetModel.isAnalyticsUpToDate(latestDataset.dataset.id, maxAgeMinutes);
            return {
                hasDataset: true,
                hasAnalytics: freshness.hasAnalytics,
                hasInsights: freshness.hasInsights,
                analyticsUpToDate: freshness.analyticsUpToDate,
                insightsUpToDate: freshness.insightsUpToDate,
                lastUpdate: latestDataset.dataset.updatedAt,
            };
        }
        catch (_error) {
            logger_1.default.error('Erreur vérification fraîcheur analyses', {
                username,
                error: _error.message,
            });
            throw new Error(`Erreur vérification fraîcheur analyses: ${_error.message}`);
        }
    }
    async deleteAllUserData(username) {
        try {
            logger_1.default.info('Début suppression données utilisateur', { username });
            const user = await models_3.UserModel.findByLogin(username);
            if (!user) {
                throw new Error('Utilisateur non trouvé');
            }
            return await database_1.default.transaction(async () => {
                const [repositoriesResult, datasetsResult] = await Promise.all([
                    models_2.RepositoryModel.findByUserId(user.id),
                    models_1.DatasetModel.findByUserId(user.id),
                ]);
                const stats = {
                    deletedUsers: 1,
                    deletedRepositories: repositoriesResult.total,
                    deletedDatasets: datasetsResult.total,
                };
                await models_3.UserModel.delete(user.id);
                logger_1.default.info('Données utilisateur supprimées avec succès', {
                    username,
                    stats,
                });
                return stats;
            });
        }
        catch (_error) {
            logger_1.default.error('Erreur suppression données utilisateur', {
                username,
                error: _error.message,
            });
            throw new Error(`Erreur suppression données utilisateur: ${_error.message}`);
        }
    }
    async cleanupOldData(options = {}) {
        const { olderThanDays = 90, dryRun = false } = options;
        try {
            logger_1.default.info('Début nettoyage données obsolètes', {
                olderThanDays,
                dryRun,
            });
            let datasetsDeleted = 0;
            if (!dryRun) {
                datasetsDeleted = await models_1.DatasetModel.cleanupOldDatasets(olderThanDays);
            }
            const orphanedRepositories = await this.findOrphanedRepositories();
            let orphanedDeleted = 0;
            if (!dryRun && orphanedRepositories.length > 0) {
                orphanedDeleted =
                    await this.deleteOrphanedRepositories(orphanedRepositories);
            }
            const inactiveUsers = await this.findInactiveUsers(olderThanDays * 2);
            let inactiveDeleted = 0;
            if (!dryRun && inactiveUsers.length > 0) {
                inactiveDeleted = await this.deleteInactiveUsers(inactiveUsers);
            }
            const stats = {
                datasets: dryRun
                    ? await this.countOldDatasets(olderThanDays)
                    : datasetsDeleted,
                orphanedRepositories: dryRun
                    ? orphanedRepositories.length
                    : orphanedDeleted,
                inactiveUsers: dryRun ? inactiveUsers.length : inactiveDeleted,
            };
            logger_1.default.info('Nettoyage données terminé', {
                stats,
                dryRun,
            });
            return stats;
        }
        catch (_error) {
            logger_1.default.error('Erreur nettoyage données', {
                error: _error.message,
            });
            throw new Error(`Erreur nettoyage données: ${_error.message}`);
        }
    }
    async healthCheck() {
        const startTime = Date.now();
        const issues = [];
        try {
            const health = await database_1.default.healthCheck();
            if (!health.overall) {
                issues.push('Connexion base de données instable');
            }
            const [usersCount, repositoriesCount, datasetsCount] = await Promise.all([
                database_1.default.findMany('user', {}),
                database_1.default.findMany('repository', {}),
                database_1.default.findMany('dataset', {}),
            ]);
            const statistics = {
                users: usersCount.length,
                repositories: repositoriesCount.length,
                datasets: datasetsCount.length,
            };
            if (repositoriesCount.length > 0 && usersCount.length === 0) {
                issues.push('Repositories orphelins détectés');
            }
            if (datasetsCount.length > 0 && usersCount.length === 0) {
                issues.push('Datasets orphelins détectés');
            }
            const responseTime = Date.now() - startTime;
            return {
                connected: health.overall,
                responseTime,
                statistics,
                issues,
            };
        }
        catch (_error) {
            const responseTime = Date.now() - startTime;
            return {
                connected: false,
                responseTime,
                statistics: { users: 0, repositories: 0, datasets: 0 },
                issues: [`Erreur health check: ${_error.message}`],
            };
        }
    }
    async getRepositoriesByIds(repositoryIds) {
        const repositories = [];
        for (const id of repositoryIds) {
            const repo = await database_1.default.findUnique('repository', { id });
            if (repo != null) {
                repositories.push(repo);
            }
        }
        return repositories;
    }
    async countUsersWithDatasets() {
        try {
            const usersWithDatasets = await database_1.default
                .getPrismaClient()
                ?.user.findMany({
                where: {
                    datasets: {
                        some: {},
                    },
                },
                select: { id: true },
            });
            return usersWithDatasets?.length ?? 0;
        }
        catch (_error) {
            logger_1.default.warn('Erreur comptage utilisateurs avec datasets', {
                error: _error.message,
            });
            return 0;
        }
    }
    async findOrphanedRepositories() {
        try {
            const orphaned = await database_1.default
                .getPrismaClient()
                ?.repository.findMany({
                where: {
                    user: null,
                },
                select: { id: true },
            });
            return orphaned?.map((repo) => repo.id) ?? [];
        }
        catch (_error) {
            logger_1.default.warn('Erreur recherche repositories orphelins', {
                error: _error.message,
            });
            return [];
        }
    }
    async deleteOrphanedRepositories(orphanedIds) {
        try {
            const result = await database_1.default
                .getPrismaClient()
                ?.repository.deleteMany({
                where: {
                    id: { in: orphanedIds },
                },
            });
            return result?.count ?? 0;
        }
        catch (_error) {
            logger_1.default.error('Erreur suppression repositories orphelins', {
                error: _error.message,
            });
            return 0;
        }
    }
    async findInactiveUsers(olderThanDays) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
            const inactive = await database_1.default.getPrismaClient()?.user.findMany({
                where: {
                    updatedAt: { lt: cutoffDate },
                    datasets: { none: {} },
                },
                select: { id: true },
            });
            return inactive?.map((user) => user.id) ?? [];
        }
        catch (_error) {
            logger_1.default.warn('Erreur recherche utilisateurs inactifs', {
                error: _error.message,
            });
            return [];
        }
    }
    async deleteInactiveUsers(inactiveIds) {
        let deletedCount = 0;
        for (const userId of inactiveIds) {
            try {
                await models_3.UserModel.delete(userId);
                deletedCount++;
            }
            catch (_error) {
                logger_1.default.warn('Erreur suppression utilisateur inactif', {
                    userId,
                    error: _error.message,
                });
            }
        }
        return deletedCount;
    }
    async countOldDatasets(olderThanDays) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
            const count = await database_1.default.getPrismaClient()?.dataset.count({
                where: {
                    updatedAt: { lt: cutoffDate },
                },
            });
            return count ?? 0;
        }
        catch (_error) {
            logger_1.default.warn('Erreur comptage datasets obsolètes', {
                error: _error.message,
            });
            return 0;
        }
    }
}
exports.DatabaseService = DatabaseService;
exports.databaseService = new DatabaseService();
//# sourceMappingURL=DatabaseService.js.map