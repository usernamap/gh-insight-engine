import { Octokit } from '@octokit/rest';

import { GitHubTokenValidationResult, RateLimitInfo, GitHubRateLimitError } from '@/types';
import logger from '@/utils/logger';
import { GITHUB_CONSTANTS, GITHUB_MESSAGES, ERROR_CONSTANTS } from '@/constants';

export class GitHubConfig {
  private octokit: Octokit | null = null;
  private token: string | null = null;
  private rateLimitInfo: RateLimitInfo | null = null;

  public async initialize(githubToken: string): Promise<void> {
    this.token = githubToken;
    this.octokit = new Octokit({
      auth: githubToken,
      userAgent: GITHUB_CONSTANTS.USER_AGENT,
      request: {
        timeout: GITHUB_CONSTANTS.INITIAL_TIMEOUT,
        retries: GITHUB_CONSTANTS.INITIAL_RETRIES,
        retryAfter: GITHUB_CONSTANTS.INITIAL_RETRY_AFTER,
      },
    });

    try {
      const validation = await this.validateToken();
      if (!validation.valid) {
        // Handle rate limit errors specifically
        if (validation.isRateLimitError === true) {
          logger.error('GitHub API rate limit exceeded during initialization', {
            error: validation.error,
            rateLimitError: true,
          });
          throw new GitHubRateLimitError(GITHUB_MESSAGES.RATE_LIMIT_INITIALIZATION_ERROR);
        }

        // Handle other validation errors
        throw new Error(
          `${GITHUB_MESSAGES.INVALID_TOKEN_PREFIX}${validation.error ?? GITHUB_MESSAGES.UNKNOWN_ERROR}`
        );
      }

      logger.info(GITHUB_MESSAGES.INITIALIZATION_SUCCESS, {
        username: validation.username,
        scopes: validation.scopes,
      });
    } catch (error) {
      // Re-throw GitHubRateLimitError as-is
      if (error instanceof GitHubRateLimitError) {
        throw error;
      }

      logger.error('GitHub configuration initialization failed', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  public async validateToken(token?: string): Promise<GitHubTokenValidationResult> {
    const authToken = token ?? this.token;

    if (authToken == null) {
      return {
        valid: false,
        error: GITHUB_MESSAGES.NO_TOKEN_PROVIDED,
      };
    }

    try {
      const tempOctokit = new Octokit({
        auth: authToken,
        request: {
          timeout: GITHUB_CONSTANTS.VALIDATION_TIMEOUT,
          retries: GITHUB_CONSTANTS.VALIDATION_RETRIES,
        },
      });

      const [userResponse, rateLimitResponse] = await Promise.all([
        tempOctokit.rest.users.getAuthenticated(),
        tempOctokit.rest.rateLimit.get(),
      ]);

      const scopes = this.extractScopesFromHeaders(
        userResponse.headers as Record<string, string | number | undefined>
      );
      const missingScopes = this.checkMissingScopes(scopes);

      if (missingScopes.length > 0) {
        return {
          valid: false,
          username: userResponse.data.login,
          scopes,
          error: `${GITHUB_MESSAGES.MISSING_PERMISSIONS_PREFIX}${missingScopes.join(', ')}`,
        };
      }

      this.rateLimitInfo = {
        limit: rateLimitResponse.data.rate.limit,
        remaining: rateLimitResponse.data.rate.remaining,
        reset: rateLimitResponse.data.rate.reset,
        used: rateLimitResponse.data.rate.used,
      };

      return {
        valid: true,
        username: userResponse.data.login,
        scopes,
      };
    } catch (_error: unknown) {
      const error = _error as Error;
      logger.error(GITHUB_MESSAGES.TOKEN_VALIDATION_ERROR, { error: error.message });

      if (this.isRateLimitError(_error)) {
        return {
          valid: false,
          error: GITHUB_MESSAGES.RATE_LIMIT_SIMPLE_MESSAGE,
          isRateLimitError: true,
        };
      }

      if (
        error.message.includes(ERROR_CONSTANTS.NETWORK_ERRORS.TIMEOUT) ||
        error.message.includes(ERROR_CONSTANTS.NETWORK_ERRORS.ECONNRESET) ||
        error.message.includes(ERROR_CONSTANTS.NETWORK_ERRORS.ENOTFOUND) ||
        error.message.includes(ERROR_CONSTANTS.NETWORK_ERRORS.CONNECT_TIMEOUT_ERROR) ||
        error.message.includes(ERROR_CONSTANTS.NETWORK_ERRORS.ECONNREFUSED)
      ) {
        return {
          valid: false,
          error: `${GITHUB_MESSAGES.CONNECTIVITY_ISSUE_PREFIX}${error.message}`,
          isNetworkError: true,
        };
      }

      return {
        valid: false,
        error: error.message ?? GITHUB_MESSAGES.INVALID_OR_EXPIRED_TOKEN,
      };
    }
  }

  private extractScopesFromHeaders(headers: Record<string, string | number | undefined>): string[] {
    const scopesHeader =
      headers[GITHUB_CONSTANTS.OAUTH_SCOPES_HEADER] ??
      headers[GITHUB_CONSTANTS.OAUTH_SCOPES_HEADER_ALT];
    if (scopesHeader == null || typeof scopesHeader !== 'string') return [];

    return scopesHeader
      .split(GITHUB_CONSTANTS.SCOPE_SEPARATOR)
      .map(scope => scope.trim())
      .filter(scope => scope.length > 0);
  }

  private checkMissingScopes(userScopes: string[]): string[] {
    const hasUser = userScopes.includes(GITHUB_CONSTANTS.USER_SCOPE_PARENT);
    const hasRepo = userScopes.includes(GITHUB_CONSTANTS.REPO_SCOPE_PARENT);
    return GITHUB_CONSTANTS.REQUIRED_SCOPES.filter(requiredScope => {
      if (userScopes.includes(requiredScope)) return false;
      if (
        hasUser &&
        (requiredScope.startsWith(GITHUB_CONSTANTS.USER_SCOPE_PREFIX) ||
          requiredScope === GITHUB_CONSTANTS.READ_USER_SCOPE)
      )
        return false;
      if (
        hasRepo &&
        (requiredScope.startsWith(GITHUB_CONSTANTS.REPO_SCOPE_PREFIX) ||
          requiredScope === GITHUB_CONSTANTS.READ_ORG_SCOPE ||
          requiredScope === GITHUB_CONSTANTS.READ_PACKAGES_SCOPE ||
          requiredScope === GITHUB_CONSTANTS.SECURITY_EVENTS_SCOPE ||
          requiredScope === GITHUB_CONSTANTS.REPO_STATUS_SCOPE)
      )
        return false;
      if (requiredScope.includes(GITHUB_CONSTANTS.SCOPE_PREFIX_SEPARATOR)) {
        const [parent] = requiredScope.split(GITHUB_CONSTANTS.SCOPE_PREFIX_SEPARATOR);
        if (userScopes.includes(parent)) return false;
      }
      return true;
    });
  }

  public async executeGraphQLQuery<T = Record<string, unknown>>(
    query: string,
    variables: Record<string, unknown> = {}
  ): Promise<T> {
    if (!this.octokit) {
      throw new Error(GITHUB_MESSAGES.CLIENT_NOT_INITIALIZED);
    }

    try {
      const response = await this.octokit.graphql<T>(query, variables);

      logger.debug(GITHUB_MESSAGES.DEBUG_GRAPHQL_ERROR, {
        success: true,
        query: `${query.substring(0, 100)}...`,
      });

      return response;
    } catch (_error: unknown) {
      logger.error(GITHUB_MESSAGES.DEBUG_GRAPHQL_ERROR, {
        error: (_error as Error).message,
        query: `${query.substring(0, 100)}...`,
      });

      throw _error;
    }
  }

  public async executeRestRequest<T = Record<string, unknown>>(
    endpoint: string,
    options: unknown = {}
  ): Promise<T> {
    if (!this.octokit) {
      throw new Error(GITHUB_MESSAGES.CLIENT_NOT_INITIALIZED);
    }

    try {
      const response = await this.octokit.request(endpoint, options as Record<string, unknown>);

      logger.debug(GITHUB_MESSAGES.REST_REQUEST_SUCCESS, {
        endpoint,
        success: true,
      });

      return response.data;
    } catch (_error: unknown) {
      logger.error(GITHUB_MESSAGES.REST_REQUEST_FAILED, {
        endpoint,
        error: (_error as Error).message,
      });

      throw _error;
    }
  }

  private isRateLimitError(_error: unknown): boolean {
    const errorMessage = (_error as Error).message?.toLowerCase() ?? '';
    const status = (_error as { status?: number }).status;

    if (status === GITHUB_CONSTANTS.RATE_LIMIT_STATUS_CODE) {
      return true;
    }

    return GITHUB_CONSTANTS.GITHUB_RATE_LIMIT_PATTERNS.some(pattern =>
      errorMessage.includes(pattern.toLowerCase())
    );
  }

  public getOctokit(): Octokit | null {
    return this.octokit;
  }

  public getToken(): string | null {
    return this.token;
  }

  public getRateLimitInfo(): RateLimitInfo | null {
    return this.rateLimitInfo;
  }

  public cleanup(): void {
    this.octokit = null;
    this.token = null;
    this.rateLimitInfo = null;
    logger.info(GITHUB_MESSAGES.CONFIGURATION_CLEANED_UP);
  }
}

export const githubConfig = new GitHubConfig();
export default githubConfig;
