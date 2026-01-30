/**
 * Language Classification Constants
 * 
 * These rules define how languages are categorized into expertise domains.
 * The rules are based on language characteristics, NOT hardcoded language names.
 */

import { LanguageCategory, CategoryRule, LanguageType, LEGACY_CATEGORIES } from '@/types/languages';

/**
 * URL to GitHub Linguist languages.yml (SSOT for language definitions)
 */
export const LINGUIST_LANGUAGES_URL =
    'https://raw.githubusercontent.com/github/linguist/master/lib/linguist/languages.yml';

/**
 * Cache configuration for language metadata
 */
export const LANGUAGE_CACHE_CONFIG = {
    /** Cache TTL in milliseconds (24 hours) */
    TTL_MS: 24 * 60 * 60 * 1000,
    /** Maximum retries for fetching Linguist data */
    MAX_RETRIES: 3,
    /** Retry delay in milliseconds */
    RETRY_DELAY_MS: 1000,
    /** Request timeout in milliseconds */
    REQUEST_TIMEOUT_MS: 10000,
} as const;

/**
 * Threshold for determining if a language is "popular" based on Linguist language_id
 * Languages with IDs below this threshold are considered popular/established.
 * The language_id is assigned chronologically - lower IDs = older/more established languages.
 * Value of 500 covers most mainstream languages while excluding very niche ones.
 */
export const POPULAR_LANGUAGE_ID_THRESHOLD = 500;

/**
 * Category rules for dynamic language classification
 *
 * These rules use patterns and characteristics rather than exhaustive lists.
 * New languages are automatically categorized based on these rules.
 */
export const LANGUAGE_CATEGORY_RULES: Record<LanguageCategory, CategoryRule> = {
    [LEGACY_CATEGORIES.FRONTEND]: {
        directMatch: [],
        extensionPatterns: ['.css', '.scss', '.sass', '.less', '.styl', '.html', '.htm', '.vue', '.svelte', '.jsx', '.tsx'],
        typeMatch: ['markup'],
        namePatterns: ['css', 'html', 'sass', 'less', 'stylus', 'svelte', 'vue'],
    },

    [LEGACY_CATEGORIES.BACKEND]: {
        directMatch: [],
        extensionPatterns: ['.go', '.rs', '.java', '.kt', '.scala', '.clj', '.ex', '.exs', '.rb', '.php', '.cs', '.fs'],
        typeMatch: ['programming'],
        namePatterns: ['go', 'rust', 'java', 'kotlin', 'scala', 'clojure', 'elixir', 'ruby', 'php', 'c#', 'f#'],
        excludeCategories: [LEGACY_CATEGORIES.FRONTEND, LEGACY_CATEGORIES.MOBILE],
    },

    [LEGACY_CATEGORIES.MOBILE]: {
        directMatch: [],
        extensionPatterns: ['.swift', '.kt', '.dart', '.m', '.mm'],
        typeMatch: ['programming'],
        namePatterns: ['swift', 'kotlin', 'dart', 'objective-c', 'flutter'],
    },

    [LEGACY_CATEGORIES.DATA_SCIENCE]: {
        directMatch: [],
        extensionPatterns: ['.r', '.jl', '.ipynb', '.rmd'],
        typeMatch: ['programming', 'data'],
        namePatterns: ['r', 'julia', 'jupyter', 'stata', 'sas', 'spss', 'matlab'],
    },

    [LEGACY_CATEGORIES.DEVOPS]: {
        directMatch: [],
        extensionPatterns: ['.dockerfile', '.tf', '.hcl', '.yml', '.yaml'],
        typeMatch: ['data'],
        namePatterns: ['docker', 'terraform', 'ansible', 'puppet', 'chef', 'salt', 'helm', 'kubernetes'],
    },

    [LEGACY_CATEGORIES.AI_ML]: {
        directMatch: [],
        extensionPatterns: ['.ipynb'],
        typeMatch: ['programming'],
        namePatterns: ['tensorflow', 'pytorch', 'keras', 'scikit', 'ml', 'neural'],
    },

    [LEGACY_CATEGORIES.SYSTEMS]: {
        directMatch: [],
        extensionPatterns: ['.c', '.h', '.cpp', '.hpp', '.cc', '.cxx', '.asm', '.s'],
        typeMatch: ['programming'],
        namePatterns: ['c', 'c++', 'assembly', 'rust', 'zig', 'nim', 'ada', 'fortran', 'd'],
    },

    [LEGACY_CATEGORIES.GAME_DEV]: {
        directMatch: [],
        extensionPatterns: ['.gd', '.gdscript', '.unity', '.uproject'],
        typeMatch: ['programming'],
        namePatterns: ['godot', 'unity', 'unreal', 'game', 'shader', 'glsl', 'hlsl'],
    },

    [LEGACY_CATEGORIES.EMBEDDED]: {
        directMatch: [],
        extensionPatterns: ['.ino', '.pde'],
        typeMatch: ['programming'],
        namePatterns: ['arduino', 'embedded', 'vhdl', 'verilog', 'systemverilog', 'pic', 'avr'],
    },

    [LEGACY_CATEGORIES.SCRIPTING]: {
        directMatch: [],
        extensionPatterns: ['.sh', '.bash', '.zsh', '.fish', '.ps1', '.psm1', '.bat', '.cmd', '.lua', '.tcl', '.awk', '.sed'],
        typeMatch: ['programming'],
        namePatterns: ['shell', 'bash', 'powershell', 'lua', 'perl', 'tcl', 'awk'],
    },

    [LEGACY_CATEGORIES.DATABASE]: {
        directMatch: [],
        extensionPatterns: ['.sql', '.plsql', '.pgsql', '.mysql'],
        typeMatch: ['data', 'programming'],
        namePatterns: ['sql', 'plsql', 'tsql', 'mysql', 'postgresql', 'sqlite', 'oracle', 'mongodb'],
    },

    [LEGACY_CATEGORIES.MARKUP]: {
        directMatch: [],
        extensionPatterns: ['.md', '.markdown', '.rst', '.adoc', '.tex', '.latex', '.org'],
        typeMatch: ['markup', 'prose'],
        namePatterns: ['markdown', 'restructuredtext', 'asciidoc', 'latex', 'tex', 'org'],
    },

    [LEGACY_CATEGORIES.CONFIG]: {
        directMatch: [],
        extensionPatterns: ['.json', '.yaml', '.yml', '.toml', '.ini', '.cfg', '.conf', '.xml', '.env'],
        typeMatch: ['data'],
        namePatterns: ['json', 'yaml', 'toml', 'ini', 'xml', 'config', 'properties'],
    },

    [LEGACY_CATEGORIES.OTHER]: {
        directMatch: [],
        extensionPatterns: [],
        typeMatch: [],
        namePatterns: [],
    },
};

