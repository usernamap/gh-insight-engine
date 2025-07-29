export const DATABASE_MESSAGES = {
  CONFIGURATION_INITIALIZED: 'Database configuration initialized successfully',
  PRISMA_CONNECTION_ESTABLISHED: 'Prisma connection established successfully',
  MONGOOSE_CONNECTION_ALREADY_ESTABLISHED:
    'Mongoose connection already established, reusing existing connection',
  MONGOOSE_CONNECTION_ESTABLISHED: 'Mongoose connection established successfully',
  MONGOOSE_ERROR: 'Mongoose error',
  MONGOOSE_CONNECTION_CLOSED: 'Mongoose connection closed',
  TRANSACTION_COMPLETED: 'Transaction Prisma completed',
  TRANSACTION_FAILED: 'Transaction Prisma failed',
  INDEXES_CREATED: 'Database indexes created successfully',
  PRISMA_CONNECTION_CLOSED: 'Prisma connection closed',
  CONNECTIONS_CLOSED: 'Error closing connections',
  TEST_DATA_CLEANED: 'Test data cleaned',
  FIND_MANY_OPERATION: 'Find many operation',
  FIND_UNIQUE_OPERATION: 'Find unique operation',
  CREATE_OPERATION: 'Create operation',
  UPDATE_OPERATION: 'Update operation',
  DELETE_OPERATION: 'Delete operation',
  PRISMA_ERROR: 'Prisma Error',
} as const;

export const LOG_LEVELS = {
  QUERY: 'query',
  ERROR: 'error',
  INFO: 'info',
  WARN: 'warn',
} as const;

export const DURATION_UNIT = 'ms';

// GitHub Service Messages
export const GITHUB_MESSAGES = {
  // Initialization Messages
  TIMEOUT_DEGRADED_MODE:
    'Timeout during token validation, but configuration initialized in degraded mode',
  INVALID_TOKEN_PREFIX: 'Invalid GitHub token: ',
  UNKNOWN_ERROR: 'Unknown error',
  INITIALIZATION_SUCCESS: 'GitHub configuration initialized successfully',
  CONNECTIVITY_ISSUE_DEGRADED: 'GitHub API connectivity issue, initialization in degraded mode',

  // Token Validation Messages
  NO_TOKEN_PROVIDED: 'No GitHub token provided',
  MISSING_PERMISSIONS_PREFIX: 'Missing permissions: ',
  TOKEN_VALIDATION_ERROR: 'GitHub token validation error',
  CONNECTIVITY_ISSUE_PREFIX: 'GitHub connectivity issue: ',
  INVALID_OR_EXPIRED_TOKEN: 'Invalid or expired token',

  // Rate Limit Error Messages
  RATE_LIMIT_EXCEEDED: 'GitHub API rate limit exceeded',
  RATE_LIMIT_EXCEEDED_DETAILED:
    'GitHub API rate limit exceeded. Please try again later or contact GitHub Support if the issue persists.',
  RATE_LIMIT_USER_SPECIFIC: 'GitHub API rate limit exceeded for this user account',
  RATE_LIMIT_RETRY_AFTER: 'Rate limit reset time: ',
  RATE_LIMIT_SUPPORT_MESSAGE:
    'If you reach out to GitHub Support for help, please include the request ID and timestamp from the error message.',

  // Client Messages
  CLIENT_NOT_INITIALIZED: 'GitHub client not initialized',

  // GraphQL Messages
  DEBUG_GRAPHQL_ERROR: 'GraphQL error',
  RATE_LIMIT_WAIT_PREFIX: 'Rate limit reached, waiting for ',
  GRAPHQL_FAILED_ATTEMPTS: 'GraphQL query failed after all attempts',
  GRAPHQL_QUERY_FAILED: 'GraphQL query failed',

  // REST Messages
  REST_REQUEST_SUCCESS: 'REST request executed successfully',
  REST_FAILED_ATTEMPTS: 'REST request failed after all attempts',
  REST_REQUEST_FAILED: 'REST request failed',

  // Rate Limiting Messages
  RATE_LIMIT_LOW_WAIT: 'Rate limit low, waiting before next request',
  RATE_LIMIT_OPTIMIZED_WAIT: 'Rate limit reached, using optimized wait time',
  RATE_LIMIT_BACKOFF_APPLIED: 'Applying exponential backoff for retry',

  // Infrastructure Error Messages
  INFRASTRUCTURE_ERROR_DETECTED: 'GitHub infrastructure error detected',
  INFRASTRUCTURE_ERROR_BACKOFF: 'Applying infrastructure error backoff',
  INFRASTRUCTURE_ERROR_WAIT_PREFIX: 'GitHub infrastructure issue, waiting for ',
  INFRASTRUCTURE_ERROR_FALLBACK: 'Falling back to degraded mode due to persistent infrastructure errors',
  INFRASTRUCTURE_ERROR_RECOVERY: 'Attempting recovery from infrastructure error',

  // Cleanup Messages
  CONFIGURATION_CLEANED_UP: 'GitHub configuration cleaned up',

  // Service Operation Messages
  ORGANIZATIONS_RETRIEVED: 'Organizations retrieved',
  USER_PROFILE_RETRIEVED_REST_API: 'User profile retrieved via REST API',
  USER_REPOSITORIES_RETRIEVED: 'User repositories retrieved',
  ORG_REPOSITORIES_RETRIEVED: 'Organization repositories retrieved',
  GITHUB_ACTIONS_DATA_RETRIEVED: 'GitHub Actions data retrieved',
  TIMEOUT_GITHUB_ACTIONS_RETRIEVAL:
    'Timeout during GitHub Actions retrieval, returning default data',
  SECURITY_DATA_RETRIEVED: 'Security data retrieved',
  PACKAGES_DATA_RETRIEVED: 'Packages data retrieved',
  BRANCH_PROTECTION_DATA_RETRIEVED: 'Branch protection data retrieved',
  COMMUNITY_HEALTH_DATA_RETRIEVED: 'Community health data retrieved',
  TRAFFIC_DATA_RETRIEVED: 'Traffic data retrieved',
  STARTING_DEVOPS_ENRICHMENT: 'Starting DevOps enrichment',
  DEVOPS_ENRICHMENT_COMPLETED: 'DevOps enrichment completed',
} as const;

