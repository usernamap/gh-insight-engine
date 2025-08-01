/**
 * Authentication middleware
 * GitHub token management and JWT authentication
 */

import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User as PrismaUser } from '@prisma/client';
import { GitHubTokenValidationResult, JWTPayload } from '@/types';
import githubConfig from '@/config/github';
import { UserModel } from '@/models';
import logger, { logWithContext } from '@/utils/logger';
import {
  JWT_CONSTANTS,
  AUTH_CONSTANTS,
  RATE_LIMIT_HEADERS,
  JWT_ERROR_NAMES,
  AUTH_MIDDLEWARE_MESSAGES,
  HTTP_STATUS_CODES,
} from '@/constants';

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

export const validateGitHubToken = async (
  req: Request,
  _res: Response,
  _next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const githubToken =
      typeof authHeader === 'string' && authHeader.startsWith(JWT_CONSTANTS.BEARER_PREFIX)
        ? authHeader.substring(JWT_CONSTANTS.BEARER_PREFIX_LENGTH)
        : authHeader;

    if (githubToken == null || githubToken === '') {
      logWithContext.auth(AUTH_MIDDLEWARE_MESSAGES.VALIDATE_GITHUB_TOKEN, req.ip ?? '', false, {
        reason: AUTH_MIDDLEWARE_MESSAGES.MISSING_TOKEN,
      });

      _res.status(HTTP_STATUS_CODES.UNAUTHORIZED).json({
        error: AUTH_MIDDLEWARE_MESSAGES.UNAUTHORIZED,
        message: AUTH_MIDDLEWARE_MESSAGES.PLEASE_PROVIDE_GITHUB_TOKEN,
        timestamp: new Date().toISOString(),
        documentation: AUTH_MIDDLEWARE_MESSAGES.GITHUB_TOKEN_DOCUMENTATION,
      });
      return;
    }

    const validation: GitHubTokenValidationResult = await githubConfig.validateToken();

    if (!validation.valid) {
      logWithContext.auth(
        AUTH_MIDDLEWARE_MESSAGES.VALIDATE_GITHUB_TOKEN,
        validation.username ?? AUTH_MIDDLEWARE_MESSAGES.UNKNOWN,
        false,
        {
          reason: validation.error,
        }
      );

      _res.status(HTTP_STATUS_CODES.UNAUTHORIZED).json({
        error: AUTH_MIDDLEWARE_MESSAGES.UNAUTHORIZED,
        message: validation.error,
        timestamp: new Date().toISOString(),
        help: AUTH_MIDDLEWARE_MESSAGES.PLEASE_VERIFY_TOKEN_PERMISSIONS,
      });
      return;
    }

    req.user = {
      id: '',
      username: validation.username ?? '',
      fullName: '',
      githubToken,
    };

    logWithContext.auth(
      AUTH_MIDDLEWARE_MESSAGES.VALIDATE_GITHUB_TOKEN,
      validation.username ?? AUTH_MIDDLEWARE_MESSAGES.UNKNOWN,
      true,
      {
        scopes: validation.scopes,
      }
    );

    _next();
  } catch (_error: unknown) {
    const errorMessage =
      _error instanceof Error ? _error.message : AUTH_MIDDLEWARE_MESSAGES.UNKNOWN_VALIDATION_ERROR;
    logWithContext.auth(
      AUTH_MIDDLEWARE_MESSAGES.VALIDATE_GITHUB_TOKEN,
      req.ip ?? AUTH_MIDDLEWARE_MESSAGES.UNKNOWN,
      false,
      {
        reason: AUTH_MIDDLEWARE_MESSAGES.VALIDATION_ERROR,
        _error: errorMessage,
      }
    );

    _res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      error: AUTH_MIDDLEWARE_MESSAGES.INTERNAL_SERVER_ERROR,
      message: AUTH_MIDDLEWARE_MESSAGES.UNABLE_TO_VALIDATE_GITHUB_TOKEN,
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
    });
  }
};

