"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.githubConfig = exports.GitHubConfig = exports.REQUIRED_SCOPES = void 0;
const rest_1 = require("@octokit/rest");
const logger_1 = __importDefault(require("@/utils/logger"));
exports.REQUIRED_SCOPES = [
    'repo',
    'user:email',
    'read:user',
    'read:org',
    'read:packages',
    'security_events',
    'actions:read',
    'admin:repo_hook',
    'repo:status',
];
class GitHubConfig {
    constructor() {
        this.octokit = null;
        this.token = null;
        this.rateLimitInfo = null;
    }
    async initialize(githubToken) {
        this.token = githubToken;
        this.octokit = new rest_1.Octokit({
            auth: githubToken,
            userAgent: 'github-insight-engine/1.0.0',
            request: {
                timeout: 30000,
                retries: 3,
            },
        });
        const validation = await this.validateToken();
        if (!validation.valid) {
            throw new Error(`Token GitHub invalide: ${validation.error}`);
        }
        logger_1.default.info('Configuration GitHub initialisée avec succès', {
            username: validation.username,
            scopes: validation.scopes,
        });
    }
    async validateToken(token) {
        const authToken = token ?? this.token;
        if (!authToken) {
            return {
                valid: false,
                error: 'Aucun token GitHub fourni',
            };
        }
        try {
            const tempOctokit = new rest_1.Octokit({ auth: authToken });
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
        }
        catch (_error) {
            logger_1.default.error('Erreur validation token GitHub', { error: _error.message });
            return {
                valid: false,
                error: _error.message ?? 'Token invalide ou expiré',
            };
        }
    }
    extractScopesFromHeaders(headers) {
        const scopesHeader = headers['x-oauth-scopes'] ?? headers['X-OAuth-Scopes'];
        if (!scopesHeader || typeof scopesHeader !== 'string')
            return [];
        return scopesHeader
            .split(',')
            .map((scope) => scope.trim())
            .filter((scope) => scope.length > 0);
    }
    checkMissingScopes(userScopes) {
        return exports.REQUIRED_SCOPES.filter((requiredScope) => {
            if (requiredScope.includes(':')) {
                const [prefix] = requiredScope.split(':');
                return !userScopes.some((scope) => scope === requiredScope || scope.startsWith(`${prefix}:`));
            }
            return !userScopes.includes(requiredScope);
        });
    }
    async executeGraphQLQuery(query, variables = {}, maxRetries = 2) {
        if (!this.octokit) {
            throw new Error('GitHub client non initialisé');
        }
        let lastError;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                await this.checkRateLimit();
                const response = await this.octokit.graphql(query, variables);
                logger_1.default.debug('Requête GraphQL exécutée avec succès', {
                    query: `${query.substring(0, 100)}...`,
                    attempt: attempt + 1,
                });
                return response;
            }
            catch (_error) {
                lastError = _error;
                if (this.isRateLimitError(_error) && attempt < maxRetries) {
                    const waitTime = this.calculateWaitTime(_error);
                    logger_1.default.warn(`Rate limit atteinte, attente de ${waitTime}ms`, {
                        attempt: attempt + 1,
                        maxRetries,
                    });
                    await this.wait(waitTime);
                    continue;
                }
                if (attempt === maxRetries) {
                    logger_1.default.error('Requête GraphQL échouée après tous les essais', {
                        error: _error.message,
                        attempts: maxRetries + 1,
                    });
                    break;
                }
                await this.wait(1000 * Math.pow(2, attempt));
            }
        }
        throw lastError ?? new Error('Requête GraphQL échouée');
    }
    async executeRestRequest(endpoint, options = {}, maxRetries = 2) {
        if (!this.octokit) {
            throw new Error('GitHub client non initialisé');
        }
        let lastError;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                await this.checkRateLimit();
                const response = await this.octokit.request(endpoint, options);
                logger_1.default.debug('Requête REST exécutée avec succès', {
                    endpoint,
                    attempt: attempt + 1,
                });
                return response.data;
            }
            catch (_error) {
                lastError = _error;
                if (this.isRateLimitError(_error) && attempt < maxRetries) {
                    const waitTime = this.calculateWaitTime(_error);
                    logger_1.default.warn(`Rate limit atteinte, attente de ${waitTime}ms`, {
                        endpoint,
                        attempt: attempt + 1,
                    });
                    await this.wait(waitTime);
                    continue;
                }
                if (attempt === maxRetries) {
                    logger_1.default.error('Requête REST échouée après tous les essais', {
                        endpoint,
                        error: _error.message,
                        attempts: maxRetries + 1,
                    });
                    break;
                }
                await this.wait(1000 * Math.pow(2, attempt));
            }
        }
        throw lastError ?? new Error('Requête REST échouée');
    }
    async checkRateLimit() {
        if (!this.rateLimitInfo)
            return;
        if (this.rateLimitInfo.remaining < 100) {
            const waitTime = (this.rateLimitInfo.reset - Date.now() / 1000) * 1000;
            if (waitTime > 0) {
                logger_1.default.warn('Rate limit faible, attente avant prochaine requête', {
                    remaining: this.rateLimitInfo.remaining,
                    waitTime,
                });
                await this.wait(Math.min(waitTime, 60000));
            }
        }
    }
    isRateLimitError(_error) {
        return (_error.status === 403 &&
            (_error.message?.includes('rate limit') ??
                _error.message?.includes('API rate limit')));
    }
    calculateWaitTime(_error) {
        if (_error.response?.headers?.['x-ratelimit-reset']) {
            const resetTime = parseInt(_error.response?.headers?.['x-ratelimit-reset'] ?? '0') * 1000;
            return Math.max(resetTime - Date.now(), 60000);
        }
        return 60000;
    }
    wait(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    getOctokit() {
        return this.octokit;
    }
    getToken() {
        return this.token;
    }
    getRateLimitInfo() {
        return this.rateLimitInfo;
    }
    cleanup() {
        this.octokit = null;
        this.token = null;
        this.rateLimitInfo = null;
        logger_1.default.info('Configuration GitHub nettoyée');
    }
}
exports.GitHubConfig = GitHubConfig;
exports.githubConfig = new GitHubConfig();
exports.default = exports.githubConfig;
//# sourceMappingURL=github.js.map