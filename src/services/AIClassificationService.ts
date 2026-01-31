/**
 * AI Classification Service
 *
 * Unified service for AI-driven classification of:
 * 1. Programming Languages (Expertise Categories)
 * 2. Technology Stack (Libraries, Frameworks, Infrastructure)
 *
 * Uses OpenAI Responses API with Structured Outputs.
 */

import { zodResponseFormat } from 'openai/helpers/zod';
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

/**
 * Schema for Tech Stack Analysis (Internal AI Response)
 * OpenAI Strict Mode requires concrete objects, avoiding dynamic keys (z.record).
 */
const TechStackAIResponseSchema = z.object({
    categories: z.array(z.object({
        category: z.string(),
        items: z.array(z.string())
    })).describe('Categorized technologies'),

    raw_sources: z.array(z.object({
        technology: z.string(),
        files: z.array(z.string())
    })).describe('Source files for each technology'),

    ignored_items: z.array(z.string())
        .describe('List of items identified as noise/utilities and ignored (e.g., "is-odd", "chalk")'),
});

/**
 * Schema for Tech Stack Analysis (Public Output)
 */
export const TechStackSchema = z.object({
    categories: z.record(z.string(), z.array(z.string()))
        .describe('Categorized technologies. Key = Category (e.g., "database", "payment"), Value = List of specific technologies (e.g., "PostgreSQL", "Stripe")'),
    raw_sources: z.record(z.string(), z.array(z.string()))
        .describe('Mapping of Technology Name -> Source Files where it was detected. e.g., "Stripe": ["package.json", "utils/billing.ts"]'),
    ignored_items: z.array(z.string())
        .describe('List of items identified as noise/utilities and ignored (e.g., "is-odd", "chalk")'),
});


// Export types derived from Zod schemas
export type LanguageCategoryItem = z.infer<typeof LanguageCategoryItemSchema>;
export type LanguageClassificationResult = z.infer<typeof LanguageClassificationSchema>;
export type TechStackResult = z.infer<typeof TechStackSchema>;

// Input types
export interface LanguageInput {
    name: string;
    bytes: number;
}

export interface RawArtifactInput {
    repoName: string;
    source: string;
    path: string;
    content?: string;
    dependencies?: string[];
}

// ============================================================================
// Constants
// ============================================================================

const AI_CLASSIFICATION_CONSTANTS = {
    MODEL: OPENAI_CONSTANTS.MODEL, // 'gpt-5-mini' or alias
    MAX_TOKENS: 4096,
    CACHE_TTL_MS: 24 * 60 * 60 * 1000, // 24 hours

    SYSTEM_PROMPT_LANGUAGES: `You are an expert developer skill classifier.
Given a list of programming languages with their byte counts from GitHub repositories,
classify each language into appropriate expertise/skill categories.

IMPORTANT RULES:
1. Create categories that reflect real developer expertise domains
2. A language CAN belong to MULTIPLE categories (e.g., Python → backend, data_science, ai_ml)
3. Use snake_case for category identifiers (e.g., "frontend", "data_science", "mobile")
4. Consider the typical use cases for each language
5. Include ALL provided languages in languageToCategories mapping
6. Order languages within categories by their byte count (most used first)
`,

    SYSTEM_PROMPT_TECH: `You are an expert Technology Stack Curator.
Given a raw list of "artifacts" (dependencies from package.json, docker-compose services, Terraform resources) found in GitHub repositories,
your goal is to filtering the NOISE and extracting the SIGNAL.

OBJECTIVE:
Create a high-level, executive summary of the technology stack.

RULES:
1. **FILTER NOISE**: Ignore utility libraries (e.g., lodash, moment, chalk, is-odd, prettier, eslint). 
   We only want "Resume Worthy" technologies.
2. **CATEGORIZE**: Group them logically.
   - database: PostgreSQL, MongoDB, Redis...
   - frontend: React, Vue, Next.js, Tailwind...
   - backend: NestJS, Express, Django...
   - cloud: AWS, Vercel, Firebase...
   - devops: Docker, Kubernetes, Terraform...
   - payment: Stripe, PayPal...
   - ai: OpenAI SDK, LangChain...
3. **SOURCE TRACKING**: You MUST map each kept technology back to the file(s) where it was found.
`,

    LOG_MESSAGES: {
        STARTING_CLASSIFICATION: 'Starting AI language classification',
        CLASSIFICATION_COMPLETE: 'AI language classification completed',
        CLASSIFICATION_ERROR: 'AI language classification failed',
        USING_CACHED: 'Using cached AI classification',
        CACHE_EXPIRED: 'AI classification cache expired',
    },
} as const;


// ============================================================================
// AIClassificationService Class
// ============================================================================

