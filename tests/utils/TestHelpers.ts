import request from 'supertest';
import { Express } from 'express';
import { testLogger, TestStep } from './TestLogger';
import { sharedContext, SharedTestContext } from '../setup';

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
    saveToContext?: string; // Clé pour sauvegarder la réponse dans le contexte partagé
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
            if (options.auth && (this.context.authToken || sharedContext.authToken)) {
                const token = this.context.authToken || sharedContext.authToken;
                req = req.set('Authorization', `Bearer ${token}`);
            }

            // Ajouter le body si nécessaire
            if (options.body) {
                req = req.send(options.body);
            }

            // Exécuter la requête
            response = await req;

            // Sauvegarder dans le contexte partagé si demandé
            if (options.saveToContext && response.body) {
                this.saveToSharedContext(options.saveToContext, response.body);
            }

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

    private saveToSharedContext(key: string, data: any): void {
        switch (key) {
            case 'authToken':
                sharedContext.authToken = data.data?.token || data.tokens?.accessToken;
                this.context.authToken = sharedContext.authToken;
                break;
            case 'userData':
                sharedContext.userData = data.data || data;
                break;
            case 'repositories':
                sharedContext.repositories = data.data || data;
                break;
            case 'analytics':
                sharedContext.analytics = data.data || data;
                break;
            case 'insights':
                sharedContext.insights = data.data || data;
                break;
            default:
                // Sauvegarder avec la clé personnalisée
                (sharedContext as any)[key] = data.data || data;
        }
    }

    public setAuthToken(token: string): void {
        this.context.authToken = token;
        sharedContext.authToken = token;
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

    public getSharedContext(): SharedTestContext {
        return sharedContext;
    }

    // Méthode pour vérifier que les données réelles sont disponibles
    public validateRealDataAvailability(): void {
        if (!sharedContext.githubToken || sharedContext.githubToken === 'your_github_classic_token_here') {
            throw new Error('GitHub token not configured. Please set up .env.test with real values.');
        }
        if (!sharedContext.username || sharedContext.username === 'your_github_username_here') {
            throw new Error('GitHub username not configured. Please set up .env.test with real values.');
        }
    }
}

// Données de test utilisant les vraies valeurs de l'environnement
export const TestData = {
    validUser: {
        username: sharedContext.username,
        fullName: sharedContext.fullName,
        githubToken: sharedContext.githubToken
    },

    invalidUser: {
        username: 'nonexistent-user-12345',
        fullName: 'Nonexistent User',
        githubToken: 'ghp_invalid_token_1234567890abcdef'
    },

    // Repository de test - utilise un repo public connu ou le premier repo de l'utilisateur
    sampleRepository: {
        owner: sharedContext.username,
        repo: 'Hello-World', // Sera mis à jour dynamiquement avec de vraies données
        nameWithOwner: `${sharedContext.username}/Hello-World`
    },

    sampleAnalytics: {
        username: sharedContext.username,
        includePrivate: false,
        forceRefresh: false,
        maxAge: 3600
    }
};

// Validators pour les réponses avec données réelles
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
        expect(response.user).toHaveProperty('username', sharedContext.username);
        expect(response.user).toHaveProperty('name', sharedContext.fullName);
    },

    userProfile: (response: any) => {
        expect(response).toHaveProperty('id');
        expect(response).toHaveProperty('login', sharedContext.username);
        expect(response).toHaveProperty('name', sharedContext.fullName);
        expect(response).toHaveProperty('followers');
        expect(response).toHaveProperty('following');
        expect(response).toHaveProperty('publicRepos');
        expect(response).toHaveProperty('createdAt');
        expect(response).toHaveProperty('updatedAt');
        expect(typeof response.followers).toBe('number');
        expect(typeof response.following).toBe('number');
        expect(typeof response.publicRepos).toBe('number');
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
        expect(typeof response.stargazerCount).toBe('number');
        expect(typeof response.forkCount).toBe('number');
        expect(typeof response.isPrivate).toBe('boolean');
    },

    repositoryList: (response: any) => {
        expect(Array.isArray(response)).toBe(true);
        if (response.length > 0) {
            response.forEach((repo: any) => {
                ResponseValidators.repository(repo);
            });
        }
    },

    analyticsOverview: (response: any) => {
        expect(response).toHaveProperty('username', sharedContext.username);
        expect(response).toHaveProperty('lastUpdated');
        expect(response).toHaveProperty('summary');
        expect(response.summary).toHaveProperty('totalRepositories');
        expect(response.summary).toHaveProperty('totalStars');
        expect(response.summary).toHaveProperty('totalForks');
        expect(response.summary).toHaveProperty('activityScore');
        expect(typeof response.summary.totalRepositories).toBe('number');
        expect(typeof response.summary.totalStars).toBe('number');
        expect(typeof response.summary.totalForks).toBe('number');
        expect(typeof response.summary.activityScore).toBe('number');
    },

    insightsSummary: (response: any) => {
        expect(response).toHaveProperty('username', sharedContext.username);
        expect(response).toHaveProperty('generatedAt');
        expect(response).toHaveProperty('summary');
        expect(response.summary).toHaveProperty('profileOverview');
        expect(response.summary).toHaveProperty('keyStrengths');
        expect(response.summary).toHaveProperty('developmentStyle');
        expect(typeof response.summary.profileOverview).toBe('string');
        expect(Array.isArray(response.summary.keyStrengths)).toBe(true);
        expect(typeof response.summary.developmentStyle).toBe('string');
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

// Utilitaires pour travailler avec des données réelles
export const RealDataHelpers = {
    // Attendre que les données soient disponibles dans le contexte partagé
    waitForContextData: async (key: keyof SharedTestContext, maxWaitMs: number = 10000): Promise<any> => {
        const startTime = Date.now();
        while (Date.now() - startTime < maxWaitMs) {
            if (sharedContext[key]) {
                return sharedContext[key];
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        throw new Error(`Timeout waiting for ${key} in shared context`);
    },

    // Vérifier que les données du contexte sont cohérentes
    validateContextConsistency: (): void => {
        if (sharedContext.userData) {
            expect(sharedContext.userData.login || sharedContext.userData.username).toBe(sharedContext.username);
        }
        if (sharedContext.repositories && Array.isArray(sharedContext.repositories)) {
            sharedContext.repositories.forEach((repo: any) => {
                expect(repo.nameWithOwner || repo.full_name).toContain(sharedContext.username);
            });
        }
        if (sharedContext.analytics) {
            expect(sharedContext.analytics.username).toBe(sharedContext.username);
        }
        if (sharedContext.insights) {
            expect(sharedContext.insights.username).toBe(sharedContext.username);
        }
    },

    // Obtenir un repository réel de l'utilisateur pour les tests
    getFirstRealRepository: (): any => {
        if (sharedContext.repositories && sharedContext.repositories.length > 0) {
            return sharedContext.repositories[0];
        }
        return null;
    },

    // Mettre à jour les données de test avec des valeurs réelles
    updateTestDataWithRealValues: (): void => {
        const firstRepo = RealDataHelpers.getFirstRealRepository();
        if (firstRepo) {
            TestData.sampleRepository.repo = firstRepo.name;
            TestData.sampleRepository.nameWithOwner = firstRepo.nameWithOwner || firstRepo.full_name;
        }
    }
};

export default TestHelpers; 