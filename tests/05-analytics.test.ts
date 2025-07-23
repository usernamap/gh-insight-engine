import { describe, test, beforeAll, afterAll } from '@jest/globals';
import { Express } from 'express';
import { createApp } from '../src/app';
import { testLogger } from './utils/TestLogger';
import TestHelpers, { TestContext, TestData, ResponseValidators } from './utils/TestHelpers';

describe('Analytics Endpoints', () => {
    let app: Express;
    let testHelpers: TestHelpers;
    let authToken: string;
    const testUsername = TestData.validUser.username;

    beforeAll(async () => {
        testLogger.startSuite(
            'Analytics Endpoints',
            'Tests des endpoints analytics: analyse utilisateur, métriques, performance, langages et activité'
        );

        // Initialiser l'application
        // @ts-ignore - Express type error
        app = await createApp();

        const context: TestContext = { app };
        testHelpers = new TestHelpers(context);

        // Authentification préalable pour les tests nécessitant un token
        testLogger.logInfo('Authentification préalable pour les tests analytics');

        const loginResponse = await testHelpers.makeRequest({
            description: 'Authentification préalable pour les tests analytics',
            method: 'POST',
            endpoint: '/api/auth/login',
            expectedStatus: 200,
            body: TestData.validUser,
            validateResponse: ResponseValidators.loginSuccess
        });

        if (loginResponse.body?.data?.token) {
            authToken = loginResponse.body.data.token;
            testHelpers.setAuthToken(authToken);
            testLogger.logSuccess('Authentification réussie pour les tests analytics');
        }
    });

    afterAll(() => {
        testLogger.endSuite();
    });

    describe('POST /api/analytics/{username}/analyze', () => {
        test('Launch user analysis without authentication', async () => {
            await testHelpers.makeRequest({
                description: 'Tentative de lancement d\'analyse sans authentification',
                method: 'POST',
                endpoint: `/api/analytics/${testUsername}/analyze`,
                expectedStatus: 401,
                body: TestData.sampleAnalytics,
                validateResponse: (response) => {
                    ResponseValidators.error(response, 'Unauthorized');
                }
            });
        });

        test('Launch user analysis with authentication', async () => {
            await testHelpers.makeRequest({
                description: 'Lancement d\'analyse utilisateur avec authentification',
                method: 'POST',
                endpoint: `/api/analytics/${testUsername}/analyze`,
                expectedStatus: 202,
                auth: true,
                body: TestData.sampleAnalytics,
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

        test('Launch analysis with custom parameters', async () => {
            await testHelpers.makeRequest({
                description: 'Analyse avec paramètres personnalisés',
                method: 'POST',
                endpoint: `/api/analytics/${testUsername}/analyze`,
                expectedStatus: 202,
                auth: true,
                body: {
                    includePrivate: true,
                    forceRefresh: true,
                    maxAge: 1800
                },
                validateResponse: (response) => {
                    expect(response).toHaveProperty('status');
                    expect(response).toHaveProperty('progress');
                    expect(response).toHaveProperty('startedAt');
                    if (response.phases) {
                        expect(response.phases).toHaveProperty('githubData');
                        expect(response.phases).toHaveProperty('analytics');
                        expect(response.phases).toHaveProperty('insights');
                    }
                }
            });
        });

        test('Launch analysis for non-existent user', async () => {
            await testHelpers.makeRequest({
                description: 'Analyse pour utilisateur inexistant',
                method: 'POST',
                endpoint: '/api/analytics/nonexistentuser123456789/analyze',
                expectedStatus: 404,
                auth: true,
                body: TestData.sampleAnalytics,
                validateResponse: (response) => {
                    ResponseValidators.error(response, 'Not Found');
                }
            });
        });

        test('Launch analysis with invalid parameters', async () => {
            await testHelpers.makeRequest({
                description: 'Analyse avec paramètres invalides',
                method: 'POST',
                endpoint: `/api/analytics/${testUsername}/analyze`,
                expectedStatus: 400,
                auth: true,
                body: {
                    includePrivate: 'invalid', // Should be boolean
                    maxAge: -1 // Should be positive
                },
                validateResponse: ResponseValidators.validationError
            });
        });

        test('Launch analysis without permission (forbidden)', async () => {
            await testHelpers.makeRequest({
                description: 'Analyse sans permission (utilisateur différent)',
                method: 'POST',
                endpoint: '/api/analytics/anotheruser/analyze',
                expectedStatus: 403,
                auth: true,
                body: TestData.sampleAnalytics,
                validateResponse: (response) => {
                    ResponseValidators.error(response, 'Forbidden');
                }
            });
        });

        test('Launch analysis with rate limiting', async () => {
            testLogger.logInfo('Test de rate limiting sur les analyses');

            // Lancer plusieurs analyses rapidement pour tester le rate limiting
            const promises = Array(3).fill(null).map((_, index) =>
                testHelpers.makeRequest({
                    description: `Analyse rapide #${index + 1} pour rate limiting`,
                    method: 'POST',
                    endpoint: `/api/analytics/${testUsername}/analyze`,
                    expectedStatus: index === 0 ? 202 : 429, // Première acceptée, autres limitées
                    auth: true,
                    body: TestData.sampleAnalytics
                })
            );

            const responses = await Promise.all(promises);

            // Vérifier qu'au moins une requête a été limitée
            const rateLimitedResponses = responses.filter(r => r.status === 429);
            if (rateLimitedResponses.length > 0) {
                testLogger.logSuccess('Rate limiting fonctionne correctement');
            }
        });
    });

    describe('GET /api/analytics/{username}/overview', () => {
        test('Get analytics overview without authentication', async () => {
            await testHelpers.makeRequest({
                description: 'Vue d\'ensemble analytics sans authentification',
                method: 'GET',
                endpoint: `/api/analytics/${testUsername}/overview`,
                expectedStatus: 200,
                validateResponse: ResponseValidators.analyticsOverview
            });
        });

        test('Get analytics overview with authentication', async () => {
            await testHelpers.makeRequest({
                description: 'Vue d\'ensemble analytics avec authentification',
                method: 'GET',
                endpoint: `/api/analytics/${testUsername}/overview`,
                expectedStatus: 200,
                auth: true,
                validateResponse: (response) => {
                    ResponseValidators.analyticsOverview(response);
                    expect(response.username).toBe(testUsername);
                    expect(response.summary.totalRepositories).toBeGreaterThanOrEqual(0);
                    expect(response.summary.totalStars).toBeGreaterThanOrEqual(0);
                    expect(response.summary.totalForks).toBeGreaterThanOrEqual(0);
                    expect(response.summary.activityScore).toBeGreaterThanOrEqual(0);
                    expect(response.summary.activityScore).toBeLessThanOrEqual(100);
                    expect(Array.isArray(response.summary.primaryLanguages)).toBe(true);
                }
            });
        });

        test('Get overview for non-existent user', async () => {
            await testHelpers.makeRequest({
                description: 'Vue d\'ensemble pour utilisateur inexistant',
                method: 'GET',
                endpoint: '/api/analytics/nonexistentuser123456789/overview',
                expectedStatus: 404,
                validateResponse: (response) => {
                    ResponseValidators.error(response, 'Not Found');
                }
            });
        });
    });

    describe('GET /api/analytics/{username}/performance', () => {
        test('Get performance scores', async () => {
            await testHelpers.makeRequest({
                description: 'Récupération des scores de performance',
                method: 'GET',
                endpoint: `/api/analytics/${testUsername}/performance`,
                expectedStatus: 200,
                validateResponse: (response) => {
                    expect(response).toHaveProperty('username', testUsername);
                    expect(response).toHaveProperty('lastUpdated');
                    expect(response).toHaveProperty('scores');
                    expect(response.scores).toHaveProperty('overall');
                    expect(response.scores).toHaveProperty('productivity');
                    expect(response.scores).toHaveProperty('quality');
                    expect(response.scores).toHaveProperty('collaboration');
                    expect(response.scores).toHaveProperty('innovation');

                    // Vérifier la structure des scores
                    Object.values(response.scores).forEach((score: any) => {
                        expect(score).toHaveProperty('value');
                        expect(score).toHaveProperty('category');
                        expect(typeof score.value).toBe('number');
                        expect(score.value).toBeGreaterThanOrEqual(0);
                        expect(score.value).toBeLessThanOrEqual(100);
                        expect(['excellent', 'good', 'average', 'below_average', 'poor']).toContain(score.category);
                    });
                }
            });
        });

        test('Get performance scores for non-existent user', async () => {
            await testHelpers.makeRequest({
                description: 'Scores de performance pour utilisateur inexistant',
                method: 'GET',
                endpoint: '/api/analytics/nonexistentuser123456789/performance',
                expectedStatus: 404,
                validateResponse: (response) => {
                    ResponseValidators.error(response, 'Not Found');
                }
            });
        });
    });

    describe('GET /api/analytics/{username}/languages', () => {
        test('Get language analysis', async () => {
            await testHelpers.makeRequest({
                description: 'Analyse des langages de programmation',
                method: 'GET',
                endpoint: `/api/analytics/${testUsername}/languages`,
                expectedStatus: 200,
                validateResponse: (response) => {
                    expect(response).toHaveProperty('username', testUsername);
                    expect(response).toHaveProperty('lastUpdated');
                    expect(response).toHaveProperty('languages');
                    expect(Array.isArray(response.languages)).toBe(true);

                    // Vérifier la structure des langages
                    response.languages.forEach((lang: any) => {
                        expect(lang).toHaveProperty('name');
                        expect(lang).toHaveProperty('totalBytes');
                        expect(lang).toHaveProperty('percentage');
                        expect(lang).toHaveProperty('repositoryCount');
                        expect(typeof lang.name).toBe('string');
                        expect(typeof lang.totalBytes).toBe('number');
                        expect(typeof lang.percentage).toBe('number');
                        expect(typeof lang.repositoryCount).toBe('number');
                        expect(lang.percentage).toBeGreaterThanOrEqual(0);
                        expect(lang.percentage).toBeLessThanOrEqual(100);
                    });

                    if (response.diversity) {
                        expect(response.diversity).toHaveProperty('value');
                        expect(response.diversity).toHaveProperty('category');
                    }

                    if (response.expertise) {
                        expect(typeof response.expertise).toBe('object');
                    }
                }
            });
        });

        test('Get language analysis for non-existent user', async () => {
            await testHelpers.makeRequest({
                description: 'Analyse des langages pour utilisateur inexistant',
                method: 'GET',
                endpoint: '/api/analytics/nonexistentuser123456789/languages',
                expectedStatus: 404,
                validateResponse: (response) => {
                    ResponseValidators.error(response, 'Not Found');
                }
            });
        });
    });

    describe('GET /api/analytics/{username}/activity', () => {
        test('Get activity analysis', async () => {
            await testHelpers.makeRequest({
                description: 'Analyse d\'activité et patterns de développement',
                method: 'GET',
                endpoint: `/api/analytics/${testUsername}/activity`,
                expectedStatus: 200,
                validateResponse: (response) => {
                    expect(response).toHaveProperty('username', testUsername);
                    expect(response).toHaveProperty('lastUpdated');
                    expect(response).toHaveProperty('patterns');
                    expect(response.patterns).toHaveProperty('commitFrequency');
                    expect(response.patterns).toHaveProperty('workingHours');
                    expect(response.patterns).toHaveProperty('weeklyActivity');

                    // Vérifier la fréquence des commits
                    const commitFreq = response.patterns.commitFrequency;
                    expect(commitFreq).toHaveProperty('daily');
                    expect(commitFreq).toHaveProperty('weekly');
                    expect(commitFreq).toHaveProperty('monthly');
                    expect(typeof commitFreq.daily).toBe('number');
                    expect(typeof commitFreq.weekly).toBe('number');
                    expect(typeof commitFreq.monthly).toBe('number');

                    // Vérifier les heures de travail
                    if (response.patterns.workingHours.peakHours) {
                        expect(Array.isArray(response.patterns.workingHours.peakHours)).toBe(true);
                        response.patterns.workingHours.peakHours.forEach((hour: number) => {
                            expect(hour).toBeGreaterThanOrEqual(0);
                            expect(hour).toBeLessThanOrEqual(23);
                        });
                    }

                    // Vérifier l'activité hebdomadaire
                    const weeklyActivity = response.patterns.weeklyActivity;
                    if (weeklyActivity.mostActiveDay) {
                        expect(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])
                            .toContain(weeklyActivity.mostActiveDay);
                    }
                    if (weeklyActivity.leastActiveDay) {
                        expect(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])
                            .toContain(weeklyActivity.leastActiveDay);
                    }
                }
            });
        });

        test('Get activity analysis for non-existent user', async () => {
            await testHelpers.makeRequest({
                description: 'Analyse d\'activité pour utilisateur inexistant',
                method: 'GET',
                endpoint: '/api/analytics/nonexistentuser123456789/activity',
                expectedStatus: 404,
                validateResponse: (response) => {
                    ResponseValidators.error(response, 'Not Found');
                }
            });
        });
    });

    describe('GET /api/analytics/{username}/productivity', () => {
        test('Get productivity score', async () => {
            await testHelpers.makeRequest({
                description: 'Score de productivité et métriques associées',
                method: 'GET',
                endpoint: `/api/analytics/${testUsername}/productivity`,
                expectedStatus: 200,
                validateResponse: (response) => {
                    expect(response).toHaveProperty('username', testUsername);
                    expect(response).toHaveProperty('lastUpdated');
                    expect(response).toHaveProperty('score');
                    expect(response.score).toHaveProperty('value');
                    expect(response.score).toHaveProperty('category');
                    expect(typeof response.score.value).toBe('number');
                    expect(response.score.value).toBeGreaterThanOrEqual(0);
                    expect(response.score.value).toBeLessThanOrEqual(100);
                    expect(['excellent', 'good', 'average', 'below_average', 'poor']).toContain(response.score.category);

                    if (response.metrics) {
                        if (response.metrics.commitsPerDay !== undefined) {
                            expect(typeof response.metrics.commitsPerDay).toBe('number');
                            expect(response.metrics.commitsPerDay).toBeGreaterThanOrEqual(0);
                        }
                        if (response.metrics.linesOfCodePerCommit !== undefined) {
                            expect(typeof response.metrics.linesOfCodePerCommit).toBe('number');
                            expect(response.metrics.linesOfCodePerCommit).toBeGreaterThanOrEqual(0);
                        }
                    }
                }
            });
        });

        test('Get productivity score for non-existent user', async () => {
            await testHelpers.makeRequest({
                description: 'Score de productivité pour utilisateur inexistant',
                method: 'GET',
                endpoint: '/api/analytics/nonexistentuser123456789/productivity',
                expectedStatus: 404,
                validateResponse: (response) => {
                    ResponseValidators.error(response, 'Not Found');
                }
            });
        });
    });

    describe('GET /api/analytics/{username}/devops', () => {
        test('Get DevOps maturity', async () => {
            await testHelpers.makeRequest({
                description: 'Évaluation de maturité DevOps',
                method: 'GET',
                endpoint: `/api/analytics/${testUsername}/devops`,
                expectedStatus: 200,
                validateResponse: (response) => {
                    expect(response).toHaveProperty('username', testUsername);
                    expect(response).toHaveProperty('lastUpdated');
                    expect(response).toHaveProperty('maturityLevel');
                    expect(['beginner', 'intermediate', 'advanced', 'expert']).toContain(response.maturityLevel);

                    if (response.practices) {
                        const practiceKeys = ['cicd', 'testing', 'monitoring', 'security'];
                        practiceKeys.forEach(key => {
                            if (response.practices[key]) {
                                expect(response.practices[key]).toHaveProperty('value');
                                expect(response.practices[key]).toHaveProperty('category');
                                expect(typeof response.practices[key].value).toBe('number');
                                expect(response.practices[key].value).toBeGreaterThanOrEqual(0);
                                expect(response.practices[key].value).toBeLessThanOrEqual(100);
                            }
                        });
                    }
                }
            });
        });

        test('Get DevOps maturity for non-existent user', async () => {
            await testHelpers.makeRequest({
                description: 'Maturité DevOps pour utilisateur inexistant',
                method: 'GET',
                endpoint: '/api/analytics/nonexistentuser123456789/devops',
                expectedStatus: 404,
                validateResponse: (response) => {
                    ResponseValidators.error(response, 'Not Found');
                }
            });
        });
    });

    describe('Analytics Integration Tests', () => {
        test('Complete analytics pipeline', async () => {
            testLogger.logInfo('Test du pipeline complet d\'analytics');

            // 1. Lancer l'analyse
            const analysisResponse = await testHelpers.makeRequest({
                description: 'Étape 1: Lancement de l\'analyse complète',
                method: 'POST',
                endpoint: `/api/analytics/${testUsername}/analyze`,
                expectedStatus: 202,
                auth: true,
                body: {
                    includePrivate: false,
                    forceRefresh: false,
                    maxAge: 3600
                }
            });

            if (analysisResponse.body.status === 'completed' || analysisResponse.body.status === 'running') {
                // 2. Vue d'ensemble
                await testHelpers.makeRequest({
                    description: 'Étape 2: Vue d\'ensemble des métriques',
                    method: 'GET',
                    endpoint: `/api/analytics/${testUsername}/overview`,
                    expectedStatus: 200,
                    auth: true,
                    validateResponse: ResponseValidators.analyticsOverview
                });

                // 3. Scores de performance
                await testHelpers.makeRequest({
                    description: 'Étape 3: Scores de performance',
                    method: 'GET',
                    endpoint: `/api/analytics/${testUsername}/performance`,
                    expectedStatus: 200,
                    auth: true
                });

                // 4. Analyse des langages
                await testHelpers.makeRequest({
                    description: 'Étape 4: Analyse des langages',
                    method: 'GET',
                    endpoint: `/api/analytics/${testUsername}/languages`,
                    expectedStatus: 200,
                    auth: true
                });

                // 5. Analyse d'activité
                await testHelpers.makeRequest({
                    description: 'Étape 5: Analyse d\'activité',
                    method: 'GET',
                    endpoint: `/api/analytics/${testUsername}/activity`,
                    expectedStatus: 200,
                    auth: true
                });

                // 6. Score de productivité
                await testHelpers.makeRequest({
                    description: 'Étape 6: Score de productivité',
                    method: 'GET',
                    endpoint: `/api/analytics/${testUsername}/productivity`,
                    expectedStatus: 200,
                    auth: true
                });

                // 7. Maturité DevOps
                await testHelpers.makeRequest({
                    description: 'Étape 7: Maturité DevOps',
                    method: 'GET',
                    endpoint: `/api/analytics/${testUsername}/devops`,
                    expectedStatus: 200,
                    auth: true
                });

                testLogger.logSuccess('Pipeline complet d\'analytics terminé avec succès');
            } else {
                testLogger.logWarning('Analyse non complétée, pipeline partiel');
            }
        });

        test('Analytics data consistency', async () => {
            testLogger.logInfo('Test de cohérence des données analytics');

            // Récupérer toutes les métriques
            const overviewResponse = await testHelpers.makeRequest({
                description: 'Récupération vue d\'ensemble pour cohérence',
                method: 'GET',
                endpoint: `/api/analytics/${testUsername}/overview`,
                expectedStatus: 200,
                auth: true
            });

            const performanceResponse = await testHelpers.makeRequest({
                description: 'Récupération performance pour cohérence',
                method: 'GET',
                endpoint: `/api/analytics/${testUsername}/performance`,
                expectedStatus: 200,
                auth: true
            });

            const languagesResponse = await testHelpers.makeRequest({
                description: 'Récupération langages pour cohérence',
                method: 'GET',
                endpoint: `/api/analytics/${testUsername}/languages`,
                expectedStatus: 200,
                auth: true
            });

            // Vérifier la cohérence des données
            if (overviewResponse.body && performanceResponse.body && languagesResponse.body) {
                // Vérifier que le username est cohérent
                expect(overviewResponse.body.username).toBe(testUsername);
                expect(performanceResponse.body.username).toBe(testUsername);
                expect(languagesResponse.body.username).toBe(testUsername);

                // Vérifier que les timestamps sont récents et cohérents
                const overviewTime = new Date(overviewResponse.body.lastUpdated);
                const performanceTime = new Date(performanceResponse.body.lastUpdated);
                const languagesTime = new Date(languagesResponse.body.lastUpdated);

                const now = new Date();
                const oneDay = 24 * 60 * 60 * 1000;

                expect(now.getTime() - overviewTime.getTime()).toBeLessThan(oneDay);
                expect(now.getTime() - performanceTime.getTime()).toBeLessThan(oneDay);
                expect(now.getTime() - languagesTime.getTime()).toBeLessThan(oneDay);

                testLogger.logSuccess('Cohérence des données analytics vérifiée');
            }
        });
    });
}); 