/**
 * Configuration GitHub API avec validation des tokens et permissions
 * Basé sur les spécifications api_data_github.md
 */

import { Octokit } from '@octokit/rest';
import { GraphQLError } from '@octokit/graphql/dist-types/error';
import { GitHubTokenValidationResult, RateLimitInfo } from '@/types/github';
import logger from '@/utils/logger';

// Permissions requises pour le token GitHub Classic
export const REQUIRED_SCOPES = [
  'repo',
  'user:email',
  'read:user',
  'read:org',
  'read:packages',
  'security_events',
  'actions:read',
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
  public async validateToken(token?: string): Promise<GitHubTokenValidationResult> {
    const authToken = token || this.token;

    if (!authToken) {
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

      const scopes = this.extractScopesFromHeaders(userResponse.headers);
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

    } catch (error: any) {
      logger.error('Erreur validation token GitHub', { error: error.message });

      return {
        valid: false,
        error: error.message || 'Token invalide ou expiré',
      };
    }
  }

  /**
   * Extraction des scopes depuis les headers de réponse
   */
  private extractScopesFromHeaders(headers: Record<string, string>): string[] {
    const scopesHeader = headers['x-oauth-scopes'] || headers['X-OAuth-Scopes'];
    if (!scopesHeader) return [];

    return scopesHeader
      .split(',')
      .map(scope => scope.trim())
      .filter(scope => scope.length > 0);
  }

  /**
   * Vérifie les scopes manquants
   */
  private checkMissingScopes(userScopes: string[]): string[] {
    return REQUIRED_SCOPES.filter(requiredScope => {
      // Logique spéciale pour les scopes avec préfixes
      if (requiredScope.includes(':')) {
        const [prefix] = requiredScope.split(':');
        return !userScopes.some(scope =>
          scope === requiredScope || scope.startsWith(`${prefix}:`),
        );
      }
      return !userScopes.includes(requiredScope);
    });
  }

  /**
   * Exécute une requête GraphQL avec gestion d'erreurs et retry
   */
  public async executeGraphQLQuery<T = any>(
    query: string,
    variables: Record<string, any> = {},
    maxRetries = 2,
  ): Promise<T> {
    if (!this.octokit) {
      throw new Error('GitHub client non initialisé');
    }

    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        await this.checkRateLimit();

        const response = await this.octokit.graphql<T>(query, variables);

        logger.debug('Requête GraphQL exécutée avec succès', {
          query: `${query.substring(0, 100)  }...`,
          attempt: attempt + 1,
        });

        return response;

      } catch (error: any) {
        lastError = error;

        if (this.isRateLimitError(error) && attempt < maxRetries) {
          const waitTime = this.calculateWaitTime(error);
          logger.warn(`Rate limit atteinte, attente de ${waitTime}ms`, {
            attempt: attempt + 1,
            maxRetries,
          });

          await this.wait(waitTime);
          continue;
        }

        if (attempt === maxRetries) {
          logger.error('Requête GraphQL échouée après tous les essais', {
            error: error.message,
            attempts: maxRetries + 1,
          });
          break;
        }

        // Attendre avant le prochain essai
        await this.wait(1000 * Math.pow(2, attempt)); // Backoff exponentiel
      }
    }

    throw lastError!;
  }

  /**
   * Exécute une requête REST API
   */
  public async executeRestRequest<T = any>(
    endpoint: string,
    options: any = {},
    maxRetries = 2,
  ): Promise<T> {
    if (!this.octokit) {
      throw new Error('GitHub client non initialisé');
    }

    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        await this.checkRateLimit();

        const response = await this.octokit.request(endpoint, options);

        logger.debug('Requête REST exécutée avec succès', {
          endpoint,
          attempt: attempt + 1,
        });

        return response.data;

      } catch (error: any) {
        lastError = error;

        if (this.isRateLimitError(error) && attempt < maxRetries) {
          const waitTime = this.calculateWaitTime(error);
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
            error: error.message,
            attempts: maxRetries + 1,
          });
          break;
        }

        await this.wait(1000 * Math.pow(2, attempt));
      }
    }

    throw lastError!;
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
  private isRateLimitError(error: any): boolean {
    return error.status === 403 &&
           (error.message?.includes('rate limit') ||
            error.message?.includes('API rate limit'));
  }

  /**
   * Calcule le temps d'attente basé sur l'erreur de rate limit
   */
  private calculateWaitTime(error: any): number {
    // Essaie d'extraire le temps de reset des headers
    if (error.response?.headers?.['x-ratelimit-reset']) {
      const resetTime = parseInt(error.response.headers['x-ratelimit-reset']) * 1000;
      return Math.max(resetTime - Date.now(), 60000); // Minimum 1 minute
    }

    return 60000; // Défaut: 1 minute
  }

  /**
   * Attendre un certain temps
   */
  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
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
