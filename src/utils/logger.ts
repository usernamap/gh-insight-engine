import path from 'path';
import winston from 'winston';
import chalk from 'chalk';
import {
  LOGGER_CONSTANTS,
  LOG_MESSAGES,
  LOG_TYPES,
  LOG_STATUSES,
  LOG_SEVERITIES,
  LOG_API_TYPES,
} from '@/constants';

const logsDir = path.join(process.cwd(), LOGGER_CONSTANTS.DIRECTORIES.LOGS);

const IGNORED_ERRORS = [
  'Secret scanning is disabled on this repository',
  'Upgrade to GitHub Pro or make this repository public to enable this feature',
  'Code Security must be enabled for this repository',
  'Dependabot alerts are disabled for this repository',
  'Not Found - https://docs.github.com/rest/secret-scanning',
  'Must have push access to repository',
  'Git Repository is empty',
  'Code scanning is not enabled for this repository',
  'no analysis found',
  'Branch not protected',
  'Not Found - https://docs.github.com/rest/branches/branch-protection',
];

const downgradeErrorToWarn = winston.format((info) => {
  if (info.level !== 'error') return info;

  const isFalsePositive = IGNORED_ERRORS.some((str) => {
    if (typeof info.message === 'string' && info.message.includes(str)) return true;
    if (typeof info.error === 'string' && info.error.includes(str)) return true;
    if (
      typeof info.error === 'object' &&
      info.error !== null &&
      'message' in info.error
    ) {
      const err = info.error as { message: unknown };
      if (typeof err.message === 'string' && err.message.includes(str)) return true;
    }
    if (typeof info['error'] === 'string' && info['error'].includes(str)) return true;

    return false;
  });

  if (isFalsePositive) {
    info.level = 'warn';
    // Essential for Winston to respect the level change in transports
    info[Symbol.for('level')] = 'warn';
  }

  return info;
});

const logFormat = winston.format.combine(
  downgradeErrorToWarn(),
  winston.format.timestamp({ format: LOGGER_CONSTANTS.TIMESTAMP_FORMAT }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const customConsoleFormat = winston.format.printf(({ timestamp, level, message, ...meta }) => {
  let levelColor = level;
  switch (level) {
    case LOGGER_CONSTANTS.LEVELS.ERROR:
      levelColor = chalk.bold.red(level.toUpperCase());
      break;
    case LOGGER_CONSTANTS.LEVELS.WARN:
      levelColor = chalk.bold.yellow(level.toUpperCase());
      break;
    case LOGGER_CONSTANTS.LEVELS.INFO:
      levelColor = chalk.bold.green(level.toUpperCase());
      break;
    case LOGGER_CONSTANTS.LEVELS.DEBUG:
      levelColor = chalk.bold.cyan(level.toUpperCase());
      break;
    default:
      levelColor = chalk.bold.white(level.toUpperCase());
  }
  const ts = chalk.gray(typeof timestamp === 'string' && timestamp ? `[${timestamp}]` : '');
  const mainMsg = chalk.bold.white(message);
  let context = '';
  if (Object.keys(meta ?? {}).length > 0) {
    const safeMeta = JSON.parse(JSON.stringify(meta));
    if (typeof safeMeta.url === 'string') {
      safeMeta.url = safeMeta.url.replace(
        LOGGER_CONSTANTS.MASKING.MONGODB_PATTERN,
        LOGGER_CONSTANTS.MASKING.MONGODB_REPLACEMENT
      );
    }
    if (
      Object.prototype.hasOwnProperty.call(safeMeta, LOGGER_CONSTANTS.SENSITIVE_PROPERTIES.TOKEN)
    ) {
      safeMeta[LOGGER_CONSTANTS.SENSITIVE_PROPERTIES.TOKEN] = LOGGER_CONSTANTS.MASKING.VALUE;
    }
    if (
      Object.prototype.hasOwnProperty.call(safeMeta, LOGGER_CONSTANTS.SENSITIVE_PROPERTIES.GH_TOKEN)
    ) {
      safeMeta[LOGGER_CONSTANTS.SENSITIVE_PROPERTIES.GH_TOKEN] = LOGGER_CONSTANTS.MASKING.VALUE;
    }
    if (
      Object.prototype.hasOwnProperty.call(
        safeMeta,
        LOGGER_CONSTANTS.SENSITIVE_PROPERTIES.OPENAI_API_KEY
      )
    ) {
      safeMeta[LOGGER_CONSTANTS.SENSITIVE_PROPERTIES.OPENAI_API_KEY] =
        LOGGER_CONSTANTS.MASKING.VALUE;
    }
    context = `\n${chalk.dim(JSON.stringify(safeMeta, null, LOGGER_CONSTANTS.FORMATTING.JSON_INDENT))}`;
  }
  return `${ts} ${levelColor} ${mainMsg}${context}`;
});

const transports: winston.transport[] = [
  new winston.transports.Console({
    level:
      process.env.NODE_ENV === LOGGER_CONSTANTS.ENVIRONMENTS.PRODUCTION
        ? LOGGER_CONSTANTS.LEVELS.INFO
        : LOGGER_CONSTANTS.LEVELS.DEBUG,
    format: winston.format.combine(
      winston.format.timestamp({ format: LOGGER_CONSTANTS.TIMESTAMP_FORMAT }),
      customConsoleFormat
    ),
  }),

  new winston.transports.File({
    filename: path.join(logsDir, LOGGER_CONSTANTS.FILES.APP_LOG),
    level: LOGGER_CONSTANTS.LEVELS.INFO,
    format: logFormat,
    maxsize: LOGGER_CONSTANTS.SIZES.MAX_FILE_SIZE_BYTES,
    maxFiles: LOGGER_CONSTANTS.SIZES.MAX_FILES,
    tailable: true,
  }),

  new winston.transports.File({
    filename: path.join(logsDir, LOGGER_CONSTANTS.FILES.ERROR_LOG),
    level: LOGGER_CONSTANTS.LEVELS.ERROR,
    format: logFormat,
    maxsize: LOGGER_CONSTANTS.SIZES.MAX_FILE_SIZE_BYTES,
    maxFiles: LOGGER_CONSTANTS.SIZES.MAX_FILES,
    tailable: true,
  }),
];

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL ?? LOGGER_CONSTANTS.LEVELS.INFO,
  format: logFormat,
  transports,
  exitOnError: false,
});

