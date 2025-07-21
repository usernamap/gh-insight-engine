"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.express = exports.setupAllMiddlewares = exports.setupErrorHandling = exports.setupDataProcessingMiddlewares = exports.setupRateLimiting = exports.setupLoggingMiddleware = exports.setupSecurityMiddlewares = void 0;
__exportStar(require("./auth"), exports);
__exportStar(require("./validation"), exports);
__exportStar(require("./errorHandler"), exports);
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const morgan_1 = __importDefault(require("morgan"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const logger_1 = __importDefault(require("@/utils/logger"));
const validation_1 = require("./validation");
const errorHandler_1 = require("./errorHandler");
const setupSecurityMiddlewares = (app) => {
    app.use((0, helmet_1.default)({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
                fontSrc: ["'self'", "https://fonts.gstatic.com"],
                scriptSrc: ["'self'"],
                imgSrc: ["'self'", "data:", "https:"],
                connectSrc: ["'self'", "https://api.github.com", "https://api.openai.com"],
            },
        },
        crossOriginEmbedderPolicy: false,
    }));
    app.use((0, cors_1.default)({
        origin: (origin, callback) => {
            if (!origin)
                return callback(null, true);
            if (process.env.NODE_ENV === 'development') {
                if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
                    return callback(null, true);
                }
            }
            const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            }
            callback(new Error('Non autorisé par CORS'));
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    }));
    app.use((0, compression_1.default)({
        filter: (req, res) => {
            if (req.headers['x-no-compression']) {
                return false;
            }
            return compression_1.default.filter(req, res);
        },
        threshold: 1024,
    }));
};
exports.setupSecurityMiddlewares = setupSecurityMiddlewares;
const setupLoggingMiddleware = (app) => {
    const morganFormat = process.env.NODE_ENV === 'production'
        ? 'combined'
        : 'dev';
    const morganStream = {
        write: (message) => {
            logger_1.default.http(message.trim());
        },
    };
    app.use((0, morgan_1.default)(morganFormat, {
        stream: morganStream,
        skip: (req, res) => {
            return req.path === '/health' || req.path === '/ping';
        },
    }));
};
exports.setupLoggingMiddleware = setupLoggingMiddleware;
const setupRateLimiting = (app) => {
    const globalLimiter = (0, express_rate_limit_1.default)({
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
        max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
        message: {
            error: 'RATE_LIMIT_EXCEEDED',
            message: 'Trop de requêtes depuis cette IP, réessayez plus tard',
            retryAfter: Math.ceil(parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000') / 1000),
            timestamp: new Date().toISOString(),
        },
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res) => {
            logger_1.default.warn('Rate limit dépassé', {
                ip: req.ip,
                path: req.path,
                method: req.method,
                userAgent: req.get('User-Agent'),
            });
            res.status(429).json({
                error: 'RATE_LIMIT_EXCEEDED',
                message: 'Trop de requêtes depuis cette IP, réessayez plus tard',
                retryAfter: Math.ceil(parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000') / 1000),
                timestamp: new Date().toISOString(),
            });
        },
    });
    const authLimiter = (0, express_rate_limit_1.default)({
        windowMs: 15 * 60 * 1000,
        max: 5,
        message: {
            error: 'AUTH_RATE_LIMIT_EXCEEDED',
            message: 'Trop de tentatives de connexion, réessayez dans 15 minutes',
            retryAfter: 900,
            timestamp: new Date().toISOString(),
        },
        skipSuccessfulRequests: true,
    });
    const analysisLimiter = (0, express_rate_limit_1.default)({
        windowMs: 60 * 60 * 1000,
        max: 10,
        message: {
            error: 'ANALYSIS_RATE_LIMIT_EXCEEDED',
            message: 'Limite d\'analyses atteinte, réessayez dans 1 heure',
            retryAfter: 3600,
            timestamp: new Date().toISOString(),
        },
    });
    app.use(globalLimiter);
    app.set('authLimiter', authLimiter);
    app.set('analysisLimiter', analysisLimiter);
};
exports.setupRateLimiting = setupRateLimiting;
const setupDataProcessingMiddlewares = (app) => {
    app.use(express_1.default.json({
        limit: '10mb',
        verify: (req, res, buf) => {
            try {
                JSON.parse(buf.toString());
            }
            catch (e) {
                throw new Error('JSON invalide');
            }
        }
    }));
    app.use(express_1.default.urlencoded({
        extended: true,
        limit: '10mb'
    }));
    app.use(validation_1.sanitizeInput);
};
exports.setupDataProcessingMiddlewares = setupDataProcessingMiddlewares;
const setupErrorHandling = (app) => {
    app.use(errorHandler_1.notFoundHandler);
    app.use(errorHandler_1.errorHandler);
    (0, errorHandler_1.setupGlobalErrorHandlers)();
};
exports.setupErrorHandling = setupErrorHandling;
const setupAllMiddlewares = (app) => {
    logger_1.default.info('Configuration des middlewares en cours...');
    (0, exports.setupSecurityMiddlewares)(app);
    (0, exports.setupLoggingMiddleware)(app);
    (0, exports.setupRateLimiting)(app);
    (0, exports.setupDataProcessingMiddlewares)(app);
    logger_1.default.info('Middlewares configurés avec succès');
};
exports.setupAllMiddlewares = setupAllMiddlewares;
const express_1 = __importDefault(require("express"));
exports.express = express_1.default;
//# sourceMappingURL=index.js.map