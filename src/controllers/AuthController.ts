import { Request, Response } from 'express';
import { asyncHandler } from '@/middleware/errorHandler';
import { createError } from '@/middleware/errorHandler';
import { generateJWT } from '@/middleware/auth';
import { githubConfig } from '@/config/github';
import { databaseService } from '@/services/DatabaseService';
import { logWithContext } from '@/utils/logger';

/**
 * Interface pour les données d'authentification
 */
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

/**
 * Contrôleur d'authentification
 */
export class AuthController {
  /**
     * Authentification et génération de JWT
     * POST /api/auth/login
     */
  static login = asyncHandler(async (req: Request, _res: Response): Promise<void> => {
    const { username, fullName, githubToken }: LoginRequestBody = req.body;

    logWithContext.auth('login_attempt', username, true, {
      fullName,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });

    try {
      // 1. Validation du token GitHub
      const tokenValidation = await githubConfig.validateToken(githubToken);

      if (!tokenValidation.valid) {
        logWithContext.auth('github_token_invalid', username, false, {
          reason: tokenValidation.error,
          scopes: tokenValidation.scopes,
        });

        throw createError.authentication(`Token GitHub invalide: ${tokenValidation.error}`);
      }

      // 2. Récupération du profil utilisateur GitHub
      const userProfile = await githubConfig.getGitHubService().getUserProfile(username, githubToken);

      if (!userProfile) {
        logWithContext.auth('github_user_not_found', username, false);
        throw createError.notFound('Utilisateur GitHub');
      }

      // 3. Vérification que le token appartient bien à l'utilisateur
      if (userProfile.login !== username) {
        logWithContext.auth('token_username_mismatch', username, false, {
          tokenOwner: userProfile.login,
        });

        throw createError.authorization('Le token GitHub ne correspond pas au nom d\'utilisateur fourni');
      }

      // 4. Mise à jour ou création du profil utilisateur en base
      const savedUser = await databaseService.saveUserDataset({
        userProfile,
        repositories: [], // Sera rempli lors de l'analyse
        metadata: {
          datasetId: `dataset_${userProfile.login}_${Date.now()}`,
          collectionDate: new Date(),
          githubUsername: userProfile.login,
          fullName,
          scope: 'user_repositories',
          totalRepositories: userProfile.publicRepos + (userProfile.privateRepos ?? 0),
          analysisVersion: '1.0.0',
          dataVersion: '1.0.0',
          settings: {
            includePrivateRepos: tokenValidation.scopes?.includes('repo') ?? false,
            includeForkedRepos: true,
            includeArchivedRepos: false,
            analysisDepth: 'standard',
            aiAnalysisEnabled: true,
          },
        },
      });

      // 5. Génération du JWT
      const jwtPayload = {
        id: savedUser.id,
        username: userProfile.login,
        githubToken,
      };

      const accessToken = generateJWT(jwtPayload);

      // 6. Préparation de la réponse
      const responseData = {
        message: 'Authentification réussie',
        user: {
          id: savedUser.id,
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
          canAccessPrivateRepos: tokenValidation.scopes?.includes('repo') ?? false,
          canReadOrgs: tokenValidation.scopes?.includes('read:org') ?? false,
          canReadUser: tokenValidation.scopes?.includes('user') ?? false,
        },
        timestamp: new Date().toISOString(),
      };

      logWithContext.auth('login_success', username, true, {
        userId: savedUser.id,
        tokenScopes: tokenValidation.scopes,
        hasPrivateAccess: tokenValidation.scopes?.includes('repo'),
      });

      res.status(200).json(responseData);

    } catch (_error: unknown) {
      logWithContext.auth('login_failed', username, false, {
        _error: error.message,
        errorType: error.constructor.name,
      });

      // Re-lancer l'erreur pour qu'elle soit gérée par le middleware d'erreurs
      throw error;
    }
  });