/**
 * Popular languages that are commonly used
 * These receive special treatment in UI/sorting
 */
export const POPULAR_LANGUAGES = new Set([
    'JavaScript',
    'TypeScript',
    'Python',
    'Java',
    'C#',
    'C++',
    'C',
    'Go',
    'Rust',
    'PHP',
    'Ruby',
    'Swift',
    'Kotlin',
    'Dart',
    'Scala',
    'R',
    'MATLAB',
    'Shell',
    'PowerShell',
    'SQL',
    'HTML',
    'CSS',
    'Sass',
    'Less',
]);

/**
 * Language groups that share the same category
 * If a language has a group in Linguist, it inherits categories from the parent
 */
export const LANGUAGE_GROUP_CATEGORIES: Record<string, LanguageCategory[]> = {
    'JavaScript': [LEGACY_CATEGORIES.FRONTEND, LEGACY_CATEGORIES.BACKEND],
    'Python': [LEGACY_CATEGORIES.BACKEND, LEGACY_CATEGORIES.DATA_SCIENCE, LEGACY_CATEGORIES.AI_ML],
    'Java': [LEGACY_CATEGORIES.BACKEND, LEGACY_CATEGORIES.MOBILE],
    'C': [LEGACY_CATEGORIES.SYSTEMS, LEGACY_CATEGORIES.EMBEDDED],
    'C++': [LEGACY_CATEGORIES.SYSTEMS, LEGACY_CATEGORIES.GAME_DEV],
};

/**
 * Default categories when no rule matches
 */
export const DEFAULT_LANGUAGE_CATEGORIES: Record<LanguageType, LanguageCategory[]> = {
    programming: [LEGACY_CATEGORIES.OTHER],
    data: [LEGACY_CATEGORIES.CONFIG],
    markup: [LEGACY_CATEGORIES.MARKUP],
    prose: [LEGACY_CATEGORIES.MARKUP],
};

/**
 * Error messages for language metadata operations
 */
export const LANGUAGE_ERROR_MESSAGES = {
    FETCH_FAILED: 'Failed to fetch language metadata from Linguist',
    PARSE_FAILED: 'Failed to parse Linguist YAML data',
    CACHE_EMPTY: 'Language metadata cache is empty',
    LANGUAGE_NOT_FOUND: (name: string) => `Language not found: ${name}`,
} as const;

/**
 * Log messages for language metadata operations
 */
export const LANGUAGE_LOG_MESSAGES = {
    FETCHING_LINGUIST: 'Fetching language metadata from GitHub Linguist',
    FETCH_SUCCESS: 'Successfully loaded language metadata',
    FETCH_FAILED: 'Failed to fetch Linguist data, using fallback',
    CACHE_HIT: 'Using cached language metadata',
    CACHE_EXPIRED: 'Language metadata cache expired, refreshing',
    CATEGORIZING: 'Categorizing language',
    INITIALIZATION_COMPLETE: 'LanguageMetadataService initialization complete',
} as const;
