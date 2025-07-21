"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stopServer = exports.startServer = void 0;
require("dotenv/config");
const http_1 = __importDefault(require("http"));
const app_1 = require("./app");
const logger_1 = __importDefault(require("@/utils/logger"));
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';
let server;
const startServer = async () => {
    try {
        logger_1.default.info('Démarrage du serveur GitHub Insight Engine...', {
            port: PORT,
            host: HOST,
            nodeEnv: process.env.NODE_ENV,
            nodeVersion: process.version,
        });
        const app = await (0, app_1.createApp)();
        server = http_1.default.createServer(app);
        server.timeout = 30000;
        server.keepAliveTimeout = 65000;
        server.headersTimeout = 66000;
        server.on('error', (error) => {
            if (error.syscall !== 'listen') {
                throw error;
            }
            const bind = typeof PORT === 'string' ? `Pipe ${PORT}` : `Port ${PORT}`;
            switch (error.code) {
                case 'EACCES':
                    logger_1.default.error(`${bind} nécessite des privilèges élevés`);
                    process.exit(1);
                    break;
                case 'EADDRINUSE':
                    logger_1.default.error(`${bind} est déjà utilisé`);
                    process.exit(1);
                    break;
                default:
                    logger_1.default.error('Erreur serveur', {
                        error: error.message,
                        code: error.code,
                        syscall: error.syscall,
                    });
                    throw error;
            }
        });
        server.on('listening', () => {
            const addr = server.address();
            const bind = typeof addr === 'string' ? `pipe ${addr}` : `port ${addr?.port}`;
            logger_1.default.info(`🚀 Serveur GitHub Insight Engine démarré`, {
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
        server.listen(PORT, HOST);
    }
    catch (error) {
        logger_1.default.error('Erreur fatale lors du démarrage du serveur', {
            error: error.message,
            stack: error.stack,
        });
        process.exit(1);
    }
};
exports.startServer = startServer;
const stopServer = async (signal) => {
    logger_1.default.info(`Signal ${signal} reçu, arrêt du serveur en cours...`);
    if (server) {
        server.close(async (error) => {
            if (error) {
                logger_1.default.error('Erreur lors de la fermeture du serveur', {
                    error: error.message,
                });
            }
            else {
                logger_1.default.info('Serveur HTTP fermé');
            }
            await (0, app_1.gracefulShutdown)();
            process.exit(error ? 1 : 0);
        });
        setTimeout(() => {
            logger_1.default.warn('Timeout d\'arrêt gracieux atteint, arrêt forcé');
            process.exit(1);
        }, 30000);
    }
    else {
        await (0, app_1.gracefulShutdown)();
        process.exit(0);
    }
};
exports.stopServer = stopServer;
process.on('SIGTERM', () => stopServer('SIGTERM'));
process.on('SIGINT', () => stopServer('SIGINT'));
process.on('uncaughtException', (error) => {
    logger_1.default.error('Exception non capturée', {
        error: error.message,
        stack: error.stack,
    });
    process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
    logger_1.default.error('Promesse rejetée non gérée', {
        reason: reason?.message || reason,
        stack: reason?.stack,
        promise: promise.toString(),
    });
    if (process.env.NODE_ENV === 'development') {
        process.exit(1);
    }
});
process.on('warning', (warning) => {
    logger_1.default.warn('Avertissement Node.js', {
        name: warning.name,
        message: warning.message,
        stack: warning.stack,
    });
});
if (require.main === module) {
    startServer().catch((error) => {
        logger_1.default.error('Erreur fatale', {
            error: error.message,
            stack: error.stack,
        });
        process.exit(1);
    });
}
exports.default = startServer;
//# sourceMappingURL=server.js.map