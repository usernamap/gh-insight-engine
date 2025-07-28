export * from './auth';
export * from './validation';
export * from './errorHandler';
export * from './documentation';

import express, { Express, Request, Response } from 'express';
import compression from 'compression';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { notFoundHandler, errorHandler, setupGlobalErrorHandlers } from './errorHandler';
import { sanitizeInput } from './validation';
import logger from '@/utils/logger';
import {
  CSP_SELF,
  CSP_UNSAFE_INLINE,
  CSP_FONTS_GOOGLEAPIS,
  CSP_FONTS_GSTATIC,
  CSP_API_GITHUB,
  CSP_API_OPENAI,
  CORS_LOCALHOST,
  CORS_127_0_0_1,
  CORS_NOT_AUTHORIZED_ERROR,
  CORS_METHODS,
  CORS_ALLOWED_HEADERS,
  COMPRESSION_NO_COMPRESSION_HEADER,
  COMPRESSION_THRESHOLD,
  MORGAN_SKIP_PATHS,
  MORGAN_PRODUCTION_FORMAT,
  MORGAN_DEVELOPMENT_FORMAT,
  RATE_LIMIT_EXCEEDED_ERROR,
  RATE_LIMIT_MESSAGE,
  AUTH_RATE_LIMIT_EXCEEDED_ERROR,
  AUTH_RATE_LIMIT_MESSAGE,
  ANALYSIS_RATE_LIMIT_EXCEEDED_ERROR,
  ANALYSIS_RATE_LIMIT_MESSAGE,
  APP_AUTH_LIMITER_KEY,
  APP_ANALYSIS_LIMITER_KEY,
  EXPRESS_JSON_LIMIT,
  EXPRESS_INVALID_JSON_ERROR,
  LOGGER_CONFIGURING_MIDDLEWARES,
  LOGGER_MIDDLEWARES_CONFIGURED,
} from '@/constants/middleware.constants';
import {
  RATE_LIMIT_STATUS_CODE,
  AUTH_RATE_LIMIT_RETRY_AFTER_SECONDS,
  ANALYSIS_RATE_LIMIT_RETRY_AFTER_SECONDS,
} from '@/constants/error.constants';
import {
  DEFAULT_RATE_LIMIT_WINDOW_MS,
  DEFAULT_RATE_LIMIT_MAX_REQUESTS,
  AUTH_RATE_LIMIT_WINDOW_MS,
  AUTH_RATE_LIMIT_MAX_REQUESTS,
  ANALYSIS_RATE_LIMIT_WINDOW_MS,
  ANALYSIS_RATE_LIMIT_MAX_REQUESTS,
} from '@/constants/app.constants';

export const setupSecurityMiddlewares = (app: Express): void => {
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: [CSP_SELF],
          styleSrc: [CSP_SELF, CSP_UNSAFE_INLINE, CSP_FONTS_GOOGLEAPIS],
          fontSrc: [CSP_SELF, CSP_FONTS_GSTATIC],
          scriptSrc: [CSP_SELF],
          imgSrc: [CSP_SELF, 'data:', 'https:'],
          connectSrc: [CSP_SELF, CSP_API_GITHUB, CSP_API_OPENAI],
        },
      },
      crossOriginEmbedderPolicy: false,
    })
  );

  app.use(
    cors({
      origin: (
        origin: string | undefined,
        // eslint-disable-next-line no-unused-vars
        callback: (error: Error | null, allow?: boolean) => void
      ) => {
        if (origin == null || origin === '') return callback(null, true);

        if (process.env.NODE_ENV === 'development') {
          if (origin.includes(CORS_LOCALHOST) || origin.includes(CORS_127_0_0_1)) {
            return callback(null, true);
          }
        }

        const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') ?? [];

        if (allowedOrigins.includes('*')) {
          return callback(null, true);
        }

        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        callback(new Error(CORS_NOT_AUTHORIZED_ERROR));
      },
      credentials: true,
      methods: CORS_METHODS,
      allowedHeaders: CORS_ALLOWED_HEADERS,
    })
  );

  app.use(
    compression({
      filter: (req, res): boolean => {
        if (req.headers[COMPRESSION_NO_COMPRESSION_HEADER] !== undefined) {
          return false;
        }
        return compression.filter(req, res);
      },
      threshold: COMPRESSION_THRESHOLD,
    })
  );
};

