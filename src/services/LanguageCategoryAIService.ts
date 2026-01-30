/**
 * Language Category AI Service
 *
 * Uses OpenAI Responses API with Structured Outputs to dynamically classify
 * programming languages into expertise categories.
 *
 * This replaces hardcoded LANGUAGE_CATEGORY_RULES with AI-generated classifications.
 */

import { zodTextFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import openaiConfig from '@/config/openai';
import logger from '@/utils/logger';
import { OPENAI_CONSTANTS } from '@/constants';

// ============================================================================
// Zod Schemas for Structured Outputs
// ============================================================================

/**
 * Schema for a single language category
 */
const LanguageCategoryItemSchema = z.object({
    id: z.string().describe('Category identifier in snake_case (e.g., "frontend", "backend", "data_science")'),
    displayName: z.string().describe('Human-readable category name'),
    description: z.string().describe('Brief description of what this category represents'),
    languages: z.array(z.string()).describe('Array of language names that belong to this category'),
});

/**
 * Schema for the complete AI classification response
 */
const LanguageClassificationSchema = z.object({
    categories: z.array(LanguageCategoryItemSchema)
        .describe('List of all expertise categories with their languages'),
    languageToCategories: z.array(z.object({
        language: z.string(),
        categories: z.array(z.string())
    })).describe('Mapping of each language name to its category IDs'),
    summary: z.string()
        .describe('Brief summary of the classification analysis'),
});

// Export types derived from Zod schemas
export type LanguageCategoryItem = z.infer<typeof LanguageCategoryItemSchema>;
export type LanguageClassificationResult = z.infer<typeof LanguageClassificationSchema>;

// ============================================================================
// Constants
// ============================================================================

const AI_CLASSIFICATION_CONSTANTS = {
    MODEL: OPENAI_CONSTANTS.MODEL,
    MAX_TOKENS: 4096,
    CACHE_TTL_MS: 24 * 60 * 60 * 1000, // 24 hours

    SYSTEM_PROMPT: `You are an expert developer skill classifier.
Given a list of programming languages with their byte counts from GitHub repositories,
classify each language into appropriate expertise/skill categories.

IMPORTANT RULES:
1. Create categories that reflect real developer expertise domains
2. A language CAN belong to MULTIPLE categories (e.g., Python → backend, data_science, ai_ml)
3. Use snake_case for category identifiers (e.g., "frontend", "data_science", "mobile")
4. Consider the typical use cases for each language
5. Include ALL provided languages in languageToCategories mapping
6. Order languages within categories by their byte count (most used first)

SUGGESTED CATEGORIES (you may add others if needed):
- frontend: Web UI technologies (JavaScript, TypeScript, CSS, HTML, Vue, Svelte, etc.)
- backend: Server-side languages (Go, Rust, Java, Python, Ruby, PHP, etc.)
- mobile: iOS/Android development (Swift, Kotlin, Dart, Objective-C, etc.)
- data_science: Statistical/analytical languages (R, Julia, Python, MATLAB, etc.)
- devops: Infrastructure/CI-CD (Dockerfile, HCL, YAML, Shell, etc.)
- ai_ml: Machine learning/AI focused (Python with ML context, Jupyter, etc.)
- systems: Low-level/systems programming (C, C++, Rust, Assembly, Zig, etc.)
- game_dev: Game development (C#, GDScript, GLSL, etc.)
- embedded: Hardware/embedded systems (Arduino, VHDL, Verilog, etc.)
- scripting: Automation/scripting (Shell, PowerShell, Perl, Lua, etc.)
- database: Database query languages (SQL, PL/pgSQL, etc.)
- markup: Document formatting (Markdown, LaTeX, HTML, etc.)
- config: Configuration files (YAML, TOML, JSON, etc.)

Be comprehensive and accurate. Every language in the input MUST appear in languageToCategories.`,

    LOG_MESSAGES: {
        STARTING_CLASSIFICATION: 'Starting AI language classification',
        CLASSIFICATION_COMPLETE: 'AI language classification completed',
        CLASSIFICATION_ERROR: 'AI language classification failed',
        USING_CACHED: 'Using cached AI classification',
        CACHE_EXPIRED: 'AI classification cache expired',
    },
} as const;

// ============================================================================
// Service Interface
// ============================================================================

export interface LanguageInput {
    name: string;
    bytes: number;
}

// ============================================================================
// LanguageCategoryAIService Class
// ============================================================================

/**
 * Service for AI-driven language classification using OpenAI Responses API
 */
export class LanguageCategoryAIService {
    private static cachedResult: LanguageClassificationResult | null = null;
    private static cacheTimestamp: Date | null = null;

    /**
     * Classify languages into categories using AI
     *
     * @param languages - Array of languages with their byte counts
     * @returns Promise resolving to classification result
     */
    public static async classifyLanguages(
        languages: LanguageInput[]
    ): Promise<LanguageClassificationResult> {
        const startTime = Date.now();

        logger.info(AI_CLASSIFICATION_CONSTANTS.LOG_MESSAGES.STARTING_CLASSIFICATION, {
            languageCount: languages.length,
            totalBytes: languages.reduce((sum, l) => sum + l.bytes, 0),
        });

        // Check cache
        if (this.isCacheValid() && this.cachedResult) {
            logger.debug(AI_CLASSIFICATION_CONSTANTS.LOG_MESSAGES.USING_CACHED);
            return this.cachedResult;
        }

        try {
            const result = await this.performAIClassification(languages);

            // Update cache
            this.cachedResult = result;
            this.cacheTimestamp = new Date();

            const processingTime = Date.now() - startTime;
            logger.info(AI_CLASSIFICATION_CONSTANTS.LOG_MESSAGES.CLASSIFICATION_COMPLETE, {
                processingTime: `${processingTime}ms`,
                categoryCount: result.categories.length,
                languagesMapped: Object.keys(result.languageToCategories).length,
            });

            return result;
        } catch (error) {
            logger.error(AI_CLASSIFICATION_CONSTANTS.LOG_MESSAGES.CLASSIFICATION_ERROR, {
                error: error instanceof Error ? error.message : String(error),
            });

            // Return fallback if AI fails
            return this.generateFallbackClassification(languages);
        }
    }

    /**
     * Clear the classification cache
     */
    public static clearCache(): void {
        this.cachedResult = null;
        this.cacheTimestamp = null;
        logger.debug('AI classification cache cleared');
    }

    /**
     * Get cache status
     */
    public static getCacheStatus(): { isValid: boolean; timestamp: Date | null } {
        return {
            isValid: this.isCacheValid(),
            timestamp: this.cacheTimestamp,
        };
    }

    // ========================================================================
    // Private Methods
    // ========================================================================

    private static isCacheValid(): boolean {
        if (this.cachedResult === null || this.cacheTimestamp === null) {
            return false;
        }

        const age = Date.now() - this.cacheTimestamp.getTime();
        if (age > AI_CLASSIFICATION_CONSTANTS.CACHE_TTL_MS) {
            logger.debug(AI_CLASSIFICATION_CONSTANTS.LOG_MESSAGES.CACHE_EXPIRED);
            return false;
        }

        return true;
    }

    private static async performAIClassification(
        languages: LanguageInput[]
    ): Promise<LanguageClassificationResult> {
        const client = openaiConfig.getClient();
        if (client === null) {
            throw new Error('OpenAI client not available');
        }

        // Sort languages by bytes (most used first)
        const sortedLanguages = [...languages].sort((a, b) => b.bytes - a.bytes);

        // Format input for AI
        const languageList = sortedLanguages.map(l => ({
            name: l.name,
            bytes: l.bytes,
            percentage: Math.round((l.bytes / languages.reduce((s, x) => s + x.bytes, 0)) * 100),
        }));

        // Use Responses API with Structured Outputs
        const response = await client.responses.parse({
            model: AI_CLASSIFICATION_CONSTANTS.MODEL,
            input: [
                {
                    role: 'system',
                    content: AI_CLASSIFICATION_CONSTANTS.SYSTEM_PROMPT,
                },
                {
                    role: 'user',
                    content: `Classify these programming languages found in GitHub repositories:\n\n${JSON.stringify(languageList, null, 2)}`,
                },
            ],
            text: {
                format: zodTextFormat(LanguageClassificationSchema, 'classification'),
            },
        });

        // Check response status
        if (response.status === 'incomplete') {
            const reason = response.incomplete_details?.reason ?? 'unknown';
            throw new Error(`AI classification incomplete: ${reason}`);
        }

        // Return parsed result
        if (!response.output_parsed) {
            throw new Error('AI returned empty classification result');
        }

        return response.output_parsed;
    }

    /**
     * Generate fallback classification when AI is unavailable
     */
    private static generateFallbackClassification(
        languages: LanguageInput[]
    ): LanguageClassificationResult {
        // Basic fallback categories based on common patterns
        const fallbackCategories: LanguageCategoryItem[] = [
            {
                id: 'frontend',
                displayName: 'Frontend Development',
                description: 'Web UI and client-side technologies',
                languages: [],
            },
            {
                id: 'backend',
                displayName: 'Backend Development',
                description: 'Server-side and API development',
                languages: [],
            },
            {
                id: 'systems',
                displayName: 'Systems Programming',
                description: 'Low-level and systems programming',
                languages: [],
            },
            {
                id: 'scripting',
                displayName: 'Scripting',
                description: 'Automation and scripting languages',
                languages: [],
            },
            {
                id: 'other',
                displayName: 'Other',
                description: 'Other languages',
                languages: [],
            },
        ];

        const languageToCategories: Array<{ language: string; categories: string[] }> = [];

        // Simple pattern-based fallback classification
        const patterns: Record<string, string[]> = {
            frontend: ['javascript', 'typescript', 'css', 'html', 'vue', 'svelte', 'scss', 'sass'],
            backend: ['python', 'go', 'java', 'ruby', 'php', 'kotlin', 'scala', 'rust'],
            systems: ['c', 'c++', 'assembly', 'zig', 'nim'],
            scripting: ['shell', 'bash', 'powershell', 'perl', 'lua'],
        };

        for (const lang of languages) {
            const nameLower = lang.name.toLowerCase();
            let matched = false;

            for (const [categoryId, patternList] of Object.entries(patterns)) {
                if (patternList.some(p => nameLower.includes(p))) {
                    languageToCategories.push({ language: lang.name, categories: [categoryId] });
                    const category = fallbackCategories.find(c => c.id === categoryId);
                    if (category !== undefined) {
                        category.languages.push(lang.name);
                    }
                    matched = true;
                    break;
                }
            }

            if (!matched) {
                languageToCategories.push({ language: lang.name, categories: ['other'] });
                fallbackCategories[fallbackCategories.length - 1].languages.push(lang.name);
            }
        }

        return {
            categories: fallbackCategories.filter(c => c.languages.length > 0),
            languageToCategories,
            summary: 'Fallback classification (AI unavailable)',
        };
    }
}

export default LanguageCategoryAIService;
