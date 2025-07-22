/**
 * Service Database - Orchestration des opérations de base de données
 * Couche d'abstraction pour toutes les interactions avec MongoDB via les modèles
 */

import { AnalyticsExtension } from '@/types/analytics';
import { DatasetMetadata } from '@/types/github';
import { DatasetModel } from '@/models';
import { GitHubRepo } from '@/types/github';
import { InsightsExtension } from '@/types/insights';
import { PrismaDataset } from '@/models';
import { PrismaRepository } from '@/models';
import { PrismaUser } from '@/models';
import { RepositoryModel } from '@/models';
import { UserModel } from '@/models';
import { UserProfile } from '@/types/github';
import databaseConfig from '@/config/database';
import logger from '@/utils/logger';

export class DatabaseService {
  /**
   * Sauvegarde complète d'un dataset utilisateur avec toutes les données
   */
  public async saveCompleteUserDataset(
    userProfile: UserProfile,
    repositories: GitHubRepo[],
    metadata: DatasetMetadata,
    analytics?: AnalyticsExtension,
    insights?: InsightsExtension,
  ): Promise<{
    user: PrismaUser;
    repositories: PrismaRepository[];
    dataset: PrismaDataset;
  }> {
    const startTime = Date.now();

    try {
      logger.info('Début sauvegarde dataset complet', {
        username: userProfile.login,
        repositoriesCount: repositories.length,
      });

      return await databaseConfig.transaction(async () => {
        // 1. Sauvegarde de l'utilisateur
        const user = await UserModel.upsert(userProfile);

        // 2. Sauvegarde des repositories
        const savedRepositories: PrismaRepository[] = [];
        for (const repo of repositories) {
          const savedRepo = await RepositoryModel.upsert(repo, user.id);
          savedRepositories.push(savedRepo);
        }

        // 3. Création du dataset avec références
        const repositoryIds = savedRepositories.map((repo) => repo.id);
        let dataset = await DatasetModel.create(
          user.id,
          metadata,
          repositoryIds,
        );

        // 4. Ajout des analyses si disponibles
        if (analytics) {
          dataset = await DatasetModel.updateAnalytics(dataset.id, analytics);
        }

        if (insights) {
          dataset = await DatasetModel.updateInsights(dataset.id, insights);
        }

        const processingTime = (Date.now() - startTime) / 1000;

        logger.info('Dataset complet sauvegardé avec succès', {
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
    } catch (_error: unknown) {
      logger.error('Erreur sauvegarde dataset complet', {
        username: userProfile.login,
        error: (_error as Error).message,
      });
      throw new Error(
        `Sauvegarde dataset échouée: ${(_error as Error).message}`,
      );
    }
  }

  /**
   * Récupère un dataset complet avec toutes ses données
   */
  public async getCompleteDataset(datasetId: string): Promise<{
    dataset: PrismaDataset;
    user: PrismaUser;
    repositories: PrismaRepository[];
  } | null> {
    try {
      const dataset = await DatasetModel.findById(datasetId);
      if (!dataset) {
        return null;
      }

      const [user, repositories] = await Promise.all([
        UserModel.findById(dataset.userProfileId),
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
    } catch (_error: unknown) {
      logger.error('Erreur récupération dataset complet', {
        datasetId,
        error: (_error as Error).message,
      });
      throw new Error(
        `Erreur récupération dataset complet: ${(_error as Error).message}`,
      );
    }
  }

  /**
   * Récupère le dernier dataset d'un utilisateur
   */
  public async getLatestUserDataset(username: string): Promise<{
    dataset: PrismaDataset;
    user: PrismaUser;
    repositories: PrismaRepository[];
  } | null> {
    try {
      const user = await UserModel.findByLogin(username);
      if (!user) {
        return null;
      }

      const dataset = await DatasetModel.findLatestByUserId(user.id);
      if (!dataset) {
        return null;
      }

      const repositories = await this.getRepositoriesByIds(
        dataset.repositories,
      );

      return {
        dataset,
        user,
        repositories,
      };
    } catch (_error: unknown) {
      logger.error('Erreur récupération dernier dataset utilisateur', {
        username,
        error: (_error as Error).message,
      });
      throw new Error(
        `Erreur récupération dernier dataset utilisateur: ${(_error as Error).message}`,
      );
    }
  }

  /**
   * Met à jour uniquement les analyses d'un dataset existant
   */
  public async updateDatasetAnalyses(
    datasetId: string,
    analytics?: AnalyticsExtension,
    insights?: InsightsExtension,
  ): Promise<PrismaDataset> {
    try {
      let dataset = await DatasetModel.findById(datasetId);
      if (!dataset) {
        throw new Error('Dataset non trouvé');
      }

      if (analytics) {
        dataset = await DatasetModel.updateAnalytics(datasetId, analytics);
      }

      if (insights) {
        dataset = await DatasetModel.updateInsights(datasetId, insights);
      }

      logger.info('Analyses dataset mises à jour', {
        datasetId,
        hasAnalytics: !!analytics,
        hasInsights: !!insights,
      });

      return dataset;
    } catch (_error: unknown) {
      logger.error('Erreur mise à jour analyses dataset', {
        datasetId,
        error: (_error as Error).message,
      });
      throw new Error(
        `Erreur mise à jour analyses dataset: ${(_error as Error).message}`,
      );
    }
  }

  /**
   * Enrichit les repositories existants avec des données DevOps
   */
  public async enrichRepositoriesWithDevOpsData(
    repositoryIds: string[],
    devOpsDataMap: Record<
      string,
      {
        githubActions?: import('@/types/github').GitHubActions;
        security?: import('@/types/github').GitHubSecurity;
        packages?: import('@/types/github').GitHubPackages;
        branchProtection?: import('@/types/github').GitHubBranchProtection;
        community?: import('@/types/github').GitHubCommunity;
        traffic?: import('@/types/github').GitHubTraffic;
      }
    >,
  ): Promise<PrismaRepository[]> {
    try {
      const enrichedRepositories: PrismaRepository[] = [];

      for (const repositoryId of repositoryIds) {
        const devOpsData = devOpsDataMap[repositoryId];
        if (devOpsData != null) {
          const enrichedRepo = await RepositoryModel.enrichWithDevOpsData(
            repositoryId,
            devOpsData,
          );
          enrichedRepositories.push(enrichedRepo);
        }
      }

      logger.info('Repositories enrichis avec données DevOps', {
        count: enrichedRepositories.length,
        total: repositoryIds.length,
      });

      return enrichedRepositories;
    } catch (_error: unknown) {
      logger.error('Erreur enrichissement repositories DevOps', {
        error: (_error as Error).message,
      });
      throw new Error(
        `Erreur enrichissement repositories DevOps: ${(_error as Error).message}`,
      );
    }
  }

  /**
   * Recherche d'utilisateurs avec leurs statistiques
   */
  public async searchUsersWithStats(filters: {
    search?: string;
    location?: string;
    company?: string;
    minFollowers?: number;
    maxFollowers?: number;
    hasAnalytics?: boolean;
    hasInsights?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{
    users: Array<
      PrismaUser & {
        stats: {
          repositoriesCount: number;
          datasetsCount: number;
          lastActivity?: Date;
        };
      }
    >;
    total: number;
  }> {
    try {
      const { users, total } = await UserModel.search(filters);

      // Enrichissement avec les statistiques
      const enrichedUsers = await Promise.all(
        users.map(async (user) => {
          const [repositoriesResult, datasetsResult] = await Promise.all([
            RepositoryModel.findByUserId(user.id, { limit: 1 }),
            DatasetModel.findByUserId(user.id, { limit: 1 }),
          ]);

          const stats = {
            repositoriesCount: repositoriesResult.total,
            datasetsCount: datasetsResult.total,
            lastActivity:
              repositoriesResult.repositories[0]?.pushedAt ?? undefined,
          };

          return {
            ...user,
            stats,
          };
        }),
      );

      return {
        users: enrichedUsers,
        total,
      };
    } catch (_error: unknown) {
      logger.error('Erreur recherche utilisateurs avec stats', {
        filters,
        error: (_error as Error).message,
      });
      throw new Error(
        `Erreur recherche utilisateurs avec stats: ${(_error as Error).message}`,
      );
    }
  }

  /**
   * Recherche de repositories avec enrichissement utilisateur
   */
  public async searchRepositoriesWithUserInfo(filters: {
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
  }): Promise<{
    repositories: Array<
      PrismaRepository & {
        user: {
          login: string;
          name: string;
          avatarUrl: string;
        };
      }
    >;
    total: number;
  }> {
    try {
      const { repositories, total } = await RepositoryModel.search(filters);

      // Enrichissement avec les informations utilisateur
      const enrichedRepositories = await Promise.all(
        repositories.map(async (repo) => {
          const user = await UserModel.findById(repo.userId);

          return {
            ...repo,
            user: {
              login: user?.login ?? 'Unknown',
              name: user?.name ?? 'Unknown',
              avatarUrl: user?.avatarUrl ?? '',
            },
          };
        }),
      );

      return {
        repositories: enrichedRepositories,
        total,
      };
    } catch (_error: unknown) {
      logger.error('Erreur recherche repositories avec info utilisateur', {
        filters,
        error: (_error as Error).message,
      });
      throw new Error(
        `Erreur recherche repositories avec info utilisateur: ${(_error as Error).message}`,
      );
    }
  }

  /**
   * Statistiques globales de la plateforme
   */
  public async getPlatformStats(): Promise<{
    users: {
      total: number;
      withDatasets: number;
      averageFollowers: number;
      topLanguages: Array<{ language: string; count: number }>;
    };
    repositories: {
      total: number;
      totalStars: number;
      totalForks: number;
      topLanguages: Array<{ language: string; count: number }>;
      devOpsAdoption: {
        githubActions: number;
        security: number;
        packages: number;
        branchProtection: number;
      };
    };
    datasets: {
      total: number;
      withAnalytics: number;
      withInsights: number;
      averageRepositoriesPerDataset: number;
      recentActivity: {
        last24h: number;
        lastWeek: number;
        lastMonth: number;
      };
    };
  }> {
    try {
      const [userStats, repositoryStats, datasetStats] = await Promise.all([
        UserModel.getStats(),
        RepositoryModel.getStats(),
        DatasetModel.getStats(),
      ]);

      // Calcul des utilisateurs avec datasets
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
          averageRepositoriesPerDataset:
            datasetStats.averageRepositoriesPerDataset,
          recentActivity: datasetStats.recentActivity,
        },
      };
    } catch (_error: unknown) {
      logger.error('Erreur récupération statistiques plateforme', {
        error: (_error as Error).message,
      });
      throw new Error(
        `Erreur récupération statistiques plateforme: ${(_error as Error).message}`,
      );
    }
  }

  /**
   * Vérifie si les analyses d'un utilisateur sont à jour
   */
  public async areUserAnalyticsUpToDate(
    username: string,
    maxAgeMinutes = 60,
  ): Promise<{
    hasDataset: boolean;
    hasAnalytics: boolean;
    hasInsights: boolean;
    analyticsUpToDate: boolean;
    insightsUpToDate: boolean;
    lastUpdate?: Date;
  }> {
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

      const freshness = await DatasetModel.isAnalyticsUpToDate(
        latestDataset.dataset.id,
        maxAgeMinutes,
      );

      return {
        hasDataset: true,
        hasAnalytics: freshness.hasAnalytics,
        hasInsights: freshness.hasInsights,
        analyticsUpToDate: freshness.analyticsUpToDate,
        insightsUpToDate: freshness.insightsUpToDate,
        lastUpdate: latestDataset.dataset.updatedAt,
      };
    } catch (_error: unknown) {
      logger.error('Erreur vérification fraîcheur analyses', {
        username,
        error: (_error as Error).message,
      });
      throw new Error(
        `Erreur vérification fraîcheur analyses: ${(_error as Error).message}`,
      );
    }
  }

  /**
   * Supprime toutes les données d'un utilisateur (RGPD)
   */
  public async deleteAllUserData(username: string): Promise<{
    deletedUsers: number;
    deletedRepositories: number;
    deletedDatasets: number;
  }> {
    try {
      logger.info('Début suppression données utilisateur', { username });

      const user = await UserModel.findByLogin(username);
      if (!user) {
        throw new Error('Utilisateur non trouvé');
      }

      return await databaseConfig.transaction(async () => {
        // Comptage avant suppression
        const [repositoriesResult, datasetsResult] = await Promise.all([
          RepositoryModel.findByUserId(user.id),
          DatasetModel.findByUserId(user.id),
        ]);

        const stats = {
          deletedUsers: 1,
          deletedRepositories: repositoriesResult.total,
          deletedDatasets: datasetsResult.total,
        };

        // Suppression en cascade via le modèle User
        await UserModel.delete(user.id);

        logger.info('Données utilisateur supprimées avec succès', {
          username,
          stats,
        });

        return stats;
      });
    } catch (_error: unknown) {
      logger.error('Erreur suppression données utilisateur', {
        username,
        error: (_error as Error).message,
      });
      throw new Error(
        `Erreur suppression données utilisateur: ${(_error as Error).message}`,
      );
    }
  }

  /**
   * Nettoyage des données obsolètes
   */
  public async cleanupOldData(
    options: {
      olderThanDays?: number;
      dryRun?: boolean;
    } = {},
  ): Promise<{
    datasets: number;
    orphanedRepositories: number;
    inactiveUsers: number;
  }> {
    const { olderThanDays = 90, dryRun = false } = options;

    try {
      logger.info('Début nettoyage données obsolètes', {
        olderThanDays,
        dryRun,
      });

      // Nettoyage des datasets obsolètes
      let datasetsDeleted = 0;
      if (!dryRun) {
        datasetsDeleted = await DatasetModel.cleanupOldDatasets(olderThanDays);
      }

      // Identification des repositories orphelins
      const orphanedRepositories = await this.findOrphanedRepositories();
      let orphanedDeleted = 0;
      if (!dryRun && orphanedRepositories.length > 0) {
        orphanedDeleted =
          await this.deleteOrphanedRepositories(orphanedRepositories);
      }

      // Identification des utilisateurs inactifs (pas d'activité depuis X jours)
      const inactiveUsers = await this.findInactiveUsers(olderThanDays * 2); // Double du temps pour les utilisateurs
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

      logger.info('Nettoyage données terminé', {
        stats,
        dryRun,
      });

      return stats;
    } catch (_error: unknown) {
      logger.error('Erreur nettoyage données', {
        error: (_error as Error).message,
      });
      throw new Error(`Erreur nettoyage données: ${(_error as Error).message}`);
    }
  }

  /**
   * Health check de la base de données
   */
  public async healthCheck(): Promise<{
    connected: boolean;
    responseTime: number;
    statistics: {
      users: number;
      repositories: number;
      datasets: number;
    };
    issues: string[];
  }> {
    const startTime = Date.now();
    const issues: string[] = [];

    try {
      // Test de connectivité
      const health = await databaseConfig.healthCheck();

      if (!health.overall) {
        issues.push('Connexion base de données instable');
      }

      // Statistiques rapides
      const [usersCount, repositoriesCount, datasetsCount] = await Promise.all([
        databaseConfig.findMany('user', {}),
        databaseConfig.findMany('repository', {}),
        databaseConfig.findMany('dataset', {}),
      ]);

      const statistics = {
        users: usersCount.length,
        repositories: repositoriesCount.length,
        datasets: datasetsCount.length,
      };

      // Vérifications d'intégrité
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
    } catch (_error: unknown) {
      const responseTime = Date.now() - startTime;

      return {
        connected: false,
        responseTime,
        statistics: { users: 0, repositories: 0, datasets: 0 },
        issues: [`Erreur health check: ${(_error as Error).message}`],
      };
    }
  }

  // Méthodes utilitaires privées

  private async getRepositoriesByIds(
    repositoryIds: string[],
  ): Promise<PrismaRepository[]> {
    const repositories: PrismaRepository[] = [];

    for (const id of repositoryIds) {
      const repo = await databaseConfig.findUnique('repository', { id });
      if (repo != null) {
        repositories.push(repo as PrismaRepository);
      }
    }

    return repositories;
  }

  private async countUsersWithDatasets(): Promise<number> {
    try {
      const usersWithDatasets = await databaseConfig
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
    } catch (_error) {
      logger.warn('Erreur comptage utilisateurs avec datasets', {
        error: (_error as Error).message,
      });
      return 0;
    }
  }

  private async findOrphanedRepositories(): Promise<string[]> {
    try {
      const orphaned = await databaseConfig
        .getPrismaClient()
        ?.repository.findMany({
          where: {
            user: null,
          },
          select: { id: true },
        });

      return orphaned?.map((repo: { id: string }) => repo.id) ?? [];
    } catch (_error) {
      logger.warn('Erreur recherche repositories orphelins', {
        error: (_error as Error).message,
      });
      return [];
    }
  }

  private async deleteOrphanedRepositories(
    orphanedIds: string[],
  ): Promise<number> {
    try {
      const result = await databaseConfig
        .getPrismaClient()
        ?.repository.deleteMany({
          where: {
            id: { in: orphanedIds },
          },
        });

      return result?.count ?? 0;
    } catch (_error) {
      logger.error('Erreur suppression repositories orphelins', {
        error: (_error as Error).message,
      });
      return 0;
    }
  }

  private async findInactiveUsers(olderThanDays: number): Promise<string[]> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const inactive = await databaseConfig.getPrismaClient()?.user.findMany({
        where: {
          updatedAt: { lt: cutoffDate },
          datasets: { none: {} },
        },
        select: { id: true },
      });

      return inactive?.map((user: { id: string }) => user.id) ?? [];
    } catch (_error) {
      logger.warn('Erreur recherche utilisateurs inactifs', {
        error: (_error as Error).message,
      });
      return [];
    }
  }

  private async deleteInactiveUsers(inactiveIds: string[]): Promise<number> {
    let deletedCount = 0;

    for (const userId of inactiveIds) {
      try {
        await UserModel.delete(userId);
        deletedCount++;
      } catch (_error) {
        logger.warn('Erreur suppression utilisateur inactif', {
          userId,
          error: (_error as Error).message,
        });
      }
    }

    return deletedCount;
  }

  private async countOldDatasets(olderThanDays: number): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const count = await databaseConfig.getPrismaClient()?.dataset.count({
        where: {
          updatedAt: { lt: cutoffDate },
        },
      });

      return count ?? 0;
    } catch (_error) {
      logger.warn('Erreur comptage datasets obsolètes', {
        error: (_error as Error).message,
      });
      return 0;
    }
  }
}

// Export de l'instance singleton pour utilisation dans les controllers
export const databaseService = new DatabaseService();