export const MESSAGES_CONSTANTS = {
  OPENAI: {
    API_KEY_NOT_DEFINED: 'OPENAI_API_KEY not defined - AI service disabled',
    CONFIGURATION_INITIALIZED: 'OpenAI configuration initialized',
    INITIALIZATION_ERROR: 'OpenAI initialization error',
    TEST_CONNECTION_SUCCESSFUL: 'OpenAI test connection successful',
    TEST_CONNECTION_FAILED: 'OpenAI test connection failed',
  },
} as const;

/**
 * User-facing messages for AI Controller
 */

export const AI_MESSAGES = {
  AUTHENTICATION_REQUIRED: 'Authentication required to launch AI analysis',
  AUTHORIZATION_DENIED: 'You can only analyze your own profile',
  ANALYSIS_COMPLETED: 'AI analysis completed successfully',
  NO_ANALYSIS_FOUND:
    'No AI analysis found for this user. Use POST /ai/{username} to launch an analysis.',
  ANALYSIS_STALE: 'Analysis is stale. Consider launching a new analysis with POST /ai/{username}.',
  RECENT_ANALYSIS: 'Recent analysis',
  OPENAI_CONNECTION_FAILED: 'OpenAI test connection failed',
  OPENAI_NOT_CONFIGURED: 'OPENAI_API_KEY not configured',
  AI_SERVICE_UNAVAILABLE: 'AI service temporarily unavailable',
  FALLBACK_MODE_DESCRIPTION: 'Basic scores calculated without AI if OpenAI is unavailable',
  // AI Analysis Model Messages
  DATABASE_NOT_INITIALIZED: 'Database not initialized',
  AI_ANALYSIS_CREATED_SUCCESS: 'AI analysis created successfully',
  ERROR_CREATING_AI_ANALYSIS: 'Error creating AI analysis',
  AI_ANALYSIS_CREATION_FAILED: 'AI analysis creation failed: ',

  // User Model Messages
  USER_CREATED_SUCCESS: 'User created successfully',
  ERROR_CREATING_USER: 'Error creating user',
  USER_CREATION_FAILED: 'User creation failed: ',
  SEARCHING_USER_BY_LOGIN: 'Searching user by login',
  ERROR_SEARCHING_USER: 'Error searching user',
  SEARCHING_USER_BY_ID: 'Searching user by ID',
  ERROR_SEARCHING_USER_BY_ID: 'Error searching user by ID',
  USER_UPDATED: 'User updated',
  ERROR_UPDATING_USER: 'Error updating user',
  USER_UPDATE_FAILED: 'User update failed: ',
  USER_DELETED_SUCCESS: 'User deleted successfully',
  ERROR_DELETING_USER: 'Error deleting user',
  USER_DELETION_FAILED: 'User deletion failed: ',
  SEARCHING_USERS: 'Searching users',
  ERROR_SEARCHING_USERS: 'Error searching users',
  ERROR_CALCULATING_STATISTICS: 'Error calculating statistics',
  ERROR_CHECKING_USER_EXISTENCE: 'Error checking user existence',
  USER_UPSERT_SUCCESS: 'User upsert successful',
  ERROR_UPSERTING_USER: 'Error upserting user',
  USER_UPSERT_FAILED: 'User upsert failed: ',
  SEARCH_AI_ANALYSIS_BY_USERNAME: 'Search AI analysis by username',
  ERROR_SEARCHING_AI_ANALYSIS_BY_USERNAME: 'Error searching AI analysis by username',
  AI_ANALYSIS_UPDATED_SUCCESS: 'AI analysis updated successfully',
  ERROR_UPDATING_AI_ANALYSIS: 'Error updating AI analysis',
  AI_ANALYSIS_UPDATE_FAILED: 'AI analysis update failed: ',
  AI_ANALYSIS_DELETED_SUCCESS: 'AI analysis deleted successfully',
  ERROR_DELETING_AI_ANALYSIS: 'Error deleting AI analysis',
  AI_ANALYSIS_DELETION_FAILED: 'AI analysis deletion failed: ',
  SEARCH_ALL_AI_ANALYSES_BY_USERNAME: 'Search all AI analyses by username',
  ERROR_SEARCHING_AI_ANALYSES_BY_USERNAME: 'Error searching AI analyses by username',
  ERROR_CALCULATING_AI_ANALYSIS_STATISTICS: 'Error calculating AI analysis statistics',
} as const;

