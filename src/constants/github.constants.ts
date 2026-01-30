// GitHub API Configuration Constants
export const GITHUB_CONSTANTS = {
  // Required OAuth Scopes
  REQUIRED_SCOPES: [
    'repo',
    'user:email',
    'read:user',
    'read:org',
    'read:packages',
    'security_events',
    'admin:repo_hook',
    'repo:status',
  ] as const,

  // User Agent
  USER_AGENT: 'github-insight-engine/1.0.0',

  // Request Configuration - Direct and fast
  INITIAL_TIMEOUT: 30000, // 30 seconds - direct requests only
  INITIAL_RETRIES: 0, // No retries - direct execution
  INITIAL_RETRY_AFTER: 0,
  VALIDATION_TIMEOUT: 15000, // 15 seconds - fast validation
  VALIDATION_RETRIES: 0, // No retries - direct validation
  DEFAULT_MAX_RETRIES: 0, // No retries anywhere

  // Headers
  OAUTH_SCOPES_HEADER: 'x-oauth-scopes',
  OAUTH_SCOPES_HEADER_ALT: 'X-OAuth-Scopes',
  RATE_LIMIT_RESET_HEADER: 'x-ratelimit-reset',

  // Scope Parsing
  SCOPE_SEPARATOR: ',',
  SCOPE_PREFIX_SEPARATOR: ':',

  // Scope Parents
  USER_SCOPE_PARENT: 'user',
  REPO_SCOPE_PARENT: 'repo',

  // Scope Prefixes
  USER_SCOPE_PREFIX: 'user:',
  REPO_SCOPE_PREFIX: 'repo:',

  // Specific Scopes
  READ_USER_SCOPE: 'read:user',
  READ_ORG_SCOPE: 'read:org',
  READ_PACKAGES_SCOPE: 'read:packages',
  SECURITY_EVENTS_SCOPE: 'security_events',
  REPO_STATUS_SCOPE: 'repo:status',

  // Rate Limiting - Production configuration
  RATE_LIMIT_THRESHOLD: 100, // Reserve 100 requests as buffer
  RATE_LIMIT_STATUS_CODE: 403,
  MAX_CONCURRENT_REQUESTS: 3, // Max simultaneous API calls
  MIN_REQUEST_INTERVAL_MS: 200, // 5 requests/second max
  MAX_RETRIES: 5, // Max retry attempts
  INITIAL_BACKOFF_MS: 1000, // Start at 1 second
  MAX_BACKOFF_MS: 16000, // Cap at 16 seconds
  BACKOFF_MULTIPLIER: 2, // Double each retry
  JITTER_FACTOR: 0.1, // ±10% randomness
  MAX_QUEUE_SIZE: 1000, // Max pending requests

  // Rate Limit Error Messages - Simplified detection
  RATE_LIMIT_ERROR_MESSAGE: 'rate limit',
  API_RATE_LIMIT_ERROR_MESSAGE: 'API rate limit',
  RATE_LIMIT_EXCEEDED_PATTERN: 'rate limit exceeded',
  API_RATE_LIMIT_EXCEEDED_PATTERN: 'API rate limit exceeded',
  RATE_LIMIT_USER_ID_PATTERN: 'rate limit exceeded for user ID',
  GITHUB_RATE_LIMIT_PATTERNS: [
    'rate limit exceeded',
    'API rate limit exceeded',
    'rate limit exceeded for user ID',
    'API rate limit exceeded for user ID',
    'rate limit exceeded for user',
    'API rate limit exceeded for user',
  ] as const,

  // Pagination Limits - Respect GitHub GraphQL API limits
  ORGANIZATIONS_LIMIT: 100, // GitHub GraphQL max limit
  USER_REPOSITORIES_LIMIT: 100, // GitHub GraphQL max limit
  ORG_REPOSITORIES_LIMIT: 100, // GitHub GraphQL max limit
  LANGUAGES_LIMIT: 100, // GitHub GraphQL max limit
  TOPICS_LIMIT: 100, // GitHub GraphQL max limit
  COMMITS_LIMIT: 100, // GitHub GraphQL max limit
  WORKFLOW_RUNS_LIMIT: 100, // GitHub GraphQL max limit
  ORGANIZATIONS_PER_PAGE: 100,

  // Infrastructure Error Handling - Removed for direct execution
  INFRASTRUCTURE_ERROR_CODES: [500, 502, 503, 504] as const,
  INFRASTRUCTURE_ERROR_PATTERNS: [
    'bad gateway',
    'service unavailable',
    'gateway timeout',
    'internal server error',
    '502 bad gateway',
    '503 service unavailable',
    '504 gateway timeout',
    '500 internal server error',
  ] as const,

  // Infrastructure Error Retry Configuration - Disabled
  INFRASTRUCTURE_ERROR_MAX_RETRIES: 0, // No retries
  INFRASTRUCTURE_ERROR_BASE_DELAY: 0, // No delay
  INFRASTRUCTURE_ERROR_MAX_DELAY: 0, // No delay
  INFRASTRUCTURE_ERROR_BACKOFF_MULTIPLIER: 1, // No backoff
  INFRASTRUCTURE_ERROR_JITTER_FACTOR: 0, // No jitter

  // Circuit Breaker Configuration - Disabled
  CIRCUIT_BREAKER_FAILURE_THRESHOLD: 999999, // Effectively disabled
  CIRCUIT_BREAKER_TIMEOUT: 0, // No timeout
  CIRCUIT_BREAKER_SUCCESS_THRESHOLD: 1, // Immediate reset

  // Status Values
  SUCCESS_STATUS: 'success',
  FAILURE_STATUS: 'failure',
  UNKNOWN_STATUS: 'unknown',

  // Alert States
  OPEN_STATE: 'open',
  FIXED_STATE: 'fixed',
  DISMISSED_STATE: 'dismissed',
  RESOLVED_STATE: 'resolved',

  // HTTP Status Codes
  FORBIDDEN_STATUS: 403,
  NOT_FOUND_STATUS: 404,

  // Default Branch
  DEFAULT_BRANCH: 'main',

  // Default Values
  DEFAULT_COUNT: 0,
  DEFAULT_PERCENTAGE: 0,
  DEFAULT_EMPTY_STRING: '',
  DEFAULT_FALSE: false,
  DEFAULT_TRUE: true,
} as const;

