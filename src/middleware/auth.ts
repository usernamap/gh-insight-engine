/**
 * Middleware d'authentification
 * Gestion des tokens GitHub et authentification JWT
 */

import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { GitHubTokenValidationResult } from '@/types/github';
import { JWTPayload } from '@/types/github';
import githubConfig from '@/config/github';
import { UserModel } from '@/models';
import { logWithContext } from '@/utils/logger';
import logger from '@/utils/logger';

// Extension des types Express pour inclure les données utilisateur
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
        fullName: string;
        githubToken: string;
      };
      jwt?: JWTPayload;
    }
  }
}

/**
 * Middleware de validation du token GitHub
 * Vérifie la validité et les permissions du token GitHub Classic
 */
export const validateGitHubToken = async (
  req: Request,
  _res: Response,
  _next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const githubToken = (typeof authHeader === 'string' && authHeader.startsWith('Bearer '))
      ? authHeader.substring(7)
      : authHeader;

    if (githubToken == null || githubToken === '') {
      logWithContext.auth('validate_github_token', req.ip ?? '', false, {
        reason: 'missing_token',
      });

      _res.status(401).json({
        error: 'Unauthorized',
        message:
          'Veuillez fournir votre token GitHub Classic dans le header Authorization',
        timestamp: new Date().toISOString(),
        documentation:
          'https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token',
      });
      return;
    }

    // Validation du token avec l'API GitHub
    const validation: GitHubTokenValidationResult =
      await githubConfig.validateToken(githubToken);

    if (!validation.valid) {
      logWithContext.auth(
        'validate_github_token',
        validation.username ?? 'unknown',
        false,
        {
          reason: validation.error,
        },
      );

      _res.status(401).json({
        error: 'Unauthorized',
        message: validation.error,
        timestamp: new Date().toISOString(),
        help: 'Vérifiez que votre token est correct et possède les permissions requises',
      });
      return;
    }

    // Ajout des informations utilisateur à la requête
    req.user = {
      id: '', // sera complété lors de la recherche en base
      username: validation.username ?? '',
      fullName: '', // sera complété depuis le formulaire
      githubToken,
    };

    logWithContext.auth(
      'validate_github_token',
      validation.username ?? 'unknown',
      true,
      {
        scopes: validation.scopes,
      },
    );

    _next();
  } catch (_error: unknown) {
    const errorMessage =
      _error instanceof Error ? _error.message : 'Unknown validation error';
    logWithContext.auth('validate_github_token', req.ip ?? 'unknown', false, {
      reason: 'validation_error',
      _error: errorMessage,
    });

    _res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Impossible de valider le token GitHub',
      details:
        process.env.NODE_ENV === 'development' ? errorMessage : undefined,
    });
  }
};

/**
 * Middleware d'authentification JWT
 * Vérifie la validité du token JWT et charge les données utilisateur
 */
