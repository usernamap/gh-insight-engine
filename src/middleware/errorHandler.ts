import { ErrorRequestHandler, NextFunction, Request, Response } from 'express';
import { ZodError, ZodIssue } from 'zod';
import { MongooseError } from 'mongoose';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaClientValidationError } from '@prisma/client/runtime/library';
import logger from '@/utils/logger';

// Types pour les erreurs HTTP
interface HTTPErrorResponse {
  status: number;
  data?: unknown;
}

interface HTTPError extends Error {
  response?: HTTPErrorResponse;
}

interface MongooseFieldError {
  message: string;
  kind: string;
  value: unknown;
}

// Interface pour les données de réponse d'erreur
interface ErrorResponseData {
  error: string;
  message: string;
  timestamp: string;
  path: string;
  method: string;
  stack?: string;
  details?: unknown;
  statusCode?: number;
  errorId?: string;
  supportMessage?: string;
}

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

  constructor(
    message: string,
    // eslint-disable-next-line no-unused-vars
    public _details?: unknown,
  ) {
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

  constructor(
    message = 'Trop de requêtes',
    // eslint-disable-next-line no-unused-vars
    public _retryAfter?: number,
  ) {
    super(message);
    this.name = 'RateLimitError';
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

export class ExternalServiceError extends Error implements APIError {
  statusCode = 502;
  code = 'EXTERNAL_SERVICE_ERROR';
  isOperational = true;
  details?: unknown;

  constructor(service: string, originalError?: Error) {
    super(`Erreur du service externe: ${service}`);
    this.name = 'ExternalServiceError';
    this.details = originalError
      ? {
        originalMessage: originalError.message,
        stack: originalError.stack,
      }
      : undefined;
    Object.setPrototypeOf(this, ExternalServiceError.prototype);
  }
}

export class DatabaseError extends Error implements APIError {
  statusCode = 500;
  code = 'DATABASE_ERROR';
  isOperational = true;
  details?: unknown;

  constructor(message: string, originalError?: Error) {
    super(`Erreur de base de données: ${message}`);
    this.name = 'DatabaseError';
    this.details = originalError
      ? {
        originalMessage: originalError.message,
        stack: originalError.stack,
      }
      : undefined;
    Object.setPrototypeOf(this, DatabaseError.prototype);
  }
}

/**
 * Classification et normalisation des erreurs
 */
const classifyError = (_error: Error): APIError => {
  // Erreurs Zod (validation)
  if (_error instanceof ZodError) {
    return new ValidationError('Erreur de validation des données', {
      validationErrors: _error.errors.map((err: ZodIssue) => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code,
        received: 'received' in err ? err.received : undefined,
      })),
    });
  }

  // Erreurs Prisma
  if (_error instanceof PrismaClientKnownRequestError) {
    switch (_error.code) {
    case 'P2002': // Unique constraint violation
      return new ConflictError(
        `Contrainte d'unicité violée: ${_error.meta?.target ?? 'champ'}`,
      );
    case 'P2025': // Record not found
      return new NotFoundError('Enregistrement');
    case 'P2003': // Foreign key constraint
      return new ValidationError('Contrainte de clé étrangère violée', {
        field: _error.meta?.field_name,
      });
    case 'P2016': // Query interpretation error
      return new ValidationError('Erreur dans les paramètres de requête');
    default:
      return new DatabaseError(`Erreur Prisma ${_error.code}`, _error);
    }
  }

  if (_error instanceof PrismaClientValidationError) {
    return new ValidationError('Erreur de validation Prisma', {
      originalMessage: _error.message,
    });
  }

  // Erreurs Mongoose
  if (isMongooseValidationError(_error)) {
    return new ValidationError('Erreur de validation MongoDB', {
      validationErrors: Object.entries((_error as MongooseValidationError).errors).map(
        ([field, err]: [string, MongooseFieldError]) => ({
          field,
          message: err.message,
          kind: err.kind,
          value: err.value,
        }),
      ),
    });
  }

  if (isMongooseCastError(_error)) {
    return new ValidationError('Format de données invalide', {
      field: (_error as MongooseCastError).path,
      value: (_error as MongooseCastError).value,
    });
  }

  // Erreurs HTTP connues
  const status = (_error as HTTPError).response?.status;
  if (status != null) {
    switch (true) {
    case status >= 400 && status < 500:
      return new ValidationError('Erreur dans la requête externe', {
        status,
        data: (_error as HTTPError).response?.data,
      });
    case status >= 500:
      return new ExternalServiceError('Service externe', _error);
    }
  }

  // Erreurs déjà classifiées
  if ('statusCode' in _error && 'code' in _error) {
    return _error as APIError;
  }

  // Erreur système non gérée
  return {
    name: _error.name ?? 'UnknownError',
    message: _error.message ?? "Une erreur inattendue s'est produite",
    statusCode: 500,
    code: 'INTERNAL_SERVER_ERROR',
    isOperational: false,
    stack: _error.stack,
  } as APIError;
};

