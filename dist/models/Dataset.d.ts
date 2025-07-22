import { Dataset as PrismaDataset } from '@/generated/prisma';
import { DatasetMetadata } from '@/types/github';
import { AnalyticsExtension } from '@/types/analytics';
import { InsightsExtension } from '@/types/insights';
export declare class DatasetModel {
    static create(userProfileId: string, metadata: DatasetMetadata, repositories: string[]): Promise<PrismaDataset>;
    static findById(id: string): Promise<PrismaDataset | null>;
    static findByUserId(userProfileId: string, options?: {
        limit?: number;
        offset?: number;
        includeAnalytics?: boolean;
        includeInsights?: boolean;
    }): Promise<{
        datasets: PrismaDataset[];
        total: number;
    }>;
    static updateMetadata(id: string, metadata: DatasetMetadata): Promise<PrismaDataset>;
    static updateAnalytics(id: string, analytics: AnalyticsExtension): Promise<PrismaDataset>;
    static updateInsights(id: string, insights: InsightsExtension): Promise<PrismaDataset>;
    static delete(id: string): Promise<void>;
    static findLatestByUserId(userProfileId: string): Promise<PrismaDataset | null>;
    static isAnalyticsUpToDate(id: string, maxAgeMinutes?: number): Promise<{
        hasAnalytics: boolean;
        hasInsights: boolean;
        analyticsUpToDate: boolean;
        insightsUpToDate: boolean;
    }>;
    static getStats(): Promise<{
        totalDatasets: number;
        datasetsWithAnalytics: number;
        datasetsWithInsights: number;
        averageRepositoriesPerDataset: number;
        recentActivity: {
            last24h: number;
            lastWeek: number;
            lastMonth: number;
        };
    }>;
    static search(filters: {
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
    }): Promise<{
        datasets: PrismaDataset[];
        total: number;
    }>;
    static clone(sourceId: string, newUserProfileId?: string): Promise<PrismaDataset>;
    static cleanupOldDatasets(olderThanDays?: number): Promise<number>;
}
//# sourceMappingURL=Dataset.d.ts.map