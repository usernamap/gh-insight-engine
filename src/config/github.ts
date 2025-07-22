/**
 * Configuration GitHub API avec validation des tokens et permissions
 * Basé sur les spécifications api_data_github.md
 */

import { Octokit } from '@octokit/rest';

import { GitHubTokenValidationResult } from '@/types/github';
import { RateLimitInfo } from '@/types/github';
import logger from '@/utils/logger';

// Permissions requises pour le token GitHub Classic
export const REQUIRED_SCOPES = [
  'repo',
  'user:email',
  'read:user',
  'read:org',
  'read:packages',
  'security_events',
  'admin:repo_hook',
  'repo:status',
] as const;

export class GitHubConfig {
  private octokit: Octokit | null = null;
  private token: string | null = null;
  private rateLimitInfo: RateLimitInfo | null = null;

  /**
   * Initialise la configuration GitHub avec un token
   */
  public async initialize(githubToken: string): Promise<void> {
    this.token = githubToken;
    this.octokit = new Octokit({
      auth: githubToken,
      userAgent: 'github-insight-engine/1.0.0',
      request: {
        timeout: 30000, // 30 secondes
        retries: 3,
      },
    });

    // Validation initiale du token
    const validation = await this.validateToken();
    if (!validation.valid) {
      throw new Error(`Token GitHub invalide: ${validation.error}`);
    }

    logger.info('Configuration GitHub initialisée avec succès', {
      username: validation.username,
      scopes: validation.scopes,
    });
  }

  /**
   * Valide un token GitHub et vérifie les permissions
   */
  public async validateToken(
    token?: string,
  ): Promise<GitHubTokenValidationResult> {
    const authToken = token ?? this.token;

    if (authToken == null) {
      return {
        valid: false,
        error: 'Aucun token GitHub fourni',
      };
    }

    try {
      const tempOctokit = new Octokit({ auth: authToken });

      // Récupération des informations utilisateur et scopes
      const [userResponse, rateLimitResponse] = await Promise.all([
        tempOctokit.rest.users.getAuthenticated(),
        tempOctokit.rest.rateLimit.get(),
      ]);

      // DEBUG: Log du header x-oauth-scopes brut
      logger.info('DEBUG x-oauth-scopes', {
        headers: userResponse.headers,
        xOAuthScopes: userResponse.headers['x-oauth-scopes'] ?? userResponse.headers['X-OAuth-Scopes'],
      });

      const scopes = this.extractScopesFromHeaders(
        userResponse.headers as Record<string, string | number | undefined>,
      );
      const missingScopes = this.checkMissingScopes(scopes);

      if (missingScopes.length > 0) {
        return {
          valid: false,
          username: userResponse.data.login,
          scopes,
          error: `Permissions manquantes: ${missingScopes.join(', ')}`,
        };
      }

      // Mise à jour des informations de rate limit
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
      logger.error('Erreur validation token GitHub', { error: (_error as Error).message });

      return {
        valid: false,
        error: (_error as Error).message ?? 'Token invalide ou expiré',
      };
    }
  }

  /**
   * Extraction des scopes depuis les headers de réponse
   */
  private extractScopesFromHeaders(
    headers: Record<string, string | number | undefined>,
  ): string[] {
    const scopesHeader = headers['x-oauth-scopes'] ?? headers['X-OAuth-Scopes'];
    if (scopesHeader == null || typeof scopesHeader !== 'string') return [];

    return scopesHeader
      .split(',')
      .map((scope) => scope.trim())
      .filter((scope) => scope.length > 0);
  }

  /**
   * Vérifie les scopes manquants
   */
  private checkMissingScopes(userScopes: string[]): string[] {
    const hasUser = userScopes.includes('user');
    const hasRepo = userScopes.includes('repo');
    return REQUIRED_SCOPES.filter((requiredScope) => {
      if (userScopes.includes(requiredScope)) return false;
      // user couvre tous les user:* et read:user
      if (hasUser && (requiredScope.startsWith('user:') || requiredScope === 'read:user')) return false;
      // repo couvre tous les repo:* et read:org, read:packages, security_events, repo:status
      if (hasRepo && (requiredScope.startsWith('repo:') || requiredScope === 'read:org' || requiredScope === 'read:packages' || requiredScope === 'security_events' || requiredScope === 'repo:status')) return false;
      // parent direct
      if (requiredScope.includes(':')) {
        const [parent] = requiredScope.split(':');
        if (userScopes.includes(parent)) return false;
      }
      return true;
    });
  }

