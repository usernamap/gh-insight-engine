"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.openaiConfig = exports.OpenAIConfig = void 0;
const openai_1 = __importDefault(require("openai"));
const logger_1 = __importDefault(require("@/utils/logger"));
class OpenAIConfig {
    constructor() {
        this.client = null;
        this.apiKey = null;
    }
    async initialize(apiKey) {
        this.apiKey = apiKey;
        this.client = new openai_1.default({
            apiKey,
            timeout: 60000,
            maxRetries: 3,
        });
        await this.testConnection();
        logger_1.default.info('Configuration OpenAI initialisée avec succès');
    }
    async testConnection() {
        if (!this.client) {
            throw new Error('Client OpenAI non initialisé');
        }
        try {
            const response = await this.client.completions.create({
                model: 'gpt-3.5-turbo-instruct',
                prompt: 'Test connection',
                max_tokens: 5,
            });
            logger_1.default.debug('Test de connexion OpenAI réussi', {
                model: response.model,
                usage: response.usage,
            });
        }
        catch (error) {
            logger_1.default.error('Échec du test de connexion OpenAI', { error: error.message });
            throw new Error(`Connexion OpenAI échouée: ${error.message}`);
        }
    }
    async executeAnalysis(prompt, model = 'gpt-4', maxTokens = 2000, temperature = 0.7) {
        if (!this.client) {
            throw new Error('Client OpenAI non initialisé');
        }
        const startTime = Date.now();
        try {
            logger_1.default.info('Démarrage analyse IA', {
                analysisType: prompt.analysisType,
                model,
                maxTokens,
            });
            const response = await this.client.chat.completions.create({
                model,
                messages: [
                    {
                        role: 'system',
                        content: prompt.systemPrompt,
                    },
                    {
                        role: 'user',
                        content: this.buildUserPrompt(prompt),
                    },
                ],
                max_tokens: maxTokens,
                temperature,
                response_format: { type: 'json_object' },
            });
            const processingTime = (Date.now() - startTime) / 1000;
            const result = JSON.parse(response.choices[0].message.content || '{}');
            logger_1.default.info('Analyse IA terminée avec succès', {
                analysisType: prompt.analysisType,
                processingTime,
                inputTokens: response.usage?.prompt_tokens,
                outputTokens: response.usage?.completion_tokens,
                totalTokens: response.usage?.total_tokens,
            });
            return {
                result,
                metadata: {
                    model: response.model,
                    processingTime,
                    tokens: {
                        input: response.usage?.prompt_tokens || 0,
                        output: response.usage?.completion_tokens || 0,
                        total: response.usage?.total_tokens || 0,
                    },
                },
            };
        }
        catch (error) {
            const processingTime = (Date.now() - startTime) / 1000;
            logger_1.default.error('Erreur lors de l\'analyse IA', {
                analysisType: prompt.analysisType,
                error: error.message,
                processingTime,
            });
            throw new Error(`Analyse IA échouée: ${error.message}`);
        }
    }
    buildUserPrompt(prompt) {
        const { userProfile, repositories, analytics } = prompt.dataContext;
        const contextData = {
            userProfile: this.sanitizeDataForPrompt(userProfile),
            repositoriesCount: repositories.length,
            repositories: repositories.slice(0, 10).map(repo => ({
                name: repo.nameWithOwner,
                description: repo.description,
                primaryLanguage: repo.primaryLanguage,
                stars: repo.stargazerCount,
                forks: repo.forkCount,
                isPrivate: repo.isPrivate,
                pushedAt: repo.pushedAt,
                topics: repo.topics?.slice(0, 5),
            })),
            analytics: this.sanitizeDataForPrompt(analytics),
        };
        return `${prompt.userPrompt}\n\nCONTEXTE DES DONNÉES:\n${JSON.stringify(contextData, null, 2)}`;
    }
    sanitizeDataForPrompt(data) {
        if (!data)
            return null;
        const sensitiveFields = ['email', 'token', 'apiKey', '_id', 'password'];
        if (Array.isArray(data)) {
            return data.map(item => this.sanitizeDataForPrompt(item));
        }
        if (typeof data === 'object' && data !== null) {
            const sanitized = {};
            for (const [key, value] of Object.entries(data)) {
                if (!sensitiveFields.includes(key.toLowerCase())) {
                    sanitized[key] = this.sanitizeDataForPrompt(value);
                }
            }
            return sanitized;
        }
        return data;
    }
    async generateDeveloperSummary(userProfile, repositories, analytics) {
        const prompt = {
            systemPrompt: this.getPromptTemplate('developer-summary').systemPrompt,
            userPrompt: this.getPromptTemplate('developer-summary').userPromptTemplate,
            dataContext: { userProfile, repositories, analytics },
            analysisType: 'personality',
        };
        return this.executeAnalysis(prompt);
    }
    async assessTechnicalSkills(userProfile, repositories, analytics) {
        const prompt = {
            systemPrompt: this.getPromptTemplate('skills-assessment').systemPrompt,
            userPrompt: this.getPromptTemplate('skills-assessment').userPromptTemplate,
            dataContext: { userProfile, repositories, analytics },
            analysisType: 'skills',
        };
        return this.executeAnalysis(prompt);
    }
    async analyzeCareerInsights(userProfile, repositories, analytics) {
        const prompt = {
            systemPrompt: this.getPromptTemplate('career-insights').systemPrompt,
            userPrompt: this.getPromptTemplate('career-insights').userPromptTemplate,
            dataContext: { userProfile, repositories, analytics },
            analysisType: 'career',
        };
        return this.executeAnalysis(prompt);
    }
    async generateRecommendations(userProfile, repositories, analytics) {
        const prompt = {
            systemPrompt: this.getPromptTemplate('recommendations').systemPrompt,
            userPrompt: this.getPromptTemplate('recommendations').userPromptTemplate,
            dataContext: { userProfile, repositories, analytics },
            analysisType: 'recommendations',
        };
        return this.executeAnalysis(prompt);
    }
    getPromptTemplate(name) {
        const templates = {
            'developer-summary': {
                name: 'developer-summary',
                version: '1.0.0',
                systemPrompt: `Tu es un expert en analyse de profils de développeurs. Analyse les données GitHub fournies pour créer un résumé de personnalité développeur. Retourne un JSON avec les champs: archetype, description, strengths, workingStyle, motivations, potentialChallenges.`,
                userPromptTemplate: `Analyse ce profil de développeur et détermine son archétype principal, son style de travail, ses forces et défis potentiels. Base ton analyse sur les repositories, langages, patterns de commits et collaboration.`,
                variables: ['userProfile', 'repositories', 'analytics'],
                outputFormat: 'json',
                maxTokens: 1500,
                temperature: 0.7,
            },
            'skills-assessment': {
                name: 'skills-assessment',
                version: '1.0.0',
                systemPrompt: `Tu es un expert en évaluation des compétences techniques. Analyse les données GitHub pour évaluer les compétences techniques et soft skills. Retourne un JSON avec les champs: technical, soft, leadership.`,
                userPromptTemplate: `Évalue les compétences techniques de ce développeur basé sur ses repositories, langages utilisés, types de projets, et patterns de collaboration. Inclus le niveau de maîtrise et les preuves pour chaque compétence.`,
                variables: ['userProfile', 'repositories', 'analytics'],
                outputFormat: 'json',
                maxTokens: 2000,
                temperature: 0.6,
            },
            'career-insights': {
                name: 'career-insights',
                version: '1.0.0',
                systemPrompt: `Tu es un conseiller en carrière spécialisé en développement logiciel. Analyse le profil pour fournir des insights sur le niveau actuel, la trajectoire et les opportunités de carrière. Retourne un JSON avec les champs: currentLevel, trajectory, suitableRoles, marketPosition.`,
                userPromptTemplate: `Analyse la trajectoire de carrière de ce développeur. Détermine son niveau actuel, sa direction de croissance, les rôles qui lui conviendraient et sa position sur le marché.`,
                variables: ['userProfile', 'repositories', 'analytics'],
                outputFormat: 'json',
                maxTokens: 1800,
                temperature: 0.5,
            },
            'recommendations': {
                name: 'recommendations',
                version: '1.0.0',
                systemPrompt: `Tu es un mentor technique expérimenté. Génère des recommandations personnalisées pour améliorer les compétences et la carrière. Retourne un JSON avec les champs: immediate, shortTerm, longTerm.`,
                userPromptTemplate: `Génère des recommandations concrètes et actionnables pour ce développeur. Inclus des suggestions immédiates, à court terme et à long terme avec des ressources spécifiques.`,
                variables: ['userProfile', 'repositories', 'analytics'],
                outputFormat: 'json',
                maxTokens: 2000,
                temperature: 0.8,
            },
        };
        const template = templates[name];
        if (!template) {
            throw new Error(`Template de prompt '${name}' non trouvé`);
        }
        return template;
    }
    getClient() {
        return this.client;
    }
    cleanup() {
        this.client = null;
        this.apiKey = null;
        logger_1.default.info('Configuration OpenAI nettoyée');
    }
}
exports.OpenAIConfig = OpenAIConfig;
exports.openaiConfig = new OpenAIConfig();
exports.default = exports.openaiConfig;
//# sourceMappingURL=openai.js.map