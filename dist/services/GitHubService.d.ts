import { GitHubRepo, UserProfile } from '@/types/github';
export declare class GitHubService {
    getUserOrganizations(): Promise<string[]>;
    getUserProfile(): Promise<UserProfile>;
    getUserRepos(cursor?: string): Promise<GitHubRepo[]>;
    getOrgRepos(orgName: string, cursor?: string): Promise<GitHubRepo[]>;
    getGitHubActionsData(owner: string, repo: string): Promise<Record<string, unknown>>;
    getSecurityData(owner: string, repo: string): Promise<Record<string, unknown>>;
    getPackagesData(owner: string, repo: string): Promise<Record<string, unknown>>;
    getBranchProtectionData(owner: string, repo: string, defaultBranch: string): Promise<Record<string, unknown>>;
    getCommunityHealthData(owner: string, repo: string): Promise<Record<string, unknown>>;
    getTrafficData(owner: string, repo: string): Promise<Record<string, unknown>>;
    enrichWithDevOpsData(repo: GitHubRepo): Promise<GitHubRepo>;
    sanitizeDescription(description: string): string;
}
export declare const githubService: GitHubService;
//# sourceMappingURL=GitHubService.d.ts.map