/**
 * Formatage de la réponse d'erreur
 */
const formatErrorResponse = (_error: APIError, req: Request): ErrorResponseData => {
  const isProduction = process.env.NODE_ENV === 'production';

  const baseResponse: ErrorResponseData = {
    error: _error.code ?? 'UNKNOWN_ERROR',
    message: _error.message,
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
  };

  // En développement, inclure plus de détails
  if (!isProduction) {
    return {
      ...baseResponse,
      stack: _error.stack,
      details: ('details' in _error) ? (_error as { details?: unknown }).details : undefined,
      statusCode: _error.statusCode,
    };
  }

  // En production, limiter les informations sensibles
  const response: ErrorResponseData = { ...baseResponse };

  // Ajouter les détails seulement pour les erreurs opérationnelles
  if (_error.isOperational === true && _error.details != null) {
    response.details = _error.details;
  }

  return response;
};

/**
 * Middleware de gestion d'erreurs principal
 */
export const errorHandler: ErrorRequestHandler = (
  _error: Error,
  _req: Request,
  _res: Response,
): void => {
  // Classifier et normaliser l'erreur
  const classifiedError = classifyError(_error);

  // Générer un ID unique pour tracer l'erreur
  const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Logger l'erreur avec contexte complet
  const logData = {
    errorId,
    userId: _req.user?.id,
    username: _req.user?.username,
    ip: _req.ip,
    userAgent: _req.get('User-Agent'),
    body: _req.body,
    query: _req.query,
    params: _req.params,
    headers: {
      authorization: _req.headers.authorization != null ? '[REDACTED]' : undefined,
      'content-type': _req.headers['content-type'],
      origin: _req.headers.origin,
      referer: _req.headers.referer,
    },
    statusCode: classifiedError.statusCode,
    errorName: classifiedError.name,
    errorCode: classifiedError.code,
    isOperational: classifiedError.isOperational,
    stack: classifiedError.stack,
    details: classifiedError.details,
  };

  // Log selon la gravité
  if (
    (classifiedError.statusCode ?? 500) >= 500 ||
    classifiedError.isOperational === false
  ) {
    logger.error('Erreur serveur critique', logData);
  } else if ((classifiedError.statusCode ?? 500) >= 400) {
    logger.warn('Erreur client', logData);
  } else {
    logger.info('Erreur gérée', logData);
  }

  // Contexte de logging spécialisé
  logger.info('error_handled', {
    path: _req.path,
    errorId,
    errorCode: classifiedError.code,
    statusCode: classifiedError.statusCode,
    isOperational: classifiedError.isOperational,
  });

  // Formatage de la réponse
  const responseData: ErrorResponseData = formatErrorResponse(classifiedError, _req);

  // Ajouter l'ID d'erreur pour le support
  if ((classifiedError.statusCode ?? 500) >= 500) {
    responseData.errorId = errorId;
    responseData.supportMessage =
      "Si le problème persiste, contactez le support avec cet ID d'erreur";
  }

  // Headers spéciaux selon le type d'erreur
  if (
    _error instanceof RateLimitError &&
    _error._retryAfter != null &&
    !Number.isNaN(_error._retryAfter)
  ) {
    _res.set('Retry-After', (_error._retryAfter ?? 0).toString());
  }

  // Envoi de la réponse d'erreur
  _res.status(classifiedError.statusCode ?? 500).json(responseData);
};

