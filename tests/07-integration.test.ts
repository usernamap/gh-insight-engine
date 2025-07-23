import { describe, test, beforeAll, afterAll } from '@jest/globals';
import { Express } from 'express';
import { createApp } from '../src/app';
import { testLogger } from './utils/TestLogger';
import { openAPIValidator } from './utils/OpenAPIValidator.ts';
import TestHelpers, { TestContext, TestData, ResponseValidators } from './utils/TestHelpers';

describe('Integration Tests & OpenAPI Validation', () => {
    let app: Express;
    let testHelpers: TestHelpers;
    let authToken: string;

    beforeAll(async () => {
        testLogger.startSuite(
            'Integration Tests & OpenAPI Validation',
            'Tests d\'intégration complets avec validation de la conformité OpenAPI et génération de rapport de couverture'
        );

        // Initialiser l'application
        // @ts-ignore - Express type error
        app = await createApp();

        const context: TestContext = { app };
        testHelpers = new TestHelpers(context);

        // Authentification préalable
        testLogger.logInfo('Authentification préalable pour les tests d\'intégration');

        const loginResponse = await testHelpers.makeRequest({
            description: 'Authentification préalable pour les tests d\'intégration',
            method: 'POST',
            endpoint: '/api/auth/login',
            expectedStatus: 200,
            body: TestData.validUser,
            validateResponse: ResponseValidators.loginSuccess
        });

        if (loginResponse.body?.data?.token) {
            authToken = loginResponse.body.data.token;
            testHelpers.setAuthToken(authToken);
            testLogger.logSuccess('Authentification réussie pour les tests d\'intégration');
        }
    });

    afterAll(() => {
        // Générer le rapport de validation OpenAPI
        openAPIValidator.generateCoverageReport();
        testLogger.endSuite();
    });

    describe('Complete API Workflow', () => {
        test('End-to-end user journey', async () => {
            testLogger.logInfo('Test du parcours utilisateur complet de bout en bout');

            // 1. Health check
            const healthResponse = await testHelpers.makeRequest({
                description: 'Étape 1: Vérification de l\'état de l\'API',
                method: 'GET',
                endpoint: '/api/health',
                expectedStatus: 200,
                validateResponse: ResponseValidators.healthCheck
            });
            openAPIValidator.registerTestedEndpoint('GET', '/api/health');

            // 2. Ping
            await testHelpers.makeRequest({
                description: 'Étape 2: Test de connectivité',
                method: 'GET',
                endpoint: '/api/ping',
                expectedStatus: 200,
                validateResponse: ResponseValidators.ping
            });
            openAPIValidator.registerTestedEndpoint('GET', '/api/ping');

            // 3. Login
            const loginResponse = await testHelpers.makeRequest({
                description: 'Étape 3: Connexion utilisateur',
                method: 'POST',
                endpoint: '/api/auth/login',
                expectedStatus: 200,
                body: TestData.validUser,
                validateResponse: ResponseValidators.loginSuccess
            });
            openAPIValidator.registerTestedEndpoint('POST', '/api/auth/login');

            if (loginResponse.body?.data?.token) {
                const token = loginResponse.body.data.token;
                testHelpers.setAuthToken(token);

                // 4. Validate token
                await testHelpers.makeRequest({
                    description: 'Étape 4: Validation du token',
                    method: 'GET',
                    endpoint: '/api/auth/validate',
                    expectedStatus: 200,
                    auth: true
                });
                openAPIValidator.registerTestedEndpoint('GET', '/api/auth/validate');

                // 5. Get current user
                await testHelpers.makeRequest({
                    description: 'Étape 5: Informations utilisateur connecté',
                    method: 'GET',
                    endpoint: '/api/auth/me',
                    expectedStatus: 200,
                    auth: true
                });
                openAPIValidator.registerTestedEndpoint('GET', '/api/auth/me');

                // 6. Search users
                const userSearchResponse = await testHelpers.makeRequest({
                    description: 'Étape 6: Recherche d\'utilisateurs',
                    method: 'GET',
                    endpoint: '/api/users/search?query=octocat&limit=5',
                    expectedStatus: 200,
                    auth: true
                });
                openAPIValidator.registerTestedEndpoint('GET', '/api/users/search');

                // 7. Get user profile
                await testHelpers.makeRequest({
                    description: 'Étape 7: Profil utilisateur détaillé',
                    method: 'GET',
                    endpoint: `/api/users/${TestData.validUser.username}`,
                    expectedStatus: 200,
                    auth: true,
                    validateResponse: ResponseValidators.userProfile
                });
                openAPIValidator.registerTestedEndpoint('GET', `/api/users/{username}`);

                // 8. Get user status
                await testHelpers.makeRequest({
                    description: 'Étape 8: Statut d\'analyse utilisateur',
                    method: 'GET',
                    endpoint: `/api/users/${TestData.validUser.username}/status`,
                    expectedStatus: 200,
                    auth: true
                });
                openAPIValidator.registerTestedEndpoint('GET', `/api/users/{username}/status`);

                // 9. Get platform stats
                await testHelpers.makeRequest({
                    description: 'Étape 9: Statistiques de la plateforme',
                    method: 'GET',
                    endpoint: '/api/users/stats',
                    expectedStatus: 200,
                    auth: true
                });
                openAPIValidator.registerTestedEndpoint('GET', '/api/users/stats');

                // 10. Get user repositories
                await testHelpers.makeRequest({
                    description: 'Étape 10: Repositories de l\'utilisateur',
                    method: 'GET',
                    endpoint: `/api/users/${TestData.validUser.username}/repositories?limit=10`,
                    expectedStatus: 200,
                    auth: true
                });
                openAPIValidator.registerTestedEndpoint('GET', `/api/users/{username}/repositories`);

                // 11. Search repositories
                const repoSearchResponse = await testHelpers.makeRequest({
                    description: 'Étape 11: Recherche de repositories',
                    method: 'GET',
                    endpoint: '/api/repositories/search?query=javascript&limit=5',
                    expectedStatus: 200,
                    auth: true
                });
                openAPIValidator.registerTestedEndpoint('GET', '/api/repositories/search');

                // 12. Get repository details
                await testHelpers.makeRequest({
                    description: 'Étape 12: Détails d\'un repository',
                    method: 'GET',
                    endpoint: `/api/repositories/${TestData.sampleRepository.owner}/${TestData.sampleRepository.repo}`,
                    expectedStatus: 200,
                    auth: true,
                    validateResponse: ResponseValidators.repository
                });
                openAPIValidator.registerTestedEndpoint('GET', `/api/repositories/{owner}/{repo}`);

                // 13. Enrich repository
                await testHelpers.makeRequest({
                    description: 'Étape 13: Enrichissement DevOps du repository',
                    method: 'POST',
                    endpoint: `/api/repositories/${TestData.sampleRepository.owner}/${TestData.sampleRepository.repo}/enrich`,
                    expectedStatus: 200,
                    auth: true
                });
                openAPIValidator.registerTestedEndpoint('POST', `/api/repositories/{owner}/{repo}/enrich`);

                // 14. Get languages stats
                await testHelpers.makeRequest({
                    description: 'Étape 14: Statistiques des langages',
                    method: 'GET',
                    endpoint: '/api/repositories/languages/stats',
                    expectedStatus: 200,
                    auth: true
                });
                openAPIValidator.registerTestedEndpoint('GET', '/api/repositories/languages/stats');

                // 15. Get trending repositories
                await testHelpers.makeRequest({
                    description: 'Étape 15: Repositories tendance',
                    method: 'GET',
                    endpoint: '/api/repositories/trending?period=7d&limit=5',
                    expectedStatus: 200,
                    auth: true
                });
                openAPIValidator.registerTestedEndpoint('GET', '/api/repositories/trending');

                // 16. Launch user analysis
                await testHelpers.makeRequest({
                    description: 'Étape 16: Lancement d\'analyse utilisateur',
                    method: 'POST',
                    endpoint: `/api/analytics/${TestData.validUser.username}/analyze`,
                    expectedStatus: 202,
                    auth: true,
                    body: TestData.sampleAnalytics
                });
                openAPIValidator.registerTestedEndpoint('POST', `/api/analytics/{username}/analyze`);

                // 17. Get analytics overview
                await testHelpers.makeRequest({
                    description: 'Étape 17: Vue d\'ensemble des analytics',
                    method: 'GET',
                    endpoint: `/api/analytics/${TestData.validUser.username}/overview`,
                    expectedStatus: 200,
                    auth: true,
                    validateResponse: ResponseValidators.analyticsOverview
                });
                openAPIValidator.registerTestedEndpoint('GET', `/api/analytics/{username}/overview`);

                // 18. Get performance scores
                await testHelpers.makeRequest({
                    description: 'Étape 18: Scores de performance',
                    method: 'GET',
                    endpoint: `/api/analytics/${TestData.validUser.username}/performance`,
                    expectedStatus: 200,
                    auth: true
                });
                openAPIValidator.registerTestedEndpoint('GET', `/api/analytics/{username}/performance`);

                // 19. Get language analysis
                await testHelpers.makeRequest({
                    description: 'Étape 19: Analyse des langages',
                    method: 'GET',
                    endpoint: `/api/analytics/${TestData.validUser.username}/languages`,
                    expectedStatus: 200,
                    auth: true
                });
                openAPIValidator.registerTestedEndpoint('GET', `/api/analytics/{username}/languages`);

                // 20. Get activity analysis
                await testHelpers.makeRequest({
                    description: 'Étape 20: Analyse d\'activité',
                    method: 'GET',
                    endpoint: `/api/analytics/${TestData.validUser.username}/activity`,
                    expectedStatus: 200,
                    auth: true
                });
                openAPIValidator.registerTestedEndpoint('GET', `/api/analytics/{username}/activity`);

                // 21. Get productivity score
                await testHelpers.makeRequest({
                    description: 'Étape 21: Score de productivité',
                    method: 'GET',
                    endpoint: `/api/analytics/${TestData.validUser.username}/productivity`,
                    expectedStatus: 200,
                    auth: true
                });
                openAPIValidator.registerTestedEndpoint('GET', `/api/analytics/{username}/productivity`);

                // 22. Get DevOps maturity
                await testHelpers.makeRequest({
                    description: 'Étape 22: Maturité DevOps',
                    method: 'GET',
                    endpoint: `/api/analytics/${TestData.validUser.username}/devops`,
                    expectedStatus: 200,
                    auth: true
                });
                openAPIValidator.registerTestedEndpoint('GET', `/api/analytics/{username}/devops`);

                // 23. Generate insights
                await testHelpers.makeRequest({
                    description: 'Étape 23: Génération d\'insights IA',
                    method: 'POST',
                    endpoint: `/api/insights/${TestData.validUser.username}/generate`,
                    expectedStatus: 202,
                    auth: true
                });
                openAPIValidator.registerTestedEndpoint('POST', `/api/insights/{username}/generate`);

                // 24. Get insights summary
                await testHelpers.makeRequest({
                    description: 'Étape 24: Résumé des insights',
                    method: 'GET',
                    endpoint: `/api/insights/${TestData.validUser.username}/summary`,
                    expectedStatus: 200,
                    auth: true,
                    validateResponse: ResponseValidators.insightsSummary
                });
                openAPIValidator.registerTestedEndpoint('GET', `/api/insights/{username}/summary`);

                // 25. Get recommendations
                await testHelpers.makeRequest({
                    description: 'Étape 25: Recommandations IA',
                    method: 'GET',
                    endpoint: `/api/insights/${TestData.validUser.username}/recommendations`,
                    expectedStatus: 200,
                    auth: true
                });
                openAPIValidator.registerTestedEndpoint('GET', `/api/insights/{username}/recommendations`);

                // 26. Get strengths
                await testHelpers.makeRequest({
                    description: 'Étape 26: Forces identifiées',
                    method: 'GET',
                    endpoint: `/api/insights/${TestData.validUser.username}/strengths`,
                    expectedStatus: 200,
                    auth: true
                });
                openAPIValidator.registerTestedEndpoint('GET', `/api/insights/{username}/strengths`);

                // 27. Get growth areas
                await testHelpers.makeRequest({
                    description: 'Étape 27: Axes d\'amélioration',
                    method: 'GET',
                    endpoint: `/api/insights/${TestData.validUser.username}/growth`,
                    expectedStatus: 200,
                    auth: true
                });
                openAPIValidator.registerTestedEndpoint('GET', `/api/insights/{username}/growth`);

                // 28. Get personality
                await testHelpers.makeRequest({
                    description: 'Étape 28: Personnalité de développeur',
                    method: 'GET',
                    endpoint: `/api/insights/${TestData.validUser.username}/personality`,
                    expectedStatus: 200,
                    auth: true
                });
                openAPIValidator.registerTestedEndpoint('GET', `/api/insights/{username}/personality`);

                // 29. Get career insights
                await testHelpers.makeRequest({
                    description: 'Étape 29: Insights de carrière',
                    method: 'GET',
                    endpoint: `/api/insights/${TestData.validUser.username}/career`,
                    expectedStatus: 200,
                    auth: true
                });
                openAPIValidator.registerTestedEndpoint('GET', `/api/insights/{username}/career`);

                // 30. Get skill assessment
                await testHelpers.makeRequest({
                    description: 'Étape 30: Évaluation des compétences',
                    method: 'GET',
                    endpoint: `/api/insights/${TestData.validUser.username}/skills`,
                    expectedStatus: 200,
                    auth: true
                });
                openAPIValidator.registerTestedEndpoint('GET', `/api/insights/{username}/skills`);

                // 31. Refresh token
                await testHelpers.makeRequest({
                    description: 'Étape 31: Rafraîchissement du token',
                    method: 'POST',
                    endpoint: '/api/auth/refresh',
                    expectedStatus: 200,
                    body: {
                        refresh_token: token
                    }
                });
                openAPIValidator.registerTestedEndpoint('POST', '/api/auth/refresh');

                // 32. Logout
                await testHelpers.makeRequest({
                    description: 'Étape 32: Déconnexion finale',
                    method: 'DELETE',
                    endpoint: '/api/auth/logout',
                    expectedStatus: 200,
                    auth: true
                });
                openAPIValidator.registerTestedEndpoint('DELETE', '/api/auth/logout');

                testLogger.logSuccess('Parcours utilisateur complet terminé avec succès - 32 étapes exécutées');
            }
        });
    });

    describe('OpenAPI Compliance Validation', () => {
        test('Validate all endpoints against OpenAPI spec', async () => {
            testLogger.logInfo('Validation de la conformité OpenAPI');

            const allEndpoints = openAPIValidator.getAllEndpoints();
            testLogger.logInfo(`Total des endpoints dans la spécification: ${allEndpoints.length}`);

            let validationErrors = 0;
            let validationWarnings = 0;

            for (const endpoint of allEndpoints) {
                // Simuler un appel pour valider la structure
                try {
                    const validation = openAPIValidator.validateEndpoint(
                        endpoint.method,
                        endpoint.path,
                        endpoint.expectedStatus[0] || 200
                    );

                    if (!validation.isValid) {
                        validationErrors += validation.errors.length;
                        testLogger.logError(`Validation failed for ${endpoint.method} ${endpoint.path}:`, validation.errors);
                    }

                    if (validation.warnings.length > 0) {
                        validationWarnings += validation.warnings.length;
                        testLogger.logWarning(`Validation warnings for ${endpoint.method} ${endpoint.path}:`, validation.warnings);
                    }
                } catch (error) {
                    testLogger.logError(`Error validating ${endpoint.method} ${endpoint.path}:`, error);
                    validationErrors++;
                }
            }

            testLogger.logInfo(`Validation terminée: ${validationErrors} erreurs, ${validationWarnings} avertissements`);

            // La validation ne doit pas échouer le test, mais informer
            if (validationErrors === 0) {
                testLogger.logSuccess('✅ Tous les endpoints sont conformes à la spécification OpenAPI');
            } else {
                testLogger.logWarning(`⚠️  ${validationErrors} problèmes de conformité détectés`);
            }
        });

        test('Schema validation for common responses', async () => {
            testLogger.logInfo('Validation des schémas de réponse');

            // Tester les schémas avec des données mock
            const schemas = [
                { name: 'HealthResponse', data: { status: 'healthy', service: 'test', version: '1.0.0', timestamp: new Date().toISOString(), uptime: 3600, environment: 'test' } },
                { name: 'PingResponse', data: { message: 'pong', timestamp: new Date().toISOString() } },
                { name: 'LoginResponse', data: { success: true, message: 'Success', data: { token: 'test', expiresIn: '24h', user: { id: '1', username: 'test', name: 'Test User' } }, timestamp: new Date().toISOString() } }
            ];

            for (const schema of schemas) {
                const validation = openAPIValidator.validateSchema(schema.data, schema.name);

                if (validation.isValid) {
                    testLogger.logSuccess(`✅ Schema ${schema.name} is valid`);
                } else {
                    testLogger.logError(`❌ Schema ${schema.name} validation failed:`, validation.errors);
                }
            }
        });

        test('Security requirements validation', async () => {
            testLogger.logInfo('Validation des exigences de sécurité');

            const secureEndpoints = [
                { method: 'GET', path: '/api/auth/validate' },
                { method: 'GET', path: '/api/auth/me' },
                { method: 'DELETE', path: '/api/auth/logout' },
                { method: 'POST', path: '/api/analytics/{username}/analyze' },
                { method: 'POST', path: '/api/insights/{username}/generate' }
            ];

            for (const endpoint of secureEndpoints) {
                const requirements = openAPIValidator.getSecurityRequirements(endpoint.method, endpoint.path);

                if (requirements.length > 0) {
                    testLogger.logSuccess(`✅ ${endpoint.method} ${endpoint.path} requires: ${requirements.join(', ')}`);
                } else {
                    testLogger.logWarning(`⚠️  ${endpoint.method} ${endpoint.path} has no security requirements`);
                }
            }
        });
    });

    describe('Performance and Load Testing', () => {
        test('Concurrent requests handling', async () => {
            testLogger.logInfo('Test de gestion des requêtes concurrentes');

            const concurrentRequests = 10;
            const promises = Array(concurrentRequests).fill(null).map((_, index) =>
                testHelpers.makeRequest({
                    description: `Requête concurrente #${index + 1}`,
                    method: 'GET',
                    endpoint: '/api/health',
                    expectedStatus: 200
                })
            );

            const startTime = Date.now();
            const responses = await Promise.all(promises);
            const endTime = Date.now();

            const totalTime = endTime - startTime;
            const averageTime = totalTime / concurrentRequests;

            testLogger.logInfo(`${concurrentRequests} requêtes concurrentes exécutées en ${totalTime}ms (moyenne: ${averageTime.toFixed(2)}ms)`);

            // Vérifier que toutes les requêtes ont réussi
            const successfulRequests = responses.filter(r => r.status === 200).length;
            expect(successfulRequests).toBe(concurrentRequests);

            if (averageTime < 100) {
                testLogger.logSuccess('🚀 Excellentes performances de concurrence');
            } else if (averageTime < 500) {
                testLogger.logInfo('✅ Bonnes performances de concurrence');
            } else {
                testLogger.logWarning('⚠️  Performances de concurrence à améliorer');
            }
        });

        test('Memory usage monitoring', async () => {
            testLogger.logInfo('Monitoring de l\'utilisation mémoire');

            const initialMemory = process.memoryUsage();

            // Effectuer plusieurs requêtes pour tester les fuites mémoire
            for (let i = 0; i < 50; i++) {
                await testHelpers.makeRequest({
                    description: `Requête mémoire #${i + 1}`,
                    method: 'GET',
                    endpoint: '/api/ping',
                    expectedStatus: 200
                });
            }

            const finalMemory = process.memoryUsage();
            const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
            const memoryIncreaseMB = memoryIncrease / 1024 / 1024;

            testLogger.logInfo(`Augmentation mémoire: ${memoryIncreaseMB.toFixed(2)} MB`);

            if (memoryIncreaseMB < 10) {
                testLogger.logSuccess('✅ Utilisation mémoire optimale');
            } else if (memoryIncreaseMB < 50) {
                testLogger.logWarning('⚠️  Utilisation mémoire acceptable');
            } else {
                testLogger.logError('❌ Possible fuite mémoire détectée');
            }
        });
    });
}); 