logger.exceptions.handle(
  new winston.transports.File({
    filename: path.join(logsDir, LOGGER_CONSTANTS.FILES.EXCEPTIONS_LOG),
    format: logFormat,
  })
);

logger.rejections.handle(
  new winston.transports.File({
    filename: path.join(logsDir, LOGGER_CONSTANTS.FILES.REJECTIONS_LOG),
    format: logFormat,
  })
);

export interface LogMeta {
  [key: string]: unknown;
}

export const logWithContext = {
  apiRequest: (method: string, url: string, ip: string, meta?: LogMeta): void => {
    logger.info(LOG_MESSAGES.API_REQUEST, {
      type: LOG_TYPES.API_REQUEST,
      method,
      url,
      ip,
      ...meta,
    });
  },

  apiResponse: (
    method: string,
    url: string,
    statusCode: number,
    responseTime: number,
    meta?: LogMeta
  ): void => {
    const level = statusCode >= 400 ? LOGGER_CONSTANTS.LEVELS.WARN : LOGGER_CONSTANTS.LEVELS.INFO;
    logger.log(level, LOG_MESSAGES.API_RESPONSE, {
      type: LOG_TYPES.API_RESPONSE,
      method,
      url,
      statusCode,
      responseTime: `${responseTime}${LOGGER_CONSTANTS.FORMATTING.TIME_UNIT}`,
      ...meta,
    });
  },

  githubRequest: (
    endpoint: string,
    type: typeof LOG_API_TYPES.GRAPHQL | typeof LOG_API_TYPES.REST,
    meta?: LogMeta
  ): void => {
    logger.debug(LOG_MESSAGES.GITHUB_API_REQUEST, {
      type: LOG_TYPES.GITHUB_REQUEST,
      endpoint,
      apiType: type,
      ...meta,
    });
  },

  database: (operation: string, collection: string, meta?: LogMeta): void => {
    logger.debug(LOG_MESSAGES.DATABASE_OPERATION, {
      type: LOG_TYPES.DATABASE,
      operation,
      collection,
      ...meta,
    });
  },

  aiAnalysis: (
    analysisType: string,
    status: typeof LOG_STATUSES.START | typeof LOG_STATUSES.SUCCESS | typeof LOG_STATUSES.ERROR,
    meta?: LogMeta
  ): void => {
    const level =
      status === LOG_STATUSES.ERROR ? LOGGER_CONSTANTS.LEVELS.ERROR : LOGGER_CONSTANTS.LEVELS.INFO;
    logger.log(level, LOG_MESSAGES.AI_ANALYSIS, {
      type: LOG_TYPES.AI_ANALYSIS,
      analysisType,
      status,
      ...meta,
    });
  },

  auth: (action: string, username: string, success: boolean, meta?: LogMeta): void => {
    const level = success ? LOGGER_CONSTANTS.LEVELS.INFO : LOGGER_CONSTANTS.LEVELS.WARN;
    logger.log(level, LOG_MESSAGES.AUTHENTICATION, {
      type: LOG_TYPES.AUTH,
      action,
      username,
      success,
      ...meta,
    });
  },

  performance: (operation: string, duration: number, meta?: LogMeta): void => {
    const level =
      duration > LOGGER_CONSTANTS.PERFORMANCE.WARN_THRESHOLD_MS
        ? LOGGER_CONSTANTS.LEVELS.WARN
        : LOGGER_CONSTANTS.LEVELS.INFO;
    logger.log(level, LOG_MESSAGES.PERFORMANCE, {
      type: LOG_TYPES.PERFORMANCE,
      operation,
      duration: `${duration}${LOGGER_CONSTANTS.FORMATTING.TIME_UNIT}`,
      ...meta,
    });
  },

  api: (action: string, endpoint: string, success: boolean, meta?: LogMeta): void => {
    const level = success ? LOGGER_CONSTANTS.LEVELS.INFO : LOGGER_CONSTANTS.LEVELS.WARN;
    logger.log(level, LOG_MESSAGES.API_ACTION, {
      type: LOG_TYPES.API_ACTION,
      action,
      endpoint,
      success,
      ...meta,
    });
  },

  security: (
    event: string,
    severity:
      | typeof LOG_SEVERITIES.LOW
      | typeof LOG_SEVERITIES.MEDIUM
      | typeof LOG_SEVERITIES.HIGH
      | typeof LOG_SEVERITIES.CRITICAL,
    meta?: LogMeta
  ): void => {
    const level =
      severity === LOG_SEVERITIES.CRITICAL
        ? LOGGER_CONSTANTS.LEVELS.ERROR
        : severity === LOG_SEVERITIES.HIGH
          ? LOGGER_CONSTANTS.LEVELS.WARN
          : LOGGER_CONSTANTS.LEVELS.INFO;
    logger.log(level, LOG_MESSAGES.SECURITY_EVENT, {
      type: LOG_TYPES.SECURITY,
      event,
      severity,
      ...meta,
    });
  },
};

export default logger;
