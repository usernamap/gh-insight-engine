"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshGitHubValidation = exports.userRateLimit = exports.requireOwnership = exports.requireRole = exports.generateJWT = exports.optionalJWT = exports.authenticateJWT = exports.validateGitHubToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const github_1 = __importDefault(require("@/config/github"));
const models_1 = require("@/models");
const logger_1 = __importStar(require("@/utils/logger"));
const validateGitHubToken = async (req, _res, _next) => {
    try {
        const authHeader = req.headers.authorization;
        const githubToken = authHeader?.startsWith('Bearer ')
            ? authHeader.substring(7)
            : authHeader;
        if (!githubToken) {
            logger_1.logWithContext.auth('validate_github_token', req.ip ?? '', false, {
                reason: 'missing_token',
            });
            _res.status(401).json({
                _error: 'Token GitHub requis',
                message: 'Veuillez fournir votre token GitHub Classic dans le header Authorization',
                documentation: 'https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token',
            });
            return;
        }
        const validation = await github_1.default.validateToken(githubToken);
        if (!validation.valid) {
            logger_1.logWithContext.auth('validate_github_token', validation.username ?? 'unknown', false, {
                reason: validation.error,
            });
            _res.status(401).json({
                _error: 'Token GitHub invalide',
                message: validation.error,
                help: 'Vérifiez que votre token est correct et possède les permissions requises',
            });
            return;
        }
        req.user = { id: '', username: '', fullName: '', githubToken: '' };
        logger_1.logWithContext.auth('validate_github_token', validation.username ?? 'unknown', true, {
            scopes: validation.scopes,
        });
        _next();
    }
    catch (_error) {
        const errorMessage = _error instanceof Error ? _error.message : 'Unknown validation error';
        logger_1.logWithContext.auth('validate_github_token', req.ip ?? 'unknown', false, {
            reason: 'validation_error',
            _error: errorMessage,
        });
        _res.status(500).json({
            _error: 'Erreur validation token',
            message: 'Impossible de valider le token GitHub',
            details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
        });
    }
};
exports.validateGitHubToken = validateGitHubToken;
const authenticateJWT = async (req, _res, _next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader?.startsWith('Bearer ')
            ? authHeader.substring(7)
            : null;
        if (!token) {
            logger_1.logWithContext.auth('authenticate_jwt', req.ip ?? '', false, {
                reason: 'missing_token',
            });
            _res.status(401).json({
                _error: "Token d'authentification requis",
                message: 'Veuillez vous connecter pour accéder à cette ressource',
            });
            return;
        }
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            throw new Error('JWT_SECRET non configuré');
        }
        const decoded = jsonwebtoken_1.default.verify(token, jwtSecret);
        const now = Math.floor(Date.now() / 1000);
        if (decoded.exp < now) {
            logger_1.logWithContext.auth('authenticate_jwt', decoded.username, false, {
                reason: 'token_expired',
            });
            _res.status(401).json({
                _error: 'Token expiré',
                message: 'Veuillez vous reconnecter',
            });
            return;
        }
        const user = await models_1.UserModel.findById(decoded.userId);
        if (!user) {
            logger_1.logWithContext.auth('authenticate_jwt', decoded.username, false, {
                reason: 'user_not_found',
            });
            _res.status(401).json({
                _error: 'Utilisateur non trouvé',
                message: "Le compte utilisateur associé à ce token n'existe plus",
            });
            return;
        }
        req.jwt = decoded;
        req.user = { id: '', username: '', fullName: '', githubToken: '' };
        logger_1.logWithContext.auth('authenticate_jwt', decoded.username, true, {
            userId: decoded.userId,
        });
        _next();
    }
    catch (_error) {
        if (_error instanceof Error && _error.name === 'JsonWebTokenError') {
            logger_1.logWithContext.auth('authenticate_jwt', 'unknown', false, {
                reason: 'invalid_token',
            });
            _res.status(401).json({
                _error: 'Token JWT invalide',
                message: 'Token malformé ou corrompu',
            });
            return;
        }
        if (_error instanceof Error && _error.name === 'TokenExpiredError') {
            logger_1.logWithContext.auth('authenticate_jwt', 'unknown', false, {
                reason: 'token_expired',
            });
            _res.status(401).json({
                _error: 'Token expiré',
                message: 'Veuillez vous reconnecter',
            });
            return;
        }
        logger_1.default.error('Erreur authentification JWT', {
            _error: _error.message,
            stack: _error.stack,
        });
        _res.status(500).json({
            _error: "Erreur d'authentification",
            message: 'Erreur interne du serveur',
        });
    }
};
exports.authenticateJWT = authenticateJWT;
const optionalJWT = async (req, _res, _next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader?.startsWith('Bearer ')
            ? authHeader.substring(7)
            : null;
        if (!token) {
            _next();
            return;
        }
        await (0, exports.authenticateJWT)(req, _res, () => {
            _next();
        });
    }
    catch (_error) {
        _next();
    }
};
exports.optionalJWT = optionalJWT;
const generateJWT = (payload) => {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        throw new Error('JWT_SECRET non configuré');
    }
    const jwtPayload = {
        userId: payload.userId,
        username: payload.username,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
    };
    return jsonwebtoken_1.default.sign(jwtPayload, jwtSecret);
};
exports.generateJWT = generateJWT;
const requireRole = (_roles) => {
    return async (req, _res, _next) => {
        if (!req.user) {
            _res.status(401).json({
                _error: 'Authentification requise',
                message: 'Veuillez vous authentifier pour accéder à cette ressource',
            });
            return;
        }
        _next();
    };
};
exports.requireRole = requireRole;
const requireOwnership = (paramName = 'username') => {
    return async (req, _res, _next) => {
        if (!req.user) {
            _res.status(401).json({
                _error: 'Authentification requise',
                message: 'Veuillez vous authentifier pour accéder à cette ressource',
            });
            return;
        }
        const requestedUsername = req.params[paramName];
        const authenticatedUsername = req.user.username;
        if (requestedUsername !== authenticatedUsername) {
            logger_1.logWithContext.security('access_denied', 'high', {
                authenticatedUser: authenticatedUsername,
                requestedUser: requestedUsername,
                endpoint: req.path,
                method: req.method,
                ip: req.ip,
            });
            _res.status(403).json({
                _error: 'Accès interdit',
                message: "Vous ne pouvez accéder qu'à vos propres données",
            });
            return;
        }
        _next();
    };
};
exports.requireOwnership = requireOwnership;
const userRateLimit = (options) => {
    const userRequestCounts = new Map();
    return async (req, _res, _next) => {
        if (!req.user) {
            _next();
            return;
        }
        const userId = req.user.id;
        const now = Date.now();
        const windowMs = options.windowMs;
        const maxRequests = options.maxRequests;
        for (const [key, data] of userRequestCounts.entries()) {
            if (data.resetTime <= now) {
                userRequestCounts.delete(key);
            }
        }
        let userData = userRequestCounts.get(userId);
        if (!userData || userData.resetTime <= now) {
            userData = {
                count: 0,
                resetTime: now + windowMs,
            };
            userRequestCounts.set(userId, userData);
        }
        if (userData.count >= maxRequests) {
            const resetIn = Math.ceil((userData.resetTime - now) / 1000);
            logger_1.logWithContext.security('user_rate_limit_exceeded', 'medium', {
                userId,
                username: req.user.username,
                count: userData.count,
                maxRequests,
                resetIn,
            });
            _res.status(429).json({
                _error: 'Trop de requêtes',
                message: `Limite de ${maxRequests} requêtes par ${Math.ceil(windowMs / 60000)} minutes atteinte`,
                retryAfter: resetIn,
            });
            return;
        }
        userData.count++;
        _res.set({
            'X-RateLimit-Limit': maxRequests.toString(),
            'X-RateLimit-Remaining': (maxRequests - userData.count).toString(),
            'X-RateLimit-Reset': Math.ceil(userData.resetTime / 1000).toString(),
        });
        _next();
    };
};
exports.userRateLimit = userRateLimit;
const refreshGitHubValidation = (intervalMinutes = 60) => {
    const lastValidations = new Map();
    return async (req, _res, _next) => {
        if (!req.user?.githubToken || !req.user.username) {
            _next();
            return;
        }
        const username = req.user.username;
        const lastValidation = lastValidations.get(username) ?? 0;
        const now = Date.now();
        const intervalMs = intervalMinutes * 60 * 1000;
        if (now - lastValidation < intervalMs) {
            _next();
            return;
        }
        try {
            const validation = await github_1.default.validateToken(req.user.githubToken);
            if (!validation.valid) {
                logger_1.logWithContext.auth('github_token_invalid', username, false, {
                    reason: validation.error,
                });
                _res.status(401).json({
                    _error: 'Token GitHub expiré ou révoqué',
                    message: 'Veuillez renouveler votre token GitHub',
                    action: 'refresh_token_required',
                });
                return;
            }
            lastValidations.set(username, now);
            logger_1.logWithContext.auth('github_token_refreshed', username, true);
            _next();
        }
        catch (_error) {
            logger_1.default.warn('Erreur lors de la revalidation du token GitHub', {
                username,
                _error: _error.message,
            });
            _next();
        }
    };
};
exports.refreshGitHubValidation = refreshGitHubValidation;
//# sourceMappingURL=auth.js.map