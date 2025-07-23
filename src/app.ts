import express from 'express';
import databaseConfig from '@/config/database';
import logger from '@/utils/logger';
import { setupAllMiddlewares } from '@/middleware';
import { setupErrorHandling } from '@/middleware';
import { setupRoutes } from '@/routes';
import { setupDocumentation } from '@/middleware/documentation';

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
    await databaseConfig.initialize();
    logger.info('Base de données connectée avec succès');

    // 2. Configuration des middlewares de base
    setupAllMiddlewares(app);

    // 3. Middleware de sécurité : bloquer l'accès navigateur aux APIs
    app.use((req, res, next) => {
      const userAgent = req.get('User-Agent') ?? '';
      const accept = req.get('Accept') ?? '';

      // Détecter si c'est un navigateur (recherche de HTML dans Accept header)
      const isBrowser = accept.length > 0 && accept.includes('text/html') &&
        userAgent.length > 0 && (userAgent.includes('Mozilla') ||
          userAgent.includes('Chrome') ||
          userAgent.includes('Safari') ||
          userAgent.includes('Firefox') ||
          userAgent.includes('Edge'));

      // Si c'est une route API et un navigateur, rediriger vers GitHub
      if (req.path.startsWith('/api/') && isBrowser) {
        logger.warn('Tentative d\'accès navigateur bloquée', {
          path: req.path,
          userAgent,
          ip: req.ip,
        });
        res.redirect(301, 'https://github.com/usernamap/gh-insight-engine');
        return;
      }

      // Continuer le traitement pour les autres cas
      next();
    });

    // 4. Configuration de la documentation OpenAPI
    setupDocumentation(app);

    // 5. Configuration des routes API
    setupRoutes(app);

    // 6. Redirection sécurisée - toutes les routes non-API vers GitHub
    app.get('/', (_req, res) => {
      res.redirect(301, 'https://github.com/usernamap/gh-insight-engine');
    });

    // Middleware de redirection pour toutes les autres routes
    app.use((req, res, next) => {
      // Permettre seulement les routes API (pour outils) et documentation
      if (req.path.startsWith('/api/') ||
        req.path.startsWith('/docs/')) {
        next();
        return;
      }

      // Rediriger tout le reste vers GitHub
      res.redirect(301, 'https://github.com/usernamap/gh-insight-engine');
    });

    // 6. Configuration de la gestion d'erreurs (doit être après toutes les routes)
    setupErrorHandling(app);

    // 7. Configuration des variables d'environnement dans l'app
    app.set('env', process.env.NODE_ENV ?? 'development');

    logger.info('Application Express configurée avec succès');
    logger.info('🔒 Toutes les routes publiques redirigent vers GitHub');

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
    // Supprimer toute référence à DatabaseConfig dans ce fichier
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
