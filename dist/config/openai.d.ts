import OpenAI from 'openai';
import { AIAnalysisPrompt } from '@/types/insights';
import type { AnalyticsOverview } from '@/types/analytics';
import type { GitHubRepo } from '@/types/github';
import type { UserProfile } from '@/types/github';
export declare class OpenAIConfig {
    private client;
    initialize(apiKey: string): Promise<void>;
    private testConnection;
    executeAnalysis(prompt: AIAnalysisPrompt, model?: string, maxTokens?: number, temperature?: number): Promise<Record<string, unknown>>;
    private buildUserPrompt;
    private sanitizeDataForPrompt;
    generateDeveloperSummary(userProfile: UserProfile, repositories: GitHubRepo[], analytics: AnalyticsOverview): Promise<Record<string, unknown>>;
    assessTechnicalSkills(userProfile: UserProfile, repositories: GitHubRepo[], analytics: AnalyticsOverview): Promise<Record<string, unknown>>;
    analyzeCareerInsights(userProfile: UserProfile, repositories: GitHubRepo[], analytics: AnalyticsOverview): Promise<Record<string, unknown>>;
    generateRecommendations(userProfile: UserProfile, repositories: GitHubRepo[], analytics: AnalyticsOverview): Promise<Record<string, unknown>>;
    private getPromptTemplate;
    getClient(): OpenAI | null;
    cleanup(): void;
}
export declare const openaiConfig: OpenAIConfig;
export default openaiConfig;
//# sourceMappingURL=openai.d.ts.map