export const authenticateJWT = async (
  req: Request,
  _res: Response,
  _next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token =
      typeof authHeader === 'string' && authHeader.startsWith(JWT_CONSTANTS.BEARER_PREFIX)
        ? authHeader.substring(JWT_CONSTANTS.BEARER_PREFIX_LENGTH)
        : null;

    if (token == null || token === '') {
      logWithContext.auth(AUTH_MIDDLEWARE_MESSAGES.AUTHENTICATE_JWT, req.ip ?? '', false, {
        reason: AUTH_MIDDLEWARE_MESSAGES.MISSING_TOKEN,
      });

      _res.status(HTTP_STATUS_CODES.UNAUTHORIZED).json({
        error: AUTH_MIDDLEWARE_MESSAGES.UNAUTHORIZED,
        message: AUTH_MIDDLEWARE_MESSAGES.PLEASE_LOGIN_TO_ACCESS,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (jwtSecret == null || jwtSecret === '') {
      throw new Error(AUTH_MIDDLEWARE_MESSAGES.JWT_SECRET_NOT_CONFIGURED);
    }

    const decoded = jwt.verify(token, jwtSecret) as JWTPayload;

    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp < now) {
      logWithContext.auth(AUTH_MIDDLEWARE_MESSAGES.AUTHENTICATE_JWT, decoded.username, false, {
        reason: AUTH_MIDDLEWARE_MESSAGES.TOKEN_EXPIRED,
      });

      _res.status(HTTP_STATUS_CODES.UNAUTHORIZED).json({
        error: AUTH_MIDDLEWARE_MESSAGES.UNAUTHORIZED,
        message: AUTH_MIDDLEWARE_MESSAGES.PLEASE_LOGIN_AGAIN,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    let user: PrismaUser | null = null;

    const isObjectId = JWT_CONSTANTS.OBJECT_ID_REGEX.test(decoded.userId);

    if (isObjectId === true) {
      user = await UserModel.findById(decoded.userId);
    } else {
      user = await UserModel.findByLogin(decoded.userId);
    }

    if (user == null) {
      if (isObjectId === false) {
        logWithContext.auth(
          AUTH_MIDDLEWARE_MESSAGES.AUTHENTICATE_JWT_TEMP_USER,
          decoded.username,
          true,
          {
            reason: AUTH_MIDDLEWARE_MESSAGES.TEMPORARY_AUTHENTICATION,
            tempUserId: decoded.userId,
          }
        );

        req.jwt = decoded;
        req.user = {
          id: decoded.userId,
          username: decoded.username,
          fullName: decoded.username,
          githubToken: decoded.githubToken,
        };

        _next();
        return;
      }

      logWithContext.auth(AUTH_MIDDLEWARE_MESSAGES.AUTHENTICATE_JWT, decoded.username, false, {
        reason: AUTH_MIDDLEWARE_MESSAGES.USER_NOT_FOUND,
      });

      _res.status(HTTP_STATUS_CODES.UNAUTHORIZED).json({
        error: AUTH_MIDDLEWARE_MESSAGES.UNAUTHORIZED,
        message: AUTH_MIDDLEWARE_MESSAGES.USER_ACCOUNT_NO_LONGER_EXISTS,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    req.jwt = decoded;
    req.user = {
      id: user.id ?? '',
      username: user.login ?? '',
      fullName: user.name ?? '',
      githubToken: decoded.githubToken,
    };

    logWithContext.auth(AUTH_MIDDLEWARE_MESSAGES.AUTHENTICATE_JWT, decoded.username, true, {
      userId: decoded.userId,
    });

    _next();
  } catch (_error: unknown) {
    if (_error instanceof Error && _error.name === JWT_ERROR_NAMES.JSON_WEB_TOKEN_ERROR) {
      logWithContext.auth(
        AUTH_MIDDLEWARE_MESSAGES.AUTHENTICATE_JWT,
        AUTH_MIDDLEWARE_MESSAGES.UNKNOWN,
        false,
        {
          reason: AUTH_MIDDLEWARE_MESSAGES.INVALID_TOKEN,
        }
      );

      _res.status(HTTP_STATUS_CODES.UNAUTHORIZED).json({
        error: AUTH_MIDDLEWARE_MESSAGES.UNAUTHORIZED,
        message: AUTH_MIDDLEWARE_MESSAGES.MALFORMED_OR_CORRUPTED_TOKEN,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (_error instanceof Error && _error.name === JWT_ERROR_NAMES.TOKEN_EXPIRED_ERROR) {
      logWithContext.auth(
        AUTH_MIDDLEWARE_MESSAGES.AUTHENTICATE_JWT,
        AUTH_MIDDLEWARE_MESSAGES.UNKNOWN,
        false,
        {
          reason: AUTH_MIDDLEWARE_MESSAGES.TOKEN_EXPIRED,
        }
      );

      _res.status(HTTP_STATUS_CODES.UNAUTHORIZED).json({
        error: AUTH_MIDDLEWARE_MESSAGES.UNAUTHORIZED,
        message: AUTH_MIDDLEWARE_MESSAGES.PLEASE_LOGIN_AGAIN,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    logger.error(AUTH_MIDDLEWARE_MESSAGES.JWT_AUTHENTICATION_ERROR, {
      _error: (_error as Error).message,
      stack: (_error as Error).stack,
    });

    _res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      error: AUTH_MIDDLEWARE_MESSAGES.INTERNAL_SERVER_ERROR,
      message: AUTH_MIDDLEWARE_MESSAGES.INTERNAL_SERVER_ERROR_MESSAGE,
    });
  }
};

export const optionalJWT = async (
  req: Request,
  _res: Response,
  _next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token =
      typeof authHeader === 'string' && authHeader.startsWith(JWT_CONSTANTS.BEARER_PREFIX)
        ? authHeader.substring(JWT_CONSTANTS.BEARER_PREFIX_LENGTH)
        : null;

    if (token == null || token === '') {
      _next();
      return;
    }

    await authenticateJWT(req, _res, () => {
      _next();
    });
  } catch {
    _next();
  }
};

export const generateJWT = (payload: {
  userId: string;
  username: string;
  githubToken: string;
}): string => {
  const jwtSecret = process.env.JWT_SECRET;
  if (jwtSecret == null || jwtSecret === '') {
    throw new Error(AUTH_MIDDLEWARE_MESSAGES.JWT_SECRET_NOT_CONFIGURED);
  }

  const jwtPayload: JWTPayload = {
    userId: payload.userId,
    username: payload.username,
    githubToken: payload.githubToken,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + JWT_CONSTANTS.EXPIRES_IN_SECONDS,
  };

  return jwt.sign(jwtPayload, jwtSecret);
};

export const requireOwnership = (paramName = AUTH_CONSTANTS.DEFAULT_PARAM_NAME) => {
  return async (req: Request, _res: Response, _next: NextFunction): Promise<void> => {
    if (!req.user) {
      _res.status(HTTP_STATUS_CODES.UNAUTHORIZED).json({
        error: AUTH_MIDDLEWARE_MESSAGES.UNAUTHORIZED,
        message: AUTH_MIDDLEWARE_MESSAGES.PLEASE_LOGIN_TO_ACCESS,
      });
      return;
    }

    const requestedUsername = req.params[paramName];
    const authenticatedUsername = req.user.username;

    logger.info(AUTH_MIDDLEWARE_MESSAGES.REQUIRE_OWNERSHIP_DEBUG, {
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
      logWithContext.security(AUTH_MIDDLEWARE_MESSAGES.ACCESS_DENIED, 'high', {
        authenticatedUser: authenticatedUsername,
        requestedUser: requestedUsername,
        endpoint: req.path,
        method: req.method,
        ip: req.ip,
      });

      _res.status(HTTP_STATUS_CODES.FORBIDDEN).json({
        error: AUTH_MIDDLEWARE_MESSAGES.UNAUTHORIZED,
        message: AUTH_MIDDLEWARE_MESSAGES.YOU_CAN_ONLY_ACCESS_YOUR_OWN_DATA,
        debug:
          process.env.NODE_ENV === 'development'
            ? {
              requestedUsername,
              authenticatedUsername,
              areEqual: requestedUsername === authenticatedUsername,
            }
            : undefined,
      });
      return;
    }

    _next();
  };
};

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

  return async (req: Request, _res: Response, _next: NextFunction): Promise<void> => {
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

      logWithContext.security(AUTH_MIDDLEWARE_MESSAGES.USER_RATE_LIMIT_EXCEEDED, 'medium', {
        userId,
        username: req.user.username,
        count: userData.count,
        maxRequests,
        resetIn,
      });

      _res.status(HTTP_STATUS_CODES.TOO_MANY_REQUESTS).json({
        error: AUTH_MIDDLEWARE_MESSAGES.TOO_MANY_REQUESTS,
        message: AUTH_MIDDLEWARE_MESSAGES.RATE_LIMIT_MESSAGE(maxRequests, windowMs),
        retryAfter: resetIn,
      });
      return;
    }

    userData.count++;

    _res.set({
      [RATE_LIMIT_HEADERS.LIMIT]: maxRequests.toString(),
      [RATE_LIMIT_HEADERS.REMAINING]: (maxRequests - userData.count).toString(),
      [RATE_LIMIT_HEADERS.RESET]: Math.ceil(userData.resetTime / 1000).toString(),
    });

    _next();
  };
};

export const refreshGitHubValidation = (
  intervalMinutes = AUTH_CONSTANTS.REFRESH_INTERVAL_MINUTES
) => {
  const lastValidations = new Map<string, number>();

  return async (req: Request, _res: Response, _next: NextFunction): Promise<void> => {
    if (
      req.user?.githubToken == null ||
      req.user.username == null ||
      req.user.githubToken === '' ||
      req.user.username === ''
    ) {
      _next();
      return;
    }

    const username = req.user.username;
    const lastValidation = lastValidations.get(username) ?? 0;
    const now = Date.now();
    const intervalMs = intervalMinutes * AUTH_CONSTANTS.MINUTES_TO_MS;

    if (now - lastValidation < intervalMs) {
      _next();
      return;
    }

    try {
      const validation = await githubConfig.validateToken();

      if (!validation.valid) {
        logWithContext.auth(AUTH_MIDDLEWARE_MESSAGES.GITHUB_TOKEN_INVALID, username, false, {
          reason: validation.error,
        });

        _res.status(HTTP_STATUS_CODES.UNAUTHORIZED).json({
          error: AUTH_MIDDLEWARE_MESSAGES.UNAUTHORIZED,
          message: AUTH_MIDDLEWARE_MESSAGES.PLEASE_RENEW_GITHUB_TOKEN,
          action: AUTH_MIDDLEWARE_MESSAGES.REFRESH_TOKEN_REQUIRED,
        });
        return;
      }

      lastValidations.set(username, now);

      logWithContext.auth(AUTH_MIDDLEWARE_MESSAGES.GITHUB_TOKEN_REFRESHED, username, true);
      _next();
    } catch (_error: unknown) {
      logger.warn(AUTH_MIDDLEWARE_MESSAGES.ERROR_DURING_GITHUB_TOKEN_REVALIDATION, {
        username,
        _error: (_error as Error).message,
      });

      _next();
    }
  };
};