// Messages utilisateur pour l'authentification
export const AUTH_MESSAGES = {
  SUCCESS: 'Authentication successful',
  SUCCESS_DEGRADED: 'Authentication successful (degraded mode - limited GitHub connectivity)',
  SUCCESS_FALLBACK: 'Authentication successful (fallback mode - unstable GitHub connectivity)',
  WARNING_DEGRADED: 'Degraded mode activated due to GitHub API connectivity issues',
  WARNING_FALLBACK: 'Fallback mode activated due to temporary connectivity issues',
  INVALID_TOKEN: 'Invalid GitHub token: ',
  USER_NOT_FOUND: 'GitHub user',
  TOKEN_USERNAME_MISMATCH: 'The GitHub token does not match the provided username',
  AUTHENTICATED: 'User is authenticated',
  NOT_AUTHENTICATED: 'User is not authenticated',
} as const;

// Messages de log pour l'authentification
export const AUTH_LOG_MESSAGES = {
  LOGIN_ATTEMPT: 'login_attempt',
  GITHUB_NETWORK_ERROR_DEGRADED: 'github_network_error_degraded_mode',
  LOGIN_SUCCESS_DEGRADED: 'login_success_degraded',
  GITHUB_TOKEN_INVALID: 'github_token_invalid',
  GITHUB_USER_NOT_FOUND: 'github_user_not_found',
  TOKEN_USERNAME_MISMATCH: 'token_username_mismatch',
  LOGIN_SUCCESS: 'login_success',
  GITHUB_SERVICE_NETWORK_ERROR_FALLBACK: 'github_service_network_error_fallback',
  ME_ENDPOINT_CALLED: 'me_endpoint_called',
  ME_ENDPOINT_SUCCESS: 'me_endpoint_success',
} as const;

// Refresh Controller Messages
export const REFRESH_MESSAGES = {
  AUTHENTICATION_REQUIRED: 'Authentication required to refresh data',
  AUTHORIZATION_DENIED: 'You can only refresh your own data',
  SUCCESS_ALL_DATA_REFRESHED: 'All data has been refreshed successfully',
  FAILURE_DURING_STEP: (step: string, error: string) => `Failure during step '${step}': ${error}`,
  // Status messages
  STATUS_NOT_FOUND: 'No refresh status found for this user',
  STATUS_IN_PROGRESS: 'Data refresh in progress',
  STATUS_COMPLETED: 'Data refresh completed',
  STATUS_FAILED: 'Data refresh failed',
} as const;

// Refresh Controller Log Messages
export const REFRESH_LOG_MESSAGES = {
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
  // Status log messages
  GET_REFRESH_STATUS: 'get_refresh_status',
  GET_REFRESH_STATUS_SUCCESS: 'get_refresh_status_success',
  GET_REFRESH_STATUS_ERROR: 'get_refresh_status_error',
  UPDATE_REFRESH_STATUS: 'update_refresh_status',
  UPDATE_REFRESH_STATUS_SUCCESS: 'update_refresh_status_success',
  UPDATE_REFRESH_STATUS_ERROR: 'update_refresh_status_error',
} as const;

