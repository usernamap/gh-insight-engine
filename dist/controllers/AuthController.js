"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const errorHandler_1 = require("@/middleware/errorHandler");
const errorHandler_2 = require("@/middleware/errorHandler");
const auth_1 = require("@/middleware/auth");
const github_1 = require("@/config/github");
const DatabaseService_1 = require("@/services/DatabaseService");
const logger_1 = require("@/utils/logger");
class AuthController {
}
exports.AuthController = AuthController;
_a = AuthController;
AuthController.login = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { username, fullName, githubToken } = req.body;
    logger_1.logWithContext.auth('login_attempt', username, true, {
        fullName,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
    });
    try {
        const tokenValidation = await github_1.githubConfig.validateToken(githubToken);
        if (!tokenValidation.valid) {
            logger_1.logWithContext.auth('github_token_invalid', username, false, {
                reason: tokenValidation.error,
                scopes: tokenValidation.scopes,
            });
            throw errorHandler_2.createError.authentication(`Token GitHub invalide: ${tokenValidation.error}`);
        }
        const userProfile = await github_1.githubConfig.getGitHubService().getUserProfile(username, githubToken);
        if (!userProfile) {
            logger_1.logWithContext.auth('github_user_not_found', username, false);
            throw errorHandler_2.createError.notFound('Utilisateur GitHub');
        }
        if (userProfile.login !== username) {
            logger_1.logWithContext.auth('token_username_mismatch', username, false, {
                tokenOwner: userProfile.login,
            });
            throw errorHandler_2.createError.authorization('Le token GitHub ne correspond pas au nom d\'utilisateur fourni');
        }
        const savedUser = await DatabaseService_1.databaseService.saveUserDataset({
            userProfile,
            repositories: [],
            metadata: {
                datasetId: `dataset_${userProfile.login}_${Date.now()}`,
                collectionDate: new Date(),
                githubUsername: userProfile.login,
                fullName: fullName,
                scope: 'user_repositories',
                totalRepositories: userProfile.publicRepos + (userProfile.privateRepos || 0),
                analysisVersion: '1.0.0',
                dataVersion: '1.0.0',
                settings: {
                    includePrivateRepos: tokenValidation.scopes?.includes('repo') || false,
                    includeForkedRepos: true,
                    includeArchivedRepos: false,
                    analysisDepth: 'standard',
                    aiAnalysisEnabled: true,
                },
            },
        });
        const jwtPayload = {
            id: savedUser.id,
            username: userProfile.login,
            githubToken: githubToken,
        };
        const accessToken = (0, auth_1.generateJWT)(jwtPayload);
        const responseData = {
            message: 'Authentification réussie',
            user: {
                id: savedUser.id,
                username: userProfile.login,
                name: userProfile.name,
                fullName: fullName,
                email: userProfile.email,
                avatarUrl: userProfile.avatarUrl,
                bio: userProfile.bio,
                company: userProfile.company,
                location: userProfile.location,
                publicRepos: userProfile.publicRepos,
                followers: userProfile.followers,
                following: userProfile.following,
                createdAt: userProfile.createdAt,
                hasValidToken: true,
                tokenScopes: tokenValidation.scopes || [],
            },
            tokens: {
                accessToken,
                tokenType: 'Bearer',
                expiresIn: '24h',
            },
            permissions: {
                canAccessPrivateRepos: tokenValidation.scopes?.includes('repo') || false,
                canReadOrgs: tokenValidation.scopes?.includes('read:org') || false,
                canReadUser: tokenValidation.scopes?.includes('user') || false,
            },
            timestamp: new Date().toISOString(),
        };
        logger_1.logWithContext.auth('login_success', username, true, {
            userId: savedUser.id,
            tokenScopes: tokenValidation.scopes,
            hasPrivateAccess: tokenValidation.scopes?.includes('repo'),
        });
        res.status(200).json(responseData);
    }
    catch (error) {
        logger_1.logWithContext.auth('login_failed', username, false, {
            error: error.message,
            errorType: error.constructor.name,
        });
        throw error;
    }
});
AuthController.refresh = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const user = req.user;
    if (!user) {
        throw errorHandler_2.createError.authentication('Token JWT requis pour le rafraîchissement');
    }
    logger_1.logWithContext.auth('token_refresh_attempt', user.username, true, {
        userId: user.id,
    });
    try {
        const tokenValidation = await github_1.githubConfig.validateToken(user.githubToken);
        if (!tokenValidation.valid) {
            logger_1.logWithContext.auth('github_token_expired', user.username, false, {
                reason: tokenValidation.error,
            });
            throw errorHandler_2.createError.authentication('Token GitHub expiré ou révoqué. Veuillez vous reconnecter');
        }
        const newAccessToken = (0, auth_1.generateJWT)({
            id: user.id,
            username: user.username,
            githubToken: user.githubToken,
        });
        logger_1.logWithContext.auth('token_refresh_success', user.username, true, {
            userId: user.id,
        });
        res.status(200).json({
            message: 'Token rafraîchi avec succès',
            tokens: {
                accessToken: newAccessToken,
                tokenType: 'Bearer',
                expiresIn: '24h',
            },
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        logger_1.logWithContext.auth('token_refresh_failed', user.username, false, {
            userId: user.id,
            error: error.message,
        });
        throw error;
    }
});
AuthController.logout = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const user = req.user;
    if (user) {
        logger_1.logWithContext.auth('logout_success', user.username, true, {
            userId: user.id,
        });
    }
    res.status(200).json({
        message: 'Déconnexion réussie',
        instruction: 'Supprimez le token JWT côté client',
        timestamp: new Date().toISOString(),
    });
});
AuthController.validateToken = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const user = req.user;
    if (!user) {
        throw errorHandler_2.createError.authentication('Token JWT requis');
    }
    logger_1.logWithContext.auth('token_validation_request', user.username, true, {
        userId: user.id,
    });
    try {
        const tokenValidation = await github_1.githubConfig.validateToken(user.githubToken);
        const responseData = {
            valid: tokenValidation.valid,
            user: {
                id: user.id,
                username: user.username,
            },
            github: {
                tokenValid: tokenValidation.valid,
                scopes: tokenValidation.scopes || [],
                rateLimit: tokenValidation.rateLimit || null,
            },
            permissions: {
                canAccessPrivateRepos: tokenValidation.scopes?.includes('repo') || false,
                canReadOrgs: tokenValidation.scopes?.includes('read:org') || false,
                canReadUser: tokenValidation.scopes?.includes('user') || false,
            },
            timestamp: new Date().toISOString(),
        };
        if (!tokenValidation.valid) {
            logger_1.logWithContext.auth('token_validation_failed', user.username, false, {
                userId: user.id,
                reason: tokenValidation.error,
            });
            res.status(401).json({
                ...responseData,
                error: tokenValidation.error,
                message: 'Token GitHub invalide. Veuillez vous reconnecter',
                action: 'login_required',
            });
        }
        else {
            logger_1.logWithContext.auth('token_validation_success', user.username, true, {
                userId: user.id,
                scopes: tokenValidation.scopes,
            });
            res.status(200).json(responseData);
        }
    }
    catch (error) {
        logger_1.logWithContext.auth('token_validation_error', user.username, false, {
            userId: user.id,
            error: error.message,
        });
        throw error;
    }
});
AuthController.getCurrentUser = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const user = req.user;
    if (!user) {
        throw errorHandler_2.createError.authentication('Token JWT requis');
    }
    try {
        const userData = await DatabaseService_1.databaseService.getUser(user.username);
        if (!userData) {
            throw errorHandler_2.createError.notFound('Utilisateur');
        }
        let tokenStatus = 'unknown';
        try {
            const tokenValidation = await github_1.githubConfig.validateToken(user.githubToken);
            tokenStatus = tokenValidation.valid ? 'valid' : 'invalid';
        }
        catch (error) {
            tokenStatus = 'error';
        }
        const responseData = {
            user: {
                id: userData.id,
                username: userData.login,
                name: userData.name,
                email: userData.email,
                avatarUrl: userData.avatarUrl,
                bio: userData.bio,
                company: userData.company,
                location: userData.location,
                blog: userData.blog,
                twitterUsername: userData.twitterUsername,
                publicRepos: userData.publicRepos,
                privateRepos: userData.privateRepos,
                followers: userData.followers,
                following: userData.following,
                createdAt: userData.createdAt,
                updatedAt: userData.updatedAt,
                organizations: userData.organizations,
            },
            status: {
                tokenStatus,
                lastLogin: new Date().toISOString(),
            },
            timestamp: new Date().toISOString(),
        };
        logger_1.logWithContext.auth('current_user_retrieved', user.username, true, {
            userId: user.id,
            tokenStatus,
        });
        res.status(200).json(responseData);
    }
    catch (error) {
        logger_1.logWithContext.auth('current_user_error', user.username, false, {
            userId: user.id,
            error: error.message,
        });
        throw error;
    }
});
exports.default = AuthController;
//# sourceMappingURL=AuthController.js.map