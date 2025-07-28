export const DATABASE_CONFIG = {
  MAX_POOL_SIZE: 10,
  SERVER_SELECTION_TIMEOUT_MS: 5000,
  SOCKET_TIMEOUT_MS: 45000,
  MONGOOSE_READY_STATE: 1,
  DEFAULT_HEALTH_STATUS: false,
} as const;

export const MASKING_VALUE = '***';

export const DATABASE_PROVIDERS = ['Prisma', 'Mongoose'] as const;

export const ENVIRONMENT_VALUES = {
  TEST: 'test',
} as const;

export const EMPTY_STRING = '';

export const APP_CONSTANTS = {
  ENV: {
    OPENAI_API_KEY: 'OPENAI_API_KEY',
  },
  DEFAULTS: {
    EMPTY_STRING: '',
  },
} as const;

/**
 * Application constants for AI Controller
 */

export const AI_TIME_CONSTANTS = {
  STALE_THRESHOLD_MS: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  HOUR_MS: 60 * 60 * 1000, // 1 hour in milliseconds
  // Time calculations for AI Analysis statistics
  DAY_MS: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  WEEK_MS: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  MONTH_MS: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
} as const;

export const AI_LIMITS = {
  MAX_REPOSITORIES_DISPLAY: 5,
  MAX_INSIGHTS_DISPLAY: 3,
  // Precision for score rounding
  SCORE_ROUNDING_PRECISION: 100,
} as const;

// Refresh Controller Constants
export const REFRESH_STEPS = {
  USERS: 'users',
  REPOSITORIES: 'repositories',
  AI: 'ai',
} as const;

export const REFRESH_LOG_IDS = {
  USER_DATA_START: 'refresh_user_data_start',
  STEP_USERS_START: 'refresh_step_users_start',
  STEP_USERS_SUCCESS: 'refresh_step_users_success',
  STEP_REPOSITORIES_START: 'refresh_step_repositories_start',
  STEP_REPOSITORIES_SUCCESS: 'refresh_step_repositories_success',
  STEP_REPOSITORIES_ORG_ERROR: 'refresh_step_repositories_org_error',
  STEP_REPOSITORIES_ENRICH_ERROR: 'refresh_step_repositories_enrich_error',
  STEP_AI_START: 'refresh_step_ai_start',
  STEP_AI_SUCCESS: 'refresh_step_ai_success',
  USER_DATA_SUCCESS: 'refresh_user_data_success',
  USER_DATA_FAILURE: 'refresh_user_data_failure',
} as const;

export const REFRESH_DEFAULTS = {
  COMPLETED_STEPS: 0,
  UNKNOWN_STEP: 'unknown',
} as const;

/**
 * Documentation application constants
 */
export const DOCUMENTATION_CONSTANTS = {
  OPENAPI_FILE: 'openapi.yaml',
  OPENAPI_VERSION: '3.1.0',
  API_TITLE: 'GitHub Insight Engine API',
  API_VERSION: '0.1.0',
  ERROR_LOADING_DESCRIPTION: 'Error loading complete specification',
  API_DESCRIPTION: 'API REST for deep analysis of GitHub data with AI insights',
  ERROR_SPECIFICATION_DESCRIPTION: 'Error loading specification',
  SWAGGER_TITLE: 'GitHub Insight Engine API - Swagger UI',
  DEVELOPMENT_ENV: 'development',
  HEALTH_STATUS: 'healthy',
  UNKNOWN_VALUE: 'Unknown',
  UTF8_ENCODING: 'utf8',
  JSON_CONTENT_TYPE: 'application/json',
  YAML_CONTENT_TYPE: 'application/x-yaml',
  CORS_ALLOW_ORIGIN: '*',
  CONTENT_TYPE_HEADER: 'Content-Type',
  CORS_HEADER: 'Access-Control-Allow-Origin',
} as const;

// Rate Limiting Default Values
export const DEFAULT_RATE_LIMIT_WINDOW_MS = '900000';
export const DEFAULT_RATE_LIMIT_MAX_REQUESTS = '100';

// Auth Rate Limiting Configuration
export const AUTH_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
export const AUTH_RATE_LIMIT_MAX_REQUESTS = 5;

// Analysis Rate Limiting Configuration
export const ANALYSIS_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
export const ANALYSIS_RATE_LIMIT_MAX_REQUESTS = 10;

// GitHub Service Constants
export const GITHUB_SERVICE_CONSTANTS = {
  DESCRIPTION_MAX_LENGTH: 500,
  DESCRIPTION_REPLACEMENT_CHAR: ' ',
  DESCRIPTION_TRIM_REGEX: /[\r\n\t]/g,
} as const;

// Scheduling Service Constants
export const SCHEDULING_DEFAULTS = {
  FREQUENCY: 'weekly' as const,
  TIME: '02:00',
  TIMEZONE: 'Europe/Paris',
  PORT: '3000',
} as const;

export const SCHEDULING_TIMEOUTS = {
  AUTH_TOKEN_REQUEST: 30000, // 30 seconds
  REFRESH_OPERATION: 600000, // 10 minutes
} as const;

export const SCHEDULING_CALCULATIONS = {
  TOKEN_EXPIRY_HOURS: 24,
  DAYS_IN_WEEK: 7,
  FIRST_DAY_OF_MONTH: 1,
} as const;

export const SCHEDULING_CRON_PATTERNS = {
  DAILY: '* * *',
  WEEKLY: '* * 0',
  MONTHLY: '1 * *',
} as const;

export const SCHEDULING_MASK = {
  HIDDEN_TOKEN: '***hidden***',
} as const;