// Refresh Controller Response Fields
export const REFRESH_RESPONSE_FIELDS = {
  SUCCESS: 'success',
  MESSAGE: 'message',
  USERNAME: 'username',
  TOTAL_DURATION: 'totalDuration',
  STEPS: 'steps',
  COMPLETED_STEPS: 'completedSteps',
  FAILED_AT: 'failedAt',
  // Status response fields
  REFRESH_STATUS: 'refreshStatus',
  PROGRESS_PERCENTAGE: 'progressPercentage',
  STARTED_AT: 'startedAt',
  COMPLETED_AT: 'completedAt',
  ESTIMATED_COMPLETION: 'estimatedCompletion',
  CURRENT_STEP: 'currentStep',
  TOTAL_STEPS: 'totalSteps',
  TARGET_USERNAME: 'targetUsername',
  REQUESTER_ID: 'requesterId',
  ERROR: 'error',
  TIMESTAMP: 'timestamp',
  METADATA: 'metadata',
} as const;

// Repository Controller Messages
export const REPO_MESSAGES = {
  AUTHENTICATION_REQUIRED: 'Authentication required to collect repositories',
  AUTHORIZATION_DENIED: 'You can only collect your own repositories',
  COLLECTION_SUCCESSFUL: 'Repository collection successful',
  NO_DATA_FOUND:
    'No data found for this user. Use POST /repositories/{username} to collect repositories.',
  NO_REPOSITORY_FOUND:
    'No repository found. Use POST /repositories/{username} to collect repositories.',
  GITHUB_API_SERVICE: 'GitHub API',
  DATABASE_SERVICE: 'Database',
  NO_DATA_FOUND_PATTERN: 'No data found',
  DELETION_SUCCESSFUL: 'Repository deletion successful',
  // Status messages
  STATUS_NOT_FOUND: 'No collection status found for this user',
  STATUS_IN_PROGRESS: 'Repository collection in progress',
  STATUS_COMPLETED: 'Repository collection completed',
  STATUS_FAILED: 'Repository collection failed',
} as const;

// Repository Controller Log Messages
export const REPO_LOG_MESSAGES = {
  COLLECT_REPOSITORIES_DATA: 'collect_repositories_data',
  GET_ORG_REPOS_ERROR: 'get_org_repos_error',
  ENRICH_REPO_ERROR: 'enrich_repo_error',
  REPOSITORIES_ENRICHED_SUCCESS: 'repositories_enriched_success',
  COLLECT_REPOSITORIES_SUCCESS: 'collect_repositories_success',
  COLLECT_REPOSITORIES_ERROR: 'collect_repositories_error',
  GET_USER_REPOSITORIES: 'get_user_repositories',
  GET_USER_REPOSITORIES_SUCCESS: 'get_user_repositories_success',
  GET_USER_REPOSITORIES_ERROR: 'get_user_repositories_error',
  DELETE_USER_REPOSITORIES: 'delete_user_repositories',
  DELETE_USER_REPOSITORIES_SUCCESS: 'delete_user_repositories_success',
  DELETE_USER_REPOSITORIES_ERROR: 'delete_user_repositories_error',
  // Status log messages
  GET_COLLECTION_STATUS: 'get_collection_status',
  GET_COLLECTION_STATUS_SUCCESS: 'get_collection_status_success',
  GET_COLLECTION_STATUS_ERROR: 'get_collection_status_error',
  UPDATE_COLLECTION_STATUS: 'update_collection_status',
  UPDATE_COLLECTION_STATUS_SUCCESS: 'update_collection_status_success',
  UPDATE_COLLECTION_STATUS_ERROR: 'update_collection_status_error',
} as const;

// Repository Controller Response Fields
export const REPO_RESPONSE_FIELDS = {
  STATUS: 'status',
  SUMMARY: 'summary',
  REPOSITORIES_COLLECTED: 'repositoriesCollected',
  ORGANIZATIONS_SCANNED: 'organizationsScanned',
  DATA_FRESHNESS: 'dataFreshness',
  ANALYTICS: 'analytics',
  METADATA: 'metadata',
  COLLECTED_AT: 'collectedAt',
  NEXT_COLLECTION_RECOMMENDED: 'nextCollectionRecommended',
  TIMESTAMP: 'timestamp',
  REPOSITORIES: 'repositories',
  DATA_SOURCE: 'dataSource',
  IS_EMPTY: 'isEmpty',
  MESSAGE: 'message',
  ACCESS_LEVEL: 'accessLevel',
  REPOSITORIES_COUNT: 'repositoriesCount',
  TARGET_USERNAME: 'targetUsername',
  REQUESTER_ID: 'requesterId',
  ORG_NAME: 'orgName',
  ERROR: 'error',
  REPO: 'repo',
  USERNAME: 'username',
  ORGANIZATIONS_COUNT: 'organizationsCount',
  IS_AUTHENTICATED: 'isAuthenticated',
  HAS_FULL_ACCESS: 'hasFullAccess',
  // Status response fields
  COLLECTION_STATUS: 'collectionStatus',
  PROGRESS_PERCENTAGE: 'progressPercentage',
  STARTED_AT: 'startedAt',
  COMPLETED_AT: 'completedAt',
  ESTIMATED_COMPLETION: 'estimatedCompletion',
  CURRENT_STEP: 'currentStep',
  TOTAL_STEPS: 'totalSteps',
} as const;

