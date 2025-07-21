"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatasetModel = void 0;
const database_1 = __importDefault(require("@/config/database"));
const logger_1 = __importDefault(require("@/utils/logger"));
class DatasetModel {
    static async create(userProfileId, metadata, repositories) {
        const prisma = database_1.default.getPrismaClient();
        if (!prisma) {
            throw new Error('Base de données non initialisée');
        }
        try {
            const dataset = await prisma.dataset.create({
                data: {
                    userProfileId,
                    metadata,
                    repositories,
                },
            });
            logger_1.default.info('Dataset créé avec succès', {
                datasetId: dataset.id,
                userProfileId,
                repositoriesCount: repositories.length,
            });
            return dataset;
        }
        catch (error) {
            logger_1.default.error('Erreur lors de la création du dataset', {
                userProfileId,
                error: error.message,
            });
            throw new Error(`Création dataset échouée: ${error.message}`);
        }
    }
    static async findById(id) {
        const prisma = database_1.default.getPrismaClient();
        if (!prisma) {
            throw new Error('Base de données non initialisée');
        }
        try {
            const dataset = await prisma.dataset.findUnique({
                where: { id },
                include: {
                    userProfile: true,
                },
            });
            logger_1.default.debug('Recherche dataset par ID', {
                id,
                found: !!dataset,
            });
            return dataset;
        }
        catch (error) {
            logger_1.default.error('Erreur lors de la recherche dataset', {
                id,
                error: error.message,
            });
            throw error;
        }
    }
    static async findByUserId(userProfileId, options = {}) {
        const prisma = database_1.default.getPrismaClient();
        if (!prisma) {
            throw new Error('Base de données non initialisée');
        }
        try {
            const { limit = 10, offset = 0 } = options;
            const [datasets, total] = await Promise.all([
                prisma.dataset.findMany({
                    where: { userProfileId },
                    take: limit,
                    skip: offset,
                    orderBy: { updatedAt: 'desc' },
                    include: {
                        userProfile: { select: { login: true, name: true } },
                    },
                }),
                prisma.dataset.count({ where: { userProfileId } }),
            ]);
            logger_1.default.debug('Recherche datasets par utilisateur', {
                userProfileId,
                count: datasets.length,
                total,
            });
            return { datasets, total };
        }
        catch (error) {
            logger_1.default.error('Erreur lors de la recherche datasets par utilisateur', {
                userProfileId,
                error: error.message,
            });
            throw error;
        }
    }
    static async updateMetadata(id, metadata) {
        const prisma = database_1.default.getPrismaClient();
        if (!prisma) {
            throw new Error('Base de données non initialisée');
        }
        try {
            const dataset = await prisma.dataset.update({
                where: { id },
                data: {
                    metadata,
                    updatedAt: new Date(),
                },
            });
            logger_1.default.info('Métadonnées dataset mises à jour', {
                datasetId: dataset.id,
                totalRepositories: metadata?.totalRepositories,
            });
            return dataset;
        }
        catch (error) {
            logger_1.default.error('Erreur lors de la mise à jour métadonnées dataset', {
                id,
                error: error.message,
            });
            throw error;
        }
    }
    static async updateAnalytics(id, analytics) {
        const prisma = database_1.default.getPrismaClient();
        if (!prisma) {
            throw new Error('Base de données non initialisée');
        }
        try {
            const dataset = await prisma.dataset.update({
                where: { id },
                data: {
                    analytics,
                    updatedAt: new Date(),
                },
            });
            logger_1.default.info('Analytics dataset mises à jour', {
                datasetId: dataset.id,
                analyticsGeneratedAt: analytics.analytics.generatedAt,
            });
            return dataset;
        }
        catch (error) {
            logger_1.default.error('Erreur lors de la mise à jour analytics dataset', {
                id,
                error: error.message,
            });
            throw error;
        }
    }
    static async updateInsights(id, insights) {
        const prisma = database_1.default.getPrismaClient();
        if (!prisma) {
            throw new Error('Base de données non initialisée');
        }
        try {
            const dataset = await prisma.dataset.update({
                where: { id },
                data: {
                    aiInsights: insights,
                    updatedAt: new Date(),
                },
            });
            logger_1.default.info('Insights IA dataset mis à jour', {
                datasetId: dataset.id,
                insightsGeneratedAt: insights.aiInsights.generatedAt,
                model: insights.aiInsights.model,
            });
            return dataset;
        }
        catch (error) {
            logger_1.default.error('Erreur lors de la mise à jour insights IA dataset', {
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
            await prisma.dataset.delete({
                where: { id },
            });
            logger_1.default.info('Dataset supprimé avec succès', { datasetId: id });
        }
        catch (error) {
            logger_1.default.error('Erreur lors de la suppression dataset', {
                id,
                error: error.message,
            });
            throw new Error(`Suppression dataset échouée: ${error.message}`);
        }
    }
    static async findLatestByUserId(userProfileId) {
        const prisma = database_1.default.getPrismaClient();
        if (!prisma) {
            throw new Error('Base de données non initialisée');
        }
        try {
            const dataset = await prisma.dataset.findFirst({
                where: { userProfileId },
                orderBy: { updatedAt: 'desc' },
                include: {
                    userProfile: { select: { login: true, name: true } },
                },
            });
            logger_1.default.debug('Recherche dataset le plus récent', {
                userProfileId,
                found: !!dataset,
                datasetId: dataset?.id,
            });
            return dataset;
        }
        catch (error) {
            logger_1.default.error('Erreur lors de la recherche du dataset le plus récent', {
                userProfileId,
                error: error.message,
            });
            throw error;
        }
    }
    static async isAnalyticsUpToDate(id, maxAgeMinutes = 60) {
        const prisma = database_1.default.getPrismaClient();
        if (!prisma) {
            throw new Error('Base de données non initialisée');
        }
        try {
            const dataset = await prisma.dataset.findUnique({
                where: { id },
                select: { analytics: true, aiInsights: true, updatedAt: true },
            });
            if (!dataset) {
                throw new Error('Dataset non trouvé');
            }
            const cutoffTime = new Date(Date.now() - maxAgeMinutes * 60 * 1000);
            const hasAnalytics = !!dataset.analytics;
            const hasInsights = !!dataset.aiInsights;
            let analyticsUpToDate = false;
            let insightsUpToDate = false;
            if (hasAnalytics) {
                const analyticsData = dataset.analytics;
                const analyticsDate = new Date(analyticsData.analytics?.generatedAt || dataset.updatedAt);
                analyticsUpToDate = analyticsDate > cutoffTime;
            }
            if (hasInsights) {
                const insightsData = dataset.aiInsights;
                const insightsDate = new Date(insightsData.aiInsights?.generatedAt || dataset.updatedAt);
                insightsUpToDate = insightsDate > cutoffTime;
            }
            return {
                hasAnalytics,
                hasInsights,
                analyticsUpToDate,
                insightsUpToDate,
            };
        }
        catch (error) {
            logger_1.default.error('Erreur lors de la vérification de fraîcheur des analyses', {
                id,
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
            const now = new Date();
            const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            const [totalDatasets, datasetsWithAnalytics, datasetsWithInsights, allDatasets, activity24h, activityWeek, activityMonth] = await Promise.all([
                prisma.dataset.count(),
                prisma.dataset.count({ where: { analytics: { not: null } } }),
                prisma.dataset.count({ where: { aiInsights: { not: null } } }),
                prisma.dataset.findMany({ select: { repositories: true } }),
                prisma.dataset.count({ where: { updatedAt: { gte: last24h } } }),
                prisma.dataset.count({ where: { updatedAt: { gte: lastWeek } } }),
                prisma.dataset.count({ where: { updatedAt: { gte: lastMonth } } }),
            ]);
            const totalRepositories = allDatasets.reduce((sum, dataset) => sum + dataset.repositories.length, 0);
            const averageRepositoriesPerDataset = totalDatasets > 0 ?
                Math.round(totalRepositories / totalDatasets) : 0;
            return {
                totalDatasets,
                datasetsWithAnalytics,
                datasetsWithInsights,
                averageRepositoriesPerDataset,
                recentActivity: {
                    last24h: activity24h,
                    lastWeek: activityWeek,
                    lastMonth: activityMonth,
                },
            };
        }
        catch (error) {
            logger_1.default.error('Erreur lors du calcul des statistiques datasets', {
                error: error.message,
            });
            throw error;
        }
    }
    static async search(filters) {
        const prisma = database_1.default.getPrismaClient();
        if (!prisma) {
            throw new Error('Base de données non initialisée');
        }
        try {
            const where = {};
            if (filters.hasAnalytics !== undefined) {
                if (filters.hasAnalytics) {
                    where.analytics = { not: null };
                }
                else {
                    where.analytics = null;
                }
            }
            if (filters.hasInsights !== undefined) {
                if (filters.hasInsights) {
                    where.aiInsights = { not: null };
                }
                else {
                    where.aiInsights = null;
                }
            }
            if (filters.dateRange) {
                where.updatedAt = {
                    gte: filters.dateRange.start,
                    lte: filters.dateRange.end,
                };
            }
            const [datasets, total] = await Promise.all([
                prisma.dataset.findMany({
                    where,
                    take: filters.limit || 10,
                    skip: filters.offset || 0,
                    orderBy: { updatedAt: 'desc' },
                    include: {
                        userProfile: { select: { login: true, name: true, avatarUrl: true } },
                    },
                }),
                prisma.dataset.count({ where }),
            ]);
            let filteredDatasets = datasets;
            if (filters.minRepositories !== undefined || filters.maxRepositories !== undefined) {
                filteredDatasets = datasets.filter(dataset => {
                    const repoCount = dataset.repositories.length;
                    if (filters.minRepositories !== undefined && repoCount < filters.minRepositories) {
                        return false;
                    }
                    if (filters.maxRepositories !== undefined && repoCount > filters.maxRepositories) {
                        return false;
                    }
                    return true;
                });
            }
            logger_1.default.debug('Recherche avancée datasets', {
                filtersCount: Object.keys(filters).length,
                resultsCount: filteredDatasets.length,
                total,
            });
            return {
                datasets: filteredDatasets,
                total: filteredDatasets.length
            };
        }
        catch (error) {
            logger_1.default.error('Erreur lors de la recherche avancée datasets', {
                filters,
                error: error.message,
            });
            throw error;
        }
    }
    static async clone(sourceId, newUserProfileId) {
        const prisma = database_1.default.getPrismaClient();
        if (!prisma) {
            throw new Error('Base de données non initialisée');
        }
        try {
            const sourceDataset = await prisma.dataset.findUnique({
                where: { id: sourceId },
            });
            if (!sourceDataset) {
                throw new Error('Dataset source non trouvé');
            }
            const clonedDataset = await prisma.dataset.create({
                data: {
                    userProfileId: newUserProfileId || sourceDataset.userProfileId,
                    metadata: sourceDataset.metadata,
                    repositories: sourceDataset.repositories,
                },
            });
            logger_1.default.info('Dataset cloné avec succès', {
                sourceId,
                clonedId: clonedDataset.id,
                userProfileId: clonedDataset.userProfileId,
            });
            return clonedDataset;
        }
        catch (error) {
            logger_1.default.error('Erreur lors du clonage dataset', {
                sourceId,
                error: error.message,
            });
            throw new Error(`Clonage dataset échoué: ${error.message}`);
        }
    }
    static async cleanupOldDatasets(olderThanDays = 90) {
        const prisma = database_1.default.getPrismaClient();
        if (!prisma) {
            throw new Error('Base de données non initialisée');
        }
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
            const result = await prisma.dataset.deleteMany({
                where: {
                    updatedAt: { lt: cutoffDate },
                },
            });
            logger_1.default.info('Nettoyage datasets obsolètes terminé', {
                deletedCount: result.count,
                cutoffDate,
            });
            return result.count;
        }
        catch (error) {
            logger_1.default.error('Erreur lors du nettoyage datasets', {
                olderThanDays,
                error: error.message,
            });
            throw error;
        }
    }
}
exports.DatasetModel = DatasetModel;
//# sourceMappingURL=Dataset.js.map