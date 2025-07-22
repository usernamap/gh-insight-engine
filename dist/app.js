"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.gracefulShutdown = exports.createApp = void 0;
const express_1 = __importDefault(require("express"));
const middleware_1 = require("@/middleware");
const routes_1 = require("@/routes");
const database_1 = require("@/config/database");
const logger_1 = __importDefault(require("@/utils/logger"));
const createApp = async () => {
    const app = (0, express_1.default)();
    logger_1.default.info("Initialisation de l'application GitHub Insight Engine", {
        nodeEnv: process.env.NODE_ENV,
        port: process.env.PORT,
    });
    try {
        logger_1.default.info('Connexion à la base de données...');
        const databaseConfig = new database_1.DatabaseConfig();
        await databaseConfig.initialize();
        logger_1.default.info('Base de données connectée avec succès');
        (0, middleware_1.setupAllMiddlewares)(app);
        (0, routes_1.setupRoutes)(app);
        (0, middleware_1.setupErrorHandling)(app);
        app.set('env', process.env.NODE_ENV ?? 'development');
        app.set('trust proxy', true);
        logger_1.default.info('Application Express configurée avec succès');
        return app;
    }
    catch (_error) {
        logger_1.default.error("Erreur lors de l'initialisation de l'application", {
            error: _error instanceof Error ? _error.message : String(_error),
            stack: _error instanceof Error ? _error.stack : undefined,
        });
        throw _error;
    }
};
exports.createApp = createApp;
const gracefulShutdown = async () => {
    logger_1.default.info("Arrêt gracieux de l'application en cours...");
    try {
        const databaseConfig = new database_1.DatabaseConfig();
        await databaseConfig.cleanup();
        logger_1.default.info('Base de données déconnectée');
        logger_1.default.info('Arrêt gracieux terminé');
    }
    catch (_error) {
        logger_1.default.error("Erreur lors de l'arrêt gracieux", {
            error: _error instanceof Error ? _error.message : String(_error),
            stack: _error instanceof Error ? _error.stack : undefined,
        });
    }
};
exports.gracefulShutdown = gracefulShutdown;
exports.default = exports.createApp;
//# sourceMappingURL=app.js.map