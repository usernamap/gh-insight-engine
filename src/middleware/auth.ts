/**
 * Middleware d'authentification
 * Gestion des tokens GitHub et authentification JWT
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { GitHubAuthPayload, JWTPayload, GitHubTokenValidationResult } from '@/types/github';
import githubConfig from '@/config/github';
import { UserModel } from '@/models';
import logger, { logWithContext } from '@/utils/logger';

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
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const githubToken = authHeader?.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : authHeader;

    if (!githubToken) {
      logWithContext.auth('validate_github_token', req.ip, false, {
        reason: 'missing_token',
      });
      
      res.status(401).json({
        error: 'Token GitHub requis',
        message: 'Veuillez fournir votre token GitHub Classic dans le header Authorization',
        documentation: 'https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token'
      });
      return;
    }

    // Validation du token avec l'API GitHub
    const validation: GitHubTokenValidationResult = await githubConfig.validateToken(githubToken);

    if (!validation.valid) {
      logWithContext.auth('validate_github_token', validation.username || 'unknown', false, {
        reason: validation.error,
      });

      res.status(401).json({
        error: 'Token GitHub invalide',
        message: validation.error,
        help: 'Vérifiez que votre token est correct et possède les permissions requises'
      });
      return;
    }

    // Ajout des informations utilisateur à la requête
    req.user = {
      id: '', // Sera rempli par le middleware JWT si nécessaire
      username: validation.username!,
      fullName: '', // Sera enrichi plus tard
      githubToken: githubToken,
    };

    logWithContext.auth('validate_github_token', validation.username!, true, {
      scopes: validation.scopes,
    });

    next();
  } catch (error: any) {
    logWithContext.auth('validate_github_token', req.ip, false, {
      reason: 'validation_error',
      error: error.message,
    });

    res.status(500).json({
      error: 'Erreur validation token',
      message: 'Impossible de valider le token GitHub',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Middleware d'authentification JWT
 * Vérifie la validité du token JWT et charge les données utilisateur
 */
export const authenticateJWT = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : null;

    if (!token) {
      logWithContext.auth('authenticate_jwt', req.ip, false, {
        reason: 'missing_token',
      });

      res.status(401).json({
        error: 'Token d\'authentification requis',
        message: 'Veuillez vous connecter pour accéder à cette ressource'
      });
      return;
    }

    // Vérification du JWT
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET non configuré');
    }

    const decoded = jwt.verify(token, jwtSecret) as JWTPayload;

    // Vérification de l'expiration
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp < now) {
      logWithContext.auth('authenticate_jwt', decoded.username, false, {
        reason: 'token_expired',
      });

      res.status(401).json({
        error: 'Token expiré',
        message: 'Veuillez vous reconnecter'
      });
      return;
    }

    // Chargement des données utilisateur depuis la base de données
    const user = await UserModel.findById(decoded.userId);
    if (!user) {
      logWithContext.auth('authenticate_jwt', decoded.username, false, {
        reason: 'user_not_found',
      });

      res.status(401).json({
        error: 'Utilisateur non trouvé',
        message: 'Le compte utilisateur associé à ce token n\'existe plus'
      });
      return;
    }

    // Ajout des informations à la requête
    req.jwt = decoded;
    req.user = {
      id: user.id,
      username: user.login,
      fullName: user.name,
      githubToken: '', // Ne pas exposer le token GitHub dans JWT
    };

    logWithContext.auth('authenticate_jwt', decoded.username, true, {
      userId: decoded.userId,
    });

    next();
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError') {
      logWithContext.auth('authenticate_jwt', 'unknown', false, {
        reason: 'invalid_token',
      });

      res.status(401).json({
        error: 'Token JWT invalide',
        message: 'Token malformé ou corrompu'
      });
      return;
    }

    if (error.name === 'TokenExpiredError') {
      logWithContext.auth('authenticate_jwt', 'unknown', false, {
        reason: 'token_expired',
      });

      res.status(401).json({
        error: 'Token expiré',
        message: 'Veuillez vous reconnecter'
      });
      return;
    }

    logger.error('Erreur authentification JWT', {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      error: 'Erreur d\'authentification',
      message: 'Erreur interne du serveur'
    });
  }
};

/**
 * Middleware optionnel d'authentification JWT
 * Charge les données utilisateur si un token est fourni, sinon continue
 */