export class AIClassificationService {
    private static languageCache: LanguageClassificationResult | null = null;
    private static languageCacheTs: Date | null = null;

    /**
     * Refine Raw Artifacts into a Structured Tech Stack
     */
    public static async refineTechnologyStack(
        artifacts: RawArtifactInput[]
    ): Promise<TechStackResult> {
        const client = openaiConfig.getClient();
        if (!client) throw new Error('OpenAI client not available');

        logger.info('Starting AI Tech Stack Refinement', { artifactCount: artifacts.length });

        // Simplify input for AI (reduce token usage)
        // We just need to know "what" and "where"
        const simplifiedInput = artifacts.map(a => {
            if (a.dependencies) {
                return {
                    source: a.source,
                    file: `${a.repoName}/${a.path}`,
                    dependencies_found: a.dependencies
                };
            }
            return {
                source: a.source,
                file: `${a.repoName}/${a.path}`,
                content_snippet: (a.content != null && a.content !== '') ? a.content.substring(0, 500) : 'binary-or-large' // Truncate content
            };
        });

        // Use standard chat completions with structured output helper
        const response = await client.chat.completions.create({
            model: AI_CLASSIFICATION_CONSTANTS.MODEL,
            messages: [
                { role: 'system', content: AI_CLASSIFICATION_CONSTANTS.SYSTEM_PROMPT_TECH },
                { role: 'user', content: JSON.stringify(simplifiedInput) }
            ],
            response_format: zodResponseFormat(TechStackAIResponseSchema, 'tech_stack')
        });

        const content = response.choices[0].message.content;
        if (content == null || content === '') {
            throw new Error('AI returned empty content');
        }

        const aiResult = JSON.parse(content);

        // Transform array-based result back to Record-based result
        const categories: Record<string, string[]> = {};
        for (const cat of aiResult.categories) {
            categories[cat.category] = cat.items;
        }

        const raw_sources: Record<string, string[]> = {};
        for (const src of aiResult.raw_sources) {
            raw_sources[src.technology] = src.files;
        }

        const result: TechStackResult = {
            categories,
            raw_sources,
            ignored_items: aiResult.ignored_items
        };

        logger.info('AI Tech Stack Refinement Complete', {
            categories: Object.keys(result.categories).length,
            technologies: Object.values(result.categories).flat().length
        });

        return result;
    }

    /**
     * Classify languages into categories using AI (Legacy/Core feature)
     */
    public static async classifyLanguages(
        languages: LanguageInput[]
    ): Promise<LanguageClassificationResult> {
        // ... (Logic copied from previous service) ...
        // Implementing strict caching for languages as before
        if (this.isLanguageCacheValid() && this.languageCache) {
            return this.languageCache;
        }

        try {
            const result = await this.performLanguageClassification(languages);
            this.languageCache = result;
            this.languageCacheTs = new Date();
            return result;
        } catch (error) {
            logger.error('Language classification failed, using fallback', { error: String(error) });
            return this.generateFallbackLanguageClassification(languages);
        }
    }

    private static isLanguageCacheValid(): boolean {
        if (!this.languageCache || !this.languageCacheTs) return false;
        return (Date.now() - this.languageCacheTs.getTime()) < AI_CLASSIFICATION_CONSTANTS.CACHE_TTL_MS;
    }

    private static async performLanguageClassification(languages: LanguageInput[]): Promise<LanguageClassificationResult> {
        const client = openaiConfig.getClient();
        if (!client) throw new Error('OpenAI client not available');

        const response = await client.chat.completions.create({
            model: AI_CLASSIFICATION_CONSTANTS.MODEL,
            messages: [
                { role: 'system', content: AI_CLASSIFICATION_CONSTANTS.SYSTEM_PROMPT_LANGUAGES },
                { role: 'user', content: JSON.stringify(languages) }
            ],
            response_format: zodResponseFormat(LanguageClassificationSchema, 'classification')
        });

        const content = response.choices[0].message.content;
        if (content == null || content === '') throw new Error('Empty AI response');

        return JSON.parse(content);
    }

    // Kept for resilience - simplistic fallback
    private static generateFallbackLanguageClassification(languages: LanguageInput[]): LanguageClassificationResult {
        return {
            categories: [], // Populate if needed
            languageToCategories: languages.map(l => ({ language: l.name, categories: ['unknown'] })),
            summary: 'Fallback: AI Unavailable'
        };
    }

    // Helper used by tests/other services to clear cache
    public static clearCache(): void {
        this.languageCache = null;
        this.languageCacheTs = null;
    }

    /**
     * Get cache status
     */
    public static getCacheStatus(): { isValid: boolean; timestamp: Date | null } {
        return {
            isValid: this.isLanguageCacheValid(),
            timestamp: this.languageCacheTs,
        };
    }
}

export default AIClassificationService;
