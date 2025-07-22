// Middleware d'authentification et d'autorisation
export * from './auth';

// Middleware de validation des données
export * from './validation';

// Middleware de gestion d'erreurs
export * from './errorHandler';

// Configuration des middlewares communes pour Express
import { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import logger from '@/utils/logger';
import { sanitizeInput } from './validation';
import {
  errorHandler,
  notFoundHandler,
  setupGlobalErrorHandlers,
} from './errorHandler';

/**
 * Configuration des middlewares de sécurité
 */
export const setupSecurityMiddlewares = (app: Express): void => {
  // Helmet pour la sécurité des headers HTTP
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            'https://fonts.googleapis.com',
          ],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: [
            "'self'",
            'https://api.github.com',
            'https://api.openai.com',
          ],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );

  // CORS configuration
  app.use(
    cors({
      origin: (
        origin: string | undefined,
        callback: (_error: Error | null, allow?: boolean) => void,
      ) => {
        // Permettre les requêtes sans origin (mobile apps, etc.)
        if (!origin) return callback(null, true);

        // En développement, permettre localhost
        if (process.env.NODE_ENV === 'development') {
          if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
            return callback(null, true);
          }
        }

        // En production, vérifier les domaines autorisés
        const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') ?? [];
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        callback(new Error('Non autorisé par CORS'));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    }),
  );

  // Compression des réponses
  app.use(
    compression({
      filter: (req, res): boolean => {
        if (req.headers['x-no-compression']) {
          return false;
        }
        return compression.filter(req, res);
      },
      threshold: 1024, // Compresser seulement si > 1KB
    }),
  );
};

/**
 * Configuration du logging des requêtes
 */
export const setupLoggingMiddleware = (app: Express): void => {
  // Format personnalisé pour Morgan
  const morganFormat =
    process.env.NODE_ENV === 'production' ? 'combined' : 'dev';

  // Stream personnalisé vers Winston
  const morganStream = {
    write(message: string): void {
      logger.http(message.trim());
    },
  };

  app.use(
    morgan(morganFormat, {
      stream: morganStream,
      skip: (req: Request, _res: Response): boolean => {
        // Ne pas logger les health checks
        return req.path === '/health' || req.path === '/ping';
      },
    }),
  );
};

/**
 * Configuration du rate limiting global
 */
export const setupRateLimiting = (app: Express): void => {
  // Rate limiting global
  const globalLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '900000'), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS ?? '100'), // 100 requêtes par IP
    message: {
      error: 'RATE_LIMIT_EXCEEDED',
      message: 'Trop de requêtes depuis cette IP, réessayez plus tard',
      retryAfter: Math.ceil(
        parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '900000') / 1000,
      ),
      timestamp: new Date().toISOString(),
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response): void => {
      logger.warn('Rate limit dépassé', {
        ip: req.ip,
        path: req.path,
        method: req.method,
        userAgent: req.get('User-Agent'),
      });

      res.status(429).json({
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Trop de requêtes depuis cette IP, réessayez plus tard',
        retryAfter: Math.ceil(
          parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '900000') / 1000,
        ),
        timestamp: new Date().toISOString(),
      });
    },
  });

  // Rate limiting pour les endpoints sensibles (authentification)
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 tentatives de connexion par IP
    message: {
      error: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Trop de tentatives de connexion, réessayez dans 15 minutes',
      retryAfter: 900,
      timestamp: new Date().toISOString(),
    },
    skipSuccessfulRequests: true,
  });

  // Rate limiting pour les endpoints d'analyse (plus restrictif)
  const analysisLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 heure
    max: 10, // 10 analyses par heure par IP
    message: {
      error: 'ANALYSIS_RATE_LIMIT_EXCEEDED',
      message: "Limite d'analyses atteinte, réessayez dans 1 heure",
      retryAfter: 3600,
      timestamp: new Date().toISOString(),
    },
  });

  // Appliquer le rate limiting global
  app.use(globalLimiter);

  // Exporter les limiteurs spécialisés pour utilisation dans les routes
  app.set('authLimiter', authLimiter);
  app.set('analysisLimiter', analysisLimiter);
};

/**
 * Configuration des middlewares de traitement des données
 */
export const setupDataProcessingMiddlewares = (app: Express): void => {
  // Parsing JSON avec limite de taille
  app.use(
    express.json({
      limit: '10mb',
      verify: (_req: Request, _res: Response, buf: Buffer): void => {
        // Vérification de la validité JSON
        try {
          JSON.parse(buf.toString());
        } catch (_error) {
          throw new Error('JSON invalide');
        }
      },
    }),
  );

  // Parsing des données de formulaire
  app.use(
    express.urlencoded({
      extended: true,
      limit: '10mb',
    }),
  );

  // Sanitisation des entrées
  app.use(sanitizeInput);
};

/**
 * Configuration des middlewares de gestion d'erreurs
 */
export const setupErrorHandling = (app: Express): void => {
  // Middleware pour les routes non trouvées (doit être après toutes les routes)
  app.use(notFoundHandler);

  // Middleware de gestion d'erreurs global (doit être le dernier)
  app.use(errorHandler);

  // Configuration des gestionnaires d'erreurs globaux
  setupGlobalErrorHandlers();
};

/**
 * Configuration complète de tous les middlewares
 */
export const setupAllMiddlewares = (app: Express): void => {
  logger.info('Configuration des middlewares en cours...');

  // 1. Middlewares de sécurité (en premier)
  setupSecurityMiddlewares(app);

  // 2. Logging des requêtes
  setupLoggingMiddleware(app);

  // 3. Rate limiting
  setupRateLimiting(app);

  // 4. Traitement des données
  setupDataProcessingMiddlewares(app);

  logger.info('Middlewares configurés avec succès');
};

// Ré-exporter Express pour faciliter l'usage
import express from 'express';
export { express };