  /**
   * Exécute une requête GraphQL avec gestion d'erreurs et retry
   */
  public async executeGraphQLQuery<T = Record<string, unknown>>(
    query: string,
    variables: Record<string, unknown> = {},
    maxRetries = 2,
  ): Promise<T> {
    if (!this.octokit) {
      throw new Error('GitHub client non initialisé');
    }

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        await this.checkRateLimit();

        const response = await this.octokit.graphql<T>(query, variables);
        logger.info('[DEBUG] GraphQL response:', JSON.stringify(response));
        return response;
      } catch (_error: unknown) {
        logger.error('[DEBUG] GraphQL error:', {
          error: (_error as Error).message,
          stack: (_error as Error).stack,
          raw: JSON.stringify(_error)
        });
        lastError = _error as Error;

        if (this.isRateLimitError(_error) && attempt < maxRetries) {
          const waitTime = this.calculateWaitTime(_error);
          logger.warn(`Rate limit atteinte, attente de ${waitTime}ms`, {
            attempt: attempt + 1,
            maxRetries,
          });

          await this.wait(waitTime);
          continue;
        }

        if (attempt === maxRetries) {
          logger.error('Requête GraphQL échouée après tous les essais', {
            error: (_error as Error).message,
            attempts: maxRetries + 1,
          });
          break;
        }

        // Attendre avant le prochain essai
        await this.wait(1000 * Math.pow(2, attempt)); // Backoff exponentiel
      }
    }

    throw lastError ?? new Error('Requête GraphQL échouée');
  }

  /**
   * Exécute une requête REST API
   */
  public async executeRestRequest<T = Record<string, unknown>>(
    endpoint: string,
    options: unknown = {},
    maxRetries = 2,
  ): Promise<T> {
    if (!this.octokit) {
      throw new Error('GitHub client non initialisé');
    }

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        await this.checkRateLimit();

        const response = await this.octokit.request(
          endpoint,
          options as Record<string, unknown>,
        );

        logger.debug('Requête REST exécutée avec succès', {
          endpoint,
          attempt: attempt + 1,
        });

        return response.data;
      } catch (_error: unknown) {
        lastError = _error as Error;

        if (this.isRateLimitError(_error) && attempt < maxRetries) {
          const waitTime = this.calculateWaitTime(_error);
          logger.warn(`Rate limit atteinte, attente de ${waitTime}ms`, {
            endpoint,
            attempt: attempt + 1,
          });

          await this.wait(waitTime);
          continue;
        }

        if (attempt === maxRetries) {
          logger.error('Requête REST échouée après tous les essais', {
            endpoint,
            error: (_error as Error).message,
            attempts: maxRetries + 1,
          });
          break;
        }

        await this.wait(1000 * Math.pow(2, attempt));
      }
    }

    throw lastError ?? new Error('Requête REST échouée');
  }

  /**
   * Vérifie si nous approchons de la limite de rate limit
   */
  private async checkRateLimit(): Promise<void> {
    if (!this.rateLimitInfo) return;

    // Si moins de 100 requêtes restantes, attendre
    if (this.rateLimitInfo.remaining < 100) {
      const waitTime = (this.rateLimitInfo.reset - Date.now() / 1000) * 1000;

      if (waitTime > 0) {
        logger.warn('Rate limit faible, attente avant prochaine requête', {
          remaining: this.rateLimitInfo.remaining,
          waitTime,
        });

        await this.wait(Math.min(waitTime, 60000)); // Max 1 minute
      }
    }
  }

  /**
   * Vérifie si l'erreur est liée au rate limiting
   */
  private isRateLimitError(_error: unknown): boolean {
    return (
      (_error as { status?: number }).status === 403 &&
      ((_error as Error).message?.includes('rate limit') ??
        (_error as Error).message?.includes('API rate limit'))
    );
  }

  /**
   * Calcule le temps d'attente basé sur l'erreur de rate limit
   */
  private calculateWaitTime(_error: unknown): number {
    // Essaie d'extraire le temps de reset des headers
    if ((_error as { response?: { headers?: Record<string, string> } }).response?.headers?.['x-ratelimit-reset'] != null) {
      const resetTime =
        parseInt((_error as { response?: { headers?: Record<string, string> } }).response?.headers?.['x-ratelimit-reset'] ?? '0') * 1000;
      return Math.max(resetTime - Date.now(), 60000); // Minimum 1 minute
    }

    return 60000; // Défaut: 1 minute
  }

  /**
   * Attendre un certain temps
   */
  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Getters pour l'accès aux propriétés
   */
  public getOctokit(): Octokit | null {
    return this.octokit;
  }

  public getToken(): string | null {
    return this.token;
  }

  public getRateLimitInfo(): RateLimitInfo | null {
    return this.rateLimitInfo;
  }

  /**
   * Nettoyage des ressources
   */
  public cleanup(): void {
    this.octokit = null;
    this.token = null;
    this.rateLimitInfo = null;
    logger.info('Configuration GitHub nettoyée');
  }
}

// Instance singleton
export const githubConfig = new GitHubConfig();
export default githubConfig;
