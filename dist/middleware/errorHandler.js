"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createError = exports.asyncHandler = exports.setupGlobalErrorHandlers = exports.notFoundHandler = exports.errorHandler = exports.DatabaseError = exports.ExternalServiceError = exports.RateLimitError = exports.ConflictError = exports.NotFoundError = exports.AuthorizationError = exports.AuthenticationError = exports.ValidationError = void 0;
const zod_1 = require("zod");
const library_1 = require("@prisma/client/runtime/library");
const library_2 = require("@prisma/client/runtime/library");
const logger_1 = __importDefault(require("@/utils/logger"));
class ValidationError extends Error {
    constructor(message, _details) {
        super(message);
        this._details = _details;
        this.statusCode = 400;
        this.code = 'VALIDATION_ERROR';
        this.isOperational = true;
        this.name = 'ValidationError';
        Object.setPrototypeOf(this, ValidationError.prototype);
    }
}
exports.ValidationError = ValidationError;
class AuthenticationError extends Error {
    constructor(message = 'Non authentifié') {
        super(message);
        this.statusCode = 401;
        this.code = 'AUTHENTICATION_ERROR';
        this.isOperational = true;
        this.name = 'AuthenticationError';
        Object.setPrototypeOf(this, AuthenticationError.prototype);
    }
}
exports.AuthenticationError = AuthenticationError;
class AuthorizationError extends Error {
    constructor(message = 'Accès refusé') {
        super(message);
        this.statusCode = 403;
        this.code = 'AUTHORIZATION_ERROR';
        this.isOperational = true;
        this.name = 'AuthorizationError';
        Object.setPrototypeOf(this, AuthorizationError.prototype);
    }
}
exports.AuthorizationError = AuthorizationError;
class NotFoundError extends Error {
    constructor(resource = 'Ressource') {
        super(`${resource} introuvable`);
        this.statusCode = 404;
        this.code = 'NOT_FOUND_ERROR';
        this.isOperational = true;
        this.name = 'NotFoundError';
        Object.setPrototypeOf(this, NotFoundError.prototype);
    }
}
exports.NotFoundError = NotFoundError;
class ConflictError extends Error {
    constructor(message) {
        super(message);
        this.statusCode = 409;
        this.code = 'CONFLICT_ERROR';
        this.isOperational = true;
        this.name = 'ConflictError';
        Object.setPrototypeOf(this, ConflictError.prototype);
    }
}
exports.ConflictError = ConflictError;
class RateLimitError extends Error {
    constructor(message = 'Trop de requêtes', _retryAfter) {
        super(message);
        this._retryAfter = _retryAfter;
        this.statusCode = 429;
        this.code = 'RATE_LIMIT_ERROR';
        this.isOperational = true;
        this.name = 'RateLimitError';
        Object.setPrototypeOf(this, RateLimitError.prototype);
    }
}
exports.RateLimitError = RateLimitError;
class ExternalServiceError extends Error {
    constructor(service, originalError) {
        super(`Erreur du service externe: ${service}`);
        this.statusCode = 502;
        this.code = 'EXTERNAL_SERVICE_ERROR';
        this.isOperational = true;
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
exports.ExternalServiceError = ExternalServiceError;
class DatabaseError extends Error {
    constructor(message, originalError) {
        super(`Erreur de base de données: ${message}`);
        this.statusCode = 500;
        this.code = 'DATABASE_ERROR';
        this.isOperational = true;
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
exports.DatabaseError = DatabaseError;
const classifyError = (_error) => {
    if (_error instanceof zod_1.ZodError) {
        return new ValidationError('Erreur de validation des données', {
            validationErrors: _error.errors.map((err) => ({
                field: err.path.join('.'),
                message: err.message,
                code: err.code,
                received: 'received' in err ? err.received : undefined,
            })),
        });
    }
    if (_error instanceof library_1.PrismaClientKnownRequestError) {
        switch (_error.code) {
            case 'P2002':
                return new ConflictError(`Contrainte d'unicité violée: ${_error.meta?.target ?? 'champ'}`);
            case 'P2025':
                return new NotFoundError('Enregistrement');
            case 'P2003':
                return new ValidationError('Contrainte de clé étrangère violée', {
                    field: _error.meta?.field_name,
                });
            case 'P2016':
                return new ValidationError('Erreur dans les paramètres de requête');
            default:
                return new DatabaseError(`Erreur Prisma ${_error.code}`, _error);
        }
    }
    if (_error instanceof library_2.PrismaClientValidationError) {
        return new ValidationError('Erreur de validation Prisma', {
            originalMessage: _error.message,
        });
    }
    if (isMongooseValidationError(_error)) {
        return new ValidationError('Erreur de validation MongoDB', {
            validationErrors: Object.entries(_error.errors).map(([field, err]) => ({
                field,
                message: err.message,
                kind: err.kind,
                value: err.value,
            })),
        });
    }
    if (isMongooseCastError(_error)) {
        return new ValidationError('Format de données invalide', {
            field: _error.path,
            value: _error.value,
        });
    }
    const status = _error.response?.status;
    if (status != null) {
        switch (true) {
            case status >= 400 && status < 500:
                return new ValidationError('Erreur dans la requête externe', {
                    status,
                    data: _error.response?.data,
                });
            case status >= 500:
                return new ExternalServiceError('Service externe', _error);
        }
    }
    if ('statusCode' in _error && 'code' in _error) {
        return _error;
    }
    return {
        name: _error.name ?? 'UnknownError',
        message: _error.message ?? "Une erreur inattendue s'est produite",
        statusCode: 500,
        code: 'INTERNAL_SERVER_ERROR',
        isOperational: false,
        stack: _error.stack,
    };
};
const formatErrorResponse = (_error, req) => {
    const isProduction = process.env.NODE_ENV === 'production';
    const baseResponse = {
        error: _error.code ?? 'UNKNOWN_ERROR',
        message: _error.message,
        timestamp: new Date().toISOString(),
        path: req.path,
        method: req.method,
    };
    if (!isProduction) {
        return {
            ...baseResponse,
            stack: _error.stack,
            details: ('details' in _error) ? _error.details : undefined,
            statusCode: _error.statusCode,
        };
    }
    const response = { ...baseResponse };
    if (_error.isOperational === true && _error.details != null) {
        response.details = _error.details;
    }
    return response;
};
const errorHandler = (_error, _req, _res) => {
    const classifiedError = classifyError(_error);
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
    if ((classifiedError.statusCode ?? 500) >= 500 ||
        classifiedError.isOperational === false) {
        logger_1.default.error('Erreur serveur critique', logData);
    }
    else if ((classifiedError.statusCode ?? 500) >= 400) {
        logger_1.default.warn('Erreur client', logData);
    }
    else {
        logger_1.default.info('Erreur gérée', logData);
    }
    logger_1.default.info('error_handled', {
        path: _req.path,
        errorId,
        errorCode: classifiedError.code,
        statusCode: classifiedError.statusCode,
        isOperational: classifiedError.isOperational,
    });
    const responseData = formatErrorResponse(classifiedError, _req);
    if ((classifiedError.statusCode ?? 500) >= 500) {
        responseData.errorId = errorId;
        responseData.supportMessage =
            "Si le problème persiste, contactez le support avec cet ID d'erreur";
    }
    if (_error instanceof RateLimitError &&
        _error._retryAfter != null &&
        !Number.isNaN(_error._retryAfter)) {
        _res.set('Retry-After', (_error._retryAfter ?? 0).toString());
    }
    _res.status(classifiedError.statusCode ?? 500).json(responseData);
};
exports.errorHandler = errorHandler;
const notFoundHandler = (req, _res, _next) => {
    const error = new NotFoundError('Endpoint');
    logger_1.default.info('endpoint_not_found', {
        path: req.path,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
    });
    _next(error);
};
exports.notFoundHandler = notFoundHandler;
const setupGlobalErrorHandlers = () => {
    process.on('uncaughtException', (_error) => {
        logger_1.default.error('Exception non capturée', {
            error: _error.message,
            stack: _error.stack,
            name: _error.name,
        });
        process.exit(1);
    });
    process.on('unhandledRejection', (reason, promise) => {
        logger_1.default.error('Promesse rejetée non gérée', {
            reason: reason?.message ?? reason,
            stack: reason?.stack,
            promise: promise.toString(),
        });
    });
    const gracefulShutdown = (signal) => {
        logger_1.default.info(`Signal ${signal} reçu, arrêt en cours...`);
        process.exit(0);
    };
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
};
exports.setupGlobalErrorHandlers = setupGlobalErrorHandlers;
const asyncHandler = (fn) => {
    return (req, _res, _next) => {
        Promise.resolve(fn(req, _res, _next)).catch(_next);
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
    externalService: (service, originalError) => new ExternalServiceError(service, originalError),
    database: (message, originalError) => new DatabaseError(message, originalError),
};
function isMongooseValidationError(error) {
    return error.name === 'ValidationError' && 'errors' in error;
}
function isMongooseCastError(error) {
    return error.name === 'CastError' && 'path' in error && 'value' in error;
}
//# sourceMappingURL=errorHandler.js.map