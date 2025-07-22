/**
 * Modèle Dataset - Collection datasets
 * CRUD operations pour les datasets avec métadonnées, analyses quantitatives et IA
 */

import { Dataset as PrismaDataset } from '@/generated/prisma';
import { DatasetMetadata } from '@/types/github';
import { AnalyticsExtension } from '@/types/analytics';
import { InsightsExtension } from '@/types/insights';
import databaseConfig from '@/config/database';
import logger from '@/utils/logger';

export class DatasetModel {
  /**
   * Crée un nouveau dataset
   */
  static async create(
    userProfileId: string,
    metadata: DatasetMetadata,
    repositories: string[],
  ): Promise<PrismaDataset> {
    const prisma = databaseConfig.getPrismaClient();
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

      logger.info('Dataset créé avec succès', {
        datasetId: dataset.id,
        userProfileId,
        repositoriesCount: repositories.length,
      });

      return dataset;
    } catch (_error: unknown) {
      logger.error('Erreur lors de la création du dataset', {
        userProfileId,
        _error: (_error as Error).message,
      });
      throw new Error(`Création dataset échouée: ${(_error as Error).message}`);
    }
  }

  /**
   * Trouve un dataset par ID
   */
  static async findById(id: string): Promise<PrismaDataset | null> {
    const prisma = databaseConfig.getPrismaClient();
    if (!prisma) {
      throw new Error('Base de données non initialisée');
    }

    try {
      const dataset = await prisma.dataset.findUnique({
        where: { id },
        include: {
          _userProfile: true,
        },
      });

      logger.debug('Recherche dataset par ID', {
        id,
        found: !!dataset,
      });

      return dataset;
    } catch (_error: unknown) {
      logger.error('Erreur lors de la recherche dataset', {
        id,
        _error: (_error as Error).message,
      });
      throw _error as Error;
    }
  }

  /**
   * Trouve les datasets d'un utilisateur
   */
  static async findByUserId(
    userProfileId: string,
    options: {
      limit?: number;
      offset?: number;
      includeAnalytics?: boolean;
      includeInsights?: boolean;
    } = {},
  ): Promise<{ datasets: PrismaDataset[]; total: number }> {
    const prisma = databaseConfig.getPrismaClient();
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
            _userProfile: { select: { login: true, name: true } },
          },
        }),
        prisma.dataset.count({ where: { userProfileId } }),
      ]);

      logger.debug('Recherche datasets par utilisateur', {
        userProfileId,
        count: datasets.length,
        total,
      });

      return { datasets, total };
    } catch (_error: unknown) {
      logger.error('Erreur lors de la recherche datasets par utilisateur', {
        userProfileId,
        _error: (_error as Error).message,
      });
      throw _error as Error;
    }
  }

  /**
   * Met à jour les métadonnées d'un dataset
   */
  static async updateMetadata(
    id: string,
    metadata: DatasetMetadata,
  ): Promise<PrismaDataset> {
    const prisma = databaseConfig.getPrismaClient();
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

      logger.info('Métadonnées dataset mises à jour', {
        datasetId: dataset.id,
        totalRepositories: (metadata as { totalRepositories?: number })
          .totalRepositories,
      });

      return dataset;
    } catch (_error: unknown) {
      logger.error('Erreur lors de la mise à jour métadonnées dataset', {
        id,
        _error: (_error as Error).message,
      });
      throw _error as Error;
    }
  }

  /**
   * Ajoute ou met à jour les analyses quantitatives
   */
  static async updateAnalytics(
    id: string,
    analytics: AnalyticsExtension,
  ): Promise<PrismaDataset> {
    const prisma = databaseConfig.getPrismaClient();
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

      logger.info('Analytics dataset mises à jour', {
        datasetId: dataset.id,
        analyticsGeneratedAt: analytics.analytics.generatedAt,
      });

      return dataset;
    } catch (_error: unknown) {
      logger.error('Erreur lors de la mise à jour analytics dataset', {
        id,
        _error: (_error as Error).message,
      });
      throw _error as Error;
    }
  }

  /**
   * Ajoute ou met à jour les insights IA
   */
  static async updateInsights(
    id: string,
    insights: InsightsExtension,
  ): Promise<PrismaDataset> {
    const prisma = databaseConfig.getPrismaClient();
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

      logger.info('Insights IA dataset mis à jour', {
        datasetId: dataset.id,
        insightsGeneratedAt: insights.aiInsights.generatedAt,
        model: insights.aiInsights.model,
      });

      return dataset;
    } catch (_error: unknown) {
      logger.error('Erreur lors de la mise à jour insights IA dataset', {
        id,
        _error: (_error as Error).message,
      });
      throw _error as Error;
    }
  }

  /**
   * Supprime un dataset
   */
  static async delete(id: string): Promise<void> {
    const prisma = databaseConfig.getPrismaClient();
    if (!prisma) {
      throw new Error('Base de données non initialisée');
    }

    try {
      await prisma.dataset.delete({
        where: { id },
      });

      logger.info('Dataset supprimé avec succès', { datasetId: id });
    } catch (_error: unknown) {
      logger.error('Erreur lors de la suppression dataset', {
        id,
        _error: (_error as Error).message,
      });
      throw new Error(
        `Suppression dataset échouée: ${(_error as Error).message}`,
      );
    }
  }

  /**
   * Trouve le dataset le plus récent d'un utilisateur
   */
  static async findLatestByUserId(
    userProfileId: string,
  ): Promise<PrismaDataset | null> {
    const prisma = databaseConfig.getPrismaClient();
    if (!prisma) {
      throw new Error('Base de données non initialisée');
    }

    try {
      const dataset = await prisma.dataset.findFirst({
        where: { userProfileId },
        orderBy: { updatedAt: 'desc' },
        include: {
          _userProfile: { select: { login: true, name: true } },
        },
      });

      logger.debug('Recherche dataset le plus récent', {
        userProfileId,
        found: !!dataset,
        datasetId: dataset?.id,
      });

      return dataset;
    } catch (_error: unknown) {
      logger.error('Erreur lors de la recherche du dataset le plus récent', {
        userProfileId,
        _error: (_error as Error).message,
      });
      throw _error as Error;
    }
  }

  /**
   * Vérifie si les analyses sont à jour
   */
  static async isAnalyticsUpToDate(
    id: string,
    maxAgeMinutes = 60,
  ): Promise<{
    hasAnalytics: boolean;
    hasInsights: boolean;
    analyticsUpToDate: boolean;
    insightsUpToDate: boolean;
  }> {
    const prisma = databaseConfig.getPrismaClient();
    if (!prisma) {
      throw new Error('Base de données non initialisée');
    }

    try {
      const dataset = await prisma.dataset.findUnique({
        where: { id },
        select: { _analytics: true, aiInsights: true, updatedAt: true },
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
        const analyticsData = dataset.analytics as {
          analytics?: { generatedAt?: string };
        };
        const analyticsDate = new Date(
          analyticsData.analytics?.generatedAt ?? dataset.updatedAt,
        );
        analyticsUpToDate = analyticsDate > cutoffTime;
      }

      if (hasInsights) {
        const insightsData = dataset.aiInsights as {
          aiInsights?: { generatedAt?: string };
        };
        const insightsDate = new Date(
          insightsData.aiInsights?.generatedAt ?? dataset.updatedAt,
        );
        insightsUpToDate = insightsDate > cutoffTime;
      }

      return {
        hasAnalytics,
        hasInsights,
        analyticsUpToDate,
        insightsUpToDate,
      };
    } catch (_error: unknown) {
      logger.error('Erreur lors de la vérification de fraîcheur des analyses', {
        id,
        _error: (_error as Error).message,
      });
      throw _error as Error;
    }
  }

  /**
   * Statistiques globales des datasets
   */
  static async getStats(): Promise<{
    totalDatasets: number;
    datasetsWithAnalytics: number;
    datasetsWithInsights: number;
    averageRepositoriesPerDataset: number;
    recentActivity: {
      last24h: number;
      lastWeek: number;
      lastMonth: number;
    };
  }> {
    const prisma = databaseConfig.getPrismaClient();
    if (!prisma) {
      throw new Error('Base de données non initialisée');
    }

    try {
      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const [
        totalDatasets,
        datasetsWithAnalytics,
        datasetsWithInsights,
        allDatasets,
        activity24h,
        activityWeek,
        activityMonth,
      ] = await Promise.all([
        prisma.dataset.count(),
        prisma.dataset.count({ where: { _analytics: { not: null } } }),
        prisma.dataset.count({ where: { aiInsights: { not: null } } }),
        prisma.dataset.findMany({ select: { repositories: true } }),
        prisma.dataset.count({ where: { updatedAt: { gte: last24h } } }),
        prisma.dataset.count({ where: { updatedAt: { gte: lastWeek } } }),
        prisma.dataset.count({ where: { updatedAt: { gte: lastMonth } } }),
      ]);

      const totalRepositories = allDatasets.reduce(
        (sum: number, dataset: { repositories: string[] }) =>
          sum + dataset.repositories.length,
        0,
      );
      const averageRepositoriesPerDataset =
        totalDatasets > 0 ? Math.round(totalRepositories / totalDatasets) : 0;

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
    } catch (_error: unknown) {
      logger.error('Erreur lors du calcul des statistiques datasets', {
        _error: (_error as Error).message,
      });
      throw _error as Error;
    }
  }

  /**
   * Recherche de datasets avec filtres avancés
   */
  static async search(filters: {
    hasAnalytics?: boolean;
    hasInsights?: boolean;
    minRepositories?: number;
    maxRepositories?: number;
    dateRange?: {
      start: Date;
      end: Date;
    };
    limit?: number;
    offset?: number;
  }): Promise<{ datasets: PrismaDataset[]; total: number }> {
    const prisma = databaseConfig.getPrismaClient();
    if (!prisma) {
      throw new Error('Base de données non initialisée');
    }

    try {
      const where: Record<string, unknown> = {};

      if (filters.hasAnalytics !== undefined) {
        if (filters.hasAnalytics) {
          where.analytics = { not: null };
        } else {
          where.analytics = null;
        }
      }

      if (filters.hasInsights !== undefined) {
        if (filters.hasInsights) {
          where.aiInsights = { not: null };
        } else {
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
          take: filters.limit ?? 10,
          skip: filters.offset ?? 0,
          orderBy: { updatedAt: 'desc' },
          include: {
            _userProfile: {
              select: { login: true, name: true, avatarUrl: true },
            },
          },
        }),
        prisma.dataset.count({ where }),
      ]);

      // Filtrage post-requête pour les critères sur les repositories
      let filteredDatasets = datasets;

      if (
        filters.minRepositories !== undefined &&
        filters.maxRepositories !== undefined
      ) {
        filteredDatasets = datasets.filter(
          (dataset: { repositories: string[] }) => {
            const repoCount = dataset.repositories.length;

            if (
              filters.minRepositories !== undefined &&
              repoCount < filters.minRepositories
            ) {
              return false;
            }

            if (
              filters.maxRepositories !== undefined &&
              repoCount > filters.maxRepositories
            ) {
              return false;
            }

            return true;
          },
        );
      }

      logger.debug('Recherche avancée datasets', {
        filtersCount: Object.keys(filters).length,
        resultsCount: filteredDatasets.length,
        total,
      });

      return {
        datasets: filteredDatasets,
        total: filteredDatasets.length,
      };
    } catch (_error: unknown) {
      logger.error('Erreur lors de la recherche avancée datasets', {
        filters,
        _error: (_error as Error).message,
      });
      throw _error as Error;
    }
  }

  /**
   * Clone un dataset (pour créer une nouvelle version)
   */
  static async clone(
    sourceId: string,
    newUserProfileId?: string,
  ): Promise<PrismaDataset> {
    const prisma = databaseConfig.getPrismaClient();
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
          userProfileId: newUserProfileId ?? sourceDataset.userProfileId,
          metadata: sourceDataset.metadata,
          repositories: sourceDataset.repositories,
          // Ne pas copier les analyses - elles devront être régénérées
        },
      });

      logger.info('Dataset cloné avec succès', {
        sourceId,
        clonedId: clonedDataset.id,
        userProfileId: clonedDataset.userProfileId,
      });

      return clonedDataset;
    } catch (_error: unknown) {
      logger.error('Erreur lors du clonage dataset', {
        sourceId,
        _error: (_error as Error).message,
      });
      throw new Error(`Clonage dataset échoué: ${(_error as Error).message}`);
    }
  }

  /**
   * Nettoyage des datasets obsolètes
   */
  static async cleanupOldDatasets(olderThanDays = 90): Promise<number> {
    const prisma = databaseConfig.getPrismaClient();
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

      logger.info('Nettoyage datasets obsolètes terminé', {
        deletedCount: result.count,
        cutoffDate,
      });

      return result.count;
    } catch (_error: unknown) {
      logger.error('Erreur lors du nettoyage datasets', {
        olderThanDays,
        _error: (_error as Error).message,
      });
      throw _error as Error;
    }
  }
}
