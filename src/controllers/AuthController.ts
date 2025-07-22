import { Request, Response } from 'express';
import { asyncHandler } from '@/middleware/errorHandler';
import { createError } from '@/middleware/errorHandler';
import { generateJWT } from '@/middleware/auth';
import { githubConfig } from '@/config/github';
import { logWithContext } from '@/utils/logger';
import { UserModel } from '@/models/User';
import { GitHubService } from '@/services/GitHubService';

interface LoginRequestBody {
  username: string;
  fullName: string;
  githubToken: string;
}

interface JWTUser {
  id: string;
  username: string;
  githubToken: string;
}

export class AuthController {
  static login = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { username, fullName, githubToken }: LoginRequestBody = req.body;
      logWithContext.auth('login_attempt', username, true, {
        fullName,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });
      try {
        const tokenValidation = await githubConfig.validateToken(githubToken);
        if (!tokenValidation.valid) {
          logWithContext.auth('github_token_invalid', username, false, {
            reason: tokenValidation.error,
            scopes: tokenValidation.scopes,
          });
          throw createError.authentication(
            `Token GitHub invalide: ${tokenValidation.error}`,
          );
        }
        // Utiliser GitHubService pour récupérer le profil
        const githubService = new GitHubService();
        const userProfile = await githubService.getUserProfile();
        if (userProfile == null) {
          logWithContext.auth('github_user_not_found', username, false);
          throw createError.notFound('Utilisateur GitHub');
        }
        if (userProfile.login !== username) {
          logWithContext.auth('token_username_mismatch', username, false, {
            tokenOwner: userProfile.login,
          });
          throw createError.authorization(
            "Le token GitHub ne correspond pas au nom d'utilisateur fourni",
          );
        }
        // Mise à jour ou création du profil utilisateur en base
        const user = await UserModel.upsert(userProfile);
        // Génération du JWT (adapter le payload au schéma attendu)
        const jwtPayload = {
          userId: user.id,
          username: userProfile.login,
        };
        const accessToken = generateJWT(jwtPayload);
        const responseData = {
          message: 'Authentification réussie',
          user: {
            id: user.id,
            username: userProfile.login,
            name: userProfile.name,
            fullName,
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
            tokenScopes: tokenValidation.scopes ?? [],
          },
          tokens: {
            accessToken,
            tokenType: 'Bearer',
            expiresIn: '24h',
          },
          permissions: {
            canAccessPrivateRepos:
              tokenValidation.scopes?.includes('repo') ?? false,
            canReadOrgs: tokenValidation.scopes?.includes('read:org') ?? false,
            canReadUser: tokenValidation.scopes?.includes('user') ?? false,
          },
          timestamp: new Date().toISOString(),
        };
        logWithContext.auth('login_success', username, true, {
          userId: user.id,
          tokenScopes: tokenValidation.scopes,
          hasPrivateAccess: tokenValidation.scopes?.includes('repo'),
        });
        res.status(200).json(responseData);
        return;
      } catch (_error: unknown) {
        logWithContext.auth('login_failed', username, false, {
          error: String(_error),
          errorType: (_error as Error).constructor.name,
        });
        throw _error;
      }
    },
  );

  static refresh = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const user = req.user as JWTUser;
      if (user == null) {
        throw createError.authentication(
          'Token JWT requis pour le rafraîchissement',
        );
      }
      logWithContext.auth('token_refresh_attempt', user.username, true, {
        userId: user.id,
      });
      try {
        const tokenValidation = await githubConfig.validateToken(
          user.githubToken,
        );
        if (!tokenValidation.valid) {
          logWithContext.auth('github_token_expired', user.username, false, {
            reason: tokenValidation.error,
          });
          throw createError.authentication(
            'Token GitHub expiré ou révoqué. Veuillez vous reconnecter',
          );
        }
        const newAccessToken = generateJWT({
          userId: user.id,
          username: user.username,
        });
        logWithContext.auth('token_refresh_success', user.username, true, {
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
        return;
      } catch (_error: unknown) {
        logWithContext.auth('token_refresh_failed', user.username, false, {
          userId: user.id,
          error: String(_error),
        });
        throw _error;
      }
    },
  );

  static logout = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const user = req.user as JWTUser;
      if (user != null) {
        logWithContext.auth('logout_success', user.username, true, {
          userId: user.id,
        });
      }
      res.status(200).json({
        message: 'Déconnexion réussie',
        instruction: 'Supprimez le token JWT côté client',
        timestamp: new Date().toISOString(),
      });
      return;
    },
  );

  static validateToken = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const user = req.user as JWTUser;
      if (user == null) {
        throw createError.authentication('Token JWT requis');
      }
      logWithContext.auth('token_validation_request', user.username, true, {
        userId: user.id,
      });
      try {
        const tokenValidation = await githubConfig.validateToken(
          user.githubToken,
        );
        const responseData = {
          valid: tokenValidation.valid,
          user: {
            id: user.id,
            username: user.username,
          },
          github: {
            tokenValid: tokenValidation.valid,
            scopes: tokenValidation.scopes ?? [],
          },
          permissions: {
            canAccessPrivateRepos:
              tokenValidation.scopes?.includes('repo') ?? false,
            canReadOrgs: tokenValidation.scopes?.includes('read:org') ?? false,
            canReadUser: tokenValidation.scopes?.includes('user') ?? false,
          },
          timestamp: new Date().toISOString(),
        };
        if (!tokenValidation.valid) {
          logWithContext.auth('token_validation_failed', user.username, false, {
            userId: user.id,
            reason: tokenValidation.error,
          });
          res.status(401).json({
            ...responseData,
            _error: tokenValidation.error,
            message: 'Token GitHub invalide. Veuillez vous reconnecter',
            action: 'login_required',
          });
          return;
        } else {
          logWithContext.auth('token_validation_success', user.username, true, {
            userId: user.id,
            scopes: tokenValidation.scopes,
          });
          res.status(200).json(responseData);
          return;
        }
      } catch (_error: unknown) {
        logWithContext.auth('token_validation_error', user.username, false, {
          userId: user.id,
          error: String(_error),
        });
        throw _error;
      }
    },
  );

  static getCurrentUser = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const user = req.user as JWTUser;
      if (user == null) {
        throw createError.authentication('Token JWT requis');
      }
      try {
        const userData = await UserModel.findByLogin(user.username);
        if (userData == null) {
          throw createError.notFound('Utilisateur');
        }
        let tokenStatus = 'unknown';
        try {
          const tokenValidation = await githubConfig.validateToken(
            user.githubToken,
          );
          tokenStatus = tokenValidation.valid ? 'valid' : 'invalid';
        } catch {
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
        logWithContext.auth('current_user_retrieved', user.username, true, {
          userId: user.id,
          tokenStatus,
        });
        res.status(200).json(responseData);
        return;
      } catch (_error: unknown) {
        logWithContext.auth('current_user_error', user.username, false, {
          userId: user.id,
          error: String(_error),
        });
        throw _error;
      }
    },
  );
}

export default AuthController;