export const setupLoggingMiddleware = (app: Express): void => {
  const morganFormat =
    process.env.NODE_ENV === 'production' ? MORGAN_PRODUCTION_FORMAT : MORGAN_DEVELOPMENT_FORMAT;

  const morganStream = {
    write(message: string): void {
      logger.http(message.trim());
    },
  };

  app.use(
    morgan(morganFormat, {
      stream: morganStream,
      skip: (req: Request): boolean => {
        return MORGAN_SKIP_PATHS.includes(req.path);
      },
    })
  );
};

export const setupRateLimiting = (app: Express): void => {
  const globalLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? DEFAULT_RATE_LIMIT_WINDOW_MS),
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS ?? DEFAULT_RATE_LIMIT_MAX_REQUESTS),
    message: {
      error: RATE_LIMIT_EXCEEDED_ERROR,
      message: RATE_LIMIT_MESSAGE,
      retryAfter: Math.ceil(
        parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? DEFAULT_RATE_LIMIT_WINDOW_MS) / 1000
      ),
      timestamp: new Date().toISOString(),
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response): void => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        path: req.path,
        method: req.method,
        userAgent: req.get('User-Agent'),
      });

      res.status(RATE_LIMIT_STATUS_CODE).json({
        error: RATE_LIMIT_EXCEEDED_ERROR,
        message: RATE_LIMIT_MESSAGE,
        retryAfter: Math.ceil(
          parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? DEFAULT_RATE_LIMIT_WINDOW_MS) / 1000
        ),
        timestamp: new Date().toISOString(),
      });
    },
  });

  const authLimiter = rateLimit({
    windowMs: AUTH_RATE_LIMIT_WINDOW_MS,
    max: AUTH_RATE_LIMIT_MAX_REQUESTS,
    message: {
      error: AUTH_RATE_LIMIT_EXCEEDED_ERROR,
      message: AUTH_RATE_LIMIT_MESSAGE,
      retryAfter: AUTH_RATE_LIMIT_RETRY_AFTER_SECONDS,
      timestamp: new Date().toISOString(),
    },
    skipSuccessfulRequests: true,
  });

  const analysisLimiter = rateLimit({
    windowMs: ANALYSIS_RATE_LIMIT_WINDOW_MS,
    max: ANALYSIS_RATE_LIMIT_MAX_REQUESTS,
    message: {
      error: ANALYSIS_RATE_LIMIT_EXCEEDED_ERROR,
      message: ANALYSIS_RATE_LIMIT_MESSAGE,
      retryAfter: ANALYSIS_RATE_LIMIT_RETRY_AFTER_SECONDS,
      timestamp: new Date().toISOString(),
    },
  });

  app.use(globalLimiter);

  app.set(APP_AUTH_LIMITER_KEY, authLimiter);
  app.set(APP_ANALYSIS_LIMITER_KEY, analysisLimiter);
};

export const setupDataProcessingMiddlewares = (app: Express): void => {
  app.use(
    express.json({
      limit: EXPRESS_JSON_LIMIT,
      verify: (_req: Request, _res: Response, buf: Buffer): void => {
        try {
          JSON.parse(buf.toString());
        } catch {
          throw new Error(EXPRESS_INVALID_JSON_ERROR);
        }
      },
    })
  );

  app.use(
    express.urlencoded({
      extended: true,
      limit: EXPRESS_JSON_LIMIT,
    })
  );

  app.use(sanitizeInput);
};

export const setupErrorHandling = (app: Express): void => {
  app.use(notFoundHandler);
  app.use(errorHandler);
  setupGlobalErrorHandlers();
};

export const setupAllMiddlewares = (app: Express): void => {
  logger.info(LOGGER_CONFIGURING_MIDDLEWARES);

  setupSecurityMiddlewares(app);
  setupLoggingMiddleware(app);
  setupRateLimiting(app);
  setupDataProcessingMiddlewares(app);

  logger.info(LOGGER_MIDDLEWARES_CONFIGURED);
};

export { express };