// Repository Controller Status Values
export const REPO_STATUS_VALUES = {
  COMPLETED: 'completed',
  LIVE: 'live',
  DATABASE: 'database',
  FULL: 'full',
  PUBLIC: 'public',
  UPDATED: 'updated',
  DESC: 'desc',
  TRUE: 'true',
  FALSE: 'false',
  // Collection status values
  IN_PROGRESS: 'in_progress',
  FAILED: 'failed',
  NOT_FOUND: 'not_found',
  PENDING: 'pending',
} as const;

// User Controller Messages
export const USER_MESSAGES = {
  AUTH_REQUIRED_COLLECT_DATA: 'Authentication required to collect data',
  AUTH_ONLY_OWN_DATA: 'You can only collect your own data',
  USER_PROFILE_COLLECTION_SUCCESS: 'User profile collection successful',
  USER_NOT_FOUND_COLLECT: 'User not found. Use POST /users/{username} to collect data.',
  DATA_DELETION_DISABLED: 'Data deletion temporarily disabled',
  DATA_DELETION_NOTE: 'Requires implementation with new simplified architecture',
  GDPR_COMPLIANCE: 'GDPR',
  COMPLETED: 'completed',
  USER_DELETION_SUCCESS: 'User deletion successful',
  USER_DELETION_CASCADE_SUCCESS: 'User and all associated data deleted successfully',
  USER_DELETION_CASCADE_PARTIAL: 'User deleted with partial cascade success',
  USER_DELETION_CASCADE_ERROR: 'User deletion with cascade failed',
} as const;

// User Controller Log/Status Labels
export const USER_LOG_MESSAGES = {
  COLLECT_USER_DATA: 'collect_user_data',
  COLLECT_USER_DATA_SUCCESS: 'collect_user_data_success',
  COLLECT_USER_DATA_ERROR: 'collect_user_data_error',
  GITHUB_API: 'github_api',
  GET_USER_PROFILE: 'get_user_profile',
  GET_USER_PROFILE_SUCCESS: 'get_user_profile_success',
  GET_USER_PROFILE_ERROR: 'get_user_profile_error',
  DATABASE: 'database',
  DELETE_USER_DATA: 'delete_user_data',
  DELETE_USER_DATA_SUCCESS: 'delete_user_data_success',
  DELETE_USER_DATA_ERROR: 'delete_user_data_error',
  DELETE_USER_CASCADE: 'delete_user_cascade',
  DELETE_USER_CASCADE_SUCCESS: 'delete_user_cascade_success',
  DELETE_USER_CASCADE_ERROR: 'delete_user_cascade_error',
  GET_USERS_STATS: 'get_users_stats',
  GET_USERS_STATS_SUCCESS: 'get_users_stats_success',
  GET_USERS_STATS_ERROR: 'get_users_stats_error',
  DIRECT_CALCULATION: 'direct_calculation',
} as const;

