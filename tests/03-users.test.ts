import { describe, test, beforeAll, afterAll } from '@jest/globals';
import { Express } from 'express';
import { createApp } from '../src/app';
import { testLogger } from './utils/TestLogger';
import TestHelpers, { TestContext, TestData, ResponseValidators } from './utils/TestHelpers';

describe('Users Endpoints', () => {
    let app: Express;
    let testHelpers: TestHelpers;
    let authToken: string;
    const testUsername = TestData.validUser.username;

    beforeAll(async () => {
        testLogger.startSuite(
            'Users Endpoints',
            'Tests des endpoints utilisateurs: recherche, profils, repositories, statistiques et gestion des données'
        );

        // Initialiser l'application
        // @ts-ignore - Express type error
        app = await createApp();

        const context: TestContext = { app };
        testHelpers = new TestHelpers(context);

        // Authentification préalable pour les tests nécessitant un token
        testLogger.logInfo('Authentification préalable pour les tests utilisateurs');

        const loginResponse = await testHelpers.makeRequest({
            description: 'Authentification préalable pour les tests utilisateurs',
            method: 'POST',
            endpoint: '/api/auth/login',
            expectedStatus: 200,
            body: TestData.validUser,
            validateResponse: ResponseValidators.loginSuccess
        });

        if (loginResponse.body?.data?.token) {
            authToken = loginResponse.body.data.token;
            testHelpers.setAuthToken(authToken);
            testHelpers.setUsername(testUsername);
            testLogger.logSuccess('Authentification réussie pour les tests utilisateurs');
        }
    });

    afterAll(() => {
        testLogger.endSuite();
    });

    describe('GET /api/users/search', () => {
        test('Search users without authentication', async () => {
            // Retirer temporairement le token pour ce test
            const originalToken = testHelpers.getContext().authToken;
            testHelpers.setAuthToken('');

            await testHelpers.makeRequest({
                description: 'Recherche d\'utilisateurs sans authentification',
                method: 'GET',
                endpoint: '/api/users/search?query=octocat',
                expectedStatus: 200,
                validateResponse: (response) => {
                    expect(response).toHaveProperty('users');
                    expect(response).toHaveProperty('pagination');
                    expect(response).toHaveProperty('totalCount');
                    expect(Array.isArray(response.users)).toBe(true);
                    ResponseValidators.pagination(response);
                }
            });

            // Restaurer le token
            if (originalToken) {
                testHelpers.setAuthToken(originalToken);
            }
        });

        test('Search users with authentication', async () => {
            await testHelpers.makeRequest({
                description: 'Recherche d\'utilisateurs avec authentification',
                method: 'GET',
                endpoint: '/api/users/search?query=octocat&limit=10',
                expectedStatus: 200,
                auth: true,
                validateResponse: (response) => {
                    expect(response).toHaveProperty('users');
                    expect(response).toHaveProperty('pagination');
                    expect(response).toHaveProperty('totalCount');
                    expect(Array.isArray(response.users)).toBe(true);
                    expect(response.users.length).toBeLessThanOrEqual(10);
                    ResponseValidators.pagination(response);
                }
            });
        });

        test('Search users with filters', async () => {
            await testHelpers.makeRequest({
                description: 'Recherche d\'utilisateurs avec filtres avancés',
                method: 'GET',
                endpoint: '/api/users/search?location=Paris&language=JavaScript&minFollowers=100&sortBy=followers&sortOrder=desc',
                expectedStatus: 200,
                auth: true,
                validateResponse: (response) => {
                    expect(response).toHaveProperty('users');
                    expect(response).toHaveProperty('pagination');
                    expect(response).toHaveProperty('totalCount');
                    ResponseValidators.pagination(response);
                }
            });
        });

        test('Search users with invalid parameters', async () => {
            await testHelpers.makeRequest({
                description: 'Recherche avec paramètres invalides',
                method: 'GET',
                endpoint: '/api/users/search?limit=1000&page=0&minFollowers=-1',
                expectedStatus: 400,
                validateResponse: ResponseValidators.validationError
            });
        });

        test('Search users with pagination', async () => {
            await testHelpers.makeRequest({
                description: 'Recherche avec pagination - page 1',
                method: 'GET',
                endpoint: '/api/users/search?query=test&page=1&limit=5',
                expectedStatus: 200,
                validateResponse: (response) => {
                    expect(response.pagination.page).toBe(1);
                    expect(response.pagination.limit).toBe(5);
                    expect(response.users.length).toBeLessThanOrEqual(5);
                }
            });

            await testHelpers.makeRequest({
                description: 'Recherche avec pagination - page 2',
                method: 'GET',
                endpoint: '/api/users/search?query=test&page=2&limit=5',
                expectedStatus: 200,
                validateResponse: (response) => {
                    expect(response.pagination.page).toBe(2);
                    expect(response.pagination.limit).toBe(5);
                }
            });
        });
    });

    describe('GET /api/users/{username}', () => {
        test('Get user profile without authentication', async () => {
            // Retirer temporairement le token
            const originalToken = testHelpers.getContext().authToken;
            testHelpers.setAuthToken('');

            await testHelpers.makeRequest({
                description: 'Récupération de profil utilisateur sans authentification',
                method: 'GET',
                endpoint: `/api/users/${testUsername}`,
                expectedStatus: 200,
                validateResponse: ResponseValidators.userProfile
            });

            // Restaurer le token
            if (originalToken) {
                testHelpers.setAuthToken(originalToken);
            }
        });

        test('Get user profile with authentication', async () => {
            await testHelpers.makeRequest({
                description: 'Récupération de profil utilisateur avec authentification',
                method: 'GET',
                endpoint: `/api/users/${testUsername}`,
                expectedStatus: 200,
                auth: true,
                validateResponse: (response) => {
                    ResponseValidators.userProfile(response);
                    // Avec auth, on peut avoir des infos privées
                    expect(response).toHaveProperty('login', testUsername);
                }
            });
        });

        test('Get non-existent user profile', async () => {
            await testHelpers.makeRequest({
                description: 'Tentative de récupération d\'un utilisateur inexistant',
                method: 'GET',
                endpoint: '/api/users/nonexistentuser123456789',
                expectedStatus: 404,
                validateResponse: (response) => {
                    ResponseValidators.error(response, 'Not Found');
                }
            });
        });

        test('Get user profile with invalid username format', async () => {
            await testHelpers.makeRequest({
                description: 'Récupération avec format de nom d\'utilisateur invalide',
                method: 'GET',
                endpoint: '/api/users/invalid-username!@#',
                expectedStatus: 400,
                validateResponse: ResponseValidators.validationError
            });
        });
    });

    describe('GET /api/users/{username}/status', () => {
        test('Get user analysis status without authentication', async () => {
            await testHelpers.makeRequest({
                description: 'Récupération du statut d\'analyse sans authentification',
                method: 'GET',
                endpoint: `/api/users/${testUsername}/status`,
                expectedStatus: 200,
                validateResponse: (response) => {
                    expect(response).toHaveProperty('status');
                    expect(response).toHaveProperty('progress');
                    expect(response).toHaveProperty('startedAt');
                    expect(['pending', 'running', 'completed', 'failed']).toContain(response.status);
                    expect(typeof response.progress).toBe('number');
                    expect(response.progress).toBeGreaterThanOrEqual(0);
                    expect(response.progress).toBeLessThanOrEqual(100);
                }
            });
        });

        test('Get user analysis status with authentication', async () => {
            await testHelpers.makeRequest({
                description: 'Récupération du statut d\'analyse avec authentification',
                method: 'GET',
                endpoint: `/api/users/${testUsername}/status`,
                expectedStatus: 200,
                auth: true,
                validateResponse: (response) => {
                    expect(response).toHaveProperty('status');
                    expect(response).toHaveProperty('progress');
                    expect(response).toHaveProperty('phases');
                    if (response.phases) {
                        expect(response.phases).toHaveProperty('githubData');
                        expect(response.phases).toHaveProperty('analytics');
                        expect(response.phases).toHaveProperty('insights');
                    }
                }
            });
        });

        test('Get analysis status for non-existent user', async () => {
            await testHelpers.makeRequest({
                description: 'Statut d\'analyse pour utilisateur inexistant',
                method: 'GET',
                endpoint: '/api/users/nonexistentuser123456789/status',
                expectedStatus: 404,
                validateResponse: (response) => {
                    ResponseValidators.error(response, 'Not Found');
                }
            });
        });
    });

    describe('GET /api/users/stats', () => {
        test('Get platform statistics without authentication', async () => {
            await testHelpers.makeRequest({
                description: 'Récupération des statistiques plateforme sans authentification',
                method: 'GET',
                endpoint: '/api/users/stats',
                expectedStatus: 200,
                validateResponse: (response) => {
                    expect(response).toHaveProperty('users');
                    expect(response).toHaveProperty('activity');
                    expect(response).toHaveProperty('timestamp');
                    expect(response.users).toHaveProperty('total');
                    expect(response.users).toHaveProperty('withDatasets');
                    expect(response.users).toHaveProperty('averageFollowers');
                    expect(response.users).toHaveProperty('topLanguages');
                    expect(response.activity).toHaveProperty('recentAnalyses');
                    expect(response.activity).toHaveProperty('totalAnalyses');
                    expect(Array.isArray(response.users.topLanguages)).toBe(true);
                }
            });
        });

        test('Get platform statistics with authentication', async () => {
            await testHelpers.makeRequest({
                description: 'Récupération des statistiques plateforme avec authentification',
                method: 'GET',
                endpoint: '/api/users/stats',
                expectedStatus: 200,
                auth: true,
                validateResponse: (response) => {
                    expect(response).toHaveProperty('users');
                    expect(response).toHaveProperty('activity');
                    expect(response).toHaveProperty('timestamp');
                    // Avec auth, on peut avoir des stats plus détaillées
                    expect(typeof response.users.total).toBe('number');
                    expect(typeof response.users.withDatasets).toBe('number');
                    expect(typeof response.users.averageFollowers).toBe('number');
                }
            });
        });
    });

    describe('GET /api/users/{username}/repositories', () => {
        test('Get user repositories without authentication', async () => {
            await testHelpers.makeRequest({
                description: 'Récupération des repositories utilisateur sans authentification',
                method: 'GET',
                endpoint: `/api/users/${testUsername}/repositories`,
                expectedStatus: 200,
                validateResponse: (response) => {
                    expect(response).toHaveProperty('repositories');
                    expect(response).toHaveProperty('pagination');
                    expect(response).toHaveProperty('totalCount');
                    expect(Array.isArray(response.repositories)).toBe(true);
                    ResponseValidators.pagination(response);

                    // Vérifier la structure des repositories
                    if (response.repositories.length > 0) {
                        ResponseValidators.repository(response.repositories[0]);
                    }
                }
            });
        });

        test('Get user repositories with authentication', async () => {
            await testHelpers.makeRequest({
                description: 'Récupération des repositories utilisateur avec authentification',
                method: 'GET',
                endpoint: `/api/users/${testUsername}/repositories?includePrivate=true`,
                expectedStatus: 200,
                auth: true,
                validateResponse: (response) => {
                    expect(response).toHaveProperty('repositories');
                    expect(response).toHaveProperty('pagination');
                    expect(response).toHaveProperty('totalCount');
                    expect(Array.isArray(response.repositories)).toBe(true);
                    ResponseValidators.pagination(response);
                }
            });
        });

        test('Get user repositories with pagination', async () => {
            await testHelpers.makeRequest({
                description: 'Récupération des repositories avec pagination',
                method: 'GET',
                endpoint: `/api/users/${testUsername}/repositories?page=1&limit=5`,
                expectedStatus: 200,
                validateResponse: (response) => {
                    expect(response.pagination.page).toBe(1);
                    expect(response.pagination.limit).toBe(5);
                    expect(response.repositories.length).toBeLessThanOrEqual(5);
                }
            });
        });

        test('Get repositories for non-existent user', async () => {
            await testHelpers.makeRequest({
                description: 'Repositories pour utilisateur inexistant',
                method: 'GET',
                endpoint: '/api/users/nonexistentuser123456789/repositories',
                expectedStatus: 404,
                validateResponse: (response) => {
                    ResponseValidators.error(response, 'Not Found');
                }
            });
        });

        test('Get repositories with invalid parameters', async () => {
            await testHelpers.makeRequest({
                description: 'Repositories avec paramètres invalides',
                method: 'GET',
                endpoint: `/api/users/${testUsername}/repositories?page=0&limit=1000`,
                expectedStatus: 400,
                validateResponse: ResponseValidators.validationError
            });
        });
    });

    describe('DELETE /api/users/{username}', () => {
        test('Delete user data without authentication', async () => {
            await testHelpers.makeRequest({
                description: 'Tentative de suppression de données sans authentification',
                method: 'DELETE',
                endpoint: `/api/users/${testUsername}`,
                expectedStatus: 401,
                validateResponse: (response) => {
                    ResponseValidators.error(response, 'Unauthorized');
                }
            });
        });

        test('Delete another user data (forbidden)', async () => {
            await testHelpers.makeRequest({
                description: 'Tentative de suppression de données d\'un autre utilisateur',
                method: 'DELETE',
                endpoint: '/api/users/anotheruser',
                expectedStatus: 403,
                auth: true,
                validateResponse: (response) => {
                    ResponseValidators.error(response, 'Forbidden');
                }
            });
        });

        test('Delete non-existent user data', async () => {
            await testHelpers.makeRequest({
                description: 'Suppression de données d\'utilisateur inexistant',
                method: 'DELETE',
                endpoint: '/api/users/nonexistentuser123456789',
                expectedStatus: 404,
                auth: true,
                validateResponse: (response) => {
                    ResponseValidators.error(response, 'Not Found');
                }
            });
        });

        // Note: Le test de suppression réelle est commenté pour éviter de supprimer les données de test
        /*
        test('Delete own user data (GDPR compliance)', async () => {
          await testHelpers.makeRequest({
            description: 'Suppression de ses propres données (conformité GDPR)',
            method: 'DELETE',
            endpoint: `/api/users/${testUsername}`,
            expectedStatus: 200,
            auth: true,
            validateResponse: (response) => {
              expect(response).toHaveProperty('message');
              expect(response).toHaveProperty('deleted');
              expect(response).toHaveProperty('compliance', 'GDPR');
              expect(response).toHaveProperty('timestamp');
              expect(response.deleted).toHaveProperty('user');
              expect(response.deleted).toHaveProperty('repositories');
              expect(response.deleted).toHaveProperty('datasets');
            }
          });
        });
        */
    });

    describe('Users Integration Tests', () => {
        test('Complete user flow', async () => {
            testLogger.logInfo('Test du flow complet utilisateur');

            // 1. Rechercher des utilisateurs
            const searchResponse = await testHelpers.makeRequest({
                description: 'Étape 1: Recherche d\'utilisateurs',
                method: 'GET',
                endpoint: '/api/users/search?query=octocat&limit=5',
                expectedStatus: 200,
                auth: true
            });

            // 2. Sélectionner le premier utilisateur trouvé (s'il y en a)
            if (searchResponse.body.users && searchResponse.body.users.length > 0) {
                const firstUser = searchResponse.body.users[0];
                const username = firstUser.login || firstUser.username;

                // 3. Récupérer le profil complet
                await testHelpers.makeRequest({
                    description: `Étape 2: Récupération du profil de ${username}`,
                    method: 'GET',
                    endpoint: `/api/users/${username}`,
                    expectedStatus: 200,
                    auth: true,
                    validateResponse: ResponseValidators.userProfile
                });

                // 4. Récupérer les repositories
                await testHelpers.makeRequest({
                    description: `Étape 3: Récupération des repositories de ${username}`,
                    method: 'GET',
                    endpoint: `/api/users/${username}/repositories?limit=10`,
                    expectedStatus: 200,
                    auth: true
                });

                // 5. Vérifier le statut d'analyse
                await testHelpers.makeRequest({
                    description: `Étape 4: Vérification du statut d'analyse de ${username}`,
                    method: 'GET',
                    endpoint: `/api/users/${username}/status`,
                    expectedStatus: 200,
                    auth: true
                });

                testLogger.logSuccess(`Flow complet utilisateur terminé pour ${username}`);
            } else {
                testLogger.logWarning('Aucun utilisateur trouvé dans la recherche');
            }

            // 6. Récupérer les statistiques globales
            await testHelpers.makeRequest({
                description: 'Étape 5: Récupération des statistiques globales',
                method: 'GET',
                endpoint: '/api/users/stats',
                expectedStatus: 200,
                auth: true
            });

            testLogger.logSuccess('Flow complet utilisateur terminé avec succès');
        });
    });
}); 