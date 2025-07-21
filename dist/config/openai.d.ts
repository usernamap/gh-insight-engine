import OpenAI from 'openai';
import { AIAnalysisPrompt } from '@/types/insights';
export declare class OpenAIConfig {
    private client;
    private apiKey;
    initialize(apiKey: string): Promise<void>;
    private testConnection;
    executeAnalysis(prompt: AIAnalysisPrompt, model?: string, maxTokens?: number, temperature?: number): Promise<any>;
    private buildUserPrompt;
    private sanitizeDataForPrompt;
    generateDeveloperSummary(userProfile: any, repositories: any[], analytics: any): Promise<any>;
    assessTechnicalSkills(userProfile: any, repositories: any[], analytics: any): Promise<any>;
    analyzeCareerInsights(userProfile: any, repositories: any[], analytics: any): Promise<any>;
    generateRecommendations(userProfile: any, repositories: any[], analytics: any): Promise<any>;
    private getPromptTemplate;
    getClient(): OpenAI | null;
    cleanup(): void;
}
export declare const openaiConfig: OpenAIConfig;
export default openaiConfig;
//# sourceMappingURL=openai.d.ts.map