// Authentication Middleware Messages
export const AUTH_MIDDLEWARE_MESSAGES = {
  // GitHub Token Validation
  VALIDATE_GITHUB_TOKEN: 'validate_github_token',
  MISSING_TOKEN: 'missing_token',
  UNAUTHORIZED: 'Unauthorized',
  PLEASE_PROVIDE_GITHUB_TOKEN:
    'Please provide your GitHub Classic token in the Authorization header',
  GITHUB_TOKEN_DOCUMENTATION:
    'https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token',
  UNKNOWN: 'unknown',
  PLEASE_VERIFY_TOKEN_PERMISSIONS:
    'Please verify that your token is correct and has the required permissions',
  VALIDATION_ERROR: 'validation_error',
  UNKNOWN_VALIDATION_ERROR: 'Unknown validation error',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  UNABLE_TO_VALIDATE_GITHUB_TOKEN: 'Unable to validate GitHub token',

  // JWT Authentication
  AUTHENTICATE_JWT: 'authenticate_jwt',
  PLEASE_LOGIN_TO_ACCESS: 'Please log in to access this resource',
  JWT_SECRET_NOT_CONFIGURED: 'JWT_SECRET not configured',
  TOKEN_EXPIRED: 'token_expired',
  PLEASE_LOGIN_AGAIN: 'Please log in again',
  AUTHENTICATE_JWT_TEMP_USER: 'authenticate_jwt_temp_user',
  TEMPORARY_AUTHENTICATION: 'temporary_authentication',
  USER_NOT_FOUND: 'user_not_found',
  USER_ACCOUNT_NO_LONGER_EXISTS: 'The user account associated with this token no longer exists',
  INVALID_TOKEN: 'invalid_token',
  MALFORMED_OR_CORRUPTED_TOKEN: 'Malformed or corrupted token',
  JWT_AUTHENTICATION_ERROR: 'JWT authentication error',
  INTERNAL_SERVER_ERROR_MESSAGE: 'Internal server error',

  // GitHub Session Validation
  PLEASE_RENEW_GITHUB_TOKEN: 'Please renew your GitHub token',
  REFRESH_TOKEN_REQUIRED: 'refresh_token_required',
  GITHUB_TOKEN_INVALID: 'github_token_invalid',
  GITHUB_TOKEN_REFRESHED: 'github_token_refreshed',
  ERROR_DURING_GITHUB_TOKEN_REVALIDATION: 'Error during GitHub token revalidation',

  // Ownership Verification
  REQUIRE_OWNERSHIP_DEBUG: 'RequireOwnership Debug',
  ACCESS_DENIED: 'access_denied',
  YOU_CAN_ONLY_ACCESS_YOUR_OWN_DATA: 'You can only access your own data',

  // Rate Limiting
  USER_RATE_LIMIT_EXCEEDED: 'user_rate_limit_exceeded',
  TOO_MANY_REQUESTS: 'Too Many Requests',
  RATE_LIMIT_MESSAGE: (maxRequests: number, windowMs: number) =>
    `Limit of ${maxRequests} requests per ${Math.ceil(windowMs / 60000)} minutes reached`,
} as const;

/**
 * Documentation message constants
 */
export const DOCUMENTATION_MESSAGES = {
  FILE_NOT_FOUND: 'File openapi.yaml not found',
  SPECIFICATION_LOADED: 'OpenAPI specification loaded successfully',
  ERROR_LOADING_SPECIFICATION: 'Error loading OpenAPI specification',
  INVALID_SPECIFICATION: 'Invalid OpenAPI specification, using default values',
  ERROR_GENERATING_SPECIFICATION: 'Error generating OpenAPI specification',
  CONFIGURING_DOCUMENTATION: 'Configuration of the API documentation...',
  UNABLE_REFRESH_SPECIFICATION: 'Unable to refresh the OpenAPI specification',
  DOCUMENTATION_CONFIGURED: 'API documentation configured successfully',
  ERROR_CONFIGURING_DOCUMENTATION: 'Error configuring documentation',
  DOCUMENTATION_UNAVAILABLE: 'Documentation unavailable',
  ERROR_LOADING_API_DOCUMENTATION: 'Error loading API documentation',
  ERROR_VALIDATING_SPECIFICATION: 'Error validating OpenAPI specification',
} as const;

/**
 * Validation error messages
 */
export const VALIDATION_MESSAGES = {
  USERNAME_REQUIRED: 'Username is required',
  USERNAME_MAX_LENGTH: 'Username cannot exceed 39 characters',
  INVALID_GITHUB_USERNAME: 'Invalid GitHub username format',
  OWNER_REQUIRED: 'Owner is required',
  OWNER_MAX_LENGTH: 'Owner name cannot exceed 39 characters',
  INVALID_GITHUB_OWNER: 'Invalid GitHub owner format',
  REPO_NAME_REQUIRED: 'Repository name is required',
  REPO_NAME_MAX_LENGTH: 'Repository name cannot exceed 100 characters',
  INVALID_REPO_NAME: 'Invalid repository name format',
  FULL_NAME_REQUIRED: 'Full name is required',
  FULL_NAME_MAX_LENGTH: 'Full name cannot exceed 255 characters',
  INVALID_FULL_NAME: 'Full name contains invalid characters',
  GITHUB_TOKEN_MIN_LENGTH: 'GitHub token must contain at least 40 characters',
  GITHUB_TOKEN_MAX_LENGTH: 'GitHub token cannot exceed 255 characters',
  INVALID_GITHUB_TOKEN: 'Invalid GitHub token format',
  PAGE_RANGE: 'Page must be between 1 and 1000',
  LIMIT_RANGE: 'Limit must be between 1 and 100',
  SEARCH_TERM_REQUIRED: 'Search term is required',
  SEARCH_TERM_MAX_LENGTH: 'Search term cannot exceed 255 characters',
  LANGUAGE_MAX_LENGTH: 'Language cannot exceed 50 characters',
  TOPIC_MAX_LENGTH: 'Topic cannot exceed 35 characters',
  MIN_STARS_RANGE: 'Minimum stars must be between 0 and 1,000,000',
  MIN_FORKS_RANGE: 'Minimum forks must be between 0 and 100,000',
  MAX_AGE_RANGE: 'Maximum age must be between 1 and 168 hours (7 days)',
  DESCRIPTION_MAX_LENGTH: 'Description cannot exceed 1000 characters',
  TAG_MAX_LENGTH: 'Each tag cannot exceed 50 characters',
  TAGS_MAX_COUNT: 'Maximum 20 tags allowed',
} as const;

