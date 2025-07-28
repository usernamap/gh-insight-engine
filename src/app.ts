import express from 'express';
import databaseConfig from '@/config/database';
import logger from '@/utils/logger';
import { setupAllMiddlewares, setupErrorHandling, setupDocumentation } from '@/middleware';
import { setupRoutes } from '@/routes';
import schedulingService from '@/services/SchedulingService';
import {
  APP_INITIALIZATION,
  BROWSER_DETECTION,
  ROUTES,
  EXTERNAL_URLS,
  EMPTY_STRING,
  APP_INITIALIZATION_MESSAGES,
  SECURITY_MESSAGES,
} from '@/constants';

export const createApp = async (): Promise<express.Application> => {
  const app = express();

  logger.info(APP_INITIALIZATION_MESSAGES.INITIALIZING_APPLICATION, {
    nodeEnv: process.env.NODE_ENV,
    port: process.env.PORT,
  });

  try {
    logger.info(APP_INITIALIZATION_MESSAGES.CONNECTING_DATABASE);
    await databaseConfig.initialize();
    logger.info(APP_INITIALIZATION_MESSAGES.DATABASE_CONNECTED);
    logger.info(APP_INITIALIZATION_MESSAGES.INITIALIZING_SCHEDULING);
    schedulingService.start();
    logger.info(APP_INITIALIZATION_MESSAGES.SCHEDULING_INITIALIZED);
    setupAllMiddlewares(app);

    app.use((req, res, next) => {
      const userAgent = req.get(BROWSER_DETECTION.HEADERS.USER_AGENT) ?? EMPTY_STRING;
      const accept = req.get(BROWSER_DETECTION.HEADERS.ACCEPT) ?? EMPTY_STRING;

      const isBrowser =
        accept.length > 0 &&
        accept.includes(BROWSER_DETECTION.CONTENT_TYPES.HTML) &&
        userAgent.length > 0 &&
        (userAgent.includes(BROWSER_DETECTION.USER_AGENTS.MOZILLA) ||
          userAgent.includes(BROWSER_DETECTION.USER_AGENTS.CHROME) ||
          userAgent.includes(BROWSER_DETECTION.USER_AGENTS.SAFARI) ||
          userAgent.includes(BROWSER_DETECTION.USER_AGENTS.FIREFOX) ||
          userAgent.includes(BROWSER_DETECTION.USER_AGENTS.EDGE));

      if (req.path.startsWith(ROUTES.API_PREFIX) && isBrowser) {
        logger.warn(SECURITY_MESSAGES.BROWSER_ACCESS_BLOCKED, {
          path: req.path,
          userAgent,
          ip: req.ip,
        });
        res.redirect(APP_INITIALIZATION.REDIRECT_STATUS_CODE, EXTERNAL_URLS.GITHUB_REPOSITORY);
        return;
      }

      next();
    });

    setupDocumentation(app);
    setupRoutes(app);

    app.get(ROUTES.ROOT, (_req, res) => {
      res.redirect(APP_INITIALIZATION.REDIRECT_STATUS_CODE, EXTERNAL_URLS.GITHUB_REPOSITORY);
    });

    app.use((req, res, next) => {
      if (req.path.startsWith(ROUTES.API_PREFIX) || req.path.startsWith(ROUTES.DOCS_PREFIX)) {
        next();
        return;
      }

      res.redirect(APP_INITIALIZATION.REDIRECT_STATUS_CODE, EXTERNAL_URLS.GITHUB_REPOSITORY);
    });

    setupErrorHandling(app);

    app.set(
      APP_INITIALIZATION.ENVIRONMENT_KEY,
      process.env.NODE_ENV ?? APP_INITIALIZATION.DEFAULT_ENVIRONMENT
    );

    logger.info(APP_INITIALIZATION_MESSAGES.EXPRESS_CONFIGURED);
    logger.info(APP_INITIALIZATION_MESSAGES.ALL_ROUTES_REDIRECT);

    return app;
  } catch (_error: unknown) {
    logger.error(APP_INITIALIZATION_MESSAGES.ERROR_INITIALIZATION, {
      error: _error instanceof Error ? _error.message : String(_error),
      stack: _error instanceof Error ? _error.stack : undefined,
    });

    throw _error;
  }
};

export const gracefulShutdown = async (): Promise<void> => {
  logger.info(APP_INITIALIZATION_MESSAGES.GRACEFUL_SHUTDOWN);

  try {
    logger.info(APP_INITIALIZATION_MESSAGES.STOPPING_SCHEDULING);
    schedulingService.stop();
    logger.info(APP_INITIALIZATION_MESSAGES.SCHEDULING_STOPPED);
    logger.info(APP_INITIALIZATION_MESSAGES.DATABASE_DISCONNECTED);

    logger.info(APP_INITIALIZATION_MESSAGES.SHUTDOWN_COMPLETED);
  } catch (_error: unknown) {
    logger.error(APP_INITIALIZATION_MESSAGES.ERROR_SHUTDOWN, {
      error: _error instanceof Error ? _error.message : String(_error),
      stack: _error instanceof Error ? _error.stack : undefined,
    });
  }
};

export default createApp;
