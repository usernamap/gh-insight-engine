import { describe, test, beforeAll, afterAll } from '@jest/globals';
import { Express } from 'express';
import { createApp } from '../src/app';
import { testLogger } from './utils/TestLogger';
import TestHelpers, { TestContext, TestData, ResponseValidators } from './utils/TestHelpers';

describe('Repositories Endpoints', () => {
    let app: Express;
    let testHelpers: TestHelpers;
    let authToken: string;
    const testRepo = TestData.sampleRepository;

    beforeAll(async () => {
        testLogger.startSuite(
            'Repositories Endpoints',
            'Tests des endpoints repositories: recherche, détails, enrichissement, statistiques et tendances'
        );

        // Initialiser l'application
        // @ts-ignore - Express type error
        app = await createApp();

        const context: TestContext = { app };
        testHelpers = new TestHelpers(context);

        // Authentification préalable pour les tests nécessitant un token
        testLogger.logInfo('Authentification préalable pour les tests repositories');

        const loginResponse = await testHelpers.makeRequest({
            description: 'Authentification préalable pour les tests repositories',
            method: 'POST',
            endpoint: '/api/auth/login',
            expectedStatus: 200,
            body: TestData.validUser,
            validateResponse: ResponseValidators.loginSuccess
        });

        if (loginResponse.body?.data?.token) {
            authToken = loginResponse.body.data.token;
            testHelpers.setAuthToken(authToken);
            testLogger.logSuccess('Authentification réussie pour les tests repositories');
        }
    });

    afterAll(() => {
        testLogger.endSuite();
    });

    describe('GET /api/repositories/search', () => {
        test('Search repositories without authentication', async () => {
            // Retirer temporairement le token
            const originalToken = testHelpers.getContext().authToken;
            testHelpers.setAuthToken('');

            await testHelpers.makeRequest({
                description: 'Recherche de repositories sans authentification',
                method: 'GET',
                endpoint: '/api/repositories/search?query=hello-world',
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

            // Restaurer le token
            if (originalToken) {
                testHelpers.setAuthToken(originalToken);
            }
        });

        test('Search repositories with authentication', async () => {
            await testHelpers.makeRequest({
                description: 'Recherche de repositories avec authentification',
                method: 'GET',
                endpoint: '/api/repositories/search?query=javascript&limit=10',
                expectedStatus: 200,
                auth: true,
                validateResponse: (response) => {
                    expect(response).toHaveProperty('repositories');
                    expect(response).toHaveProperty('pagination');
                    expect(response).toHaveProperty('totalCount');
                    expect(Array.isArray(response.repositories)).toBe(true);
                    expect(response.repositories.length).toBeLessThanOrEqual(10);
                    ResponseValidators.pagination(response);
                }
            });
        });

        test('Search repositories with advanced filters', async () => {
            await testHelpers.makeRequest({
                description: 'Recherche avec filtres avancés',
                method: 'GET',
                endpoint: '/api/repositories/search?language=JavaScript&minStars=100&minForks=10&sortBy=stars&sortOrder=desc',
                expectedStatus: 200,
                auth: true,
                validateResponse: (response) => {
                    expect(response).toHaveProperty('repositories');
                    expect(response).toHaveProperty('pagination');
                    expect(response).toHaveProperty('totalCount');
                    ResponseValidators.pagination(response);

                    // Vérifier que les repositories ont les bonnes propriétés
                    response.repositories.forEach((repo: any) => {
                        if (repo.stargazerCount !== undefined) {
                            expect(repo.stargazerCount).toBeGreaterThanOrEqual(100);
                        }
                        if (repo.forkCount !== undefined) {
                            expect(repo.forkCount).toBeGreaterThanOrEqual(10);
                        }
                    });
                }
            });
        });

        test('Search repositories with topic filter', async () => {
            await testHelpers.makeRequest({
                description: 'Recherche avec filtre par topic',
                method: 'GET',
                endpoint: '/api/repositories/search?topic=web&language=TypeScript',
                expectedStatus: 200,
                auth: true,
                validateResponse: (response) => {
                    expect(response).toHaveProperty('repositories');
                    expect(response).toHaveProperty('pagination');
                    expect(response).toHaveProperty('totalCount');
                }
            });
        });

        test('Search repositories with privacy filters', async () => {
            await testHelpers.makeRequest({
                description: 'Recherche avec filtres de confidentialité',
                method: 'GET',
                endpoint: '/api/repositories/search?isPrivate=false&isFork=false&isArchived=false',
                expectedStatus: 200,
                auth: true,
                validateResponse: (response) => {
                    expect(response).toHaveProperty('repositories');
                    expect(response).toHaveProperty('pagination');
                    expect(response).toHaveProperty('totalCount');

                    // Vérifier les filtres appliqués
                    response.repositories.forEach((repo: any) => {
                        if (repo.isPrivate !== undefined) {
                            expect(repo.isPrivate).toBe(false);
                        }
                        if (repo.isFork !== undefined) {
                            expect(repo.isFork).toBe(false);
                        }
                        if (repo.isArchived !== undefined) {
                            expect(repo.isArchived).toBe(false);
                        }
                    });
                }
            });
        });

        test('Search repositories with invalid parameters', async () => {
            await testHelpers.makeRequest({
                description: 'Recherche avec paramètres invalides',
                method: 'GET',
                endpoint: '/api/repositories/search?limit=1000&page=0&minStars=-1',
                expectedStatus: 400,
                validateResponse: ResponseValidators.validationError
            });
        });

        test('Search repositories with pagination', async () => {
            // Page 1
            const page1Response = await testHelpers.makeRequest({
                description: 'Recherche avec pagination - page 1',
                method: 'GET',
                endpoint: '/api/repositories/search?query=test&page=1&limit=5',
                expectedStatus: 200,
                validateResponse: (response) => {
                    expect(response.pagination.page).toBe(1);
                    expect(response.pagination.limit).toBe(5);
                    expect(response.repositories.length).toBeLessThanOrEqual(5);
                }
            });

            // Page 2 si il y a plus de résultats
            if (page1Response.body.pagination.hasNext) {
                await testHelpers.makeRequest({
                    description: 'Recherche avec pagination - page 2',
                    method: 'GET',
                    endpoint: '/api/repositories/search?query=test&page=2&limit=5',
                    expectedStatus: 200,
                    validateResponse: (response) => {
                        expect(response.pagination.page).toBe(2);
                        expect(response.pagination.limit).toBe(5);
                    }
                });
            }
        });
    });

    describe('GET /api/repositories/languages/stats', () => {
        test('Get languages statistics without authentication', async () => {
            await testHelpers.makeRequest({
                description: 'Statistiques des langages sans authentification',
                method: 'GET',
                endpoint: '/api/repositories/languages/stats',
                expectedStatus: 200,
                validateResponse: (response) => {
                    expect(response).toHaveProperty('totalRepositories');
                    expect(response).toHaveProperty('languages');
                    expect(response).toHaveProperty('timestamp');
                    expect(Array.isArray(response.languages)).toBe(true);
                    expect(typeof response.totalRepositories).toBe('number');

                    // Vérifier la structure des langages
                    response.languages.forEach((lang: any) => {
                        expect(lang).toHaveProperty('name');
                        expect(lang).toHaveProperty('repositoryCount');
                        expect(lang).toHaveProperty('percentage');
                        expect(typeof lang.name).toBe('string');
                        expect(typeof lang.repositoryCount).toBe('number');
                        expect(typeof lang.percentage).toBe('number');
                        expect(lang.percentage).toBeGreaterThanOrEqual(0);
                        expect(lang.percentage).toBeLessThanOrEqual(100);
                    });
                }
            });
        });

        test('Get languages statistics with authentication', async () => {
            await testHelpers.makeRequest({
                description: 'Statistiques des langages avec authentification',
                method: 'GET',
                endpoint: '/api/repositories/languages/stats',
                expectedStatus: 200,
                auth: true,
                validateResponse: (response) => {
                    expect(response).toHaveProperty('totalRepositories');
                    expect(response).toHaveProperty('languages');
                    expect(response).toHaveProperty('timestamp');
                    expect(Array.isArray(response.languages)).toBe(true);

                    // Avec auth, on peut avoir des stats plus détaillées
                    response.languages.forEach((lang: any) => {
                        expect(lang).toHaveProperty('name');
                        expect(lang).toHaveProperty('repositoryCount');
                        expect(lang).toHaveProperty('percentage');
                        if (lang.totalBytes !== undefined) {
                            expect(typeof lang.totalBytes).toBe('number');
                        }
                    });
                }
            });
        });
    });

    describe('GET /api/repositories/trending', () => {
        test('Get trending repositories - 7 days', async () => {
            await testHelpers.makeRequest({
                description: 'Repositories tendance sur 7 jours',
                method: 'GET',
                endpoint: '/api/repositories/trending?period=7d&limit=10',
                expectedStatus: 200,
                validateResponse: (response) => {
                    expect(response).toHaveProperty('repositories');
                    expect(response).toHaveProperty('period', '7d');
                    expect(response).toHaveProperty('totalCount');
                    expect(response).toHaveProperty('timestamp');
                    expect(Array.isArray(response.repositories)).toBe(true);
                    expect(response.repositories.length).toBeLessThanOrEqual(10);

                    // Vérifier la structure des repositories
                    response.repositories.forEach((repo: any) => {
                        ResponseValidators.repository(repo);
                    });
                }
            });
        });

        test('Get trending repositories by language', async () => {
            await testHelpers.makeRequest({
                description: 'Repositories tendance par langage',
                method: 'GET',
                endpoint: '/api/repositories/trending?period=30d&language=JavaScript&limit=5',
                expectedStatus: 200,
                validateResponse: (response) => {
                    expect(response).toHaveProperty('repositories');
                    expect(response).toHaveProperty('period', '30d');
                    expect(response).toHaveProperty('totalCount');
                    expect(response.repositories.length).toBeLessThanOrEqual(5);
                }
            });
        });

        test('Get trending repositories - different periods', async () => {
            const periods = ['1d', '7d', '30d'];

            for (const period of periods) {
                await testHelpers.makeRequest({
                    description: `Repositories tendance sur ${period}`,
                    method: 'GET',
                    endpoint: `/api/repositories/trending?period=${period}&limit=3`,
                    expectedStatus: 200,
                    validateResponse: (response) => {
                        expect(response).toHaveProperty('period', period);
                        expect(response).toHaveProperty('repositories');
                        expect(response).toHaveProperty('totalCount');
                        expect(Array.isArray(response.repositories)).toBe(true);
                    }
                });
            }
        });

        test('Get trending repositories with invalid period', async () => {
            await testHelpers.makeRequest({
                description: 'Repositories tendance avec période invalide',
                method: 'GET',
                endpoint: '/api/repositories/trending?period=invalid&limit=5',
                expectedStatus: 400,
                validateResponse: ResponseValidators.validationError
            });
        });
    });

    describe('GET /api/repositories/{owner}/{repo}', () => {
        test('Get repository details without authentication', async () => {
            await testHelpers.makeRequest({
                description: 'Détails de repository sans authentification',
                method: 'GET',
                endpoint: `/api/repositories/${testRepo.owner}/${testRepo.repo}`,
                expectedStatus: 200,
                validateResponse: (response) => {
                    ResponseValidators.repository(response);
                    expect(response.nameWithOwner).toBe(testRepo.nameWithOwner);
                    expect(response.name).toBe(testRepo.repo);
                }
            });
        });

        test('Get repository details with authentication', async () => {
            await testHelpers.makeRequest({
                description: 'Détails de repository avec authentification',
                method: 'GET',
                endpoint: `/api/repositories/${testRepo.owner}/${testRepo.repo}`,
                expectedStatus: 200,
                auth: true,
                validateResponse: (response) => {
                    ResponseValidators.repository(response);
                    expect(response.nameWithOwner).toBe(testRepo.nameWithOwner);
                    expect(response.name).toBe(testRepo.repo);

                    // Avec auth, on peut avoir des infos supplémentaires
                    if (response.collaborators !== undefined) {
                        expect(response.collaborators).toHaveProperty('totalCount');
                    }
                }
            });
        });

        test('Get non-existent repository', async () => {
            await testHelpers.makeRequest({
                description: 'Tentative de récupération d\'un repository inexistant',
                method: 'GET',
                endpoint: '/api/repositories/nonexistentowner/nonexistentrepo',
                expectedStatus: 404,
                validateResponse: (response) => {
                    ResponseValidators.error(response, 'Not Found');
                }
            });
        });

        test('Get repository with invalid owner/repo format', async () => {
            await testHelpers.makeRequest({
                description: 'Repository avec format owner/repo invalide',
                method: 'GET',
                endpoint: '/api/repositories/invalid-owner!/invalid-repo!',
                expectedStatus: 400,
                validateResponse: ResponseValidators.validationError
            });
        });

        test('Get private repository without authentication', async () => {
            // Test avec un repository potentiellement privé
            await testHelpers.makeRequest({
                description: 'Tentative d\'accès à repository privé sans authentification',
                method: 'GET',
                endpoint: '/api/repositories/privateowner/privaterepo',
                expectedStatus: 404, // ou 403 selon l'implémentation
                validateResponse: (response) => {
                    expect(response).toHaveProperty('error');
                    expect(response).toHaveProperty('message');
                }
            });
        });
    });

    describe('POST /api/repositories/{owner}/{repo}/enrich', () => {
        test('Enrich repository without authentication', async () => {
            await testHelpers.makeRequest({
                description: 'Tentative d\'enrichissement sans authentification',
                method: 'POST',
                endpoint: `/api/repositories/${testRepo.owner}/${testRepo.repo}/enrich`,
                expectedStatus: 401,
                validateResponse: (response) => {
                    ResponseValidators.error(response, 'Unauthorized');
                }
            });
        });

        test('Enrich repository with authentication', async () => {
            await testHelpers.makeRequest({
                description: 'Enrichissement DevOps d\'un repository avec authentification',
                method: 'POST',
                endpoint: `/api/repositories/${testRepo.owner}/${testRepo.repo}/enrich`,
                expectedStatus: 200,
                auth: true,
                validateResponse: (response) => {
                    ResponseValidators.repository(response);

                    // Vérifier les enrichissements DevOps
                    if (response.githubActions !== undefined) {
                        expect(response.githubActions).toHaveProperty('enabled');
                        if (response.githubActions.workflows) {
                            expect(Array.isArray(response.githubActions.workflows)).toBe(true);
                        }
                    }

                    if (response.security !== undefined) {
                        expect(response.security).toHaveProperty('vulnerabilityAlertsEnabled');
                    }

                    if (response.branchProtection !== undefined) {
                        expect(response.branchProtection).toHaveProperty('enabled');
                    }
                }
            });
        });

        test('Enrich non-existent repository', async () => {
            await testHelpers.makeRequest({
                description: 'Enrichissement de repository inexistant',
                method: 'POST',
                endpoint: '/api/repositories/nonexistentowner/nonexistentrepo/enrich',
                expectedStatus: 404,
                auth: true,
                validateResponse: (response) => {
                    ResponseValidators.error(response, 'Not Found');
                }
            });
        });

        test('Enrich repository with invalid format', async () => {
            await testHelpers.makeRequest({
                description: 'Enrichissement avec format invalide',
                method: 'POST',
                endpoint: '/api/repositories/invalid!/invalid!/enrich',
                expectedStatus: 400,
                auth: true,
                validateResponse: ResponseValidators.validationError
            });
        });
    });

    describe('Repositories Integration Tests', () => {
        test('Complete repositories flow', async () => {
            testLogger.logInfo('Test du flow complet repositories');

            // 1. Rechercher des repositories
            const searchResponse = await testHelpers.makeRequest({
                description: 'Étape 1: Recherche de repositories',
                method: 'GET',
                endpoint: '/api/repositories/search?query=javascript&limit=5&sortBy=stars',
                expectedStatus: 200,
                auth: true
            });

            // 2. Sélectionner le premier repository trouvé
            if (searchResponse.body.repositories && searchResponse.body.repositories.length > 0) {
                const firstRepo = searchResponse.body.repositories[0];
                const [owner, repo] = firstRepo.nameWithOwner.split('/');

                // 3. Récupérer les détails complets
                await testHelpers.makeRequest({
                    description: `Étape 2: Détails complets de ${firstRepo.nameWithOwner}`,
                    method: 'GET',
                    endpoint: `/api/repositories/${owner}/${repo}`,
                    expectedStatus: 200,
                    auth: true,
                    validateResponse: ResponseValidators.repository
                });

                // 4. Enrichir avec données DevOps
                await testHelpers.makeRequest({
                    description: `Étape 3: Enrichissement DevOps de ${firstRepo.nameWithOwner}`,
                    method: 'POST',
                    endpoint: `/api/repositories/${owner}/${repo}/enrich`,
                    expectedStatus: 200,
                    auth: true
                });

                testLogger.logSuccess(`Flow repository terminé pour ${firstRepo.nameWithOwner}`);
            } else {
                testLogger.logWarning('Aucun repository trouvé dans la recherche');
            }

            // 5. Récupérer les statistiques des langages
            await testHelpers.makeRequest({
                description: 'Étape 4: Statistiques des langages',
                method: 'GET',
                endpoint: '/api/repositories/languages/stats',
                expectedStatus: 200,
                auth: true
            });

            // 6. Récupérer les repositories tendance
            await testHelpers.makeRequest({
                description: 'Étape 5: Repositories tendance',
                method: 'GET',
                endpoint: '/api/repositories/trending?period=7d&limit=5',
                expectedStatus: 200,
                auth: true
            });

            testLogger.logSuccess('Flow complet repositories terminé avec succès');
        });

        test('Repository search with different filters', async () => {
            testLogger.logInfo('Test de recherche avec différents filtres');

            const filters = [
                'language=JavaScript&minStars=1000',
                'topic=react&sortBy=updated&sortOrder=desc',
                'isPrivate=false&isFork=false&minForks=50',
                'language=TypeScript&isArchived=false'
            ];

            for (let i = 0; i < filters.length; i++) {
                await testHelpers.makeRequest({
                    description: `Recherche avec filtre ${i + 1}: ${filters[i]}`,
                    method: 'GET',
                    endpoint: `/api/repositories/search?${filters[i]}&limit=3`,
                    expectedStatus: 200,
                    auth: true,
                    validateResponse: (response) => {
                        expect(response).toHaveProperty('repositories');
                        expect(response).toHaveProperty('pagination');
                        expect(response).toHaveProperty('totalCount');
                    }
                });
            }

            testLogger.logSuccess('Tests de filtres multiples terminés');
        });
    });
}); 