export const optionalJWT = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : null;

    if (!token) {
      // Pas de token, continuer sans authentification
      next();
      return;
    }

    // Si un token est fourni, tenter l'authentification
    await authenticateJWT(req, res, (error) => {
      if (error) {
        // Ignorer les erreurs d'authentification en mode optionnel
        next();
      } else {
        next();
      }
    });
  } catch (error) {
    // Ignorer les erreurs en mode optionnel
    next();
  }
};

/**
 * Générateur de tokens JWT
 */
export const generateJWT = (payload: {
  userId: string;
  username: string;
}): string => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET non configuré');
  }

  const jwtPayload: JWTPayload = {
    userId: payload.userId,
    username: payload.username,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 heures
  };

  return jwt.sign(jwtPayload, jwtSecret);
};

/**
 * Middleware de vérification des rôles (pour usage futur)
 */
export const requireRole = (roles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentification requise',
        message: 'Veuillez vous authentifier pour accéder à cette ressource'
      });
      return;
    }

    // Pour l'instant, tous les utilisateurs authentifiés ont accès
    // Cette logique peut être étendue avec un système de rôles
    next();
  };
};

/**
 * Middleware de vérification d'ownership
 * Vérifie que l'utilisateur peut accéder aux données demandées
 */
export const requireOwnership = (paramName: string = 'username') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentification requise',
        message: 'Veuillez vous authentifier pour accéder à cette ressource'
      });
      return;
    }

    const requestedUsername = req.params[paramName];
    const authenticatedUsername = req.user.username;

    if (requestedUsername !== authenticatedUsername) {
      logWithContext.security('access_denied', 'high', {
        authenticatedUser: authenticatedUsername,
        requestedUser: requestedUsername,
        endpoint: req.path,
        method: req.method,
        ip: req.ip,
      });

      res.status(403).json({
        error: 'Accès interdit',
        message: 'Vous ne pouvez accéder qu\'à vos propres données'
      });
      return;
    }

    next();
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
  const userRequestCounts = new Map<string, {
    count: number;
    resetTime: number;
  }>();

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      // Si pas d'utilisateur authentifié, laisser passer (sera géré par d'autres middlewares)
      next();
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

      res.status(429).json({
        error: 'Trop de requêtes',
        message: `Limite de ${maxRequests} requêtes par ${Math.ceil(windowMs / 60000)} minutes atteinte`,
        retryAfter: resetIn
      });
      return;
    }

    // Incrémenter le compteur
    userData.count++;

    // Ajouter les headers informatifs
    res.set({
      'X-RateLimit-Limit': maxRequests.toString(),
      'X-RateLimit-Remaining': (maxRequests - userData.count).toString(),
      'X-RateLimit-Reset': Math.ceil(userData.resetTime / 1000).toString(),
    });

    next();
  };
};

/**
 * Middleware de validation de session GitHub
 * Rafraîchit périodiquement la validation du token GitHub
 */
export const refreshGitHubValidation = (intervalMinutes: number = 60) => {
  const lastValidations = new Map<string, number>();

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user?.githubToken || !req.user?.username) {
      next();
      return;
    }

    const username = req.user.username;
    const lastValidation = lastValidations.get(username) || 0;
    const now = Date.now();
    const intervalMs = intervalMinutes * 60 * 1000;

    // Vérifier si une revalidation est nécessaire
    if (now - lastValidation < intervalMs) {
      next();
      return;
    }

    try {
      // Revalidation du token GitHub
      const validation = await githubConfig.validateToken(req.user.githubToken);

      if (!validation.valid) {
        logWithContext.auth('github_token_invalid', username, false, {
          reason: validation.error,
        });

        res.status(401).json({
          error: 'Token GitHub expiré ou révoqué',
          message: 'Veuillez renouveler votre token GitHub',
          action: 'refresh_token_required'
        });
        return;
      }

      // Mise à jour du timestamp de validation
      lastValidations.set(username, now);

      logWithContext.auth('github_token_refreshed', username, true);
      next();

    } catch (error: any) {
      logger.warn('Erreur lors de la revalidation du token GitHub', {
        username,
        error: error.message,
      });

      // En cas d'erreur de validation, laisser passer mais logger
      next();
    }
  };
}; 