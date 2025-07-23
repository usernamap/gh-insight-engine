import { describe, test, beforeAll, afterAll } from '@jest/globals';
import { Express } from 'express';
import { createApp } from '../src/app';
import { testLogger } from './utils/TestLogger';
import TestHelpers, { TestContext, TestData, ResponseValidators } from './utils/TestHelpers';
import { sharedContext } from './setup';

describe('Authentication Endpoints - REAL GitHub Data', () => {
    let app: Express;
    let testHelpers: TestHelpers;

    beforeAll(async () => {
        testLogger.startSuite(
            'Authentication Endpoints - REAL GitHub Data',
            `Tests complets du flow d'authentification avec de vraies données GitHub pour l'utilisateur: ${sharedContext.username}`
        );

        // Initialiser l'application
        // @ts-ignore - Express type error
        app = await createApp();

        const context: TestContext = { app };
        testHelpers = new TestHelpers(context);

        // Valider que les données réelles sont disponibles
        testHelpers.validateRealDataAvailability();

        testLogger.logInfo(`🔑 Utilisation du token GitHub réel: ${sharedContext.githubToken.substring(0, 10)}...`);
        testLogger.logInfo(`👤 Utilisateur GitHub: ${sharedContext.username}`);
        testLogger.logInfo(`📝 Nom complet: ${sharedContext.fullName}`);
    });

    afterAll(() => {
        testLogger.endSuite();
    });

    describe('POST /api/auth/login', () => {
        test('Login successful with REAL GitHub credentials', async () => {
            const response = await testHelpers.makeRequest({
                description: `Connexion réussie avec les vraies données GitHub de ${sharedContext.username}`,
                method: 'POST',
                endpoint: '/api/auth/login',
                expectedStatus: 200,
                body: TestData.validUser,
                validateResponse: ResponseValidators.loginSuccess,
                saveToContext: 'authToken' // Sauvegarder le token pour les tests suivants
            });

            // Vérifications spécifiques aux données réelles
            expect(response.body.user.username).toBe(sharedContext.username);
            expect(response.body.user.name).toBe(sharedContext.fullName);
            expect(response.body.tokens.accessToken).toBeDefined();
            expect(typeof response.body.tokens.accessToken).toBe('string');

            // Le token est maintenant sauvegardé dans sharedContext.authToken
            testLogger.logSuccess(`✅ Token d'authentification généré et sauvegardé pour ${sharedContext.username}`);
        });

        test('Login failure with invalid GitHub token', async () => {
            await testHelpers.makeRequest({
                description: 'Échec de connexion avec un token GitHub invalide',
                method: 'POST',
                endpoint: '/api/auth/login',
                expectedStatus: 401,
                body: TestData.invalidUser,
                validateResponse: (response) => {
                    ResponseValidators.error(response, 'AUTHENTICATION_FAILED');
                    expect(response.message).toContain('GitHub');
                }
            });
        });

        test('Login failure with missing credentials', async () => {
            await testHelpers.makeRequest({
                description: 'Échec de connexion avec des identifiants manquants',
                method: 'POST',
                endpoint: '/api/auth/login',
                expectedStatus: 400,
                body: {},
                validateResponse: ResponseValidators.validationError
            });
        });

        test('Login failure with empty username', async () => {
            await testHelpers.makeRequest({
                description: 'Échec de connexion avec nom d\'utilisateur vide',
                method: 'POST',
                endpoint: '/api/auth/login',
                expectedStatus: 400,
                body: {
                    username: '',
                    fullName: sharedContext.fullName,
                    githubToken: sharedContext.githubToken
                },
                validateResponse: ResponseValidators.validationError
            });
        });

        test('Login failure with empty GitHub token', async () => {
            await testHelpers.makeRequest({
                description: 'Échec de connexion avec token GitHub vide',
                method: 'POST',
                endpoint: '/api/auth/login',
                expectedStatus: 400,
                body: {
                    username: sharedContext.username,
                    fullName: sharedContext.fullName,
                    githubToken: ''
                },
                validateResponse: ResponseValidators.validationError
            });
        });
    });

    describe('GET /api/auth/validate', () => {
        test('Token validation success with REAL auth token', async () => {
            // Utiliser le token sauvegardé dans le contexte partagé
            await testHelpers.makeRequest({
                description: `Validation réussie du token d'authentification pour ${sharedContext.username}`,
                method: 'GET',
                endpoint: '/api/auth/validate',
                expectedStatus: 200,
                auth: true,
                validateResponse: (response) => {
                    expect(response).toHaveProperty('valid', true);
                    expect(response).toHaveProperty('user');
                    expect(response.user).toHaveProperty('username', sharedContext.username);
                    expect(response).toHaveProperty('permissions');
                    expect(response).toHaveProperty('expiresAt');
                }
            });
        });

        test('Token validation failure without token', async () => {
            await testHelpers.makeRequest({
                description: 'Échec de validation sans token d\'authentification',
                method: 'GET',
                endpoint: '/api/auth/validate',
                expectedStatus: 401,
                auth: false,
                validateResponse: (response) => {
                    ResponseValidators.error(response, 'MISSING_TOKEN');
                }
            });
        });

        test('Token validation failure with invalid token', async () => {
            await testHelpers.makeRequest({
                description: 'Échec de validation avec token invalide',
                method: 'GET',
                endpoint: '/api/auth/validate',
                expectedStatus: 401,
                headers: {
                    'Authorization': 'Bearer invalid-token-123'
                },
                validateResponse: (response) => {
                    ResponseValidators.error(response, 'INVALID_TOKEN');
                }
            });
        });
    });

    describe('POST /api/auth/refresh', () => {
        test('Token refresh success with REAL auth token', async () => {
            await testHelpers.makeRequest({
                description: `Renouvellement réussi du token pour ${sharedContext.username}`,
                method: 'POST',
                endpoint: '/api/auth/refresh',
                expectedStatus: 200,
                auth: true,
                validateResponse: (response) => {
                    expect(response).toHaveProperty('message', 'Token renouvelé avec succès');
                    expect(response).toHaveProperty('tokens');
                    expect(response.tokens).toHaveProperty('accessToken');
                    expect(response.tokens).toHaveProperty('tokenType', 'Bearer');
                    expect(response.tokens).toHaveProperty('expiresIn', '24h');
                    expect(response).toHaveProperty('timestamp');
                    
                    // Mettre à jour le token dans le contexte partagé
                    if (response.tokens?.accessToken) {
                        sharedContext.authToken = response.tokens.accessToken;
                        testHelpers.setAuthToken(response.tokens.accessToken);
                    }
                }
            });
        });

        test('Token refresh failure without token', async () => {
            await testHelpers.makeRequest({
                description: 'Échec de renouvellement sans token',
                method: 'POST',
                endpoint: '/api/auth/refresh',
                expectedStatus: 401,
                auth: false,
                validateResponse: (response) => {
                    ResponseValidators.error(response, 'MISSING_TOKEN');
                }
            });
        });
    });

    describe('DELETE /api/auth/logout', () => {
        test('Logout success with REAL auth token', async () => {
            await testHelpers.makeRequest({
                description: `Déconnexion réussie pour ${sharedContext.username}`,
                method: 'DELETE',
                endpoint: '/api/auth/logout',
                expectedStatus: 200,
                auth: true,
                validateResponse: (response) => {
                    expect(response).toHaveProperty('message', 'Déconnexion réussie');
                    expect(response).toHaveProperty('timestamp');
                }
            });
        });

        test('Logout failure without token', async () => {
            await testHelpers.makeRequest({
                description: 'Échec de déconnexion sans token',
                method: 'DELETE',
                endpoint: '/api/auth/logout',
                expectedStatus: 401,
                auth: false,
                validateResponse: (response) => {
                    ResponseValidators.error(response, 'MISSING_TOKEN');
                }
            });
        });
    });

    describe('Context Validation', () => {
        test('Shared context contains REAL GitHub data', async () => {
            // Vérifier que le contexte partagé contient les bonnes données
            expect(sharedContext.username).toBeDefined();
            expect(sharedContext.fullName).toBeDefined();
            expect(sharedContext.githubToken).toBeDefined();
            expect(sharedContext.authToken).toBeDefined();
            
            // Vérifier que les données correspondent aux vraies valeurs
            expect(sharedContext.username).not.toBe('test-user');
            expect(sharedContext.fullName).not.toBe('Test User');
            expect(sharedContext.githubToken).not.toBe('test-github-token');
            expect(sharedContext.githubToken.startsWith('ghp_') || sharedContext.githubToken.startsWith('github_pat_')).toBe(true);
            
            testLogger.logSuccess('✅ Contexte partagé validé avec des données GitHub réelles');
            testLogger.logInfo(`📊 Données disponibles: authToken=${!!sharedContext.authToken}, userData=${!!sharedContext.userData}`);
        });
    });
}); 