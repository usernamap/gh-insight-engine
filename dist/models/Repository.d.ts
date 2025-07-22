import { Repository as PrismaRepository } from '@/generated/prisma';
import { GitHubRepo } from '@/types/github';
export declare class RepositoryModel {
    static create(repoData: GitHubRepo, userId: string): Promise<PrismaRepository>;
    static findByNameWithOwner(nameWithOwner: string): Promise<PrismaRepository | null>;
    static findByUserId(userId: string, options?: {
        limit?: number;
        offset?: number;
        includePrivate?: boolean;
        sortBy?: 'stars' | 'forks' | 'updated' | 'created';
        sortOrder?: 'asc' | 'desc';
    }): Promise<{
        repositories: PrismaRepository[];
        total: number;
    }>;
    static update(id: string, updateData: Partial<GitHubRepo>): Promise<PrismaRepository>;
    static enrichWithDevOpsData(id: string, devOpsData: {
        githubActions?: import('@/types/github').GitHubActions;
        security?: import('@/types/github').GitHubSecurity;
        packages?: import('@/types/github').GitHubPackages;
        branchProtection?: import('@/types/github').GitHubBranchProtection;
        community?: import('@/types/github').GitHubCommunity;
        traffic?: import('@/types/github').GitHubTraffic;
    }): Promise<PrismaRepository>;
    static delete(id: string): Promise<void>;
    static search(filters: {
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
        repositories: PrismaRepository[];
        total: number;
    }>;
    static getStats(): Promise<{
        totalRepositories: number;
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
    }>;
    static upsert(repoData: GitHubRepo, userId: string): Promise<PrismaRepository>;
}
//# sourceMappingURL=Repository.d.ts.map