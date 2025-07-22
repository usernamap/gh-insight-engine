"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createError =
  exports.asyncHandler =
  exports.setupGlobalErrorHandlers =
  exports.notFoundHandler =
  exports.errorHandler =
  exports.DatabaseError =
  exports.ExternalServiceError =
  exports.RateLimitError =
  exports.ConflictError =
  exports.NotFoundError =
  exports.AuthorizationError =
  exports.AuthenticationError =
  exports.ValidationError =
    void 0;
const zod_1 = require("zod");
const library_1 = require("@prisma/client/runtime/library");
const mongoose_1 = require("mongoose");
const logger_1 = require("@/utils/logger");
class ValidationError extends Error {
  constructor(message, details) {
    super(message);
    this.details = details;
    this.statusCode = 400;
    this.code = "VALIDATION_ERROR";
    this.isOperational = true;
    this.name = "ValidationError";
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}
exports.ValidationError = ValidationError;
class AuthenticationError extends Error {
  constructor(message = "Non authentifié") {
    super(message);
    this.statusCode = 401;
    this.code = "AUTHENTICATION_ERROR";
    this.isOperational = true;
    this.name = "AuthenticationError";
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}
exports.AuthenticationError = AuthenticationError;
class AuthorizationError extends Error {
  constructor(message = "Accès refusé") {
    super(message);
    this.statusCode = 403;
    this.code = "AUTHORIZATION_ERROR";
    this.isOperational = true;
    this.name = "AuthorizationError";
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}
exports.AuthorizationError = AuthorizationError;
class NotFoundError extends Error {
  constructor(resource = "Ressource") {
    super(`${resource} introuvable`);
    this.statusCode = 404;
    this.code = "NOT_FOUND_ERROR";
    this.isOperational = true;
    this.name = "NotFoundError";
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}
exports.NotFoundError = NotFoundError;
class ConflictError extends Error {
  constructor(message) {
    super(message);
    this.statusCode = 409;
    this.code = "CONFLICT_ERROR";
    this.isOperational = true;
    this.name = "ConflictError";
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}
exports.ConflictError = ConflictError;
class RateLimitError extends Error {
  constructor(message = "Trop de requêtes", retryAfter) {
    super(message);
    this.retryAfter = retryAfter;
    this.statusCode = 429;
    this.code = "RATE_LIMIT_ERROR";
    this.isOperational = true;
    this.name = "RateLimitError";
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}
exports.RateLimitError = RateLimitError;
class ExternalServiceError extends Error {
  constructor(service, originalError) {
    super(`Erreur du service externe: ${service}`);
    this.statusCode = 502;
    this.code = "EXTERNAL_SERVICE_ERROR";
    this.isOperational = true;
    this.name = "ExternalServiceError";
    this.details = originalError
      ? {
          originalMessage: originalError.message,
          stack: originalError.stack,
        }
      : undefined;
    Object.setPrototypeOf(this, ExternalServiceError.prototype);
  }
}
exports.ExternalServiceError = ExternalServiceError;
class DatabaseError extends Error {
  constructor(message, originalError) {
    super(`Erreur de base de données: ${message}`);
    this.statusCode = 500;
    this.code = "DATABASE_ERROR";
    this.isOperational = true;
    this.name = "DatabaseError";
    this.details = originalError
      ? {
          originalMessage: originalError.message,
          stack: originalError.stack,
        }
      : undefined;
    Object.setPrototypeOf(this, DatabaseError.prototype);
  }
}
exports.DatabaseError = DatabaseError;
const classifyError = (error) => {
  if (error instanceof zod_1.ZodError) {
    return new ValidationError("Erreur de validation des données", {
      validationErrors: error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
        code: err.code,
        received: err.received,
      })),
    });
  }
  if (error instanceof library_1.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2002":
        return new ConflictError(
          `Contrainte d'unicité violée: ${error.meta?.target || "champ"}`,
        );
      case "P2025":
        return new NotFoundError("Enregistrement");
      case "P2003":
        return new ValidationError("Contrainte de clé étrangère violée", {
          field: error.meta?.field_name,
        });
      case "P2016":
        return new ValidationError("Erreur dans les paramètres de requête");
      default:
        return new DatabaseError(`Erreur Prisma ${error.code}`, error);
    }
  }
  if (error instanceof library_1.PrismaClientValidationError) {
    return new ValidationError("Erreur de validation Prisma", {
      originalMessage: error.message,
    });
  }
  if (error instanceof mongoose_1.MongooseError) {
    if (error.name === "ValidationError") {
      return new ValidationError("Erreur de validation MongoDB", {
        validationErrors: Object.entries(error.errors || {}).map(
          ([field, err]) => ({
            field,
            message: err.message,
            kind: err.kind,
            value: err.value,
          }),
        ),
      });
    }
    if (error.name === "CastError") {
      return new ValidationError("Format de données invalide", {
        field: error.path,
        value: error.value,
      });
    }
    return new DatabaseError("Erreur MongoDB", error);
  }
  if (error.response?.status) {
    const status = error.response.status;
    switch (true) {
      case status >= 400 && status < 500:
        return new ValidationError("Erreur dans la requête externe", {
          status,
          data: error.response.data,
        });
      case status >= 500:
        return new ExternalServiceError("Service externe", error);
    }
  }
  if ("statusCode" in error && "code" in error) {
    return error;
  }
  return {
    name: error.name || "UnknownError",
    message: error.message || "Une erreur inattendue s'est produite",
    statusCode: 500,
    code: "INTERNAL_SERVER_ERROR",
    isOperational: false,
    stack: error.stack,
  };
};
const formatErrorResponse = (error, req) => {
  const isProduction = process.env.NODE_ENV === "production";
  const baseResponse = {
    error: error.code || "UNKNOWN_ERROR",
    message: error.message,
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
  };
  if (!isProduction) {
    return {
      ...baseResponse,
      stack: error.stack,
      details: error.details,
      statusCode: error.statusCode,
    };
  }
  const response = { ...baseResponse };
  if (error.isOperational && error.details) {
    response.details = error.details;
  }
  return response;
};
const errorHandler = (error, req, res, next) => {
  const classifiedError = classifyError(error);
  const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const logData = {
    errorId,
    userId: req.user?.id,
    username: req.user?.username,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    body: req.body,
    query: req.query,
    params: req.params,
    headers: {
      authorization: req.headers.authorization ? "[REDACTED]" : undefined,
      "content-type": req.headers["content-type"],
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
  if (classifiedError.statusCode >= 500 || !classifiedError.isOperational) {
    logger_1.logger.error("Erreur serveur critique", logData);
  } else if (classifiedError.statusCode >= 400) {
    logger_1.logger.warn("Erreur client", logData);
  } else {
    logger_1.logger.info("Erreur gérée", logData);
  }
  logger_1.logWithContext.api("error_handled", req.path, false, {
    errorId,
    errorCode: classifiedError.code,
    statusCode: classifiedError.statusCode,
    isOperational: classifiedError.isOperational,
  });
  const responseData = formatErrorResponse(classifiedError, req);
  if (classifiedError.statusCode >= 500) {
    responseData.errorId = errorId;
    responseData.supportMessage =
      "Si le problème persiste, contactez le support avec cet ID d'erreur";
  }
  if (error instanceof RateLimitError && error.retryAfter) {
    res.set("Retry-After", error.retryAfter.toString());
  }
  res.status(classifiedError.statusCode || 500).json(responseData);
};
exports.errorHandler = errorHandler;
const notFoundHandler = (req, res, next) => {
  const error = new NotFoundError("Endpoint");
  logger_1.logWithContext.api("endpoint_not_found", req.path, false, {
    method: req.method,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });
  next(error);
};
exports.notFoundHandler = notFoundHandler;
const setupGlobalErrorHandlers = () => {
  process.on("uncaughtException", (error) => {
    logger_1.logger.error("Exception non capturée", {
      error: error.message,
      stack: error.stack,
      name: error.name,
    });
    process.exit(1);
  });
  process.on("unhandledRejection", (reason, promise) => {
    logger_1.logger.error("Promesse rejetée non gérée", {
      reason: reason?.message || reason,
      stack: reason?.stack,
      promise: promise.toString(),
    });
  });
  const gracefulShutdown = (signal) => {
    logger_1.logger.info(`Signal ${signal} reçu, arrêt en cours...`);
    process.exit(0);
  };
  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
};
exports.setupGlobalErrorHandlers = setupGlobalErrorHandlers;
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
exports.asyncHandler = asyncHandler;
exports.createError = {
  validation: (message, details) => new ValidationError(message, details),
  authentication: (message) => new AuthenticationError(message),
  authorization: (message) => new AuthorizationError(message),
  notFound: (resource) => new NotFoundError(resource),
  conflict: (message) => new ConflictError(message),
  rateLimit: (message, retryAfter) => new RateLimitError(message, retryAfter),
  externalService: (service, originalError) =>
    new ExternalServiceError(service, originalError),
  database: (message, originalError) =>
    new DatabaseError(message, originalError),
};
//# sourceMappingURL=errorHandler.js.map
