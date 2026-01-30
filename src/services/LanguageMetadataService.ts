/**
 * LanguageMetadataService
 *
 * Dynamic language classification service that uses GitHub Linguist as the
 * single source of truth for language definitions. This eliminates all
 * hardcoded language lists and enables automatic support for new languages.
 */

import {
    LanguageCategoryAIService,
    type LanguageInput,
    type LanguageClassificationResult,
} from './LanguageCategoryAIService';

import {
    LanguageCategory,
    LEGACY_CATEGORIES,
    LanguageMetadata,
    LanguageType,
    LinguistLanguageEntry,
    LanguageCacheStatus,
    LanguageStats,
    CategorizedLanguages,
} from '@/types/languages';

import {
    LINGUIST_LANGUAGES_URL,
    LANGUAGE_CACHE_CONFIG,
    LANGUAGE_CATEGORY_RULES,
    DEFAULT_LANGUAGE_CATEGORIES,
    LANGUAGE_LOG_MESSAGES,
    POPULAR_LANGUAGE_ID_THRESHOLD,
} from '@/constants/languages.constants';

import logger from '@/utils/logger';
import { RepositoryModel, UserModel } from '@/models';



// YAML parser - using dynamic import for compatibility
// eslint-disable-next-line no-unused-vars
let yamlParse: ((_content: string) => Record<string, LinguistLanguageEntry>) | undefined;

/**
 * Initialize YAML parser
 */
async function initYamlParser(): Promise<void> {
    if (yamlParse !== undefined) return;

    try {
        // Try to use yaml package if available
        const yamlModule = await import('yaml');
        yamlParse = yamlModule.parse;
    } catch {
        // Fallback to simple YAML parsing for basic cases
        yamlParse = simpleYamlParse;
    }
}

/**
 * Simple YAML parser for basic Linguist YAML structure
 * Only used as fallback if yaml package is not available
 */