/**
 * Logger constants
 */
export const LOGGER_CONSTANTS = {
  DIRECTORIES: {
    LOGS: 'logs',
  },
  TIMESTAMP_FORMAT: 'YYYY-MM-DD HH:mm:ss',
  LEVELS: {
    ERROR: 'error',
    WARN: 'warn',
    INFO: 'info',
    DEBUG: 'debug',
  },
  ENVIRONMENTS: {
    PRODUCTION: 'production',
  },
  FILES: {
    APP_LOG: 'app.log',
    ERROR_LOG: 'error.log',
    EXCEPTIONS_LOG: 'exceptions.log',
    REJECTIONS_LOG: 'rejections.log',
  },
  SIZES: {
    MAX_FILE_SIZE_BYTES: 10485760, // 10MB
    MAX_FILES: 5,
  },
  MASKING: {
    VALUE: '****',
    MONGODB_PATTERN: /(mongodb:\/\/)(.*):(.*)@/,
    MONGODB_REPLACEMENT: '$1****:****@',
  },
  SENSITIVE_PROPERTIES: {
    TOKEN: 'token',
    GH_TOKEN: 'GH_TOKEN',
    OPENAI_API_KEY: 'OPENAI_API_KEY',
    URL: 'url',
  },
  PERFORMANCE: {
    WARN_THRESHOLD_MS: 5000,
  },
  FORMATTING: {
    JSON_INDENT: 2,
    TIME_UNIT: 'ms',
  },
} as const;

export const LOG_MESSAGES = {
  API_REQUEST: 'API Request',
  API_RESPONSE: 'API Response',
  GITHUB_API_REQUEST: 'GitHub API Request',
  DATABASE_OPERATION: 'Database Operation',
  AI_ANALYSIS: 'AI Analysis',
  AUTHENTICATION: 'Authentication',
  PERFORMANCE: 'Performance',
  API_ACTION: 'API Action',
  SECURITY_EVENT: 'Security Event',
} as const;

export const LOG_TYPES = {
  API_REQUEST: 'api_request',
  API_RESPONSE: 'api_response',
  GITHUB_REQUEST: 'github_request',
  DATABASE: 'database',
  AI_ANALYSIS: 'ai_analysis',
  AUTH: 'auth',
  PERFORMANCE: 'performance',
  API_ACTION: 'api_action',
  SECURITY: 'security',
} as const;

export const LOG_STATUSES = {
  START: 'start',
  SUCCESS: 'success',
  ERROR: 'error',
} as const;

export const LOG_SEVERITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;

export const LOG_API_TYPES = {
  GRAPHQL: 'graphql',
  REST: 'rest',
} as const;

// Application initialization constants
export const APP_INITIALIZATION = {
  REDIRECT_STATUS_CODE: 301,
  DEFAULT_ENVIRONMENT: 'development',
  ENVIRONMENT_KEY: 'env',
} as const;

// Browser detection constants
export const BROWSER_DETECTION = {
  HEADERS: {
    USER_AGENT: 'User-Agent',
    ACCEPT: 'Accept',
  },
  CONTENT_TYPES: {
    HTML: 'text/html',
  },
  USER_AGENTS: {
    MOZILLA: 'Mozilla',
    CHROME: 'Chrome',
    SAFARI: 'Safari',
    FIREFOX: 'Firefox',
    EDGE: 'Edge',
  },
} as const;

// Route constants
export const ROUTES = {
  API_PREFIX: '/api/',
  DOCS_PREFIX: '/docs/',
  ROOT: '/',
} as const;

// External URLs
export const EXTERNAL_URLS = {
  GITHUB_REPOSITORY: 'https://github.com/usernamap/gh-insight-engine',
} as const;

// Server Configuration Constants
export const SERVER_CONFIG = {
  DEFAULT_PORT: 3000,
  DEFAULT_HOST: '0.0.0.0',
  DEFAULT_PORT_STRING: '3000',
  TIMEOUT_MS: 30000,
  KEEP_ALIVE_TIMEOUT_MS: 65000,
  HEADERS_TIMEOUT_MS: 66000,
  GRACEFUL_SHUTDOWN_TIMEOUT_MS: 30000,
} as const;

export const SERVER_ERROR_CODES = {
  EACCES: 'EACCES',
  EADDRINUSE: 'EADDRINUSE',
} as const;

export const SERVER_SYSCALLS = {
  LISTEN: 'listen',
} as const;

export const SERVER_SIGNALS = {
  SIGTERM: 'SIGTERM',
  SIGINT: 'SIGINT',
} as const;

export const SERVER_EXIT_CODES = {
  SUCCESS: 0,
  ERROR: 1,
} as const;

export const SERVER_MESSAGE_TEMPLATES = {
  PIPE_BIND: (port: string | number) => `Pipe ${port}`,
  PORT_BIND: (port: string | number) => `Port ${port}`,
  PIPE_ADDRESS: (addr: string) => `pipe ${addr}`,
  PORT_ADDRESS: (port: number) => `port ${port}`,
  SIGNAL_RECEIVED: (signal: string) => `Signal ${signal} received, shutting down server...`,
  ELEVATED_PRIVILEGES: (bind: string) => `${bind} requires elevated privileges`,
  ALREADY_IN_USE: (bind: string) => `${bind} is already in use`,
} as const;

export const SERVER_ENDPOINTS = {
  API: (host: string, port: number) => `http://${host}:${port}/api`,
  HEALTH: (host: string, port: number) => `http://${host}:${port}/api/health`,
  DOCS: (host: string, port: number) => `http://${host}:${port}/`,
} as const;
