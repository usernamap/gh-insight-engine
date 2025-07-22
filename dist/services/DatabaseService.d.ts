import { UserProfile, GitHubRepo, DatasetMetadata } from "@/types/github";
import { AnalyticsExtension } from "@/types/analytics";
import { InsightsExtension } from "@/types/insights";
import { PrismaUser, PrismaRepository, PrismaDataset } from "@/models";
export declare class DatabaseService {
  saveCompleteUserDataset(
    userProfile: UserProfile,
    repositories: GitHubRepo[],
    metadata: DatasetMetadata,
    analytics?: AnalyticsExtension,
    insights?: InsightsExtension,
  ): Promise<{
    user: PrismaUser;
    repositories: PrismaRepository[];
    dataset: PrismaDataset;
  }>;
  getCompleteDataset(datasetId: string): Promise<{
    dataset: PrismaDataset;
    user: PrismaUser;
    repositories: PrismaRepository[];
  } | null>;
  getLatestUserDataset(username: string): Promise<{
    dataset: PrismaDataset;
    user: PrismaUser;
    repositories: PrismaRepository[];
  } | null>;
  updateDatasetAnalyses(
    datasetId: string,
    analytics?: AnalyticsExtension,
    insights?: InsightsExtension,
  ): Promise<PrismaDataset>;
  enrichRepositoriesWithDevOpsData(
    repositoryIds: string[],
    devOpsDataMap: Record<
      string,
      {
        githubActions?: any;
        security?: any;
        packages?: any;
        branchProtection?: any;
        community?: any;
        traffic?: any;
      }
    >,
  ): Promise<PrismaRepository[]>;
  searchUsersWithStats(filters: {
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
  }>;
  searchRepositoriesWithUserInfo(filters: {
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
  }>;
  getPlatformStats(): Promise<{
    users: {
      total: number;
      withDatasets: number;
      averageFollowers: number;
      topLanguages: Array<{
        language: string;
        count: number;
      }>;
    };
    repositories: {
      total: number;
      totalStars: number;
      totalForks: number;
      topLanguages: Array<{
        language: string;
        count: number;
      }>;
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
  }>;
  areUserAnalyticsUpToDate(
    username: string,
    maxAgeMinutes?: number,
  ): Promise<{
    hasDataset: boolean;
    hasAnalytics: boolean;
    hasInsights: boolean;
    analyticsUpToDate: boolean;
    insightsUpToDate: boolean;
    lastUpdate?: Date;
  }>;
  deleteAllUserData(username: string): Promise<{
    deletedUsers: number;
    deletedRepositories: number;
    deletedDatasets: number;
  }>;
  cleanupOldData(options?: {
    olderThanDays?: number;
    dryRun?: boolean;
  }): Promise<{
    datasets: number;
    orphanedRepositories: number;
    inactiveUsers: number;
  }>;
  healthCheck(): Promise<{
    connected: boolean;
    responseTime: number;
    statistics: {
      users: number;
      repositories: number;
      datasets: number;
    };
    issues: string[];
  }>;
  private getRepositoriesByIds;
  private countUsersWithDatasets;
  private findOrphanedRepositories;
  private deleteOrphanedRepositories;
  private findInactiveUsers;
  private deleteInactiveUsers;
  private countOldDatasets;
}
export declare const databaseService: DatabaseService;
//# sourceMappingURL=DatabaseService.d.ts.map
