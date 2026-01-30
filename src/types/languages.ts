/**
 * Language Metadata Types
 * Based on GitHub Linguist schema (languages.yml)
 */



/**
 * Language type as defined by GitHub Linguist
 */
export type LanguageType = 'programming' | 'data' | 'markup' | 'prose';

/**
 * Expertise category for grouping languages by domain
 * Now dynamic string type to support AI-generated categories
 */
export type LanguageCategory = string;

/**
 * Interface for AI-generated language category
 */
export interface AIGeneratedCategory {
    id: string;             // snake_case identifier
    displayName: string;    // Human readable name
    description: string;    // Description of the category
    languages: string[];    // Languages in this category
}

// Deprecated: Kept for backward compatibility during migration
// These will be replaced by AI-generated categories
export const LEGACY_CATEGORIES = {
    FRONTEND: 'frontend',
    BACKEND: 'backend',
    MOBILE: 'mobile',
    DATA_SCIENCE: 'data_science',
    DEVOPS: 'devops',
    AI_ML: 'ai_ml',
    SYSTEMS: 'systems',
    GAME_DEV: 'game_dev',
    EMBEDDED: 'embedded',
    SCRIPTING: 'scripting',
    DATABASE: 'database',
    MARKUP: 'markup',
    CONFIG: 'config',
    OTHER: 'other',
} as const;

/**
 * Metadata for a single language from GitHub Linguist
 */
export interface LanguageMetadata {
    /** Language name (e.g., "TypeScript") */
    name: string;
    /** Language type from Linguist */
    type: LanguageType;
    /** Display color (hex) */
    color: string | null;
    /** File extensions (e.g., [".ts", ".tsx"]) */
    extensions: string[];
    /** Alternative names/aliases */
    aliases: string[];
    /** Parent language group (e.g., "JavaScript" for TypeScript) */
    group: string | null;
    /** Computed expertise categories */
    categories: LanguageCategory[];
    /** Linguist language ID */
    languageId: number | null;
    /** Whether this is a popular/common language */
    isPopular: boolean;
}

/**
 * Rule for categorizing languages
 */
export interface CategoryRule {
    /** Languages directly matching this category */
    directMatch: string[];
    /** File extension patterns */
    extensionPatterns: string[];
    /** Language types that match */
    typeMatch: LanguageType[];
    /** Categories to exclude (for disambiguation) */
    excludeCategories?: LanguageCategory[];
    /** Keywords in language name that suggest this category */
    namePatterns?: string[];
}

/**
 * Linguist YAML entry structure
 */
export interface LinguistLanguageEntry {
    type?: string;
    color?: string;
    extensions?: string[];
    aliases?: string[];
    group?: string;
    language_id?: number;
    tm_scope?: string;
    ace_mode?: string;
    codemirror_mode?: string;
    codemirror_mime_type?: string;
    wrap?: boolean;
    fs_name?: string;
    searchable?: boolean;
}

/**
 * Cache status for language metadata
 */
export interface LanguageCacheStatus {
    isLoaded: boolean;
    lastFetch: Date | null;
    languageCount: number;
    source: 'linguist' | 'fallback' | 'none';
    error: string | null;
}

/**
 * Language statistics for a user/repository
 */
export interface LanguageStats {
    name: string;
    bytes: number;
    percentage: number;
    repositoryCount: number;
    categories: LanguageCategory[];
    isPopular: boolean;
}

/**
 * Categorized language summary
 */
/**
 * Categorized language summary
 * Dynamic keys to support AI-generated categories
 */
export interface CategorizedLanguages {
    [category: string]: LanguageStats[];
}
