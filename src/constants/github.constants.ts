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

  // Request Configuration
  INITIAL_TIMEOUT: 120000,
  INITIAL_RETRIES: 8,
  INITIAL_RETRY_AFTER: 3,
  VALIDATION_TIMEOUT: 60000,
  VALIDATION_RETRIES: 5,
  DEFAULT_MAX_RETRIES: 5,

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

  // Rate Limiting - Optimized for faster execution
  RATE_LIMIT_THRESHOLD: 50, // Reduced from 100 to be more conservative
  RATE_LIMIT_STATUS_CODE: 403,
  RATE_LIMIT_WAIT_TIME_MAX: 30000, // Reduced from 60000 to 30 seconds max
  RATE_LIMIT_WAIT_TIME_DEFAULT: 5000, // Reduced from 60000 to 5 seconds default
  RATE_LIMIT_RESET_DEFAULT: '0',
  RATE_LIMIT_BACKOFF_MULTIPLIER: 1.5, // Exponential backoff multiplier
  RATE_LIMIT_MAX_BACKOFF: 30000, // Maximum backoff time in ms
  RATE_LIMIT_MIN_BACKOFF: 1000, // Minimum backoff time in ms

  // Rate Limit Error Messages - Enhanced detection patterns
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

  // Pagination Limits
  ORGANIZATIONS_LIMIT: 50,
  USER_REPOSITORIES_LIMIT: 20,
  ORG_REPOSITORIES_LIMIT: 50,
  LANGUAGES_LIMIT: 10,
  TOPICS_LIMIT: 5,
  COMMITS_LIMIT: 10,
  WORKFLOW_RUNS_LIMIT: 20,
  ORGANIZATIONS_PER_PAGE: 10,

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
  DEFAULT_LIMIT: 200,
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