// Repository Model Log Messages
export const REPOSITORY_LOG_MESSAGES = {
  CREATED_SUCCESS: 'Repository created successfully',
  ERROR_CREATING: 'Error creating repository',
  SEARCHING_BY_NAME: 'Searching repository by nameWithOwner',
  ERROR_SEARCHING: 'Error searching repository',
  SEARCHING_BY_USER: 'Searching repositories by user',
  ERROR_SEARCHING_BY_USER: 'Error searching repositories by user',
  UPDATED: 'Repository updated',
  ERROR_UPDATING: 'Error updating repository',
  ENRICHED_DEV_OPS: 'Repository enriched with DevOps data',
  ERROR_DEV_OPS_ENRICHMENT: 'Error during DevOps enrichment',
  DELETED_SUCCESS: 'Repository deleted successfully',
  ERROR_DELETING: 'Error deleting repository',
  ADVANCED_SEARCH: 'Advanced repository search',
  ERROR_ADVANCED_SEARCH: 'Error during advanced repository search',
  ERROR_CALCULATING_STATS: 'Error calculating repository statistics',
  UPSERT_SUCCESS: 'Repository upsert successful',
  ERROR_UPSERTING: 'Error upserting repository',
  DELETED_BY_USER_SUCCESS: 'Repositories deleted by user successfully',
  ERROR_DELETING_BY_USER: 'Error deleting repositories by user',
} as const;

// AI Analysis Log Messages
export const AI_ANALYSIS_LOG_MESSAGES = {
  STARTING_ANALYSIS: 'Starting AI analysis for user',
  ANALYSIS_COMPLETED: 'AI analysis completed',
  ANALYSIS_ERROR: 'AI analysis error',
  NO_ANALYSIS_FOUND: 'No AI analysis found',
  ANALYSIS_RETRIEVED: 'AI analysis retrieved successfully',
  ERROR_RETRIEVING_ANALYSIS: 'Error retrieving AI analysis',
  OPENAI_API_ERROR: 'OpenAI API error',
  USER_NOT_FOUND_SAVE: 'User not found for AI analysis save',
  ANALYSIS_SAVED: 'AI analysis saved successfully',
  ERROR_SAVING_ANALYSIS: 'Error saving AI analysis',
  ANALYSIS_DELETED_SUCCESS: 'AI analysis deleted successfully',
  ERROR_DELETING_AI_ANALYSIS: 'Error deleting AI analysis',
} as const;

// AI Analysis Default Insights
export const AI_ANALYSIS_DEFAULT_INSIGHTS = {
  STRENGTHS: {
    REGULAR_ACTIVITY: 'Regular activity',
    TECHNOLOGY_DIVERSITY: 'Technology diversity',
    GOOD_DOCUMENTATION: 'Good documentation',
  },
  WEAKNESSES: {
    DOCUMENTATION_TO_IMPROVE: 'Documentation to improve',
    COMMUNITY_VISIBILITY: 'Community visibility',
  },
  RECOMMENDATIONS: {
    CONTRIBUTE_OPEN_SOURCE: 'Contribute to open source',
    IMPROVE_DOCUMENTATION: 'Improve documentation',
  },
  CAREER_ADVICE: {
    CONTINUE_DEVELOP_SKILLS: 'Continue to develop your skills',
    DEVELOP_SPECIALIZATION: 'Develop a specialization',
    PARTICIPATE_COLLABORATIVE: 'Participate in collaborative projects',
  },
  IMPROVEMENT_AREAS: {
    AUTOMATED_TESTS: 'Automated tests',
    CI_CD: 'CI/CD',
  },
  FALLBACK_SUMMARY_TEMPLATE: (totalRepositories: number, totalStars: number) =>
    `Developer with ${totalRepositories} repositories and ${totalStars} stars.`,
  FALLBACK_ACTIVE_SUMMARY_TEMPLATE: (totalRepositories: number, totalLanguages: number) =>
    `Active developer with ${totalRepositories} repositories and expertise in ${totalLanguages} technologies.`,
} as const;