function simpleYamlParse(yaml: string): Record<string, LinguistLanguageEntry> {
    const result: Record<string, LinguistLanguageEntry> = {};
    const lines = yaml.split('\n');
    let currentLanguage: string | null = null;
    let currentEntry: LinguistLanguageEntry = {};

    for (const line of lines) {
        // New language definition (no leading whitespace)
        if (line.match(/^[A-Za-z0-9_#+-]+:/) !== null && !line.startsWith(' ')) {
            if (currentLanguage !== null && currentLanguage !== '') {
                result[currentLanguage] = currentEntry;
            }
            currentLanguage = line.replace(':', '').trim();
            currentEntry = {};
        }
        // Property line (with leading whitespace)
        else if (currentLanguage !== null && currentLanguage !== '' && line.startsWith('  ')) {
            const match = line.match(/^\s+(\w+):\s*(.*)$/);
            if (match) {
                const [, key, value] = match;
                if (key === 'type') {
                    currentEntry.type = value.replace(/['"]/g, '');
                } else if (key === 'color') {
                    currentEntry.color = value.replace(/['"]/g, '');
                } else if (key === 'language_id') {
                    currentEntry.language_id = parseInt(value, 10);
                } else if (key === 'group') {
                    currentEntry.group = value.replace(/['"]/g, '');
                }
            }
        }
        // Extension array item
        else if (currentLanguage !== null && currentLanguage !== '' && line.match(/^\s+-\s+['".].?\w+/) !== null) {
            const ext = line.replace(/^\s+-\s+/, '').replace(/['"]/g, '').trim();
            currentEntry.extensions ??= [];
            currentEntry.extensions.push(ext);
        }
    }

    // Add last language
    if (currentLanguage !== null && currentLanguage !== '') {
        result[currentLanguage] = currentEntry;
    }

    return result;
}

/**
 * LanguageMetadataService
 *
 * Provides dynamic language classification based on GitHub Linguist.
 * Singleton pattern for global access with caching.
 */
export class LanguageMetadataService {
    private static instance: LanguageMetadataService | null = null;

    private cache: Map<string, LanguageMetadata> = new Map();
    private categoryCache: Map<LanguageCategory, string[]> = new Map();
    private aliasCache: Map<string, string> = new Map(); // alias -> canonical name
    private extensionToLanguage: Map<string, string> = new Map(); // extension -> language name
    private categoryDefinitions: Map<string, { displayName: string; description: string }> = new Map();
    private lastFetch: Date | null = null;
    private isInitialized = false;
    private initializationPromise: Promise<void> | null = null;

    private constructor() {
        // Private constructor for singleton
    }

    /**
     * Get singleton instance
     */
    public static getInstance(): LanguageMetadataService {
        LanguageMetadataService.instance ??= new LanguageMetadataService();
        return LanguageMetadataService.instance;
    }

    /**
     * Initialize the service (fetch Linguist data)
     * Safe to call multiple times - will only initialize once
     */
    public async initialize(): Promise<void> {
        if (this.isInitialized) {
            return;
        }

        if (this.initializationPromise !== null) {
            return this.initializationPromise;
        }

        this.initializationPromise = this.doInitialize();
        await this.initializationPromise;
    }

    private async doInitialize(): Promise<void> {
        try {
            await initYamlParser();
            await this.fetchLinguistData();
            this.buildAliasCache();
            this.buildExtensionMap();
            this.resolveGroupInheritance();
            this.buildCategoryCache();
            this.isInitialized = true;
            logger.info(LANGUAGE_LOG_MESSAGES.INITIALIZATION_COMPLETE, {
                languageCount: this.cache.size / 2, // Divided by 2 because we store both cases
                aliasCount: this.aliasCache.size,
                extensionCount: this.extensionToLanguage.size,
                categories: Array.from(this.categoryCache.keys()),
            });
        } catch (error) {
            logger.error(LANGUAGE_LOG_MESSAGES.FETCH_FAILED, {
                error: error instanceof Error ? error.message : String(error),
            });
            // Initialize with empty cache - will use fallback logic
            this.isInitialized = true;
        }
    }

    /**
     * Fetch language data from GitHub Linguist
     */
    private async fetchLinguistData(): Promise<void> {
        logger.info(LANGUAGE_LOG_MESSAGES.FETCHING_LINGUIST);

        const controller = new AbortController();
        const timeoutId = setTimeout(
            () => controller.abort(),
            LANGUAGE_CACHE_CONFIG.REQUEST_TIMEOUT_MS
        );

        try {
            const response = await fetch(LINGUIST_LANGUAGES_URL, {
                signal: controller.signal,
                headers: {
                    'Accept': 'text/plain',
                    'User-Agent': 'gh-insight-engine/1.0.0',
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const yamlContent = await response.text();

            if (yamlParse === undefined) {
                throw new Error('YAML parser not initialized');
            }
            const parsed = yamlParse(yamlContent);

            this.cache.clear();

            for (const [name, entry] of Object.entries(parsed)) {
                const metadata = this.transformToMetadata(name, entry);
                this.cache.set(name.toLowerCase(), metadata);
                // Also store with original case for exact matching
                this.cache.set(name, metadata);
            }

            this.lastFetch = new Date();

            logger.info(LANGUAGE_LOG_MESSAGES.FETCH_SUCCESS, {
                languageCount: this.cache.size / 2, // Divided by 2 because we store both cases
                source: 'linguist',
            });
        } finally {
            clearTimeout(timeoutId);
        }
    }

    /**
     * Transform Linguist entry to LanguageMetadata
     */
    private transformToMetadata(
        name: string,
        entry: LinguistLanguageEntry
    ): LanguageMetadata {
        const type = (entry.type ?? 'programming') as LanguageType;
        const languageId = entry.language_id ?? null;

        return {
            name,
            type,
            color: entry.color ?? null,
            extensions: entry.extensions ?? [],
            aliases: entry.aliases ?? [],
            group: entry.group ?? null,
            languageId,
            categories: this.categorizeLanguage(name, type, entry.extensions ?? []),
            // Dynamic popularity based on Linguist language_id
            // Lower IDs were assigned earlier = more established/popular languages
            isPopular: this.isPopularByLinguistId(languageId, type),
        };
    }

    /**
     * Determine if a language is popular based on Linguist language_id
     * Lower IDs indicate older/more established languages
     * Only programming languages are considered for popularity
     */
    private isPopularByLinguistId(languageId: number | null, type: LanguageType): boolean {
        if (type !== 'programming') return false;
        if (languageId === null) return false;
        return languageId < POPULAR_LANGUAGE_ID_THRESHOLD;
    }

    /**
     * Build alias cache for fuzzy language name matching
     */
    private buildAliasCache(): void {
        this.aliasCache.clear();
        for (const [name, metadata] of this.cache.entries()) {
            if (name !== metadata.name) continue; // Skip lowercase duplicates
            for (const alias of metadata.aliases) {
                this.aliasCache.set(alias.toLowerCase(), metadata.name);
            }
        }
    }

    /**
     * Build extension to language mapping for file-based detection
     */
    private buildExtensionMap(): void {
        this.extensionToLanguage.clear();
        for (const [name, metadata] of this.cache.entries()) {
            if (name !== metadata.name) continue; // Skip lowercase duplicates
            for (const ext of metadata.extensions) {
                // Only set if not already mapped (first language wins)
                if (!this.extensionToLanguage.has(ext.toLowerCase())) {
                    this.extensionToLanguage.set(ext.toLowerCase(), metadata.name);
                }
            }
        }
    }

    /**
     * Resolve group inheritance - languages inherit categories from their parent group
     * This is recursive: if TypeScript's group is JavaScript, and JavaScript has categories,
     * TypeScript inherits those categories.
     */
    private resolveGroupInheritance(): void {
        const visited = new Set<string>();

        const resolveRecursive = (languageName: string): LanguageCategory[] => {
            if (visited.has(languageName)) return []; // Prevent cycles
            visited.add(languageName);

            const metadata = this.cache.get(languageName);
            if (!metadata) return [];

            const categories = new Set(metadata.categories);

            // If this language has a group, inherit from parent
            if (metadata.group !== null && metadata.group !== undefined && metadata.group !== '') {
                const parentCategories = resolveRecursive(metadata.group);
                parentCategories.forEach(cat => categories.add(cat));
            }

            visited.delete(languageName); // Allow revisiting from different paths
            return Array.from(categories);
        };

        // Update all languages with inherited categories
        for (const [name, metadata] of this.cache.entries()) {
            if (name !== metadata.name) continue; // Skip lowercase duplicates
            visited.clear();
            const inheritedCategories = resolveRecursive(name);
            metadata.categories = inheritedCategories;

            // Also update lowercase entry
            const lowerEntry = this.cache.get(name.toLowerCase());
            if (lowerEntry) {
                lowerEntry.categories = inheritedCategories;
            }
        }

        logger.debug('Resolved group inheritance for all languages');
    }

    /**
     * Categorize a language based on rules
     */
    private categorizeLanguage(
        name: string,
        type: LanguageType,
        extensions: string[]
    ): LanguageCategory[] {
        const categories = new Set<LanguageCategory>();
        const nameLower = name.toLowerCase();

        // Note: Group inheritance is now handled in resolveGroupInheritance()
        // after all languages are loaded, so we don't check groups here

        // Apply category rules
        for (const [category, rule] of Object.entries(LANGUAGE_CATEGORY_RULES)) {
            const cat = category as LanguageCategory;

            // Skip OTHER category for now
            if (cat === LEGACY_CATEGORIES.OTHER) continue;

            // Check name patterns
            if (rule.namePatterns?.some(pattern => nameLower.includes(pattern.toLowerCase())) === true) {
                categories.add(cat);
                continue;
            }

            // Check extension patterns
            if (extensions.some(ext =>
                rule.extensionPatterns.some(pattern =>
                    ext.toLowerCase() === pattern.toLowerCase()
                )
            )) {
                categories.add(cat);
                continue;
            }

            // Check type match
            if (rule.typeMatch.includes(type)) {
                // Only add if no other categories matched (type is a weak signal)
                // This prevents every programming language from being classified everywhere
            }
        }

        // If no categories matched, use defaults based on type
        if (categories.size === 0) {
            const defaults = DEFAULT_LANGUAGE_CATEGORIES[type] ?? [LEGACY_CATEGORIES.OTHER];
            defaults.forEach(cat => categories.add(cat));
        }

        return Array.from(categories);
    }

    /**
     * Build category cache for fast lookups
     */
    private buildCategoryCache(): void {
        this.categoryCache.clear();

        for (const category of Object.values(LEGACY_CATEGORIES)) {
            this.categoryCache.set(category, []);
        }

        for (const [name, metadata] of this.cache.entries()) {
            // Skip lowercase duplicates
            if (name !== metadata.name) continue;

            for (const category of metadata.categories) {
                const list = this.categoryCache.get(category);
                if (list !== undefined && !list.includes(name)) {
                    list.push(name);
                }
            }
        }
    }

    /**
     * Check if a language belongs to a category
     */
    public isInCategory(languageName: string | null | undefined, category: LanguageCategory): boolean {
        if (languageName === null || languageName === undefined || languageName === '') {
            return false;
        }

        const metadata = this.getLanguageMetadata(languageName);
        if (metadata !== null) {
            return metadata.categories.includes(category);
        }

        // Fallback: check if language name matches any rule patterns
        const rule = LANGUAGE_CATEGORY_RULES[category];
        const nameLower = languageName.toLowerCase();
        return rule.namePatterns?.some(pattern =>
            nameLower.includes(pattern.toLowerCase())
        ) === true;
    }

    /**
     * Get all languages in a category
     */
    public getLanguagesByCategory(category: LanguageCategory): string[] {
        return this.categoryCache.get(category) ?? [];
    }

    /**
     * Get metadata for a specific language
     */
    public getLanguageMetadata(name: string): LanguageMetadata | null {
        // Try exact match first
        let metadata = this.cache.get(name);
        if (metadata !== undefined) return metadata;

        // Try lowercase match
        metadata = this.cache.get(name.toLowerCase());
        if (metadata !== undefined) return metadata;

        return null;
    }

    /**
     * Get all categories for a language
     */
    public getCategoriesForLanguage(languageName: string | null | undefined): LanguageCategory[] {
        if (languageName === null || languageName === undefined || languageName === '') {
            return [LEGACY_CATEGORIES.OTHER];
        }

        const metadata = this.getLanguageMetadata(languageName);
        if (metadata !== null) {
            return metadata.categories;
        }

        return [LEGACY_CATEGORIES.OTHER];
    }

    /**
     * Check if a language is popular
     */
    public isPopular(languageName: string): boolean {
        const metadata = this.getLanguageMetadata(languageName);
        return metadata?.isPopular ?? false;
    }

    /**
     * Get cache status for monitoring
     */
    public getCacheStatus(): LanguageCacheStatus {
        return {
            isLoaded: this.isInitialized,
            lastFetch: this.lastFetch,
            languageCount: this.cache.size / 2, // Divided by 2 because we store both cases
            source: this.cache.size > 0 ? 'linguist' : 'fallback',
            error: null,
        };
    }

    /**
     * Check if cache needs refresh
     */
    public needsRefresh(): boolean {
        if (!this.lastFetch) return true;

        const age = Date.now() - this.lastFetch.getTime();
        return age > LANGUAGE_CACHE_CONFIG.TTL_MS;
    }

    /**
     * Force refresh of Linguist data
     */
    public async refresh(): Promise<void> {
        await this.fetchLinguistData();
        this.buildCategoryCache();
    }

    /**
     * Categorize a list of languages with statistics
     */
    public categorizeLanguages(
        languages: Array<{ name: string; bytes: number; repositoryCount?: number }>
    ): CategorizedLanguages {
        const result: CategorizedLanguages = {
            // Initialize all known categories from cache
            ...Array.from(this.categoryCache.keys()).reduce((acc, cat) => {
                acc[cat] = [];
                return acc;
            }, {} as CategorizedLanguages),
            // Ensure legacy categories are present as fallback/default
            ...Object.values(LEGACY_CATEGORIES).reduce((acc, cat) => {
                acc[cat] ??= [];
                return acc;
            }, {} as CategorizedLanguages),
        };

        const totalBytes = languages.reduce((sum, lang) => sum + lang.bytes, 0);

        for (const lang of languages) {
            const categories = this.getCategoriesForLanguage(lang.name);
            const stats: LanguageStats = {
                name: lang.name,
                bytes: lang.bytes,
                percentage: totalBytes > 0 ? Math.round((lang.bytes / totalBytes) * 100 * 100) / 100 : 0,
                repositoryCount: lang.repositoryCount ?? 0,
                categories,
                isPopular: this.isPopular(lang.name),
            };

            for (const category of categories) {
                result[category].push(stats);
            }
        }

        // Sort each category by bytes
        for (const category of Object.keys(result) as LanguageCategory[]) {
            result[category].sort((a, b) => b.bytes - a.bytes);
        }

        return result;
    }

    // ========================================================================
    // AI-Driven Classification (GPT-5-mini + Structured Outputs)
    // ========================================================================

    /**
     * Classify languages using AI with structured outputs
     *
     * This method sends the aggregated language data to GPT-5-mini
     * and receives a structured classification result.
     *
     * @param languages - Array of languages with names and byte counts
     * @returns Promise resolving to AI-generated classification
     */
    public async classifyLanguagesWithAI(
        languages: LanguageInput[]
    ): Promise<LanguageClassificationResult> {
        logger.info('Starting AI-driven language classification', {
            languageCount: languages.length,
        });

        return LanguageCategoryAIService.classifyLanguages(languages);
    }

    /**
     * Collect languages from user repositories and classify them
     */
    public async collectAndClassifyLanguages(username: string): Promise<void> {
        let userId: string | undefined;
        try {
            // 0. Resolve username to userId (ObjectId)
            const user = await UserModel.findByLogin(username);
            if (!user) {
                logger.warn('User not found for language classification', { username });
                return;
            }
            userId = user.id;

            // 1. Collect all unique languages from all repos
            const result = await RepositoryModel.findByUserId(userId, { limit: 1000 });
            const repositories = result.repositories;

            const languageMap = new Map<string, number>();

            for (const repo of repositories) {
                if (repo.primaryLanguage !== null && repo.primaryLanguage !== '') {
                    // Add primary language
                    // We don't have bytes for primary language easily unless we check languages node
                }

                if (repo.languages !== null && typeof repo.languages === 'object') {
                    const languages = repo.languages as { nodes: Array<{ name: string; size: number }> };
                    if (languages.nodes !== undefined && languages.nodes !== null) {
                        for (const lang of languages.nodes) {
                            languageMap.set(lang.name,
                                (languageMap.get(lang.name) ?? 0) + lang.size);
                        }
                    }
                }
            }

            if (languageMap.size === 0) {
                logger.warn('No languages found to classify for user', { userId });
                return;
            }

            const languageInputs: LanguageInput[] = Array.from(languageMap.entries()).map(([name, bytes]) => ({
                name,
                bytes
            }));

            // 2. Call AI service
            const aiCategories = await this.classifyLanguagesWithAI(languageInputs);

            // 3. Update internal cache with AI-generated categories
            this.updateCategoriesFromAI(aiCategories);

        } catch (error) {
            logger.error('Failed to collect and classify languages', {
                username,
                userId,
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }

    /**
     * Update categories from AI classification result
     */
    public updateCategoriesFromAI(result: LanguageClassificationResult): void {
        // Update definitions
        for (const cat of result.categories) {
            this.categoryDefinitions.set(cat.id, {
                displayName: cat.displayName,
                description: cat.description
            });
        }

        // Update language mappings
        let updatedCount = 0;
        for (const mapping of result.languageToCategories) {
            const { language: languageName, categories: categoryIds } = mapping;

            const metadata = this.getLanguageMetadata(languageName);
            if (metadata) {
                metadata.categories = categoryIds as import('@/types/languages').LanguageCategory[];
                updatedCount++;
            }
            // Also update lowercase variant if needed
            const metadataLower = this.getLanguageMetadata(languageName.toLowerCase());
            if (metadataLower && metadataLower !== metadata) {
                metadataLower.categories = categoryIds as import('@/types/languages').LanguageCategory[];
            }
        }

        // Rebuild category cache
        this.buildCategoryCache();

        logger.info('Updated language categories from AI', {
            languagesUpdated: updatedCount,
            categories: result.categories.length
        });
    }

    /**
     * Get AI classification cache status
     */
    public getAIClassificationCacheStatus(): { isValid: boolean; timestamp: Date | null } {
        return LanguageCategoryAIService.getCacheStatus();
    }

    /**
     * Clear AI classification cache
     */
    public clearAIClassificationCache(): void {
        LanguageCategoryAIService.clearCache();
    }
}

/**
 * Helper function to get the singleton instance
 */
export function getLanguageMetadataService(): LanguageMetadataService {
    return LanguageMetadataService.getInstance();
}

/**
 * Helper function to check if a language is in a category
 * Can be used directly without async initialization
 */
export function isLanguageInCategory(
    languageName: string | null | undefined,
    category: LanguageCategory
): boolean {
    return LanguageMetadataService.getInstance().isInCategory(languageName, category);
}

export default LanguageMetadataService;