export const authenticateJWT = async (
  req: Request,
  _res: Response,
  _next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = (typeof authHeader === 'string' && authHeader.startsWith('Bearer '))
      ? authHeader.substring(7)
      : null;

    if (token == null || token === '') {
      logWithContext.auth('authenticate_jwt', req.ip ?? '', false, {
        reason: 'missing_token',
      });

      _res.status(401).json({
        error: 'Unauthorized',
        message: 'Veuillez vous connecter pour accéder à cette ressource',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Vérification du JWT
    const jwtSecret = process.env.JWT_SECRET;
    if (jwtSecret == null || jwtSecret === '') {
      throw new Error('JWT_SECRET non configuré');
    }

    const decoded = jwt.verify(token, jwtSecret) as JWTPayload;

    // Vérification de l'expiration
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp < now) {
      logWithContext.auth('authenticate_jwt', decoded.username, false, {
        reason: 'token_expired',
      });

      _res.status(401).json({
        error: 'Unauthorized',
        message: 'Veuillez vous reconnecter',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Chargement des données utilisateur depuis la base de données
    // ✅ CORRECTION: Gérer les userId temporaires (login) et les vrais ObjectIds
    let user;

    // Détecter si c'est un ObjectID MongoDB valide ou un login temporaire
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(decoded.userId);

    if (isObjectId) {
      // Cas normal : chercher par ObjectID
      user = await UserModel.findById(decoded.userId);
    } else {
      // Cas temporaire : chercher par login (userId contient le login GitHub)
      user = await UserModel.findByLogin(decoded.userId);
    }

    if (!user) {
      // ✅ NOUVEAU: Pour les userid temporaires, créer un user minimal si nécessaire
      if (!isObjectId) {
        // Permettre l'authentification avec user temporaire pour POST /users/{username}
        logWithContext.auth('authenticate_jwt_temp_user', decoded.username, true, {
          reason: 'temporary_authentication',
          tempUserId: decoded.userId,
        });

        // Créer un utilisateur temporaire pour la requête
        req.jwt = decoded;
        req.user = {
          id: decoded.userId, // ID temporaire (login)
          username: decoded.username,
          fullName: decoded.username,
          githubToken: decoded.githubToken,
        };

        _next();
        return;
      }

      // Cas normal : utilisateur avec ObjectID introuvable
      logWithContext.auth('authenticate_jwt', decoded.username, false, {
        reason: 'user_not_found',
      });

      _res.status(401).json({
        error: 'Unauthorized',
        message: "Le compte utilisateur associé à ce token n'existe plus",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Ajout des informations à la requête
    req.jwt = decoded;
    req.user = {
      id: user.id,
      username: user.login,
      fullName: user.name ?? '',
      githubToken: decoded.githubToken, // Récupérer le token GitHub depuis le JWT
    };

    logWithContext.auth('authenticate_jwt', decoded.username, true, {
      userId: decoded.userId,
    });

    _next();
  } catch (_error: unknown) {
    if (_error instanceof Error && _error.name === 'JsonWebTokenError') {
      logWithContext.auth('authenticate_jwt', 'unknown', false, {
        reason: 'invalid_token',
      });

      _res.status(401).json({
        error: 'Unauthorized',
        message: 'Token malformé ou corrompu',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (_error instanceof Error && _error.name === 'TokenExpiredError') {
      logWithContext.auth('authenticate_jwt', 'unknown', false, {
        reason: 'token_expired',
      });

      _res.status(401).json({
        error: 'Unauthorized',
        message: 'Veuillez vous reconnecter',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    logger.error('Erreur authentification JWT', {
      _error: (_error as Error).message,
      stack: (_error as Error).stack,
    });

    _res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Erreur interne du serveur',
    });
  }
};

/**
 * Middleware optionnel d'authentification JWT
 * Charge les données utilisateur si un token est fourni, sinon continue
 */
export const optionalJWT = async (
  req: Request,
  _res: Response,
  _next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = (typeof authHeader === 'string' && authHeader.startsWith('Bearer '))
      ? authHeader.substring(7)
      : null;

    if (token == null || token === '') {
      // Pas de token, continuer sans authentification
      _next();
      return;
    }

    // Si un token est fourni, tenter l'authentification
    await authenticateJWT(req, _res, () => {
      // Ignorer les erreurs d'authentification en mode optionnel
      _next();
    });
  } catch {
    // Ignorer les erreurs en mode optionnel
    _next();
  }
};

/**
 * Générateur de tokens JWT
 */
export const generateJWT = (payload: {
  userId: string;
  username: string;
  githubToken: string;
}): string => {
  const jwtSecret = process.env.JWT_SECRET;
  if (jwtSecret == null || jwtSecret === '') {
    throw new Error('JWT_SECRET non configuré');
  }

  const jwtPayload: JWTPayload = {
    userId: payload.userId,
    username: payload.username,
    githubToken: payload.githubToken,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 heures
  };

  return jwt.sign(jwtPayload, jwtSecret);
};

/**
 * Middleware de vérification des rôles (pour usage futur)
 */
// eslint-disable-next-line no-unused-vars
export const requireRole = (_roles: string[]) => {
  return async (
    req: Request,
    _res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    if (!req.user) {
      _res.status(401).json({
        error: 'Unauthorized',
        message: 'Veuillez vous authentifier pour accéder à cette ressource',
      });
      return;
    }
    // TODO: étendre la logique de rôle ici
    _next();
  };
};

/**
 * Middleware de vérification d'ownership
 * Vérifie que l'utilisateur peut accéder aux données demandées
 */
export const requireOwnership = (paramName = 'username') => {
  return async (
    req: Request,
    _res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    if (!req.user) {
      _res.status(401).json({
        error: 'Unauthorized',
        message: 'Veuillez vous authentifier pour accéder à cette ressource',
      });
      return;
    }

    const requestedUsername = req.params[paramName];
    const authenticatedUsername = req.user.username;

    // Debug logging pour comprendre le problème
    logger.info('RequireOwnership Debug', {
      requestedUsername,
      authenticatedUsername,
      requestedUsernameType: typeof requestedUsername,
      authenticatedUsernameType: typeof authenticatedUsername,
      requestedUsernameLength: requestedUsername?.length,
      authenticatedUsernameLength: authenticatedUsername?.length,
      areEqual: requestedUsername === authenticatedUsername,
      paramName,
      path: req.path,
    });

    if (requestedUsername !== authenticatedUsername) {
      logWithContext.security('access_denied', 'high', {
        authenticatedUser: authenticatedUsername,
        requestedUser: requestedUsername,
        endpoint: req.path,
        method: req.method,
        ip: req.ip,
      });

      _res.status(403).json({
        error: 'Forbidden',
        message: "Vous ne pouvez accéder qu'à vos propres données",
        debug: process.env.NODE_ENV === 'development' ? {
          requestedUsername,
          authenticatedUsername,
          areEqual: requestedUsername === authenticatedUsername,
        } : undefined,
      });
      return;
    }

    _next();
  };
};

/**
 * Middleware de limitation par utilisateur
 * Applique des limites spécifiques par utilisateur authentifié
 */
export const userRateLimit = (options: {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
}) => {
  const userRequestCounts = new Map<
    string,
    {
      count: number;
      resetTime: number;
    }
  >();

  return async (
    req: Request,
    _res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    if (!req.user) {
      // Si pas d'utilisateur authentifié, laisser passer (sera géré par d'autres middlewares)
      _next();
      return;
    }

    const userId = req.user.id;
    const now = Date.now();
    const windowMs = options.windowMs;
    const maxRequests = options.maxRequests;

    // Nettoyage des entrées expirées
    for (const [key, data] of userRequestCounts.entries()) {
      if (data.resetTime <= now) {
        userRequestCounts.delete(key);
      }
    }

    // Récupération ou création du compteur utilisateur
    let userData = userRequestCounts.get(userId);
    if (!userData || userData.resetTime <= now) {
      userData = {
        count: 0,
        resetTime: now + windowMs,
      };
      userRequestCounts.set(userId, userData);
    }

    // Vérification de la limite
    if (userData.count >= maxRequests) {
      const resetIn = Math.ceil((userData.resetTime - now) / 1000);

      logWithContext.security('user_rate_limit_exceeded', 'medium', {
        userId,
        username: req.user.username,
        count: userData.count,
        maxRequests,
        resetIn,
      });

      _res.status(429).json({
        error: 'Too Many Requests',
        message: `Limite de ${maxRequests} requêtes par ${Math.ceil(windowMs / 60000)} minutes atteinte`,
        retryAfter: resetIn,
      });
      return;
    }

    // Incrémenter le compteur
    userData.count++;

    // Ajouter les headers informatifs
    _res.set({
      'X-RateLimit-Limit': maxRequests.toString(),
      'X-RateLimit-Remaining': (maxRequests - userData.count).toString(),
      'X-RateLimit-Reset': Math.ceil(userData.resetTime / 1000).toString(),
    });

    _next();
  };
};

/**
 * Middleware de validation de session GitHub
 * Rafraîchit périodiquement la validation du token GitHub
 */
export const refreshGitHubValidation = (intervalMinutes = 60) => {
  const lastValidations = new Map<string, number>();

  return async (
    req: Request,
    _res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    if (req.user?.githubToken == null || req.user.username == null || req.user.githubToken === '' || req.user.username === '') {
      _next();
      return;
    }

    const username = req.user.username;
    const lastValidation = lastValidations.get(username) ?? 0;
    const now = Date.now();
    const intervalMs = intervalMinutes * 60 * 1000;

    // Vérifier si une revalidation est nécessaire
    if (now - lastValidation < intervalMs) {
      _next();
      return;
    }

    try {
      // Revalidation du token GitHub
      const validation = await githubConfig.validateToken(req.user.githubToken);

      if (!validation.valid) {
        logWithContext.auth('github_token_invalid', username, false, {
          reason: validation.error,
        });

        _res.status(401).json({
          error: 'Unauthorized',
          message: 'Veuillez renouveler votre token GitHub',
          action: 'refresh_token_required',
        });
        return;
      }

      // Mise à jour du timestamp de validation
      lastValidations.set(username, now);

      logWithContext.auth('github_token_refreshed', username, true);
      _next();
    } catch (_error: unknown) {
      logger.warn('Erreur lors de la revalidation du token GitHub', {
        username,
        _error: (_error as Error).message,
      });

      // En cas d'erreur de validation, laisser passer mais logger
      _next();
    }
  };
};
