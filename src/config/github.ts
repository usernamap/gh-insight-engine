import { Octokit } from '@octokit/rest';

import { GitHubTokenValidationResult, RateLimitInfo } from '@/types';
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
        if (validation.isRateLimitError === true) {
          logger.error(GITHUB_MESSAGES.RATE_LIMIT_EXCEEDED, {
            error: validation.error,
          });
          throw new Error(GITHUB_MESSAGES.RATE_LIMIT_EXCEEDED_DETAILED);
        }

        if (
          validation.error != null &&
          (validation.error.includes(ERROR_CONSTANTS.NETWORK_ERRORS.TIMEOUT) ||
            validation.error.includes(ERROR_CONSTANTS.NETWORK_ERRORS.ECONNRESET))
        ) {
          logger.warn(GITHUB_MESSAGES.TIMEOUT_DEGRADED_MODE, {
            error: validation.error,
          });
          return;
        }
        throw new Error(
          `${GITHUB_MESSAGES.INVALID_TOKEN_PREFIX}${validation.error ?? GITHUB_MESSAGES.UNKNOWN_ERROR}`
        );
      }

      logger.info(GITHUB_MESSAGES.INITIALIZATION_SUCCESS, {
        username: validation.username,
        scopes: validation.scopes,
      });
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes(ERROR_CONSTANTS.NETWORK_ERRORS.TIMEOUT) ||
          error.message.includes(ERROR_CONSTANTS.NETWORK_ERRORS.ECONNRESET) ||
          error.message.includes(ERROR_CONSTANTS.NETWORK_ERRORS.ENOTFOUND) ||
          error.message.includes(ERROR_CONSTANTS.NETWORK_ERRORS.CONNECT_TIMEOUT_ERROR))
      ) {
        logger.warn(GITHUB_MESSAGES.CONNECTIVITY_ISSUE_DEGRADED, {
          error: error.message,
        });
        return;
      }
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
          error: GITHUB_MESSAGES.RATE_LIMIT_EXCEEDED_DETAILED,
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
    variables: Record<string, unknown> = {},
    maxRetries = GITHUB_CONSTANTS.DEFAULT_MAX_RETRIES
  ): Promise<T> {
    if (!this.octokit) {
      throw new Error(GITHUB_MESSAGES.CLIENT_NOT_INITIALIZED);
    }

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        await this.checkRateLimit();

        const response = await this.octokit.graphql<T>(query, variables);
        return response;
      } catch (_error: unknown) {
        logger.error(GITHUB_MESSAGES.DEBUG_GRAPHQL_ERROR, {
          error: (_error as Error).message,
          stack: (_error as Error).stack,
          raw: JSON.stringify(_error),
        });
        lastError = _error as Error;

        if (this.isRateLimitError(_error) && attempt < maxRetries) {
          const waitTime = this.calculateWaitTime(_error);
          logger.warn(`${GITHUB_MESSAGES.RATE_LIMIT_OPTIMIZED_WAIT}: ${waitTime}ms`, {
            attempt: attempt + 1,
            maxRetries,
            originalError: (_error as Error).message,
          });

          await this.wait(waitTime);
          continue;
        }

        if (attempt === maxRetries) {
          logger.error(GITHUB_MESSAGES.GRAPHQL_FAILED_ATTEMPTS, {
            error: (_error as Error).message,
            attempts: maxRetries + 1,
          });
          break;
        }

        const backoffTime = Math.min(
          GITHUB_CONSTANTS.RATE_LIMIT_MIN_BACKOFF *
            Math.pow(GITHUB_CONSTANTS.RATE_LIMIT_BACKOFF_MULTIPLIER, attempt),
          GITHUB_CONSTANTS.RATE_LIMIT_MAX_BACKOFF
        );
        logger.warn(`${GITHUB_MESSAGES.RATE_LIMIT_BACKOFF_APPLIED}: ${backoffTime}ms`, {
          attempt: attempt + 1,
          maxRetries,
        });
        await this.wait(backoffTime);
      }
    }

    throw lastError ?? new Error(GITHUB_MESSAGES.GRAPHQL_QUERY_FAILED);
  }

  public async executeRestRequest<T = Record<string, unknown>>(
    endpoint: string,
    options: unknown = {},
    maxRetries = GITHUB_CONSTANTS.DEFAULT_MAX_RETRIES
  ): Promise<T> {
    if (!this.octokit) {
      throw new Error(GITHUB_MESSAGES.CLIENT_NOT_INITIALIZED);
    }

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        await this.checkRateLimit();

        const response = await this.octokit.request(endpoint, options as Record<string, unknown>);

        logger.debug(GITHUB_MESSAGES.REST_REQUEST_SUCCESS, {
          endpoint,
          attempt: attempt + 1,
        });

        return response.data;
      } catch (_error: unknown) {
        lastError = _error as Error;

        if (this.isRateLimitError(_error) && attempt < maxRetries) {
          const waitTime = this.calculateWaitTime(_error);
          logger.warn(`${GITHUB_MESSAGES.RATE_LIMIT_OPTIMIZED_WAIT}: ${waitTime}ms`, {
            endpoint,
            attempt: attempt + 1,
            originalError: (_error as Error).message,
          });

          await this.wait(waitTime);
          continue;
        }

        if (attempt === maxRetries) {
          logger.error(GITHUB_MESSAGES.REST_FAILED_ATTEMPTS, {
            endpoint,
            error: (_error as Error).message,
            attempts: maxRetries + 1,
          });
          break;
        }

        const backoffTime = Math.min(
          GITHUB_CONSTANTS.RATE_LIMIT_MIN_BACKOFF *
            Math.pow(GITHUB_CONSTANTS.RATE_LIMIT_BACKOFF_MULTIPLIER, attempt),
          GITHUB_CONSTANTS.RATE_LIMIT_MAX_BACKOFF
        );
        logger.warn(`${GITHUB_MESSAGES.RATE_LIMIT_BACKOFF_APPLIED}: ${backoffTime}ms`, {
          attempt: attempt + 1,
          maxRetries,
        });
        await this.wait(backoffTime);
      }
    }

    throw lastError ?? new Error(GITHUB_MESSAGES.REST_REQUEST_FAILED);
  }

  private async checkRateLimit(): Promise<void> {
    if (!this.rateLimitInfo) return;

    if (this.rateLimitInfo.remaining < GITHUB_CONSTANTS.RATE_LIMIT_THRESHOLD) {
      const resetTime = this.rateLimitInfo.reset * 1000;
      const currentTime = Date.now();
      const waitTime = Math.max(resetTime - currentTime, 0);

      if (waitTime > 0) {
        const cappedWaitTime = Math.min(waitTime, GITHUB_CONSTANTS.RATE_LIMIT_WAIT_TIME_MAX);

        logger.warn(GITHUB_MESSAGES.RATE_LIMIT_LOW_WAIT, {
          remaining: this.rateLimitInfo.remaining,
          waitTime: cappedWaitTime,
          originalWaitTime: waitTime,
        });

        await this.wait(cappedWaitTime);
      }
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

  private calculateWaitTime(_error: unknown): number {
    const headers = (_error as { response?: { headers?: Record<string, string> } }).response
      ?.headers;
    if (headers?.[GITHUB_CONSTANTS.RATE_LIMIT_RESET_HEADER] != null) {
      const resetTime =
        parseInt(
          headers[GITHUB_CONSTANTS.RATE_LIMIT_RESET_HEADER] ??
            GITHUB_CONSTANTS.RATE_LIMIT_RESET_DEFAULT
        ) * 1000;
      const currentTime = Date.now();
      const waitTime = Math.max(resetTime - currentTime, 0);

      return Math.min(waitTime, GITHUB_CONSTANTS.RATE_LIMIT_WAIT_TIME_MAX);
    }

    return GITHUB_CONSTANTS.RATE_LIMIT_WAIT_TIME_DEFAULT;
  }

  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
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
