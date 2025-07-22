import 'dotenv/config';
import http from 'http';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import { createApp, gracefulShutdown } from './app';
import logger from '@/utils/logger';

/**
 * Configuration du serveur HTTP
 */
const PORT = parseInt(process.env.PORT ?? '3000', 10);
const HOST = process.env.HOST ?? '0.0.0.0';

/**
 * Variables globales pour le serveur
 */
let server: http.Server;

/**
 * Déclaration locale du type ErrnoException si NodeJS n'est pas reconnu
 */
interface ErrnoException extends Error {
  errno?: number;
  code?: string;
  syscall?: string;
  path?: string;
}

/**
 * Démarrage du serveur
 */
const startServer = async (): Promise<void> => {
  try {
    logger.info('Démarrage du serveur GitHub Insight Engine...', {
      port: PORT,
      host: HOST,
      nodeEnv: process.env.NODE_ENV,
      nodeVersion: process.version,
    });

    // Création de l'application Express
    const app = await createApp();

    // Création du serveur HTTP
    server = http.createServer(app);

    // Configuration des timeouts
    server.timeout = 30000; // 30 secondes
    server.keepAliveTimeout = 65000; // 65 secondes
    server.headersTimeout = 66000; // 66 secondes

    // Gestion des erreurs du serveur
    server.on('error', (error: ErrnoException) => {
      if (error.syscall !== 'listen') {
        throw error;
      }

      const bind = typeof PORT === 'string' ? `Pipe ${PORT}` : `Port ${PORT}`;

      switch (error.code) {
      case 'EACCES':
        logger.error(`${bind} nécessite des privilèges élevés`);
        process.exit(1);
        break;
      case 'EADDRINUSE':
        logger.error(`${bind} est déjà utilisé`);
        process.exit(1);
        break;
      default:
        logger.error('Erreur serveur', {
          error: error.message,
          code: error.code,
          syscall: error.syscall,
        });
        throw error;
      }
    });

    // Événement de démarrage réussi
    server.on('listening', () => {
      const addr = server.address();
      const bind =
        typeof addr === 'string' ? `pipe ${addr}` : `port ${addr?.port}`;

      logger.info('🚀 Serveur GitHub Insight Engine démarré', {
        address: bind,
        host: HOST,
        port: PORT,
        environment: process.env.NODE_ENV,
        processId: process.pid,
        endpoints: {
          api: `http://${HOST}:${PORT}/api`,
          health: `http://${HOST}:${PORT}/api/health`,
          docs: `http://${HOST}:${PORT}/`,
        },
      });
    });

    // Démarrage du serveur
    server.listen(PORT, HOST);
  } catch (_error: unknown) {
    logger.error('Erreur fatale lors du démarrage du serveur', {
      error: _error instanceof Error ? _error.message : String(_error),
      stack: _error instanceof Error ? _error.stack : undefined,
    });
    process.exit(1);
  }
};

/**
 * Arrêt gracieux du serveur
 */
const stopServer = async (signal: string): Promise<void> => {
  logger.info(`Signal ${signal} reçu, arrêt du serveur en cours...`);

  if (typeof server !== 'undefined' && server !== null) {
    // Arrêt d'accepter de nouvelles connexions
    server.close(async (error) => {
      if (error) {
        logger.error('Erreur lors de la fermeture du serveur', {
          error: error.message,
        });
      } else {
        logger.info('Serveur HTTP fermé');
      }

      // Arrêt gracieux de l'application
      await gracefulShutdown();

      // Arrêt du processus
      process.exit(error ? 1 : 0);
    });

    // Timeout pour forcer l'arrêt si nécessaire
    setTimeout(() => {
      logger.warn("Timeout d'arrêt gracieux atteint, arrêt forcé");
      process.exit(1);
    }, 30000); // 30 secondes
  } else {
    await gracefulShutdown();
    process.exit(0);
  }
};

/**
 * Gestion des signaux système
 */
process.on('SIGTERM', () => stopServer('SIGTERM'));
process.on('SIGINT', () => stopServer('SIGINT'));

/**
 * Gestion des exceptions non capturées
 */
process.on('uncaughtException', (error: Error) => {
  logger.error('Exception non capturée', {
    error: error.message,
    stack: error.stack,
  });

  // Arrêt immédiat pour les exceptions critiques
  process.exit(1);
});

/**
 * Gestion des promesses rejetées non gérées
 */
process.on(
  'unhandledRejection',
  (reason: unknown, promise: Promise<Record<string, unknown>>) => {
    logger.error('Promesse rejetée non gérée', {
      reason: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
      promise: promise.toString(),
    });

    // En mode développement, arrêter le processus
    if (process.env.NODE_ENV === 'development') {
      process.exit(1);
    }
  },
);

/**
 * Gestion des avertissements Node.js
 */
process.on('warning', (warning) => {
  logger.warn('Avertissement Node.js', {
    name: warning.name,
    message: warning.message,
    stack: warning.stack,
  });
});

/**
 * Header stylé au démarrage
 */
function printHeader(): void {
  // eslint-disable-next-line no-console
  console.log(`\n${  chalk.bgBlueBright.bold.white('  GitHub Insight Engine  ')  }  ${  chalk.bold.gray(`v${process.env.npm_package_version ?? 'dev'}`)}`);
  // eslint-disable-next-line no-console
  console.log(chalk.gray('='.repeat(60)));
  // eslint-disable-next-line no-console
  console.log(chalk.white('Mode:'), chalk.bold.yellow(process.env.NODE_ENV ?? 'development'), chalk.white('Port:'), chalk.bold.green(process.env.PORT ?? '3000'), chalk.white('Date:'), chalk.bold.cyan(new Date().toLocaleString()));
  // eslint-disable-next-line no-console
  console.log(chalk.white('API:'), chalk.underline(`http://localhost:${process.env.PORT ?? '3000'}/api`));
  // eslint-disable-next-line no-console
  console.log(chalk.white('Docs:'), chalk.underline(`http://localhost:${process.env.PORT ?? '3000'}/`));
  // eslint-disable-next-line no-console
  console.log(`${chalk.gray('='.repeat(60))  }\n`);
}

/**
 * Démarrage du serveur
 */
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  printHeader();
  startServer().catch((error) => {
    logger.error('Erreur fatale', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  });
}

// Export pour les tests
export { startServer, stopServer };
export default startServer;
