import { ErrorRequestHandler, NextFunction, Request, Response } from 'express';
import { ZodError, ZodIssue } from 'zod';
import { MongooseError } from 'mongoose';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaClientValidationError } from '@prisma/client/runtime/library';
import logger from '@/utils/logger';
import {
  ERROR_HANDLER_STATUS_CODES,
  ERROR_HANDLER_CODES,
  ERROR_HANDLER_MESSAGES,
  PRISMA_ERROR_CODES,
  MONGOOSE_ERROR_NAMES,
  ERROR_HANDLER_UTILS,
  ERROR_HANDLER_HEADERS,
  GITHUB_CONSTANTS,
  GITHUB_MESSAGES,
} from '@/constants';

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

export interface APIError extends Error {
  statusCode?: number;
  code?: string;
  details?: unknown;
  isOperational?: boolean;
}

export class ValidationError extends Error implements APIError {
  statusCode = ERROR_HANDLER_STATUS_CODES.BAD_REQUEST;
  code = ERROR_HANDLER_CODES.VALIDATION_ERROR;
  isOperational = true;

  constructor(
    message: string,
    // eslint-disable-next-line no-unused-vars
    public _details?: unknown
  ) {
    super(message);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class AuthenticationError extends Error implements APIError {
  statusCode = ERROR_HANDLER_STATUS_CODES.UNAUTHORIZED;
  code = ERROR_HANDLER_CODES.AUTHENTICATION_ERROR;
  isOperational = true;

  constructor(message?: string) {
    super(message ?? ERROR_HANDLER_MESSAGES.UNAUTHENTICATED);
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

export class AuthorizationError extends Error implements APIError {
  statusCode = ERROR_HANDLER_STATUS_CODES.FORBIDDEN;
  code = ERROR_HANDLER_CODES.AUTHORIZATION_ERROR;
  isOperational = true;

  constructor(message?: string) {
    super(message ?? ERROR_HANDLER_MESSAGES.ACCESS_DENIED);
    this.name = 'AuthorizationError';
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}

export class NotFoundError extends Error implements APIError {
  statusCode = ERROR_HANDLER_STATUS_CODES.NOT_FOUND;
  code = ERROR_HANDLER_CODES.NOT_FOUND_ERROR;
  isOperational = true;

  constructor(resource?: string) {
    super(`${resource ?? ERROR_HANDLER_MESSAGES.DEFAULT_RESOURCE} not found`);
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class ConflictError extends Error implements APIError {
  statusCode = ERROR_HANDLER_STATUS_CODES.CONFLICT;
  code = ERROR_HANDLER_CODES.CONFLICT_ERROR;
  isOperational = true;

  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

export class RateLimitError extends Error implements APIError {
  statusCode = ERROR_HANDLER_STATUS_CODES.TOO_MANY_REQUESTS;
  code = ERROR_HANDLER_CODES.RATE_LIMIT_ERROR;
  isOperational = true;

  constructor(
    message?: string,
    // eslint-disable-next-line no-unused-vars
    public _retryAfter?: number
  ) {
    super(message ?? ERROR_HANDLER_MESSAGES.TOO_MANY_REQUESTS);
    this.name = 'RateLimitError';
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

export class ExternalServiceError extends Error implements APIError {
  statusCode = ERROR_HANDLER_STATUS_CODES.BAD_GATEWAY;
  code = ERROR_HANDLER_CODES.EXTERNAL_SERVICE_ERROR;
  isOperational = true;
  details?: unknown;

  constructor(service: string, originalError?: Error) {
    super(`${ERROR_HANDLER_MESSAGES.EXTERNAL_SERVICE_ERROR_PREFIX}${service}`);
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
  statusCode = ERROR_HANDLER_STATUS_CODES.INTERNAL_SERVER_ERROR;
  code = ERROR_HANDLER_CODES.DATABASE_ERROR;
  isOperational = true;
  details?: unknown;

  constructor(message: string, originalError?: Error) {
    super(`${ERROR_HANDLER_MESSAGES.DATABASE_ERROR_PREFIX}${message}`);
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

const classifyError = (_error: Error): APIError => {
  if (_error instanceof ZodError) {
    return new ValidationError(ERROR_HANDLER_MESSAGES.DATA_VALIDATION_ERROR, {
      validationErrors: _error.errors.map((err: ZodIssue) => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code,
        received: 'received' in err ? err.received : undefined,
      })),
    });
  }

  if (_error instanceof PrismaClientKnownRequestError) {
    switch (_error.code) {
      case PRISMA_ERROR_CODES.UNIQUE_CONSTRAINT_VIOLATION:
        return new ConflictError(
          `${ERROR_HANDLER_MESSAGES.UNIQUE_CONSTRAINT_VIOLATION}${_error.meta?.target ?? ERROR_HANDLER_MESSAGES.FIELD_FALLBACK}`
        );
      case PRISMA_ERROR_CODES.RECORD_NOT_FOUND:
        return new NotFoundError(ERROR_HANDLER_MESSAGES.RECORD_NOT_FOUND);
      case PRISMA_ERROR_CODES.FOREIGN_KEY_CONSTRAINT_VIOLATION:
        return new ValidationError(ERROR_HANDLER_MESSAGES.FOREIGN_KEY_CONSTRAINT_VIOLATION, {
          field: _error.meta?.field_name,
        });
      case PRISMA_ERROR_CODES.QUERY_PARAMETER_ERROR:
        return new ValidationError(ERROR_HANDLER_MESSAGES.QUERY_PARAMETER_ERROR);
      default:
        return new DatabaseError(`Prisma error ${_error.code}`, _error);
    }
  }

  if (_error instanceof PrismaClientValidationError) {
    return new ValidationError(ERROR_HANDLER_MESSAGES.PRISMA_VALIDATION_ERROR, {
      originalMessage: _error.message,
    });
  }

  if (isMongooseValidationError(_error)) {
    return new ValidationError(ERROR_HANDLER_MESSAGES.MONGODB_VALIDATION_ERROR, {
      validationErrors: Object.entries((_error as MongooseValidationError).errors).map(
        ([field, err]: [string, MongooseFieldError]) => ({
          field,
          message: err.message,
          kind: err.kind,
          value: err.value,
        })
      ),
    });
  }

  if (isMongooseCastError(_error)) {
    return new ValidationError(ERROR_HANDLER_MESSAGES.INVALID_DATA_FORMAT, {
      field: (_error as MongooseCastError).path,
      value: (_error as MongooseCastError).value,
    });
  }

  const errorMessage = _error.message?.toLowerCase() ?? '';
  const isGitHubRateLimitError =
    errorMessage.includes(GITHUB_CONSTANTS.RATE_LIMIT_ERROR_MESSAGE) ||
    errorMessage.includes(GITHUB_CONSTANTS.API_RATE_LIMIT_ERROR_MESSAGE) ||
    errorMessage.includes(GITHUB_CONSTANTS.RATE_LIMIT_EXCEEDED_PATTERN) ||
    errorMessage.includes(GITHUB_CONSTANTS.API_RATE_LIMIT_EXCEEDED_PATTERN) ||
    errorMessage.includes(GITHUB_CONSTANTS.RATE_LIMIT_USER_ID_PATTERN);

  if (isGitHubRateLimitError) {
    return new RateLimitError(GITHUB_MESSAGES.RATE_LIMIT_EXCEEDED_DETAILED);
  }

  const status = (_error as HTTPError).response?.status;
  if (status != null) {
    switch (true) {
      case status >= ERROR_HANDLER_UTILS.CLIENT_ERROR_MIN &&
        status < ERROR_HANDLER_UTILS.CLIENT_ERROR_MAX:
        return new ValidationError(ERROR_HANDLER_MESSAGES.EXTERNAL_REQUEST_ERROR, {
          status,
          data: (_error as HTTPError).response?.data,
        });
      case status >= ERROR_HANDLER_UTILS.SERVER_ERROR_MIN:
        return new ExternalServiceError(ERROR_HANDLER_MESSAGES.EXTERNAL_SERVICE, _error);
    }
  }

  if ('statusCode' in _error && 'code' in _error) {
    return _error as APIError;
  }

  return {
    name: _error.name ?? ERROR_HANDLER_MESSAGES.UNKNOWN_ERROR_NAME,
    message: _error.message ?? ERROR_HANDLER_MESSAGES.UNEXPECTED_ERROR,
    statusCode: ERROR_HANDLER_UTILS.DEFAULT_STATUS_CODE,
    code: ERROR_HANDLER_CODES.INTERNAL_SERVER_ERROR,
    isOperational: false,
    stack: _error.stack,
  } as APIError;
};

const formatErrorResponse = (_error: APIError, req: Request): ErrorResponseData => {
  const isProduction = process.env.NODE_ENV === 'production';

  const baseResponse: ErrorResponseData = {
    error: _error.code ?? ERROR_HANDLER_CODES.UNKNOWN_ERROR,
    message: _error.message,
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
  };

  if (!isProduction) {
    return {
      ...baseResponse,
      stack: _error.stack,
      details: 'details' in _error ? (_error as { details?: unknown }).details : undefined,
      statusCode: _error.statusCode,
    };
  }

  const response: ErrorResponseData = { ...baseResponse };

  if (_error.isOperational === true && _error.details != null) {
    response.details = _error.details;
  }

  return response;
};

export const errorHandler: ErrorRequestHandler = (
  _error: Error,
  _req: Request,
  _res: Response,
  // eslint-disable-next-line no-unused-vars
  _next: NextFunction
): void => {
  const classifiedError = classifyError(_error);

  const errorId = `err_${Date.now()}_${Math.random().toString(ERROR_HANDLER_UTILS.ERROR_ID_BASE).substr(ERROR_HANDLER_UTILS.ERROR_ID_START, ERROR_HANDLER_UTILS.ERROR_ID_LENGTH)}`;

  const logData = {
    errorId,
    userId: _req.user?.id,
    username: _req.user?.username,
    ip: _req.ip,
    userAgent: _req.get(ERROR_HANDLER_HEADERS.USER_AGENT),
    body: _req.body,
    query: _req.query,
    params: _req.params,
    headers: {
      authorization:
        _req.headers.authorization != null ? ERROR_HANDLER_UTILS.REDACTED_VALUE : undefined,
      'content-type': _req.headers[ERROR_HANDLER_HEADERS.CONTENT_TYPE],
      origin: _req.headers[ERROR_HANDLER_HEADERS.ORIGIN],
      referer: _req.headers[ERROR_HANDLER_HEADERS.REFERER],
    },
    statusCode: classifiedError.statusCode,
    errorName: classifiedError.name,
    errorCode: classifiedError.code,
    isOperational: classifiedError.isOperational,
    stack: classifiedError.stack,
    details: classifiedError.details,
  };

  if (
    (classifiedError.statusCode ?? ERROR_HANDLER_UTILS.DEFAULT_STATUS_CODE) >=
      ERROR_HANDLER_UTILS.SERVER_ERROR_MIN ||
    classifiedError.isOperational === false
  ) {
    logger.error(ERROR_HANDLER_MESSAGES.CRITICAL_SERVER_ERROR, logData);
  } else if (
    (classifiedError.statusCode ?? ERROR_HANDLER_UTILS.DEFAULT_STATUS_CODE) >=
    ERROR_HANDLER_UTILS.CLIENT_ERROR_MIN
  ) {
    logger.warn(ERROR_HANDLER_MESSAGES.CLIENT_ERROR, logData);
  } else {
    logger.info(ERROR_HANDLER_MESSAGES.HANDLED_ERROR, logData);
  }

  logger.info(ERROR_HANDLER_MESSAGES.ERROR_HANDLED_LOG, {
    path: _req.path,
    errorId,
    errorCode: classifiedError.code,
    statusCode: classifiedError.statusCode,
    isOperational: classifiedError.isOperational,
  });

  const responseData: ErrorResponseData = formatErrorResponse(classifiedError, _req);

  if (
    (classifiedError.statusCode ?? ERROR_HANDLER_UTILS.DEFAULT_STATUS_CODE) >=
    ERROR_HANDLER_UTILS.SERVER_ERROR_MIN
  ) {
    responseData.errorId = errorId;
    responseData.supportMessage = ERROR_HANDLER_MESSAGES.SUPPORT_MESSAGE;
  }

  if (
    _error instanceof RateLimitError &&
    _error._retryAfter != null &&
    !Number.isNaN(_error._retryAfter)
  ) {
    _res.set(ERROR_HANDLER_UTILS.RETRY_AFTER_HEADER, (_error._retryAfter ?? 0).toString());
  }

  _res
    .status(classifiedError.statusCode ?? ERROR_HANDLER_UTILS.DEFAULT_STATUS_CODE)
    .json(responseData);
};

export const notFoundHandler = (req: Request, _res: Response, _next: NextFunction): void => {
  const error = new NotFoundError(ERROR_HANDLER_MESSAGES.ENDPOINT_NOT_FOUND);

  logger.info(ERROR_HANDLER_MESSAGES.ENDPOINT_NOT_FOUND_LOG, {
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get(ERROR_HANDLER_HEADERS.USER_AGENT),
  });

  _next(error);
};

export const setupGlobalErrorHandlers = (): void => {
  process.on('uncaughtException', (_error: Error): void => {
    logger.error(ERROR_HANDLER_MESSAGES.UNCAUGHT_EXCEPTION, {
      error: _error.message,
      stack: _error.stack,
      name: _error.name,
    });

    process.exit(1);
  });

  process.on(
    'unhandledRejection',
    (reason: unknown, promise: Promise<Record<string, unknown>>): void => {
      logger.error(ERROR_HANDLER_MESSAGES.UNHANDLED_PROMISE_REJECTION, {
        reason: (reason as Error)?.message ?? reason,
        stack: (reason as Error)?.stack,
        promise: promise.toString(),
      });
    }
  );

  const gracefulShutdown = (signal: string): void => {
    logger.info(
      `${ERROR_HANDLER_MESSAGES.SIGNAL_RECEIVED_SHUTDOWN}${signal}${ERROR_HANDLER_MESSAGES.SIGNAL_SHUTDOWN_SUFFIX}`
    );
    process.exit(0);
  };

  process.on('SIGTERM', (): void => gracefulShutdown(ERROR_HANDLER_MESSAGES.SIGTERM));
  process.on('SIGINT', (): void => gracefulShutdown(ERROR_HANDLER_MESSAGES.SIGINT));
};

export const asyncHandler = (
  fn: (
    // eslint-disable-next-line no-unused-vars
    _req: Request,
    // eslint-disable-next-line no-unused-vars
    _res: Response,
    // eslint-disable-next-line no-unused-vars
    _next: NextFunction
  ) => Promise<Record<string, unknown> | void>
) => {
  return (req: Request, _res: Response, _next: NextFunction): void => {
    Promise.resolve(fn(req, _res, _next)).catch(_next);
  };
};

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

interface MongooseValidationError extends MongooseError {
  errors: Record<
    string,
    {
      message: string;
      kind: string;
      value: unknown;
    }
  >;
}

interface MongooseCastError extends MongooseError {
  path: string;
  value: unknown;
}

function isMongooseValidationError(error: MongooseError): error is MongooseValidationError {
  return error.name === MONGOOSE_ERROR_NAMES.VALIDATION_ERROR && 'errors' in error;
}

function isMongooseCastError(error: MongooseError): error is MongooseCastError {
  return error.name === MONGOOSE_ERROR_NAMES.CAST_ERROR && 'path' in error && 'value' in error;
}
