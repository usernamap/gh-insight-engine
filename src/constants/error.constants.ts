export const DATABASE_ERROR_MESSAGES = {
  DATABASE_URL_NOT_DEFINED: 'DATABASE_URL not defined in environment variables',
  DATABASE_CONNECTION_FAILED: 'Database connection failed: ',
  DATABASE_INITIALIZATION_FAILED: 'Database initialization failed',
  PRISMA_CLIENT_NOT_INITIALIZED: 'Prisma client not initialized',
  ERROR_CREATING_INDEXES: 'Error creating indexes',
  ERROR_CLOSING_CONNECTIONS: 'Error closing connections',
  DATA_CLEANUP_TEST_MODE_ONLY: 'Data cleanup allowed only in test mode',
  ERROR_CLEANING_TEST_DATA: 'Error cleaning test data',
  FIND_MANY_OPERATION_FAILED: 'Find many operation failed',
  FIND_UNIQUE_OPERATION_FAILED: 'Find unique operation failed',
  CREATE_OPERATION_FAILED: 'Create operation failed',
  UPDATE_OPERATION_FAILED: 'Update operation failed',
  DELETE_OPERATION_FAILED: 'Delete operation failed',
  INVALID_URL: 'Invalid URL',
} as const;

export const HEALTH_CHECK_ERROR_MESSAGES = {
  PRISMA_FAILED: 'Health check Prisma failed',
  MONGOOSE_FAILED: 'Health check Mongoose failed',
} as const;

// Error Constants
export const ERROR_CONSTANTS = {
  // Network Error Messages
  NETWORK_ERRORS: {
    TIMEOUT: 'timeout',
    ECONNRESET: 'ECONNRESET',
    ENOTFOUND: 'ENOTFOUND',
    CONNECT_TIMEOUT_ERROR: 'Connect Timeout Error',
    ECONNREFUSED: 'ECONNREFUSED',
  },
} as const;

/**
 * Error constants for AI Controller
 */

export const AI_HTTP_STATUS = {
  CREATED: 201,
  OK: 200,
} as const;

export const AI_ERROR_PATTERNS = {
  OPENAI_SERVICE_UNAVAILABLE: 'OpenAI service not available',
  NOT_FOUND: 'not found',
  NO_ANALYSIS_FOUND: 'No AI analysis found',
} as const;

// Messages d'erreur réseau
export const NETWORK_ERROR_MESSAGES = {
  TIMEOUT: 'timeout',
  ECONNRESET: 'ECONNRESET',
  CONNECT_TIMEOUT_ERROR: 'Connect Timeout Error',
} as const;

// Codes de statut HTTP
export const HTTP_STATUS_CODES = {
  OK: 200,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
} as const;

// Refresh Controller Status Codes
export const REFRESH_STATUS_CODES = {
  SUCCESS: 200,
  PARTIAL_SUCCESS: 207,
  INTERNAL_ERROR: 500,
  ACCEPTED: 202,
} as const;

// Repository Controller Status Codes
export const REPO_STATUS_CODES = {
  CREATED: 201,
  OK: 200,
  ACCEPTED: 202,
} as const;

/**
 * Documentation error constants
 */
export const DOCUMENTATION_ERROR_CODES = {
  INTERNAL_SERVER_ERROR: 500,
} as const;

// Error Handler Constants
export const ERROR_HANDLER_STATUS_CODES = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
} as const;

