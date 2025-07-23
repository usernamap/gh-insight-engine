import { describe, test, beforeAll, afterAll } from '@jest/globals';
import { Express } from 'express';
import { createApp } from '../src/app';
import { testLogger } from './utils/TestLogger';
import TestHelpers, { TestContext, TestData, ResponseValidators, RealDataHelpers } from './utils/TestHelpers';
import { sharedContext } from './setup';

describe('Users Endpoints - REAL GitHub Data', () => {
    let app: Express;
    let testHelpers: TestHelpers;

    beforeAll(async () => {
        testLogger.startSuite(
            'Users Endpoints - REAL GitHub Data',
            `Tests des endpoints utilisateurs avec de vraies données GitHub pour l'utilisateur: ${sharedContext.username}`
        );

        // Initialiser l'application
        // @ts-ignore - Express type error
        app = await createApp();

        const context: TestContext = { app };
        testHelpers = new TestHelpers(context);

        // Valider que les données réelles sont disponibles
        testHelpers.validateRealDataAvailability();

        // Vérifier que l'authentification a été effectuée dans le test précédent
        if (!sharedContext.authToken) {
            throw new Error('Auth token not available from previous test. Tests must run in sequence.');
        }

        testHelpers.setAuthToken(sharedContext.authToken);
        testLogger.logInfo(`🔑 Utilisation du token d'authentification du contexte partagé`);
        testLogger.logInfo(`👤 Tests pour l'utilisateur GitHub: ${sharedContext.username}`);
    });

    afterAll(() => {
        testLogger.endSuite();
    });

    describe('GET /api/users/search', () => {
        test('Search users without authentication - public endpoint', async () => {
            await testHelpers.makeRequest({
                description: 'Recherche d\'utilisateurs publique sans authentification',
                method: 'GET',
                endpoint: `/api/users/search?query=${sharedContext.username}`,
                expectedStatus: 200,
                auth: false,
                validateResponse: (response) => {
                    expect(response).toHaveProperty('users');
                    expect(response).toHaveProperty('pagination');
                    expect(response).toHaveProperty('totalCount');
                    expect(Array.isArray(response.users)).toBe(true);
                    ResponseValidators.pagination(response);
                    
                    // Vérifier que notre utilisateur réel est trouvé
                    const foundUser = response.users.find((user: any) => 
                        user.login === sharedContext.username || user.username === sharedContext.username
                    );
                    if (foundUser) {
                        expect(foundUser.login || foundUser.username).toBe(sharedContext.username);
                    }
                }
            });
        });

        test('Search users with REAL authentication', async () => {
            await testHelpers.makeRequest({
                description: `Recherche d'utilisateurs avec authentification réelle pour ${sharedContext.username}`,
                method: 'GET',
                endpoint: `/api/users/search?query=${sharedContext.username}&limit=10`,
                expectedStatus: 200,
                auth: true,
                validateResponse: (response) => {
                    expect(response).toHaveProperty('users');
                    expect(response).toHaveProperty('pagination');
                    expect(response).toHaveProperty('totalCount');
                    expect(Array.isArray(response.users)).toBe(true);
                    expect(response.users.length).toBeGreaterThanOrEqual(1);
                    ResponseValidators.pagination(response);
                    
                    // Avec authentification, on devrait avoir plus de détails
                    if (response.users.length > 0) {
                        const user = response.users[0];
                        expect(user).toHaveProperty('id');
                        expect(user).toHaveProperty('login');
                    }
                }
            });
        });

        test('Search with empty query', async () => {
            await testHelpers.makeRequest({
                description: 'Recherche avec requête vide',
                method: 'GET',
                endpoint: '/api/users/search?query=',
                expectedStatus: 400,
                validateResponse: ResponseValidators.validationError
            });
        });

        test('Search with pagination parameters', async () => {
            await testHelpers.makeRequest({
                description: 'Recherche avec paramètres de pagination',
                method: 'GET',
                endpoint: `/api/users/search?query=${sharedContext.username}&page=1&limit=5`,
                expectedStatus: 200,
                validateResponse: (response) => {
                    expect(response).toHaveProperty('users');
                    expect(response).toHaveProperty('pagination');
                    expect(response.pagination.page).toBe(1);
                    expect(response.pagination.limit).toBe(5);
                    expect(response.users.length).toBeLessThanOrEqual(5);
                }
            });
        });
    });

    describe('GET /api/users/:username', () => {
        test('Get REAL user profile with authentication', async () => {
            await testHelpers.makeRequest({
                description: `Récupération du profil utilisateur réel pour ${sharedContext.username}`,
                method: 'GET',
                endpoint: `/api/users/${sharedContext.username}`,
                expectedStatus: 200,
                auth: true,
                validateResponse: ResponseValidators.userProfile,
                saveToContext: 'userData'
            });

            // Vérifier que les données utilisateur sont maintenant dans le contexte partagé
            expect(sharedContext.userData).toBeDefined();
            expect(sharedContext.userData.login || sharedContext.userData.username).toBe(sharedContext.username);
            testLogger.logSuccess(`✅ Données utilisateur réelles sauvegardées dans le contexte partagé`);
        });

        test('Get user profile without authentication', async () => {
            await testHelpers.makeRequest({
                description: `Récupération du profil public pour ${sharedContext.username}`,
                method: 'GET',
                endpoint: `/api/users/${sharedContext.username}`,
                expectedStatus: 200,
                auth: false,
                validateResponse: (response) => {
                    // Profil public - moins de détails que avec authentification
                    expect(response).toHaveProperty('id');
                    expect(response).toHaveProperty('login', sharedContext.username);
                    expect(response).toHaveProperty('name');
                    expect(response).toHaveProperty('publicRepos');
                    expect(typeof response.publicRepos).toBe('number');
                }
            });
        });

        test('Get nonexistent user profile', async () => {
            await testHelpers.makeRequest({
                description: 'Tentative de récupération d\'un utilisateur inexistant',
                method: 'GET',
                endpoint: '/api/users/nonexistent-user-12345-xyz',
                expectedStatus: 404,
                validateResponse: (response) => {
                    ResponseValidators.error(response, 'USER_NOT_FOUND');
                }
            });
        });

        test('Get user profile with invalid username format', async () => {
            await testHelpers.makeRequest({
                description: 'Récupération avec format de nom d\'utilisateur invalide',
                method: 'GET',
                endpoint: '/api/users/invalid..username',
                expectedStatus: 400,
                validateResponse: ResponseValidators.validationError
            });
        });
    });

    describe('GET /api/users/:username/repositories', () => {
        test('Get REAL user repositories with authentication', async () => {
            await testHelpers.makeRequest({
                description: `Récupération des repositories réels pour ${sharedContext.username}`,
                method: 'GET',
                endpoint: `/api/users/${sharedContext.username}/repositories`,
                expectedStatus: 200,
                auth: true,
                validateResponse: ResponseValidators.repositoryList,
                saveToContext: 'repositories'
            });

            // Vérifier que les repositories sont maintenant dans le contexte partagé
            expect(sharedContext.repositories).toBeDefined();
            expect(Array.isArray(sharedContext.repositories)).toBe(true);
            
            if (sharedContext.repositories && sharedContext.repositories.length > 0) {
                // Mettre à jour les données de test avec des valeurs réelles
                RealDataHelpers.updateTestDataWithRealValues();
                testLogger.logSuccess(`✅ ${sharedContext.repositories.length} repositories réels sauvegardés dans le contexte`);
            } else {
                testLogger.logWarning('⚠️ Aucun repository trouvé pour cet utilisateur');
            }
        });

        test('Get user repositories without authentication', async () => {
            await testHelpers.makeRequest({
                description: `Récupération des repositories publics pour ${sharedContext.username}`,
                method: 'GET',
                endpoint: `/api/users/${sharedContext.username}/repositories`,
                expectedStatus: 200,
                auth: false,
                validateResponse: (response) => {
                    expect(Array.isArray(response)).toBe(true);
                    // Seuls les repositories publics sont visibles sans authentification
                    if (response.length > 0) {
                        response.forEach((repo: any) => {
                            expect(repo.isPrivate || repo.private).toBe(false);
                        });
                    }
                }
            });
        });

        test('Get repositories with pagination', async () => {
            await testHelpers.makeRequest({
                description: `Récupération des repositories avec pagination pour ${sharedContext.username}`,
                method: 'GET',
                endpoint: `/api/users/${sharedContext.username}/repositories?page=1&limit=5`,
                expectedStatus: 200,
                auth: true,
                validateResponse: (response) => {
                    expect(Array.isArray(response)).toBe(true);
                    expect(response.length).toBeLessThanOrEqual(5);
                }
            });
        });

        test('Get repositories with type filter', async () => {
            await testHelpers.makeRequest({
                description: `Récupération des repositories filtrés par type pour ${sharedContext.username}`,
                method: 'GET',
                endpoint: `/api/users/${sharedContext.username}/repositories?type=owner`,
                expectedStatus: 200,
                auth: true,
                validateResponse: (response) => {
                    expect(Array.isArray(response)).toBe(true);
                    // Tous les repos retournés doivent appartenir à l'utilisateur
                    if (response.length > 0) {
                        response.forEach((repo: any) => {
                            const repoOwner = repo.owner?.login || repo.nameWithOwner?.split('/')[0];
                            expect(repoOwner).toBe(sharedContext.username);
                        });
                    }
                }
            });
        });

        test('Get repositories for nonexistent user', async () => {
            await testHelpers.makeRequest({
                description: 'Récupération des repositories pour utilisateur inexistant',
                method: 'GET',
                endpoint: '/api/users/nonexistent-user-12345-xyz/repositories',
                expectedStatus: 404,
                validateResponse: (response) => {
                    ResponseValidators.error(response, 'USER_NOT_FOUND');
                }
            });
        });
    });

    describe('POST /api/users/analyze', () => {
        test('Analyze REAL user data with authentication', async () => {
            await testHelpers.makeRequest({
                description: `Analyse complète des données réelles pour ${sharedContext.username}`,
                method: 'POST',
                endpoint: '/api/users/analyze',
                expectedStatus: 202, // Accepted - processus asynchrone
                auth: true,
                body: {
                    username: sharedContext.username,
                    includePrivate: false,
                    forceRefresh: true
                },
                validateResponse: (response) => {
                    expect(response).toHaveProperty('message');
                    expect(response).toHaveProperty('analysisId');
                    expect(response).toHaveProperty('status', 'started');
                    expect(response).toHaveProperty('estimatedDuration');
                    expect(typeof response.analysisId).toBe('string');
                }
            });
        });

        test('Analyze user without authentication', async () => {
            await testHelpers.makeRequest({
                description: 'Tentative d\'analyse sans authentification',
                method: 'POST',
                endpoint: '/api/users/analyze',
                expectedStatus: 401,
                auth: false,
                body: {
                    username: sharedContext.username
                },
                validateResponse: (response) => {
                    ResponseValidators.error(response, 'MISSING_TOKEN');
                }
            });
        });

        test('Analyze with missing username', async () => {
            await testHelpers.makeRequest({
                description: 'Analyse avec nom d\'utilisateur manquant',
                method: 'POST',
                endpoint: '/api/users/analyze',
                expectedStatus: 400,
                auth: true,
                body: {},
                validateResponse: ResponseValidators.validationError
            });
        });

        test('Analyze nonexistent user', async () => {
            await testHelpers.makeRequest({
                description: 'Analyse d\'un utilisateur inexistant',
                method: 'POST',
                endpoint: '/api/users/analyze',
                expectedStatus: 404,
                auth: true,
                body: {
                    username: 'nonexistent-user-12345-xyz'
                },
                validateResponse: (response) => {
                    ResponseValidators.error(response, 'USER_NOT_FOUND');
                }
            });
        });
    });

    describe('GET /api/users/:username/status', () => {
        test('Get analysis status for REAL user', async () => {
            await testHelpers.makeRequest({
                description: `Vérification du statut d'analyse pour ${sharedContext.username}`,
                method: 'GET',
                endpoint: `/api/users/${sharedContext.username}/status`,
                expectedStatus: 200,
                auth: true,
                validateResponse: (response) => {
                    expect(response).toHaveProperty('username', sharedContext.username);
                    expect(response).toHaveProperty('status');
                    expect(response).toHaveProperty('lastUpdated');
                    expect(['pending', 'processing', 'completed', 'error']).toContain(response.status);
                    
                    if (response.status === 'completed') {
                        expect(response).toHaveProperty('completedAt');
                        expect(response).toHaveProperty('dataAvailable');
                    }
                    
                    if (response.status === 'error') {
                        expect(response).toHaveProperty('error');
                    }
                }
            });
        });

        test('Get status without authentication', async () => {
            await testHelpers.makeRequest({
                description: 'Vérification du statut sans authentification',
                method: 'GET',
                endpoint: `/api/users/${sharedContext.username}/status`,
                expectedStatus: 401,
                auth: false,
                validateResponse: (response) => {
                    ResponseValidators.error(response, 'MISSING_TOKEN');
                }
            });
        });

        test('Get status for nonexistent user', async () => {
            await testHelpers.makeRequest({
                description: 'Vérification du statut pour utilisateur inexistant',
                method: 'GET',
                endpoint: '/api/users/nonexistent-user-12345-xyz/status',
                expectedStatus: 404,
                auth: true,
                validateResponse: (response) => {
                    ResponseValidators.error(response, 'USER_NOT_FOUND');
                }
            });
        });
    });

    describe('Context Validation', () => {
        test('Shared context contains REAL user data', async () => {
            // Vérifier que le contexte partagé contient maintenant les données utilisateur réelles
            expect(sharedContext.userData).toBeDefined();
            expect(sharedContext.repositories).toBeDefined();
            
            // Valider la cohérence des données
            RealDataHelpers.validateContextConsistency();
            
            testLogger.logSuccess('✅ Contexte partagé validé avec les données utilisateur réelles');
            testLogger.logInfo(`📊 Données disponibles: userData=${!!sharedContext.userData}, repositories=${sharedContext.repositories?.length || 0} repos`);
            
            // Log des informations utiles pour les tests suivants
            if (sharedContext.userData) {
                testLogger.logInfo(`👤 Profil: ${sharedContext.userData.publicRepos || 0} repos publics, ${sharedContext.userData.followers || 0} followers`);
            }
        });
    });
}); 