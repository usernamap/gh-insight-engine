import { ErrorRequestHandler, NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { PrismaClientKnownRequestError, PrismaClientValidationError } from '@prisma/client/runtime/library';
import { MongooseError } from 'mongoose';
import { logWithContext, logger } from '@/utils/logger';

/**
 * Interface pour les erreurs API personnalisées
 */
export interface APIError extends Error {
  statusCode?: number;
  code?: string;
  details?: unknown;
  isOperational?: boolean;
}

/**
 * Classes d'erreurs personnalisées
 */
export class ValidationError extends Error implements APIError {
  statusCode = 400;
  code = 'VALIDATION_ERROR';
  isOperational = true;

  constructor(message: string, public details?: unknown) {
    super(message);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class AuthenticationError extends Error implements APIError {
  statusCode = 401;
  code = 'AUTHENTICATION_ERROR';
  isOperational = true;

  constructor(message = 'Non authentifié') {
    super(message);
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

export class AuthorizationError extends Error implements APIError {
  statusCode = 403;
  code = 'AUTHORIZATION_ERROR';
  isOperational = true;

  constructor(message = 'Accès refusé') {
    super(message);
    this.name = 'AuthorizationError';
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}

export class NotFoundError extends Error implements APIError {
  statusCode = 404;
  code = 'NOT_FOUND_ERROR';
  isOperational = true;

  constructor(resource = 'Ressource') {
    super(`${resource} introuvable`);
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class ConflictError extends Error implements APIError {
  statusCode = 409;
  code = 'CONFLICT_ERROR';
  isOperational = true;

  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

export class RateLimitError extends Error implements APIError {
  statusCode = 429;
  code = 'RATE_LIMIT_ERROR';
  isOperational = true;

  constructor(message = 'Trop de requêtes', public retryAfter?: number) {
    super(message);
    this.name = 'RateLimitError';
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

export class ExternalServiceError extends Error implements APIError {
  statusCode = 502;
  code = 'EXTERNAL_SERVICE_ERROR';
  isOperational = true;

  constructor(service: string, originalError?: Error) {
    super(`Erreur du service externe: ${service}`);
    this.name = 'ExternalServiceError';
    this.details = originalError ? {
      originalMessage: originalError.message,
      stack: originalError.stack,
    } : undefined;
    Object.setPrototypeOf(this, ExternalServiceError.prototype);
  }
}

export class DatabaseError extends Error implements APIError {
  statusCode = 500;
  code = 'DATABASE_ERROR';
  isOperational = true;

  constructor(message: string, originalError?: Error) {
    super(`Erreur de base de données: ${message}`);
    this.name = 'DatabaseError';
    this.details = originalError ? {
      originalMessage: originalError.message,
      stack: originalError.stack,
    } : undefined;
    Object.setPrototypeOf(this, DatabaseError.prototype);
  }
}

/**
 * Classification et normalisation des erreurs
 */
const classifyError = (_error: Error): APIError => {
  // Erreurs Zod (validation)
  if (error instanceof ZodError) {
    return new ValidationError('Erreur de validation des données', {
      validationErrors: error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code,
        received: err.received,
      })),
    });
  }

  // Erreurs Prisma
  if (error instanceof PrismaClientKnownRequestError) {
    switch (error.code) {
    case 'P2002': // Unique constraint violation
      return new ConflictError(`Contrainte d'unicité violée: ${error.meta?.target ?? 'champ'}`);
    case 'P2025': // Record not found
      return new NotFoundError('Enregistrement');
    case 'P2003': // Foreign key constraint
      return new ValidationError('Contrainte de clé étrangère violée', {
        field: error.meta?.field_name,
      });
    case 'P2016': // Query interpretation error
      return new ValidationError('Erreur dans les paramètres de requête');
    default:
      return new DatabaseError(`Erreur Prisma ${error.code}`, error);
    }
  }

  if (error instanceof PrismaClientValidationError) {
    return new ValidationError('Erreur de validation Prisma', {
      originalMessage: error.message,
    });
  }

  // Erreurs Mongoose
  if (error instanceof MongooseError) {
    if (error.name === 'ValidationError') {
      return new ValidationError('Erreur de validation MongoDB', {
        validationErrors: Object.entries((error as any).errors ?? {}).map(([field, err]: [string, any]) => ({
          field,
          message: err.message,
          kind: err.kind,
          value: err.value,
        })),
      });
    }

    if (error.name === 'CastError') {
      return new ValidationError('Format de données invalide', {
        field: (error as any).path,
        value: (error as any).value,
      });
    }

    return new DatabaseError('Erreur MongoDB', error);
  }

  // Erreurs HTTP connues
  if ((error as any).response?.status) {
    const status = (error as any).response.status;
    switch (true) {
    case status >= 400 && status < 500:
      return new ValidationError('Erreur dans la requête externe', {
        status,
        data: (error as any).response.data,
      });
    case status >= 500:
      return new ExternalServiceError('Service externe', error);
    }
  }

  // Erreurs déjà classifiées
  if ('statusCode' in error && 'code' in error) {
    return error as APIError;
  }

  // Erreur système non gérée
  return {
    name: error.name ?? 'UnknownError',
    message: error.message ?? 'Une erreur inattendue s\'est produite',
    statusCode: 500,
    code: 'INTERNAL_SERVER_ERROR',
    isOperational: false,
    stack: error.stack,
  } as APIError;
};

/**
 * Formatage de la réponse d'erreur
 */
const formatErrorResponse = (_error: APIError, req: Request) => {
  const isProduction = process.env.NODE_ENV === 'production';

  const baseResponse = {
    _error: error.code ?? 'UNKNOWN_ERROR',
    message: error.message,
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
  };

  // En développement, inclure plus de détails
  if (!isProduction) {
    return {
      ...baseResponse,
      stack: error.stack,
      details: error.details,
      statusCode: error.statusCode,
    };
  }

  // En production, limiter les informations sensibles
  const response: unknown = { ...baseResponse };

  // Ajouter les détails seulement pour les erreurs opérationnelles
  if (error.isOperational && error.details) {
    response.details = error.details;
  }

  return response;
};

/**
 * Middleware de gestion d'erreurs principal
 */
export const errorHandler: ErrorRequestHandler = (
  _error: Error,
  req: Request,
  _res: Response,
  _next: NextFunction,
): void => {
  // Classifier et normaliser l'erreur
  const classifiedError = classifyError(error);

  // Générer un ID unique pour tracer l'erreur
  const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Logger l'erreur avec contexte complet
  const logData = {
    errorId,
    userId: (req as any).user?.id,
    username: (req as any).user?.username,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.body,
    query: req.query,
    params: req.params,
    headers: {
      authorization: req.headers.authorization ? '[REDACTED]' : undefined,
      'content-type': req.headers['content-type'],
      origin: req.headers.origin,
      referer: req.headers.referer,
    },
    statusCode: classifiedError.statusCode,
    errorName: classifiedError.name,
    errorCode: classifiedError.code,
    isOperational: classifiedError.isOperational,
    stack: classifiedError.stack,
    details: classifiedError.details,
  };

  // Log selon la gravité
  if (classifiedError.statusCode >= 500 ?? !classifiedError.isOperational) {
    logger.error('Erreur serveur critique', logData);
  } else if (classifiedError.statusCode >= 400) {
    logger.warn('Erreur client', logData);
  } else {
    logger.info('Erreur gérée', logData);
  }

  // Contexte de logging spécialisé
  logWithContext.api('error_handled', req.path, false, {
    errorId,
    errorCode: classifiedError.code,
    statusCode: classifiedError.statusCode,
    isOperational: classifiedError.isOperational,
  });

  // Formatage de la réponse
  const responseData = formatErrorResponse(classifiedError, req);

  // Ajouter l'ID d'erreur pour le support
  if (classifiedError.statusCode >= 500) {
    responseData.errorId = errorId;
    responseData.supportMessage = 'Si le problème persiste, contactez le support avec cet ID d\'erreur';
  }

  // Headers spéciaux selon le type d'erreur
  if (error instanceof RateLimitError && error.retryAfter) {
    res.set('Retry-After', error.retryAfter.toString());
  }

  // Envoi de la réponse d'erreur
  res.status(classifiedError.statusCode ?? 500).json(responseData);
};

/**
 * Middleware pour les routes 404
 */
export const notFoundHandler = (req: Request, _res: Response, _next: NextFunction): void => {
  const error = new NotFoundError('Endpoint');

  logWithContext.api('endpoint_not_found', req.path, false, {
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  next(error);
};

/**
 * Gestionnaire d'erreurs non capturées
 */
export const setupGlobalErrorHandlers = (): void => {
  // Exceptions non capturées
  process.on('uncaughtException', (_error: Error) => {
    logger.error('Exception non capturée', {
      _error: error.message,
      stack: error.stack,
      name: error.name,
    });

    // Arrêt gracieux
    process.exit(1);
  });

  // Promesses rejetées non gérées
  process.on('unhandledRejection', (reason: unknown, promise: Promise<Record<string, unknown>>) => {
    logger.error('Promesse rejetée non gérée', {
      reason: reason?.message ?? reason,
      stack: reason?.stack,
      promise: promise.toString(),
    });

    // Laisser le processus continuer, mais logger
    // En production, considérer l'arrêt du processus
  });

  // Signaux de terminaison
  const gracefulShutdown = (signal: string) => {
    logger.info(`Signal ${signal} reçu, arrêt en cours...`);

    // Ici, ajouter la logique pour fermer proprement:
    // - Connexions DB
    // - Serveur HTTP
    // - Tâches en cours

    process.exit(0);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
};

/**
 * Middleware d'asyncronous error catching pour les routes async
 */
export const asyncHandler = (fn: (req: Request, _res: Response, _next: NextFunction) => Promise<Record<string, unknown>>) => {
  return (req: Request, _res: Response, _next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Helper pour créer des erreurs facilement dans les controllers
 */
export const createError = {
  validation: (message: string, details?: unknown) => new ValidationError(message, details),
  authentication: (message?: string) => new AuthenticationError(message),
  authorization: (message?: string) => new AuthorizationError(message),
  notFound: (resource?: string) => new NotFoundError(resource),
  conflict: (message: string) => new ConflictError(message),
  rateLimit: (message?: string, retryAfter?: number) => new RateLimitError(message, retryAfter),
  externalService: (service: string, originalError?: Error) => new ExternalServiceError(service, originalError),
  database: (message: string, originalError?: Error) => new DatabaseError(message, originalError),
};