/**
 * Middleware pour les routes 404
 */
export const notFoundHandler = (
  req: Request,
  _res: Response,
  _next: NextFunction,
): void => {
  const error = new NotFoundError('Endpoint');

  logger.info('endpoint_not_found', {
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  _next(error);
};

/**
 * Gestionnaire d'erreurs non capturées
 */
export const setupGlobalErrorHandlers = (): void => {
  // Exceptions non capturées
  process.on('uncaughtException', (_error: Error): void => {
    logger.error('Exception non capturée', {
      error: _error.message,
      stack: _error.stack,
      name: _error.name,
    });

    // Arrêt gracieux
    process.exit(1);
  });

  // Promesses rejetées non gérées
  process.on(
    'unhandledRejection',
    (reason: unknown, promise: Promise<Record<string, unknown>>): void => {
      logger.error('Promesse rejetée non gérée', {
        reason: (reason as Error)?.message ?? reason,
        stack: (reason as Error)?.stack,
        promise: promise.toString(),
      });

      // Laisser le processus continuer, mais logger
      // En production, considérer l'arrêt du processus
    },
  );

  // Signaux de terminaison
  const gracefulShutdown = (signal: string): void => {
    logger.info(`Signal ${signal} reçu, arrêt en cours...`);

    // Ici, ajouter la logique pour fermer proprement:
    // - Connexions DB
    // - Serveur HTTP
    // - Tâches en cours

    process.exit(0);
  };

  process.on('SIGTERM', (): void => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', (): void => gracefulShutdown('SIGINT'));
};

/**
 * Middleware d'asyncronous error catching pour les routes async
 */
export const asyncHandler = (
  fn: (
     // eslint-disable-next-line no-unused-vars
    _req: Request,
     // eslint-disable-next-line no-unused-vars
    _res: Response,
     // eslint-disable-next-line no-unused-vars
    _next: NextFunction,
  ) => Promise<Record<string, unknown> | void>,
) => {
  return (req: Request, _res: Response, _next: NextFunction): void => {
    Promise.resolve(fn(req, _res, _next)).catch(_next);
  };
};

/**
 * Helper pour créer des erreurs facilement dans les controllers
 */
export const createError = {
  validation: (message: string, details?: unknown): ValidationError =>
    new ValidationError(message, details),
  authentication: (message?: string): AuthenticationError => new AuthenticationError(message),
  authorization: (message?: string): AuthorizationError => new AuthorizationError(message),
  notFound: (resource?: string): NotFoundError => new NotFoundError(resource),
  conflict: (message: string): ConflictError => new ConflictError(message),
  rateLimit: (message?: string, retryAfter?: number): RateLimitError =>
    new RateLimitError(message, retryAfter),
  externalService: (service: string, originalError?: Error): ExternalServiceError =>
    new ExternalServiceError(service, originalError),
  database: (message: string, originalError?: Error): DatabaseError =>
    new DatabaseError(message, originalError),
};

// Interface for Mongoose validation error
interface MongooseValidationError extends MongooseError {
  errors: Record<string, {
    message: string;
    kind: string;
    value: unknown;
  }>;
}

// Interface for Mongoose cast error
interface MongooseCastError extends MongooseError {
  path: string;
  value: unknown;
}

// Type guard functions
function isMongooseValidationError(error: MongooseError): error is MongooseValidationError {
  return error.name === 'ValidationError' && 'errors' in error;
}

function isMongooseCastError(error: MongooseError): error is MongooseCastError {
  return error.name === 'CastError' && 'path' in error && 'value' in error;
}
