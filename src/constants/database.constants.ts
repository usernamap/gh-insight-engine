export const DATABASE_TABLES = {
  DATASETS: 'datasets',
  REPOSITORIES: 'repositories',
  USERS: 'users',
} as const;

export const PRISMA_LOG_LEVELS = [
  { level: 'query' as const, emit: 'event' as const },
  { level: 'error' as const, emit: 'event' as const },
  { level: 'info' as const, emit: 'event' as const },
  { level: 'warn' as const, emit: 'event' as const },
];

export const MONGOOSE_EVENTS = {
  CONNECTED: 'connected',
  ERROR: 'error',
  DISCONNECTED: 'disconnected',
} as const;

// User Model Default Values
export const USER_DEFAULTS = {
  EMPTY_STRING: '',
  ZERO: 0,
  DEFAULT_TYPE: 'User',
  DEFAULT_SITE_ADMIN: false,
  DEFAULT_REPOSITORIES_LIMIT: 10,
  DEFAULT_SEARCH_LIMIT: 10,
  DEFAULT_SEARCH_OFFSET: 0,
  DEFAULT_TOP_LANGUAGES_LIMIT: 10,
} as const;

// Database Query Modes
export const QUERY_MODES = {
  INSENSITIVE: 'insensitive',
} as const;

// Database Sort Orders
export const SORT_ORDERS = {
  DESC: 'desc',
} as const;

// Database Operators
export const OPERATORS = {
  NOT: 'not',
} as const;