export const ERROR_HANDLER_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR: 'NOT_FOUND_ERROR',
  CONFLICT_ERROR: 'CONFLICT_ERROR',
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export const ERROR_HANDLER_MESSAGES = {
  UNAUTHENTICATED: 'Unauthenticated',
  ACCESS_DENIED: 'Access denied',
  DEFAULT_RESOURCE: 'Resource',
  TOO_MANY_REQUESTS: 'Too many requests',
  DATA_VALIDATION_ERROR: 'Data validation error',
  UNIQUE_CONSTRAINT_VIOLATION: 'Unique constraint violation: ',
  FIELD_FALLBACK: 'field',
  RECORD_NOT_FOUND: 'Record',
  FOREIGN_KEY_CONSTRAINT_VIOLATION: 'Foreign key constraint violation',
  QUERY_PARAMETER_ERROR: 'Query parameter error',
  PRISMA_VALIDATION_ERROR: 'Prisma validation error',
  MONGODB_VALIDATION_ERROR: 'MongoDB validation error',
  INVALID_DATA_FORMAT: 'Invalid data format',
  EXTERNAL_REQUEST_ERROR: 'External request error',
  EXTERNAL_SERVICE: 'External service',
  EXTERNAL_SERVICE_ERROR_PREFIX: 'External service error: ',
  DATABASE_ERROR_PREFIX: 'Database error: ',
  UNEXPECTED_ERROR: 'An unexpected error occurred',
  UNKNOWN_ERROR_NAME: 'UnknownError',
  CRITICAL_SERVER_ERROR: 'Critical server error',
  CLIENT_ERROR: 'Client error',
  HANDLED_ERROR: 'Handled error',
  ERROR_HANDLED_LOG: 'error_handled',
  SUPPORT_MESSAGE: 'If the problem persists, please contact support with this error ID',
  ENDPOINT_NOT_FOUND: 'Endpoint',
  ENDPOINT_NOT_FOUND_LOG: 'endpoint_not_found',
  UNCAUGHT_EXCEPTION: 'Uncaught exception',
  UNHANDLED_PROMISE_REJECTION: 'Unhandled promise rejection',
  SIGNAL_RECEIVED_SHUTDOWN: 'Signal ',
  SIGNAL_SHUTDOWN_SUFFIX: ' received, shutting down...',
  SIGTERM: 'SIGTERM',
  SIGINT: 'SIGINT',
} as const;

export const PRISMA_ERROR_CODES = {
  UNIQUE_CONSTRAINT_VIOLATION: 'P2002',
  RECORD_NOT_FOUND: 'P2025',
  FOREIGN_KEY_CONSTRAINT_VIOLATION: 'P2003',
  QUERY_PARAMETER_ERROR: 'P2016',
} as const;

export const MONGOOSE_ERROR_NAMES = {
  VALIDATION_ERROR: 'ValidationError',
  CAST_ERROR: 'CastError',
} as const;

export const ERROR_HANDLER_UTILS = {
  ERROR_ID_BASE: 36,
  ERROR_ID_START: 2,
  ERROR_ID_LENGTH: 9,
  DEFAULT_STATUS_CODE: 500,
  CLIENT_ERROR_MIN: 400,
  CLIENT_ERROR_MAX: 500,
  SERVER_ERROR_MIN: 500,
  REDACTED_VALUE: '[REDACTED]',
  RETRY_AFTER_HEADER: 'Retry-After',
} as const;

// Rate Limiting Status Codes
export const RATE_LIMIT_STATUS_CODE = 429;

// Rate Limiting Retry After Values (seconds)
export const AUTH_RATE_LIMIT_RETRY_AFTER_SECONDS = 900;
export const ANALYSIS_RATE_LIMIT_RETRY_AFTER_SECONDS = 3600;

// Validation Error Constants
export const VALIDATION_ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  SANITIZATION_ERROR: 'SANITIZATION_ERROR',
} as const;

export const VALIDATION_ERROR_MESSAGES = {
  DATA_FORMAT_MISMATCH: 'The provided data does not match the expected format',
  SANITIZATION_ERROR: 'Error during data sanitization',
  UNEXPECTED_PROCESSING_ERROR: 'An unexpected error occurred while processing your request',
  UNKNOWN_SANITIZATION_ERROR: 'Unknown sanitization error',
} as const;

export const VALIDATION_STATUS_CODES = {
  BAD_REQUEST: 400,
  INTERNAL_SERVER_ERROR: 500,
} as const;

// Repository Model Error Messages
export const REPOSITORY_ERROR_MESSAGES = {
  DATABASE_NOT_INITIALIZED: 'Database not initialized',
  CREATION_FAILED: 'Creation repository failed: ',
  UPDATE_FAILED: 'Update repository failed: ',
  DELETION_FAILED: 'Deletion repository failed: ',
  UPSERT_FAILED: 'Upsert repository failed: ',
  DELETION_BY_USER_FAILED: 'Deletion repositories by user failed: ',
} as const;

