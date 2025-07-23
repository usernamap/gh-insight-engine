import request from 'supertest';
import { Express } from 'express';
import { testLogger, TestStep } from './TestLogger';

export interface TestContext {
    app: Express;
    authToken?: string;
    userId?: string;
    username?: string;
}

export interface ApiTestOptions {
    description: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    endpoint: string;
    expectedStatus: number;
    body?: any;
    headers?: Record<string, string>;
    auth?: boolean;
    validateResponse?: (response: any) => void;
}

export class TestHelpers {
    private context: TestContext;

    constructor(context: TestContext) {
        this.context = context;
    }

    public async makeRequest(options: ApiTestOptions): Promise<any> {
        const startTime = Date.now();
        let response: any;
        let error: string | undefined;

        try {
            // Construire la requête
            const method = options.method.toLowerCase() as 'get' | 'post' | 'put' | 'delete' | 'patch';
            let req = (request(this.context.app) as any)[method](options.endpoint);

            // Ajouter les headers
            if (options.headers) {
                Object.entries(options.headers).forEach(([key, value]) => {
                    req = req.set(key, value);
                });
            }

            // Ajouter l'authentification si nécessaire
            if (options.auth && this.context.authToken) {
                req = req.set('Authorization', `Bearer ${this.context.authToken}`);
            }

            // Ajouter le body si nécessaire
            if (options.body) {
                req = req.send(options.body);
            }

            // Exécuter la requête
            response = await req;

            // Valider la réponse si une fonction de validation est fournie
            if (options.validateResponse) {
                options.validateResponse(response.body);
            }

        } catch (err: any) {
            error = err.message;
            response = err.response || { status: 500 };
        }

        const duration = Date.now() - startTime;

        // Logger le step
        const step: TestStep = {
            step: 0, // Sera défini par le logger
            description: options.description,
            method: options.method,
            endpoint: options.endpoint,
            expectedStatus: options.expectedStatus,
            actualStatus: response?.status,
            duration,
            error,
            data: response?.body,
            headers: response?.headers
        };

        testLogger.logStep(step);

        // Retourner la réponse pour permettre des assertions supplémentaires
        return response;
    }

    public setAuthToken(token: string): void {
        this.context.authToken = token;
    }

    public setUserId(userId: string): void {
        this.context.userId = userId;
    }

    public setUsername(username: string): void {
        this.context.username = username;
    }

    public getContext(): TestContext {
        return this.context;
    }
}

// Données de test prédéfinies - utilise les vraies données d'environnement
export const TestData = {
    validUser: {
        username: process.env.GITHUB_USERNAME || 'test-user',
        fullName: process.env.GITHUB_FULL_NAME || 'Test User',
        githubToken: process.env.GH_TOKEN || 'ghp_' + 'x'.repeat(36)
    },

    invalidUser: {
        username: '',
        fullName: '',
        githubToken: 'invalid-token'
    },

    sampleRepository: {
        owner: process.env.GITHUB_USERNAME || 'test-user',
        repo: 'Hello-World',
        nameWithOwner: `${process.env.GITHUB_USERNAME || 'test-user'}/Hello-World`
    },

    sampleAnalytics: {
        username: process.env.GITHUB_USERNAME || 'test-user',
        includePrivate: false,
        forceRefresh: false,
        maxAge: 3600
    }
};