// Scheduling Service Messages
export const SCHEDULING_MESSAGES = {
  RETRIEVING_AUTH_TOKEN: 'Retrieving authentication token for scheduling',
  AUTH_TOKEN_RETRIEVED: 'Authentication token retrieved successfully',
  FAILED_TO_RETRIEVE_AUTH_TOKEN: 'Failed to retrieve authentication token',
  SCHEDULING_DISABLED: 'Scheduling disabled via SCHEDULE_ENABLED=false',
  SCHEDULING_ALREADY_STARTED: 'Scheduling service already started',
  SCHEDULING_STARTED: 'Scheduling service started',
  ERROR_STARTING_SCHEDULING: 'Error starting scheduling',
  SCHEDULING_STOPPED: 'Scheduling service stopped',
  STARTING_SCHEDULED_UPDATE: 'Starting scheduled update',
  SCHEDULED_UPDATE_COMPLETED: 'Scheduled update completed successfully',
  SCHEDULED_UPDATE_FAILED: 'Scheduled update failed',
  TEST_CONFIGURATION: 'Test the configuration by executing an immediate update',
  CONFIGURATION_TEST_FAILED: 'Configuration test failed',
} as const;

// Application initialization messages
export const APP_INITIALIZATION_MESSAGES = {
  INITIALIZING_APPLICATION: 'Initializing GitHub Insight Engine application',
  CONNECTING_DATABASE: 'Connecting to the database...',
  DATABASE_CONNECTED: 'Database connected successfully',
  INITIALIZING_SCHEDULING: 'Initializing scheduling service...',
  SCHEDULING_INITIALIZED: 'Scheduling service initialized',
  EXPRESS_CONFIGURED: 'Express application configured successfully',
  ALL_ROUTES_REDIRECT: '🔒 All public routes redirect to GitHub',
  ERROR_INITIALIZATION: 'Error during application initialization',
  GRACEFUL_SHUTDOWN: 'Graceful shutdown of the application...',
  STOPPING_SCHEDULING: 'Stopping scheduling service...',
  SCHEDULING_STOPPED: 'Scheduling service stopped',
  DATABASE_DISCONNECTED: 'Database disconnected',
  SHUTDOWN_COMPLETED: 'Graceful shutdown completed',
  ERROR_SHUTDOWN: 'Error during graceful shutdown',
} as const;

// Security and access control messages
export const SECURITY_MESSAGES = {
  BROWSER_ACCESS_BLOCKED: 'Browser access blocked',
} as const;

// Server Messages
export const SERVER_MESSAGES = {
  STARTUP: 'Server startup...',
  STARTED: '🚀 GitHub Insight Engine server started',
  SERVER_ERROR: 'Server error',
  FATAL_ERROR_STARTUP: 'Fatal error during server startup',
  ERROR_SHUTDOWN: 'Error during server shutdown',
  HTTP_SERVER_CLOSED: 'HTTP server closed',
  GRACEFUL_SHUTDOWN_TIMEOUT: 'Graceful shutdown timeout reached, forcing shutdown',
  UNHANDLED_EXCEPTION: 'Unhandled exception',
  UNHANDLED_PROMISE_REJECTION: 'Unhandled promise rejection',
  NODE_WARNING: 'Node.js warning',
  FATAL_ERROR: 'Fatal error',
} as const;

export const AI_LOG_EVENTS = {
  PERFORM_ANALYSIS: 'perform_ai_analysis',
  PERFORM_ANALYSIS_SUCCESS: 'perform_ai_analysis_success',
  PERFORM_ANALYSIS_ERROR: 'perform_ai_analysis_error',
  GET_ANALYSIS: 'get_ai_analysis',
  GET_ANALYSIS_SUCCESS: 'get_ai_analysis_success',
  GET_ANALYSIS_ERROR: 'get_ai_analysis_error',
  GET_SERVICE_STATUS: 'get_ai_service_status',
  GET_SERVICE_STATUS_SUCCESS: 'get_ai_service_status_success',
  GET_SERVICE_STATUS_ERROR: 'get_ai_service_status_error',
  DELETE_ANALYSIS: 'delete_ai_analysis',
  DELETE_ANALYSIS_SUCCESS: 'delete_ai_analysis_success',
  DELETE_ANALYSIS_ERROR: 'delete_ai_analysis_error',
} as const;
