import { describe, test, beforeAll, afterAll } from '@jest/globals';
import { Express } from 'express';
import { createApp } from '../src/app';
import { testLogger } from './utils/TestLogger';
import TestHelpers, { TestContext, TestData, ResponseValidators } from './utils/TestHelpers';

describe('Authentication Endpoints', () => {
    let app: Express;
    let testHelpers: TestHelpers;
    let validAuthToken: string;

    beforeAll(async () => {
        testLogger.startSuite(
            'Authentication Endpoints',
            'Tests complets du flow d\'authentification: login, validation, refresh, logout et gestion des erreurs'
        );

        // Initialiser l'application
        // @ts-ignore - Express type error
        app = await createApp();

        const context: TestContext = { app };
        testHelpers = new TestHelpers(context);

        testLogger.logInfo('Application de test initialisée pour authentification');
    });

    afterAll(() => {
        testLogger.endSuite();
    });

    describe('POST /api/auth/login', () => {
        test('Login successful with valid credentials', async () => {
            const response = await testHelpers.makeRequest({
                description: 'Connexion réussie avec des identifiants valides',
                method: 'POST',
                endpoint: '/api/auth/login',
                expectedStatus: 200,
                body: TestData.validUser,
                validateResponse: ResponseValidators.loginSuccess
            });

            // Sauvegarder le token pour les tests suivants
            if (response.body?.data?.token) {
                validAuthToken = response.body.data.token;
                testHelpers.setAuthToken(validAuthToken);
                testHelpers.setUsername(TestData.validUser.username);
                testLogger.logSuccess('Token d\'authentification sauvegardé');
            }
        });

        test('Login failed with invalid username', async () => {
            await testHelpers.makeRequest({
                description: 'Échec de connexion avec nom d\'utilisateur invalide',
                method: 'POST',
                endpoint: '/api/auth/login',
                expectedStatus: 400,
                body: {
                    ...TestData.validUser,
                    username: ''
                },
                validateResponse: ResponseValidators.validationError
            });
        });

        test('Login failed with invalid token format', async () => {
            await testHelpers.makeRequest({
                description: 'Échec de connexion avec format de token invalide',
                method: 'POST',
                endpoint: '/api/auth/login',
                expectedStatus: 400,
                body: {
                    ...TestData.validUser,
                    githubToken: 'invalid-token-format'
                },
                validateResponse: ResponseValidators.validationError
            });
        });

        test('Login failed with missing full name', async () => {
            await testHelpers.makeRequest({
                description: 'Échec de connexion avec nom complet manquant',
                method: 'POST',
                endpoint: '/api/auth/login',
                expectedStatus: 400,
                body: {
                    username: TestData.validUser.username,
                    githubToken: TestData.validUser.githubToken
                    // fullName manquant
                },
                validateResponse: ResponseValidators.validationError
            });
        });

        test('Login failed with empty body', async () => {
            await testHelpers.makeRequest({
                description: 'Échec de connexion avec body vide',
                method: 'POST',
                endpoint: '/api/auth/login',
                expectedStatus: 400,
                body: {},
                validateResponse: ResponseValidators.validationError
            });
        });

        test('Login failed with invalid GitHub token', async () => {
            await testHelpers.makeRequest({
                description: 'Échec de connexion avec token GitHub invalide (simulation)',
                method: 'POST',
                endpoint: '/api/auth/login',
                expectedStatus: 401,
                body: {
                    ...TestData.validUser,
                    githubToken: 'ghp_invalidtokenxxxxxxxxxxxxxxxxxxxxxxxxxx'
                },
                validateResponse: (response) => {
                    ResponseValidators.error(response, 'Unauthorized');
                }
            });
        });
    });

    describe('GET /api/auth/validate', () => {
        test('Validate valid token', async () => {
            if (!validAuthToken) {
                testLogger.logWarning('Token non disponible, passage du test');
                return;
            }

            await testHelpers.makeRequest({
                description: 'Validation d\'un token JWT valide',
                method: 'GET',
                endpoint: '/api/auth/validate',
                expectedStatus: 200,
                auth: true,
                validateResponse: (response) => {
                    expect(response).toHaveProperty('valid', true);
                    expect(response).toHaveProperty('expiresAt');
                    expect(response).toHaveProperty('user');
                    expect(response.user).toHaveProperty('username');
                }
            });
        });

        test('Validate without token', async () => {
            // Temporairement retirer le token
            const originalToken = testHelpers.getContext().authToken;
            testHelpers.setAuthToken('');

            await testHelpers.makeRequest({
                description: 'Validation sans token d\'authentification',
                method: 'GET',
                endpoint: '/api/auth/validate',
                expectedStatus: 401,
                validateResponse: (response) => {
                    ResponseValidators.error(response, 'Unauthorized');
                }
            });

            // Restaurer le token
            if (originalToken) {
                testHelpers.setAuthToken(originalToken);
            }
        });

        test('Validate with invalid token format', async () => {
            await testHelpers.makeRequest({
                description: 'Validation avec format de token invalide',
                method: 'GET',
                endpoint: '/api/auth/validate',
                expectedStatus: 401,
                headers: {
                    'Authorization': 'Bearer invalid-token-format'
                },
                validateResponse: (response) => {
                    ResponseValidators.error(response, 'Unauthorized');
                }
            });
        });

        test('Validate with malformed Authorization header', async () => {
            await testHelpers.makeRequest({
                description: 'Validation avec header Authorization malformé',
                method: 'GET',
                endpoint: '/api/auth/validate',
                expectedStatus: 401,
                headers: {
                    'Authorization': 'InvalidFormat token'
                },
                validateResponse: (response) => {
                    ResponseValidators.error(response, 'Unauthorized');
                }
            });
        });
    });

    describe('GET /api/auth/me', () => {
        test('Get current user info with valid token', async () => {
            if (!validAuthToken) {
                testLogger.logWarning('Token non disponible, passage du test');
                return;
            }

            await testHelpers.makeRequest({
                description: 'Récupération des informations utilisateur connecté',
                method: 'GET',
                endpoint: '/api/auth/me',
                expectedStatus: 200,
                auth: true,
                validateResponse: (response) => {
                    expect(response).toHaveProperty('user');
                    expect(response).toHaveProperty('status');
                    expect(response).toHaveProperty('timestamp');
                    expect(response.user).toHaveProperty('username');
                    expect(response.user).toHaveProperty('name');
                    expect(response.status).toHaveProperty('tokenStatus');
                    expect(response.status).toHaveProperty('lastLogin');
                }
            });
        });

        test('Get current user without authentication', async () => {
            await testHelpers.makeRequest({
                description: 'Tentative de récupération d\'infos utilisateur sans authentification',
                method: 'GET',
                endpoint: '/api/auth/me',
                expectedStatus: 401,
                validateResponse: (response) => {
                    ResponseValidators.error(response, 'Unauthorized');
                }
            });
        });
    });

    describe('POST /api/auth/refresh', () => {
        test('Refresh token with valid refresh token', async () => {
            if (!validAuthToken) {
                testLogger.logWarning('Token non disponible, passage du test');
                return;
            }

            // Note: En pratique, il faudrait un vrai refresh token
            // Pour le test, on simule avec le token actuel
            await testHelpers.makeRequest({
                description: 'Rafraîchissement du token avec refresh token valide',
                method: 'POST',
                endpoint: '/api/auth/refresh',
                expectedStatus: 200,
                body: {
                    refresh_token: validAuthToken // Simulation
                },
                validateResponse: (response) => {
                    expect(response).toHaveProperty('token');
                    expect(response).toHaveProperty('expiresIn');
                    expect(typeof response.token).toBe('string');
                    expect(typeof response.expiresIn).toBe('string');
                }
            });
        });

        test('Refresh token with invalid refresh token', async () => {
            await testHelpers.makeRequest({
                description: 'Échec de rafraîchissement avec refresh token invalide',
                method: 'POST',
                endpoint: '/api/auth/refresh',
                expectedStatus: 401,
                body: {
                    refresh_token: 'invalid-refresh-token'
                },
                validateResponse: (response) => {
                    ResponseValidators.error(response, 'Unauthorized');
                }
            });
        });

        test('Refresh token without authentication', async () => {
            await testHelpers.makeRequest({
                description: 'Échec de rafraîchissement sans authentification JWT',
                method: 'POST',
                endpoint: '/api/auth/refresh',
                expectedStatus: 401,
                body: {},
                validateResponse: (response) => {
                    expect(response).toHaveProperty('error', 'Unauthorized');
                    expect(response).toHaveProperty('message');
                    expect(response).toHaveProperty('timestamp');
                }
            });
        });
    });

    describe('DELETE /api/auth/logout', () => {
        test('Logout with valid token', async () => {
            if (!validAuthToken) {
                testLogger.logWarning('Token non disponible, passage du test');
                return;
            }

            await testHelpers.makeRequest({
                description: 'Déconnexion avec token valide',
                method: 'DELETE',
                endpoint: '/api/auth/logout',
                expectedStatus: 200,
                auth: true,
                validateResponse: (response) => {
                    expect(response).toHaveProperty('success', true);
                    expect(response).toHaveProperty('message');
                    expect(typeof response.message).toBe('string');
                }
            });

            // Après logout, le token ne devrait plus être valide
            testLogger.logInfo('Vérification que le token est invalidé après logout');

            await testHelpers.makeRequest({
                description: 'Vérification que le token est invalidé après logout',
                method: 'GET',
                endpoint: '/api/auth/validate',
                expectedStatus: 401,
                auth: true,
                validateResponse: (response) => {
                    ResponseValidators.error(response, 'Unauthorized');
                }
            });
        });

        test('Logout without token', async () => {
            await testHelpers.makeRequest({
                description: 'Tentative de déconnexion sans token',
                method: 'DELETE',
                endpoint: '/api/auth/logout',
                expectedStatus: 401,
                validateResponse: (response) => {
                    ResponseValidators.error(response, 'Unauthorized');
                }
            });
        });
    });

    describe('Authentication Flow Integration', () => {
        test('Complete authentication flow', async () => {
            testLogger.logInfo('Test du flow complet d\'authentification');

            // 1. Login
            const loginResponse = await testHelpers.makeRequest({
                description: 'Étape 1: Connexion pour flow complet',
                method: 'POST',
                endpoint: '/api/auth/login',
                expectedStatus: 200,
                body: TestData.validUser,
                validateResponse: ResponseValidators.loginSuccess
            });

            const newToken = loginResponse.body.tokens.accessToken;
            testHelpers.setAuthToken(newToken);

            // 2. Validate token
            await testHelpers.makeRequest({
                description: 'Étape 2: Validation du token obtenu',
                method: 'GET',
                endpoint: '/api/auth/validate',
                expectedStatus: 200,
                auth: true
            });

            // 3. Get user info
            await testHelpers.makeRequest({
                description: 'Étape 3: Récupération des infos utilisateur',
                method: 'GET',
                endpoint: '/api/auth/me',
                expectedStatus: 200,
                auth: true
            });

            // 4. Refresh token
            const refreshResponse = await testHelpers.makeRequest({
                description: 'Étape 4: Rafraîchissement du token',
                method: 'POST',
                endpoint: '/api/auth/refresh',
                expectedStatus: 200,
                body: {
                    refresh_token: newToken
                }
            });

            // 5. Use refreshed token
            if (refreshResponse.body.token) {
                testHelpers.setAuthToken(refreshResponse.body.token);

                await testHelpers.makeRequest({
                    description: 'Étape 5: Utilisation du token rafraîchi',
                    method: 'GET',
                    endpoint: '/api/auth/validate',
                    expectedStatus: 200,
                    auth: true
                });
            }

            // 6. Logout
            await testHelpers.makeRequest({
                description: 'Étape 6: Déconnexion finale',
                method: 'DELETE',
                endpoint: '/api/auth/logout',
                expectedStatus: 200,
                auth: true
            });

            testLogger.logSuccess('Flow complet d\'authentification terminé avec succès');
        });
    });
}); 