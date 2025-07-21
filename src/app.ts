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
    logger.info('Initialisation de l\'application GitHub Insight Engine', {
        nodeEnv: process.env.NODE_ENV,
        port: process.env.PORT,
    });

    try {
        // 1. Initialisation de la base de données
        logger.info('Connexion à la base de données...');
        const databaseConfig = DatabaseConfig.getInstance();
        await databaseConfig.initialize();
        logger.info('Base de données connectée avec succès');

        // 2. Configuration des middlewares de base
        setupAllMiddlewares(app);

        // 3. Configuration des routes API
        setupRoutes(app);

        // 4. Configuration de la gestion d'erreurs (doit être après toutes les routes)
        setupErrorHandling(app);

        // 5. Configuration des variables d'environnement dans l'app
        app.set('env', process.env.NODE_ENV || 'development');
        app.set('trust proxy', true); // Pour les reverse proxies (nginx, etc.)

        logger.info('Application Express configurée avec succès');

        return app;

    } catch (error: any) {
        logger.error('Erreur lors de l\'initialisation de l\'application', {
            error: error.message,
            stack: error.stack,
        });

        throw error;
    }
};

/**
 * Arrêt gracieux de l'application
 */
export const gracefulShutdown = async (): Promise<void> => {
    logger.info('Arrêt gracieux de l\'application en cours...');

    try {
        // Fermeture de la base de données
        const databaseConfig = DatabaseConfig.getInstance();
        await databaseConfig.disconnect();
        logger.info('Base de données déconnectée');

        logger.info('Arrêt gracieux terminé');
    } catch (error: any) {
        logger.error('Erreur lors de l\'arrêt gracieux', {
            error: error.message,
            stack: error.stack,
        });
    }
};

export default createApp; 