// Network Error Constants
export const GITHUB_NETWORK_ERRORS = {
  TIMEOUT: 'timeout',
  ECONNRESET: 'ECONNRESET',
  ENOTFOUND: 'ENOTFOUND',
  CONNECT_TIMEOUT_ERROR: 'Connect Timeout Error',
  ECONNREFUSED: 'ECONNREFUSED',
} as const;

// Scopes GitHub API
export const GITHUB_SCOPES = {
  REPO: 'repo',
  READ_ORG: 'read:org',
  USER: 'user',
} as const;

// Valeurs par défaut pour UserProfile
export const DEFAULT_USER_PROFILE = {
  TYPE: 'User',
  ID: 0,
  EMPTY_STRING: '',
  BOOLEAN_FALSE: false,
  ORGANIZATIONS: {
    TOTAL_COUNT: 0,
    NODES: [],
  },
} as const;

// Repository Controller Constants
export const REPO_CONSTANTS = {
  DEFAULT_LIMIT: Number.MAX_SAFE_INTEGER, // No pagination limit - return ALL repositories
  TOP_LANGUAGES_LIMIT: 10,
  TOP_LANGUAGES_DISPLAY: 5,
  TOP_TOPICS_LIMIT: 15,
  TOP_TOPICS_DISPLAY: 10,
  PERCENTAGE_MULTIPLIER: 100,
  NEXT_COLLECTION_DURATION_MS: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
} as const;

// Repository Model Field Mappings
export const REPOSITORY_FIELD_MAPPINGS = [
  'description',
  'stargazerCount',
  'forkCount',
  'watchersCount',
  'openIssuesCount',
  'primaryLanguage',
  'languages',
  'topics',
  'pushedAt',
  'homepageUrl',
  'size',
  'hasIssuesEnabled',
  'hasProjectsEnabled',
  'hasWikiEnabled',
  'deployments',
  'environments',
  'commits',
  'releases',
  'issues',
  'pullRequests',
  'githubActions',
  'security',
  'packages',
  'branchProtection',
  'community',
  'traffic',
] as const;