// User Model Error Messages
export const USER_ERROR_MESSAGES = {
  DATABASE_NOT_INITIALIZED: 'Database not initialized',
  DELETION_FAILED: 'User deletion failed: ',
  CASCADE_DELETION_FAILED: 'User cascade deletion failed: ',
} as const;

// AI Analysis Error Messages
export const AI_ANALYSIS_ERROR_MESSAGES = {
  OPENAI_SERVICE_UNAVAILABLE: 'OpenAI service not available. Please check OPENAI_API_KEY.',
  USER_NOT_FOUND: (username: string) => `User ${username} not found`,
  NO_REPOSITORY_FOUND: (username: string) => `No repository found for ${username}`,
  OPENAI_CLIENT_NOT_AVAILABLE: 'OpenAI client not available',
  EMPTY_OPENAI_RESPONSE: 'Empty response from OpenAI',
} as const;

// GitHub Service Error Messages
export const GITHUB_SERVICE_ERROR_MESSAGES = {
  ORGANIZATION_RETRIEVAL_FAILED: 'Organization retrieval failed: ',
  PROFILE_RETRIEVAL_FAILED: 'Profile retrieval failed: ',
  REPOSITORY_RETRIEVAL_FAILED: 'Repository retrieval failed: ',
  ORG_REPOSITORY_RETRIEVAL_FAILED: 'Organization repository retrieval failed: ',
  SECURITY_RETRIEVAL_FAILED: 'Security retrieval failed: ',
  PACKAGE_RETRIEVAL_FAILED: 'Package retrieval failed: ',
  BRANCH_PROTECTION_RETRIEVAL_FAILED: 'Branch protection retrieval failed: ',
  COMMUNITY_HEALTH_RETRIEVAL_FAILED: 'Community health retrieval failed: ',
  RATE_LIMIT_EXCEEDED: 'GitHub API rate limit exceeded',
  RATE_LIMIT_EXCEEDED_DETAILED:
    'GitHub API rate limit exceeded. Please try again later or contact GitHub Support if the issue persists.',
  RATE_LIMIT_USER_SPECIFIC: 'GitHub API rate limit exceeded for this user account',
  RATE_LIMIT_SUPPORT_MESSAGE:
    'If you reach out to GitHub Support for help, please include the request ID and timestamp from the error message.',
} as const;

// GitHub Service Log Error Messages
export const GITHUB_SERVICE_LOG_ERROR_MESSAGES = {
  ERROR_RETRIEVING_ORGANIZATIONS: 'Error retrieving organizations',
  ERROR_RETRIEVING_USER_PROFILE_REST_API: 'Error retrieving user profile REST API',
  ERROR_RETRIEVING_USER_REPOSITORIES: 'Error retrieving user repositories',
  ERROR_RETRIEVING_ORG_REPOSITORIES: 'Error retrieving organization repositories',
  ERROR_RETRIEVING_GITHUB_ACTIONS: 'Error retrieving GitHub Actions',
  ERROR_RETRIEVING_SECURITY_DATA: 'Error retrieving security data',
  ERROR_RETRIEVING_PACKAGES: 'Error retrieving packages',
  ERROR_RETRIEVING_BRANCH_PROTECTION: 'Error retrieving branch protection',
  ERROR_RETRIEVING_COMMUNITY_HEALTH: 'Error retrieving community health',
  ERROR_RETRIEVING_TRAFFIC: 'Error retrieving traffic',
  ERROR_DURING_DEVOPS_ENRICHMENT: 'Error during DevOps enrichment',
} as const;

// Scheduling Service Error Messages
export const SCHEDULING_ERROR_MESSAGES = {
  GITHUB_USERNAME_REQUIRED: 'GITHUB_USERNAME is required to enable scheduling',
  GH_TOKEN_REQUIRED: 'GH_TOKEN is required to enable scheduling',
  GITHUB_FULL_NAME_REQUIRED: 'GITHUB_FULL_NAME is required to enable scheduling',
  UNSUPPORTED_FREQUENCY: 'Unsupported frequency: ',
} as const;