// Validators pour les réponses
export const ResponseValidators = {
    healthCheck: (response: any) => {
        expect(response).toHaveProperty('status', 'healthy');
        expect(response).toHaveProperty('service');
        expect(response).toHaveProperty('version');
        expect(response).toHaveProperty('timestamp');
        expect(response).toHaveProperty('uptime');
        expect(response).toHaveProperty('environment');
    },

    ping: (response: any) => {
        expect(response).toHaveProperty('message', 'pong');
        expect(response).toHaveProperty('timestamp');
    },

    loginSuccess: (response: any) => {
        expect(response).toHaveProperty('message', 'Authentification réussie');
        expect(response).toHaveProperty('user');
        expect(response).toHaveProperty('tokens');
        expect(response).toHaveProperty('permissions');
        expect(response).toHaveProperty('timestamp');
        expect(response.tokens).toHaveProperty('accessToken');
        expect(response.tokens).toHaveProperty('tokenType', 'Bearer');
        expect(response.tokens).toHaveProperty('expiresIn', '24h');
        expect(response.user).toHaveProperty('id');
        expect(response.user).toHaveProperty('username');
        expect(response.user).toHaveProperty('name');
    },

    userProfile: (response: any) => {
        expect(response).toHaveProperty('id');
        expect(response).toHaveProperty('login');
        expect(response).toHaveProperty('name');
        expect(response).toHaveProperty('followers');
        expect(response).toHaveProperty('following');
        expect(response).toHaveProperty('publicRepos');
        expect(response).toHaveProperty('createdAt');
        expect(response).toHaveProperty('updatedAt');
    },

    repository: (response: any) => {
        expect(response).toHaveProperty('id');
        expect(response).toHaveProperty('nameWithOwner');
        expect(response).toHaveProperty('name');
        expect(response).toHaveProperty('isPrivate');
        expect(response).toHaveProperty('stargazerCount');
        expect(response).toHaveProperty('forkCount');
        expect(response).toHaveProperty('createdAt');
        expect(response).toHaveProperty('updatedAt');
    },

    analyticsOverview: (response: any) => {
        expect(response).toHaveProperty('username');
        expect(response).toHaveProperty('lastUpdated');
        expect(response).toHaveProperty('summary');
        expect(response.summary).toHaveProperty('totalRepositories');
        expect(response.summary).toHaveProperty('totalStars');
        expect(response.summary).toHaveProperty('totalForks');
        expect(response.summary).toHaveProperty('activityScore');
    },

    insightsSummary: (response: any) => {
        expect(response).toHaveProperty('username');
        expect(response).toHaveProperty('generatedAt');
        expect(response).toHaveProperty('summary');
        expect(response.summary).toHaveProperty('profileOverview');
        expect(response.summary).toHaveProperty('keyStrengths');
        expect(response.summary).toHaveProperty('developmentStyle');
    },

    error: (response: any, expectedError?: string) => {
        expect(response).toHaveProperty('error');
        expect(response).toHaveProperty('message');
        expect(response).toHaveProperty('timestamp');
        if (expectedError) {
            expect(response.error).toBe(expectedError);
        }
    },

    validationError: (response: any) => {
        expect(response).toHaveProperty('error', 'VALIDATION_ERROR');
        expect(response).toHaveProperty('message');
        expect(response).toHaveProperty('details');
        expect(Array.isArray(response.details)).toBe(true);
    },

    pagination: (response: any) => {
        expect(response).toHaveProperty('pagination');
        expect(response.pagination).toHaveProperty('page');
        expect(response.pagination).toHaveProperty('limit');
        expect(response.pagination).toHaveProperty('totalPages');
        expect(response.pagination).toHaveProperty('hasNext');
        expect(response.pagination).toHaveProperty('hasPrevious');
    }
};

// Utilitaires pour créer des mocks
export const MockHelpers = {
    createMockUser: (overrides: Partial<any> = {}) => ({
        id: '507f1f77bcf86cd799439011',
        login: process.env.GITHUB_USERNAME || 'test-user',
        name: process.env.GITHUB_FULL_NAME || 'Test User',
        email: `${process.env.GITHUB_USERNAME || 'test-user'}@github.com`,
        avatarUrl: `https://avatars.githubusercontent.com/u/1?v=4`,
        followers: 0,
        following: 0,
        publicRepos: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        type: 'User',
        siteAdmin: false,
        ...overrides
    }),

    createMockRepository: (overrides: Partial<any> = {}) => ({
        id: '1296269',
        nameWithOwner: `${process.env.GITHUB_USERNAME || 'test-user'}/Hello-World`,
        name: 'Hello-World',
        description: null,
        isPrivate: false,
        isArchived: false,
        isFork: false,
        stargazerCount: 0,
        forkCount: 0,
        watchersCount: 0,
        openIssuesCount: 0,
        primaryLanguage: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        pushedAt: new Date().toISOString(),
        ...overrides
    }),

    createMockAnalytics: (overrides: Partial<any> = {}) => ({
        username: process.env.GITHUB_USERNAME || 'test-user',
        lastUpdated: new Date().toISOString(),
        summary: {
            totalRepositories: 0,
            totalStars: 0,
            totalForks: 0,
            totalCommits: 0,
            primaryLanguages: [],
            activityScore: 0
        },
        ...overrides
    })
};

export default TestHelpers; 