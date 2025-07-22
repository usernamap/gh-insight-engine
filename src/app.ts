import express from 'express';
import { setupAllMiddlewares, setupErrorHandling } from '@/middleware';
import { setupRoutes } from '@/routes';
import { DatabaseConfig } from '@/config/database';
import logger from '@/utils/logger';

/**
 * Création et configuration de l'application Express
 */
export const createApp = async (): Promise<express.Application> => {
  const app = express();

  // Log du démarrage de l'application
  logger.info("Initialisation de l'application GitHub Insight Engine", {
    nodeEnv: process.env.NODE_ENV,
    port: process.env.PORT,
  });

  try {
    // 1. Initialisation de la base de données
    logger.info('Connexion à la base de données...');
    const databaseConfig = new DatabaseConfig();
    await databaseConfig.initialize();
    logger.info('Base de données connectée avec succès');

    // 2. Configuration des middlewares de base
    setupAllMiddlewares(app);

    // 3. Configuration des routes API
    setupRoutes(app);

    // 4. Configuration de la gestion d'erreurs (doit être après toutes les routes)
    setupErrorHandling(app);

    // 5. Configuration des variables d'environnement dans l'app
    app.set('env', process.env.NODE_ENV ?? 'development');
    app.set('trust proxy', true); // Pour les reverse proxies (nginx, etc.)

    logger.info('Application Express configurée avec succès');

    return app;
  } catch (_error: unknown) {
    logger.error("Erreur lors de l'initialisation de l'application", {
      error: _error instanceof Error ? _error.message : String(_error),
      stack: _error instanceof Error ? _error.stack : undefined,
    });

    throw _error;
  }
};

/**
 * Arrêt gracieux de l'application
 */
export const gracefulShutdown = async (): Promise<void> => {
  logger.info("Arrêt gracieux de l'application en cours...");

  try {
    // Fermeture de la base de données
    const databaseConfig = new DatabaseConfig();
    await databaseConfig.cleanup();
    logger.info('Base de données déconnectée');

    logger.info('Arrêt gracieux terminé');
  } catch (_error: unknown) {
    logger.error("Erreur lors de l'arrêt gracieux", {
      error: _error instanceof Error ? _error.message : String(_error),
      stack: _error instanceof Error ? _error.stack : undefined,
    });
  }
};

export default createApp;
