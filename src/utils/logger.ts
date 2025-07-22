/**
 * Configuration du logger Winston pour l'application
 * Gestion centralisée des logs avec rotation et niveaux
 */

import path from 'path';
import winston from 'winston';
import chalk from 'chalk';

// Création du dossier logs s'il n'existe pas
const logsDir = path.join(process.cwd(), 'logs');

// Configuration des formats
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

// Format console custom
const customConsoleFormat = winston.format.printf(({ timestamp, level, message, ...meta }) => {
  // Coloration niveau
  let levelColor = level;
  switch (level) {
  case 'error':
    levelColor = chalk.bold.red(level.toUpperCase());
    break;
  case 'warn':
    levelColor = chalk.bold.yellow(level.toUpperCase());
    break;
  case 'info':
    levelColor = chalk.bold.green(level.toUpperCase());
    break;
  case 'debug':
    levelColor = chalk.bold.cyan(level.toUpperCase());
    break;
  default:
    levelColor = chalk.bold.white(level.toUpperCase());
  }
  // Timestamp
  const ts = chalk.gray(typeof timestamp === 'string' && timestamp ? `[${timestamp}]` : '');
  // Message principal
  const mainMsg = chalk.bold.white(message);
  // Contexte/meta
  let context = '';
  if (Object.keys(meta ?? {}).length > 0) {
    // Masquage infos sensibles
    const safeMeta = JSON.parse(JSON.stringify(meta));
    if (typeof safeMeta.url === 'string') {
      safeMeta.url = safeMeta.url.replace(/(mongodb:\/\/)(.*):(.*)@/, '$1****:****@');
    }
    if (Object.prototype.hasOwnProperty.call(safeMeta, 'token')) safeMeta.token = '****';
    if (Object.prototype.hasOwnProperty.call(safeMeta, 'GH_TOKEN')) safeMeta.GH_TOKEN = '****';
    if (Object.prototype.hasOwnProperty.call(safeMeta, 'OPENAI_API_KEY')) safeMeta.OPENAI_API_KEY = '****';
    context = `\n${chalk.dim(JSON.stringify(safeMeta, null, 2))}`;
  }
  return `${ts} ${levelColor} ${mainMsg}${context}`;
});

// Configuration des transports
const transports: winston.transport[] = [
  // Console pour développement
  new winston.transports.Console({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      customConsoleFormat,
    ),
  }),

  // Fichier pour tous les logs
  new winston.transports.File({
    filename: path.join(logsDir, 'app.log'),
    level: 'info',
    format: logFormat,
    maxsize: 10485760, // 10MB
    maxFiles: 5,
    tailable: true,
  }),

  // Fichier pour les erreurs uniquement
  new winston.transports.File({
    filename: path.join(logsDir, 'error.log'),
    level: 'error',
    format: logFormat,
    maxsize: 10485760, // 10MB
    maxFiles: 5,
    tailable: true,
  }),
];

// Création du logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL ?? 'info',
  format: logFormat,
  transports,
  exitOnError: false,
});

// Gestion des exceptions non catchées
logger.exceptions.handle(
  new winston.transports.File({
    filename: path.join(logsDir, 'exceptions.log'),
    format: logFormat,
  }),
);

// Gestion des rejections de promesses
logger.rejections.handle(
  new winston.transports.File({
    filename: path.join(logsDir, 'rejections.log'),
    format: logFormat,
  }),
);

// Interface pour typage strict
export interface LogMeta {
  [key: string]: unknown;
}

// Méthodes utilitaires
export const logWithContext = {
  /**
   * Log d'une requête API entrante
   */
  apiRequest: (
    method: string,
    url: string,
    ip: string,
    meta?: LogMeta,
  ): void => {
    logger.info('API Request', {
      type: 'api_request',
      method,
      url,
      ip,
      ...meta,
    });
  },

  /**
   * Log d'une réponse API
   */
  apiResponse: (
    method: string,
    url: string,
    statusCode: number,
    responseTime: number,
    meta?: LogMeta,
  ): void => {
    const level = statusCode >= 400 ? 'warn' : 'info';
    logger.log(level, 'API Response', {
      type: 'api_response',
      method,
      url,
      statusCode,
      responseTime: `${responseTime}ms`,
      ...meta,
    });
  },

  /**
   * Log d'une requête GitHub API
   */
  githubRequest: (
    endpoint: string,
    type: 'graphql' | 'rest',
    meta?: LogMeta,
  ): void => {
    logger.debug('GitHub API Request', {
      type: 'github_request',
      endpoint,
      apiType: type,
      ...meta,
    });
  },

  /**
   * Log d'une opération base de données
   */
  database: (operation: string, collection: string, meta?: LogMeta): void => {
    logger.debug('Database Operation', {
      type: 'database',
      operation,
      collection,
      ...meta,
    });
  },

  /**
   * Log d'une analyse IA
   */
  aiAnalysis: (
    analysisType: string,
    status: 'start' | 'success' | 'error',
    meta?: LogMeta,
  ): void => {
    const level = status === 'error' ? 'error' : 'info';
    logger.log(level, 'AI Analysis', {
      type: 'ai_analysis',
      analysisType,
      status,
      ...meta,
    });
  },

  /**
   * Log d'authentification
   */
  auth: (
    action: string,
    username: string,
    success: boolean,
    meta?: LogMeta,
  ): void => {
    const level = success ? 'info' : 'warn';
    logger.log(level, 'Authentication', {
      type: 'auth',
      action,
      username,
      success,
      ...meta,
    });
  },

  /**
   * Log de performance
   */
  performance: (operation: string, duration: number, meta?: LogMeta): void => {
    const level = duration > 5000 ? 'warn' : 'info'; // Warn si > 5s
    logger.log(level, 'Performance', {
      type: 'performance',
      operation,
      duration: `${duration}ms`,
      ...meta,
    });
  },

  /**
   * Log d'API générique
   */
  api: (
    action: string,
    endpoint: string,
    success: boolean,
    meta?: LogMeta,
  ): void => {
    const level = success ? 'info' : 'warn';
    logger.log(level, 'API Action', {
      type: 'api_action',
      action,
      endpoint,
      success,
      ...meta,
    });
  },

  /**
   * Log de sécurité
   */
  security: (
    event: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    meta?: LogMeta,
  ): void => {
    const level =
      severity === 'critical' ? 'error' : severity === 'high' ? 'warn' : 'info';
    logger.log(level, 'Security Event', {
      type: 'security',
      event,
      severity,
      ...meta,
    });
  },
};

export default logger;
