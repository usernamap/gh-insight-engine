// Constantes JWT et tokens
export const JWT_CONSTANTS = {
  TOKEN_TYPE: 'Bearer',
  EXPIRES_IN: '24h',
  BEARER_PREFIX: 'Bearer ',
  BEARER_PREFIX_LENGTH: 7,
  EXPIRES_IN_SECONDS: 24 * 60 * 60, // 24 heures
  OBJECT_ID_REGEX: /^[0-9a-fA-F]{24}$/,
} as const;

// Constantes d'authentification
export const AUTH_CONSTANTS = {
  DEFAULT_PARAM_NAME: 'username',
  REFRESH_INTERVAL_MINUTES: 60,
  REFRESH_INTERVAL_MS: 60 * 1000,
  MINUTES_TO_MS: 60000,
} as const;

// Constantes de rate limiting
export const RATE_LIMIT_HEADERS = {
  LIMIT: 'X-RateLimit-Limit',
  REMAINING: 'X-RateLimit-Remaining',
  RESET: 'X-RateLimit-Reset',
} as const;

// Noms d'erreurs JWT
export const JWT_ERROR_NAMES = {
  JSON_WEB_TOKEN_ERROR: 'JsonWebTokenError',
  TOKEN_EXPIRED_ERROR: 'TokenExpiredError',
} as const;

// Headers HTTP pour error handler
export const ERROR_HANDLER_HEADERS = {
  USER_AGENT: 'User-Agent',
  CONTENT_TYPE: 'content-type',
  ORIGIN: 'origin',
  REFERER: 'referer',
  AUTHORIZATION: 'authorization',
} as const;

// CSP Directives
export const CSP_SELF = "'self'";
export const CSP_UNSAFE_INLINE = "'unsafe-inline'";
export const CSP_DATA = 'data:';
export const CSP_HTTPS = 'https:';

// CSP External Sources
export const CSP_FONTS_GOOGLEAPIS = 'https://fonts.googleapis.com';
export const CSP_FONTS_GSTATIC = 'https://fonts.gstatic.com';
export const CSP_API_GITHUB = 'https://api.github.com';
export const CSP_API_OPENAI = 'https://api.openai.com';

// CORS Development Origins
export const CORS_LOCALHOST = 'localhost';
export const CORS_127_0_0_1 = '127.0.0.1';
export const CORS_NOT_AUTHORIZED_ERROR = 'Not authorized by CORS';

// CORS Methods
export const CORS_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'];

// CORS Allowed Headers
export const CORS_ALLOWED_HEADERS = ['Content-Type', 'Authorization', 'X-Requested-With'];

// Compression
export const COMPRESSION_NO_COMPRESSION_HEADER = 'x-no-compression';
export const COMPRESSION_THRESHOLD = 1024;

// Morgan Logging
export const MORGAN_SKIP_PATHS = ['/health', '/ping'];
export const MORGAN_PRODUCTION_FORMAT = 'combined';
export const MORGAN_DEVELOPMENT_FORMAT = 'dev';

// Rate Limiting Error Codes
export const RATE_LIMIT_EXCEEDED_ERROR = 'RATE_LIMIT_EXCEEDED';
export const AUTH_RATE_LIMIT_EXCEEDED_ERROR = 'AUTH_RATE_LIMIT_EXCEEDED';
export const ANALYSIS_RATE_LIMIT_EXCEEDED_ERROR = 'ANALYSIS_RATE_LIMIT_EXCEEDED';

// Rate Limiting Messages
export const RATE_LIMIT_MESSAGE = 'Too many requests from this IP, please try again later';
export const AUTH_RATE_LIMIT_MESSAGE = 'Too many login attempts, please try again in 15 minutes';
export const ANALYSIS_RATE_LIMIT_MESSAGE = 'Analysis limit reached, please try again in 1 hour';

// App Settings Keys
export const APP_AUTH_LIMITER_KEY = 'authLimiter';
export const APP_ANALYSIS_LIMITER_KEY = 'analysisLimiter';

// Express Configuration
export const EXPRESS_JSON_LIMIT = '10mb';
export const EXPRESS_INVALID_JSON_ERROR = 'Invalid JSON';

// Logger Messages
export const LOGGER_CONFIGURING_MIDDLEWARES = 'Configuring middlewares...';
export const LOGGER_MIDDLEWARES_CONFIGURED = 'Middlewares configured successfully';

// Validation Constants
export const VALIDATION_LIMITS = {
  USERNAME_MIN_LENGTH: 1,
  USERNAME_MAX_LENGTH: 39,
  OWNER_MAX_LENGTH: 39,
  REPO_NAME_MAX_LENGTH: 100,
  FULL_NAME_MAX_LENGTH: 255,
  GITHUB_TOKEN_MIN_LENGTH: 40,
  GITHUB_TOKEN_MAX_LENGTH: 255,
  PAGE_MAX_VALUE: 1000,
  LIMIT_DEFAULT_VALUE: 20,
  LIMIT_MAX_VALUE: 100,
  LANGUAGE_MAX_LENGTH: 50,
  TOPIC_MAX_LENGTH: 35,
  STARS_MAX_VALUE: 1000000,
  FORKS_MAX_VALUE: 100000,
  MAX_AGE_DEFAULT_HOURS: 24,
  MAX_AGE_MAX_HOURS: 168,
  DESCRIPTION_MAX_LENGTH: 1000,
  TAG_MAX_LENGTH: 50,
  TAGS_MAX_COUNT: 20,
} as const;

export const VALIDATION_REGEX = {
  GITHUB_USERNAME: /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i,
  REPOSITORY_NAME: /^[a-zA-Z0-9._-]+$/,
  FULL_NAME: /^[\p{L}\p{M}\p{Zs}.-]+$/u,
  GITHUB_TOKEN: /^gh[pousr]_[A-Za-z0-9_]{36,251}$/,
} as const;

export const VALIDATION_SORT_OPTIONS = [
  'createdAt',
  'updatedAt',
  'stargazerCount',
  'forkCount',
  'pushedAt',
  'name',
] as const;

export const VALIDATION_SORT_ORDERS = ['asc', 'desc'] as const;

export const VALIDATION_DEFAULTS = {
  SORT_BY: 'updatedAt',
  SORT_ORDER: 'desc',
} as const;

export const VALIDATION_ANALYSIS_DEPTH_OPTIONS = ['basic', 'standard', 'detailed'] as const;

export const VALIDATION_BOOLEAN_TRANSFORM = {
  TRUE_VALUE: 'true',
} as const;

export const VALIDATION_HTML_ENTITIES = {
  AMPERSAND: '&amp;',
  LESS_THAN: '&lt;',
  GREATER_THAN: '&gt;',
  QUOTATION_MARK: '&quot;',
  APOSTROPHE: '&#x27;',
  SOLIDUS: '&#x2F;',
} as const;

export const VALIDATION_HTML_CHARS = {
  AMPERSAND: '&',
  LESS_THAN: '<',
  GREATER_THAN: '>',
  QUOTATION_MARK: '"',
  APOSTROPHE: "'",
  SOLIDUS: '/',
} as const;
