import { GitHubRepo, UserProfile } from "@/types/github";
export declare class GitHubService {
  getUserOrganizations(): Promise<string[]>;
  getUserProfile(): Promise<UserProfile>;
  getUserRepos(cursor?: string): Promise<GitHubRepo[]>;
  getOrgRepos(orgName: string, cursor?: string): Promise<GitHubRepo[]>;
  getGitHubActionsData(owner: string, repo: string): Promise<any>;
  getSecurityData(owner: string, repo: string): Promise<any>;
  getPackagesData(owner: string, repo: string): Promise<any>;
  getBranchProtectionData(
    owner: string,
    repo: string,
    defaultBranch: string,
  ): Promise<any>;
  getCommunityHealthData(owner: string, repo: string): Promise<any>;
  getTrafficData(owner: string, repo: string): Promise<any>;
  enrichWithDevOpsData(repo: GitHubRepo): Promise<GitHubRepo>;
  sanitizeDescription(description: string): string;
}
export declare const githubService: GitHubService;
//# sourceMappingURL=GitHubService.d.ts.map
