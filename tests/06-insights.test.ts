import { describe, test, beforeAll, afterAll } from '@jest/globals';
import { Express } from 'express';
import { createApp } from '../src/app';
import { testLogger } from './utils/TestLogger';
import TestHelpers, { TestContext, TestData, ResponseValidators } from './utils/TestHelpers';

describe('Insights Endpoints', () => {
    let app: Express;
    let testHelpers: TestHelpers;
    let authToken: string;
    const testUsername = TestData.validUser.username;

    beforeAll(async () => {
        testLogger.startSuite(
            'Insights Endpoints',
            'Tests des endpoints insights IA: génération, résumé, recommandations, forces, croissance et analyses avancées'
        );

        // Initialiser l'application
        // @ts-ignore - Express type error
        app = await createApp();

        const context: TestContext = { app };
        testHelpers = new TestHelpers(context);

        // Authentification préalable pour les tests nécessitant un token
        testLogger.logInfo('Authentification préalable pour les tests insights');

        const loginResponse = await testHelpers.makeRequest({
            description: 'Authentification préalable pour les tests insights',
            method: 'POST',
            endpoint: '/api/auth/login',
            expectedStatus: 200,
            body: TestData.validUser,
            validateResponse: ResponseValidators.loginSuccess
        });

        if (loginResponse.body?.data?.token) {
            authToken = loginResponse.body.data.token;
            testHelpers.setAuthToken(authToken);
            testLogger.logSuccess('Authentification réussie pour les tests insights');
        }
    });

    afterAll(() => {
        testLogger.endSuite();
    });

    describe('POST /api/insights/{username}/generate', () => {
        test('Generate insights without authentication', async () => {
            await testHelpers.makeRequest({
                description: 'Tentative de génération d\'insights sans authentification',
                method: 'POST',
                endpoint: `/api/insights/${testUsername}/generate`,
                expectedStatus: 401,
                validateResponse: (response) => {
                    ResponseValidators.error(response, 'Unauthorized');
                }
            });
        });

        test('Generate insights with authentication', async () => {
            await testHelpers.makeRequest({
                description: 'Génération d\'insights IA avec authentification',
                method: 'POST',
                endpoint: `/api/insights/${testUsername}/generate`,
                expectedStatus: 202,
                auth: true,
                validateResponse: (response) => {
                    expect(response).toHaveProperty('status');
                    expect(response).toHaveProperty('message');
                    expect(response).toHaveProperty('estimatedCompletion');
                    expect(['accepted', 'processing']).toContain(response.status);
                    expect(typeof response.message).toBe('string');
                    expect(() => new Date(response.estimatedCompletion)).not.toThrow();
                }
            });
        });

        test('Generate insights for non-existent user', async () => {
            await testHelpers.makeRequest({
                description: 'Génération d\'insights pour utilisateur inexistant',
                method: 'POST',
                endpoint: '/api/insights/nonexistentuser123456789/generate',
                expectedStatus: 404,
                auth: true,
                validateResponse: (response) => {
                    ResponseValidators.error(response, 'Not Found');
                }
            });
        });

        test('Generate insights without permission (forbidden)', async () => {
            await testHelpers.makeRequest({
                description: 'Génération d\'insights sans permission (utilisateur différent)',
                method: 'POST',
                endpoint: '/api/insights/anotheruser/generate',
                expectedStatus: 403,
                auth: true,
                validateResponse: (response) => {
                    ResponseValidators.error(response, 'Forbidden');
                }
            });
        });

        test('Generate insights with rate limiting', async () => {
            testLogger.logInfo('Test de rate limiting sur la génération d\'insights');

            // Lancer plusieurs générations rapidement pour tester le rate limiting
            const promises = Array(3).fill(null).map((_, index) =>
                testHelpers.makeRequest({
                    description: `Génération insights rapide #${index + 1} pour rate limiting`,
                    method: 'POST',
                    endpoint: `/api/insights/${testUsername}/generate`,
                    expectedStatus: index === 0 ? 202 : 429, // Première acceptée, autres limitées
                    auth: true
                })
            );

            const responses = await Promise.all(promises);

            // Vérifier qu'au moins une requête a été limitée
            const rateLimitedResponses = responses.filter(r => r.status === 429);
            if (rateLimitedResponses.length > 0) {
                testLogger.logSuccess('Rate limiting sur insights fonctionne correctement');
            }
        });
    });

    describe('GET /api/insights/{username}/summary', () => {
        test('Get insights summary without authentication', async () => {
            await testHelpers.makeRequest({
                description: 'Résumé IA sans authentification',
                method: 'GET',
                endpoint: `/api/insights/${testUsername}/summary`,
                expectedStatus: 200,
                validateResponse: ResponseValidators.insightsSummary
            });
        });

        test('Get insights summary with authentication', async () => {
            await testHelpers.makeRequest({
                description: 'Résumé IA avec authentification',
                method: 'GET',
                endpoint: `/api/insights/${testUsername}/summary`,
                expectedStatus: 200,
                auth: true,
                validateResponse: (response) => {
                    ResponseValidators.insightsSummary(response);
                    expect(response.username).toBe(testUsername);
                    expect(typeof response.summary.profileOverview).toBe('string');
                    expect(Array.isArray(response.summary.keyStrengths)).toBe(true);
                    expect(typeof response.summary.developmentStyle).toBe('string');
                    expect(response.summary.expertise).toHaveProperty('level');
                    expect(['junior', 'intermediate', 'senior', 'expert']).toContain(response.summary.expertise.level);
                    expect(Array.isArray(response.summary.expertise.domains)).toBe(true);
                }
            });
        });

        test('Get summary for non-existent user', async () => {
            await testHelpers.makeRequest({
                description: 'Résumé IA pour utilisateur inexistant',
                method: 'GET',
                endpoint: '/api/insights/nonexistentuser123456789/summary',
                expectedStatus: 404,
                validateResponse: (response) => {
                    ResponseValidators.error(response, 'Not Found');
                }
            });
        });
    });

    describe('GET /api/insights/{username}/recommendations', () => {
        test('Get insights recommendations', async () => {
            await testHelpers.makeRequest({
                description: 'Recommandations IA basées sur l\'analyse du profil',
                method: 'GET',
                endpoint: `/api/insights/${testUsername}/recommendations`,
                expectedStatus: 200,
                validateResponse: (response) => {
                    expect(response).toHaveProperty('username', testUsername);
                    expect(response).toHaveProperty('generatedAt');
                    expect(response).toHaveProperty('recommendations');
                    expect(Array.isArray(response.recommendations)).toBe(true);

                    // Vérifier la structure des recommandations
                    response.recommendations.forEach((rec: any) => {
                        expect(rec).toHaveProperty('category');
                        expect(rec).toHaveProperty('title');
                        expect(rec).toHaveProperty('description');
                        expect(rec).toHaveProperty('priority');
                        expect(['skills', 'productivity', 'collaboration', 'projects', 'career']).toContain(rec.category);
                        expect(['high', 'medium', 'low']).toContain(rec.priority);
                        expect(typeof rec.title).toBe('string');
                        expect(typeof rec.description).toBe('string');

                        if (rec.actionItems) {
                            expect(Array.isArray(rec.actionItems)).toBe(true);
                        }

                        if (rec.resources) {
                            expect(Array.isArray(rec.resources)).toBe(true);
                            rec.resources.forEach((resource: any) => {
                                expect(resource).toHaveProperty('title');
                                expect(resource).toHaveProperty('url');
                                expect(resource).toHaveProperty('type');
                                expect(['documentation', 'tutorial', 'course', 'book', 'tool']).toContain(resource.type);
                            });
                        }
                    });
                }
            });
        });

        test('Get recommendations for non-existent user', async () => {
            await testHelpers.makeRequest({
                description: 'Recommandations pour utilisateur inexistant',
                method: 'GET',
                endpoint: '/api/insights/nonexistentuser123456789/recommendations',
                expectedStatus: 404,
                validateResponse: (response) => {
                    ResponseValidators.error(response, 'Not Found');
                }
            });
        });
    });

    describe('GET /api/insights/{username}/strengths', () => {
        test('Get insights strengths', async () => {
            await testHelpers.makeRequest({
                description: 'Forces identifiées par l\'IA',
                method: 'GET',
                endpoint: `/api/insights/${testUsername}/strengths`,
                expectedStatus: 200,
                validateResponse: (response) => {
                    expect(response).toHaveProperty('username', testUsername);
                    expect(response).toHaveProperty('generatedAt');
                    expect(response).toHaveProperty('strengths');
                    expect(Array.isArray(response.strengths)).toBe(true);

                    // Vérifier la structure des forces
                    response.strengths.forEach((strength: any) => {
                        expect(strength).toHaveProperty('area');
                        expect(strength).toHaveProperty('description');
                        expect(strength).toHaveProperty('evidence');
                        expect(strength).toHaveProperty('score');
                        expect(['technical', 'leadership', 'collaboration', 'innovation', 'productivity']).toContain(strength.area);
                        expect(typeof strength.description).toBe('string');
                        expect(Array.isArray(strength.evidence)).toBe(true);
                        expect(typeof strength.score).toBe('number');
                        expect(strength.score).toBeGreaterThanOrEqual(0);
                        expect(strength.score).toBeLessThanOrEqual(100);
                    });
                }
            });
        });

        test('Get strengths for non-existent user', async () => {
            await testHelpers.makeRequest({
                description: 'Forces pour utilisateur inexistant',
                method: 'GET',
                endpoint: '/api/insights/nonexistentuser123456789/strengths',
                expectedStatus: 404,
                validateResponse: (response) => {
                    ResponseValidators.error(response, 'Not Found');
                }
            });
        });
    });

    describe('GET /api/insights/{username}/growth', () => {
        test('Get insights growth areas', async () => {
            await testHelpers.makeRequest({
                description: 'Axes d\'amélioration suggérés par l\'IA',
                method: 'GET',
                endpoint: `/api/insights/${testUsername}/growth`,
                expectedStatus: 200,
                validateResponse: (response) => {
                    expect(response).toHaveProperty('username', testUsername);
                    expect(response).toHaveProperty('generatedAt');
                    expect(response).toHaveProperty('growthAreas');
                    expect(Array.isArray(response.growthAreas)).toBe(true);

                    // Vérifier la structure des axes d'amélioration
                    response.growthAreas.forEach((area: any) => {
                        expect(area).toHaveProperty('area');
                        expect(area).toHaveProperty('description');
                        expect(area).toHaveProperty('impact');
                        expect(area).toHaveProperty('difficulty');
                        expect(typeof area.area).toBe('string');
                        expect(typeof area.description).toBe('string');
                        expect(['high', 'medium', 'low']).toContain(area.impact);
                        expect(['easy', 'moderate', 'challenging']).toContain(area.difficulty);

                        if (area.timeline) {
                            expect(['short_term', 'medium_term', 'long_term']).toContain(area.timeline);
                        }

                        if (area.steps) {
                            expect(Array.isArray(area.steps)).toBe(true);
                        }
                    });
                }
            });
        });

        test('Get growth areas for non-existent user', async () => {
            await testHelpers.makeRequest({
                description: 'Axes d\'amélioration pour utilisateur inexistant',
                method: 'GET',
                endpoint: '/api/insights/nonexistentuser123456789/growth',
                expectedStatus: 404,
                validateResponse: (response) => {
                    ResponseValidators.error(response, 'Not Found');
                }
            });
        });
    });

    describe('GET /api/insights/{username}/personality', () => {
        test('Get developer personality', async () => {
            await testHelpers.makeRequest({
                description: 'Analyse de personnalité de développeur par l\'IA',
                method: 'GET',
                endpoint: `/api/insights/${testUsername}/personality`,
                expectedStatus: 200,
                validateResponse: (response) => {
                    expect(response).toHaveProperty('username', testUsername);
                    expect(response).toHaveProperty('generatedAt');
                    expect(response).toHaveProperty('personality');
                    expect(response.personality).toHaveProperty('type');
                    expect(response.personality).toHaveProperty('traits');
                    expect(response.personality).toHaveProperty('workStyle');
                    expect(typeof response.personality.type).toBe('string');
                    expect(Array.isArray(response.personality.traits)).toBe(true);
                    expect(typeof response.personality.workStyle).toBe('string');

                    if (response.personality.strengths) {
                        expect(Array.isArray(response.personality.strengths)).toBe(true);
                    }

                    if (response.personality.challenges) {
                        expect(Array.isArray(response.personality.challenges)).toBe(true);
                    }
                }
            });
        });

        test('Get personality for non-existent user', async () => {
            await testHelpers.makeRequest({
                description: 'Personnalité pour utilisateur inexistant',
                method: 'GET',
                endpoint: '/api/insights/nonexistentuser123456789/personality',
                expectedStatus: 404,
                validateResponse: (response) => {
                    ResponseValidators.error(response, 'Not Found');
                }
            });
        });
    });

    describe('GET /api/insights/{username}/career', () => {
        test('Get career insights', async () => {
            await testHelpers.makeRequest({
                description: 'Insights de carrière par l\'IA',
                method: 'GET',
                endpoint: `/api/insights/${testUsername}/career`,
                expectedStatus: 200,
                validateResponse: (response) => {
                    expect(response).toHaveProperty('username', testUsername);
                    expect(response).toHaveProperty('generatedAt');
                    expect(response).toHaveProperty('insights');
                    expect(response.insights).toHaveProperty('currentLevel');
                    expect(response.insights).toHaveProperty('nextSteps');
                    expect(response.insights).toHaveProperty('recommendations');
                    expect(['junior', 'mid', 'senior', 'lead', 'principal']).toContain(response.insights.currentLevel);
                    expect(Array.isArray(response.insights.nextSteps)).toBe(true);
                    expect(Array.isArray(response.insights.recommendations)).toBe(true);

                    // Vérifier les recommandations de carrière
                    response.insights.recommendations.forEach((rec: any) => {
                        expect(rec).toHaveProperty('category');
                        expect(rec).toHaveProperty('suggestion');
                        expect(rec).toHaveProperty('priority');
                        expect(typeof rec.category).toBe('string');
                        expect(typeof rec.suggestion).toBe('string');
                        expect(['high', 'medium', 'low']).toContain(rec.priority);
                    });
                }
            });
        });

        test('Get career insights for non-existent user', async () => {
            await testHelpers.makeRequest({
                description: 'Insights de carrière pour utilisateur inexistant',
                method: 'GET',
                endpoint: '/api/insights/nonexistentuser123456789/career',
                expectedStatus: 404,
                validateResponse: (response) => {
                    ResponseValidators.error(response, 'Not Found');
                }
            });
        });
    });

    describe('GET /api/insights/{username}/skills', () => {
        test('Get skill assessment', async () => {
            await testHelpers.makeRequest({
                description: 'Évaluation des compétences par l\'IA',
                method: 'GET',
                endpoint: `/api/insights/${testUsername}/skills`,
                expectedStatus: 200,
                validateResponse: (response) => {
                    expect(response).toHaveProperty('username', testUsername);
                    expect(response).toHaveProperty('generatedAt');
                    expect(response).toHaveProperty('skills');
                    expect(Array.isArray(response.skills)).toBe(true);

                    // Vérifier la structure des compétences
                    response.skills.forEach((skill: any) => {
                        expect(skill).toHaveProperty('name');
                        expect(skill).toHaveProperty('level');
                        expect(skill).toHaveProperty('confidence');
                        expect(typeof skill.name).toBe('string');
                        expect(['beginner', 'intermediate', 'advanced', 'expert']).toContain(skill.level);
                        expect(typeof skill.confidence).toBe('number');
                        expect(skill.confidence).toBeGreaterThanOrEqual(0);
                        expect(skill.confidence).toBeLessThanOrEqual(100);

                        if (skill.evidence) {
                            expect(Array.isArray(skill.evidence)).toBe(true);
                        }
                    });
                }
            });
        });

        test('Get skill assessment for non-existent user', async () => {
            await testHelpers.makeRequest({
                description: 'Évaluation des compétences pour utilisateur inexistant',
                method: 'GET',
                endpoint: '/api/insights/nonexistentuser123456789/skills',
                expectedStatus: 404,
                validateResponse: (response) => {
                    ResponseValidators.error(response, 'Not Found');
                }
            });
        });
    });

    describe('Insights Integration Tests', () => {
        test('Complete insights pipeline', async () => {
            testLogger.logInfo('Test du pipeline complet d\'insights IA');

            // 1. Générer les insights
            const generationResponse = await testHelpers.makeRequest({
                description: 'Étape 1: Génération des insights IA',
                method: 'POST',
                endpoint: `/api/insights/${testUsername}/generate`,
                expectedStatus: 202,
                auth: true
            });

            if (generationResponse.body.status === 'accepted' || generationResponse.body.status === 'processing') {
                // 2. Résumé du profil
                await testHelpers.makeRequest({
                    description: 'Étape 2: Résumé IA du profil',
                    method: 'GET',
                    endpoint: `/api/insights/${testUsername}/summary`,
                    expectedStatus: 200,
                    auth: true,
                    validateResponse: ResponseValidators.insightsSummary
                });

                // 3. Recommandations
                await testHelpers.makeRequest({
                    description: 'Étape 3: Recommandations IA',
                    method: 'GET',
                    endpoint: `/api/insights/${testUsername}/recommendations`,
                    expectedStatus: 200,
                    auth: true
                });

                // 4. Forces identifiées
                await testHelpers.makeRequest({
                    description: 'Étape 4: Forces identifiées',
                    method: 'GET',
                    endpoint: `/api/insights/${testUsername}/strengths`,
                    expectedStatus: 200,
                    auth: true
                });

                // 5. Axes d'amélioration
                await testHelpers.makeRequest({
                    description: 'Étape 5: Axes d\'amélioration',
                    method: 'GET',
                    endpoint: `/api/insights/${testUsername}/growth`,
                    expectedStatus: 200,
                    auth: true
                });

                // 6. Personnalité de développeur
                await testHelpers.makeRequest({
                    description: 'Étape 6: Personnalité de développeur',
                    method: 'GET',
                    endpoint: `/api/insights/${testUsername}/personality`,
                    expectedStatus: 200,
                    auth: true
                });

                // 7. Insights de carrière
                await testHelpers.makeRequest({
                    description: 'Étape 7: Insights de carrière',
                    method: 'GET',
                    endpoint: `/api/insights/${testUsername}/career`,
                    expectedStatus: 200,
                    auth: true
                });

                // 8. Évaluation des compétences
                await testHelpers.makeRequest({
                    description: 'Étape 8: Évaluation des compétences',
                    method: 'GET',
                    endpoint: `/api/insights/${testUsername}/skills`,
                    expectedStatus: 200,
                    auth: true
                });

                testLogger.logSuccess('Pipeline complet d\'insights IA terminé avec succès');
            } else {
                testLogger.logWarning('Génération d\'insights non acceptée, pipeline partiel');
            }
        });

        test('Insights data consistency', async () => {
            testLogger.logInfo('Test de cohérence des données insights');

            // Récupérer tous les insights
            const summaryResponse = await testHelpers.makeRequest({
                description: 'Récupération résumé pour cohérence',
                method: 'GET',
                endpoint: `/api/insights/${testUsername}/summary`,
                expectedStatus: 200,
                auth: true
            });

            const strengthsResponse = await testHelpers.makeRequest({
                description: 'Récupération forces pour cohérence',
                method: 'GET',
                endpoint: `/api/insights/${testUsername}/strengths`,
                expectedStatus: 200,
                auth: true
            });

            const growthResponse = await testHelpers.makeRequest({
                description: 'Récupération croissance pour cohérence',
                method: 'GET',
                endpoint: `/api/insights/${testUsername}/growth`,
                expectedStatus: 200,
                auth: true
            });

            // Vérifier la cohérence des données
            if (summaryResponse.body && strengthsResponse.body && growthResponse.body) {
                // Vérifier que le username est cohérent
                expect(summaryResponse.body.username).toBe(testUsername);
                expect(strengthsResponse.body.username).toBe(testUsername);
                expect(growthResponse.body.username).toBe(testUsername);

                // Vérifier que les timestamps sont récents et cohérents
                const summaryTime = new Date(summaryResponse.body.generatedAt);
                const strengthsTime = new Date(strengthsResponse.body.generatedAt);
                const growthTime = new Date(growthResponse.body.generatedAt);

                const now = new Date();
                const oneWeek = 7 * 24 * 60 * 60 * 1000;

                expect(now.getTime() - summaryTime.getTime()).toBeLessThan(oneWeek);
                expect(now.getTime() - strengthsTime.getTime()).toBeLessThan(oneWeek);
                expect(now.getTime() - growthTime.getTime()).toBeLessThan(oneWeek);

                testLogger.logSuccess('Cohérence des données insights vérifiée');
            }
        });

        test('Cross-validation with analytics data', async () => {
            testLogger.logInfo('Test de validation croisée insights vs analytics');

            // Récupérer les données analytics
            const analyticsResponse = await testHelpers.makeRequest({
                description: 'Récupération analytics pour validation croisée',
                method: 'GET',
                endpoint: `/api/analytics/${testUsername}/overview`,
                expectedStatus: 200,
                auth: true
            });

            // Récupérer les insights
            const insightsResponse = await testHelpers.makeRequest({
                description: 'Récupération insights pour validation croisée',
                method: 'GET',
                endpoint: `/api/insights/${testUsername}/summary`,
                expectedStatus: 200,
                auth: true
            });

            // Vérifier la cohérence entre analytics et insights
            if (analyticsResponse.body && insightsResponse.body) {
                // Les langages principaux dans analytics devraient être cohérents avec l'expertise dans insights
                const primaryLanguages = analyticsResponse.body.summary.primaryLanguages;
                const expertiseDomains = insightsResponse.body.summary.expertise.domains;

                if (primaryLanguages && expertiseDomains) {
                    // Au moins un langage principal devrait être mentionné dans les domaines d'expertise
                    const hasOverlap = primaryLanguages.some((lang: string) =>
                        expertiseDomains.some((domain: string) =>
                            domain.toLowerCase().includes(lang.toLowerCase())
                        )
                    );

                    if (hasOverlap) {
                        testLogger.logSuccess('Cohérence entre analytics et insights vérifiée');
                    } else {
                        testLogger.logWarning('Possible incohérence entre analytics et insights');
                    }
                }
            }
        });
    });
}); 