  /**
     * Rafraîchissement du token JWT
     * POST /api/auth/refresh
     */
  static refresh = asyncHandler(async (req: Request, _res: Response): Promise<void> => {
    const user = (req as any).user as JWTUser;

    if (!user) {
      throw createError.authentication('Token JWT requis pour le rafraîchissement');
    }

    logWithContext.auth('token_refresh_attempt', user.username, true, {
      userId: user.id,
    });

    try {
      // 1. Revalidation du token GitHub
      const tokenValidation = await githubConfig.validateToken(user.githubToken);

      if (!tokenValidation.valid) {
        logWithContext.auth('github_token_expired', user.username, false, {
          reason: tokenValidation.error,
        });

        throw createError.authentication('Token GitHub expiré ou révoqué. Veuillez vous reconnecter');
      }

      // 2. Génération d'un nouveau JWT
      const newAccessToken = generateJWT({
        id: user.id,
        username: user.username,
        githubToken: user.githubToken,
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

    } catch (_error: unknown) {
      logWithContext.auth('token_refresh_failed', user.username, false, {
        userId: user.id,
        _error: error.message,
      });

      throw error;
    }
  });

  /**
     * Déconnexion (invalidation côté client)
     * DELETE /api/auth/logout
     */
  static logout = asyncHandler(async (req: Request, _res: Response): Promise<void> => {
    const user = (req as any).user as JWTUser;

    if (user) {
      logWithContext.auth('logout_success', user.username, true, {
        userId: user.id,
      });
    }

    res.status(200).json({
      message: 'Déconnexion réussie',
      instruction: 'Supprimez le token JWT côté client',
      timestamp: new Date().toISOString(),
    });
  });

  /**
     * Validation du token GitHub actuel
     * GET /api/auth/validate
     */
  static validateToken = asyncHandler(async (req: Request, _res: Response): Promise<void> => {
    const user = (req as any).user as JWTUser;

    if (!user) {
      throw createError.authentication('Token JWT requis');
    }

    logWithContext.auth('token_validation_request', user.username, true, {
      userId: user.id,
    });

    try {
      // Validation du token GitHub
      const tokenValidation = await githubConfig.validateToken(user.githubToken);

      const responseData = {
        valid: tokenValidation.valid,
        user: {
          id: user.id,
          username: user.username,
        },
        github: {
          tokenValid: tokenValidation.valid,
          scopes: tokenValidation.scopes ?? [],
          rateLimit: tokenValidation.rateLimit ?? null,
        },
        permissions: {
          canAccessPrivateRepos: tokenValidation.scopes?.includes('repo') ?? false,
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
      } else {
        logWithContext.auth('token_validation_success', user.username, true, {
          userId: user.id,
          scopes: tokenValidation.scopes,
        });

        res.status(200).json(responseData);
      }

    } catch (_error: unknown) {
      logWithContext.auth('token_validation_error', user.username, false, {
        userId: user.id,
        _error: error.message,
      });

      throw error;
    }
  });

  /**
     * Information sur l'utilisateur connecté
     * GET /api/auth/me
     */
  static getCurrentUser = asyncHandler(async (req: Request, _res: Response): Promise<void> => {
    const user = (req as any).user as JWTUser;

    if (!user) {
      throw createError.authentication('Token JWT requis');
    }

    try {
      // Récupération des données utilisateur depuis la base
      const userData = await databaseService.getUser(user.username);

      if (!userData) {
        throw createError.notFound('Utilisateur');
      }

      // Validation du token GitHub en arrière-plan (non-bloquant)
      let tokenStatus = 'unknown';
      try {
        const tokenValidation = await githubConfig.validateToken(user.githubToken);
        tokenStatus = tokenValidation.valid ? 'valid' : 'invalid';
      } catch (_error) {
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
          lastLogin: new Date().toISOString(), // À améliorer avec un vrai tracking
        },
        timestamp: new Date().toISOString(),
      };

      logWithContext.auth('current_user_retrieved', user.username, true, {
        userId: user.id,
        tokenStatus,
      });

      res.status(200).json(responseData);

    } catch (_error: unknown) {
      logWithContext.auth('current_user_error', user.username, false, {
        userId: user.id,
        _error: error.message,
      });

      throw error;
    }
  });
}

export default AuthController;
