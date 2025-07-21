import { Octokit } from '@octokit/rest';
import { GitHubTokenValidationResult, RateLimitInfo } from '@/types/github';
export declare const REQUIRED_SCOPES: readonly ["repo", "user:email", "read:user", "read:org", "read:packages", "security_events", "actions:read", "admin:repo_hook", "repo:status"];
export declare class GitHubConfig {
    private octokit;
    private token;
    private rateLimitInfo;
    initialize(githubToken: string): Promise<void>;
    validateToken(token?: string): Promise<GitHubTokenValidationResult>;
    private extractScopesFromHeaders;
    private checkMissingScopes;
    executeGraphQLQuery<T = any>(query: string, variables?: Record<string, any>, maxRetries?: number): Promise<T>;
    executeRestRequest<T = any>(endpoint: string, options?: any, maxRetries?: number): Promise<T>;
    private checkRateLimit;
    private isRateLimitError;
    private calculateWaitTime;
    private wait;
    getOctokit(): Octokit | null;
    getToken(): string | null;
    getRateLimitInfo(): RateLimitInfo | null;
    cleanup(): void;
}
export declare const githubConfig: GitHubConfig;
export default githubConfig;
//# sourceMappingURL=github.d.ts.map