/**
 * Route and service constants for AI Controller
 */

export const AI_SERVICE_NAMES = {
  OPENAI: 'OpenAI',
  AI_ANALYSIS: 'AI Analysis',
  AI_SERVICE_STATUS: 'AI Service Status',
} as const;

export const AI_DATA_SOURCES = {
  AI_ANALYSIS: 'ai_analysis',
} as const;

export const AI_ACCESS_LEVELS = {
  COMPLETE: 'complete',
  PUBLIC: 'public',
} as const;

export const AI_SERVICE_STATUS = {
  AVAILABLE: 'available',
  UNAVAILABLE: 'unavailable',
} as const;

export const AI_SERVICE_INFO = {
  SERVICE_NAME: 'AI Analysis Service',
} as const;

/**
 * Pagination defaults for AI Analysis
 */
export const AI_ANALYSIS_PAGINATION = {
  DEFAULT_LIMIT: 10,
  DEFAULT_OFFSET: 0,
} as const;

/**
 * Documentation route constants
 */
export const DOCUMENTATION_ROUTES = {
  OPENAPI_JSON: '/openapi.json',
  OPENAPI_YAML: '/openapi.yaml',
  DOCS: '/docs',
  DOC_HEALTH: '/doc/health',
  DOCUMENTATION: '/documentation',
  DOC: '/doc',
} as const;

// Repository Model Default Values
export const REPOSITORY_DEFAULTS = {
  LIMIT: 10,
  OFFSET: 0,
  INCLUDE_PRIVATE: true,
  SORT_BY: 'updated',
  SORT_ORDER: 'desc',
  SEARCH_MODE: 'insensitive',
  TOP_LANGUAGES_LIMIT: 10,
  UNKNOWN_LANGUAGE: 'Unknown',
} as const;

// Repository Model Sort Options
export const REPOSITORY_SORT_OPTIONS = {
  STARS: 'stars',
  FORKS: 'forks',
  CREATED: 'created',
  UPDATED: 'updated',
} as const;

// Scheduling Service HTTP Constants
export const SCHEDULING_HTTP = {
  CONTENT_TYPE: 'application/json',
} as const;
