import { describe, test, beforeAll, afterAll } from '@jest/globals';
import { Express } from 'express';
import { createApp } from '../src/app';
import { testLogger } from './utils/TestLogger';
import TestHelpers, { TestContext, ResponseValidators } from './utils/TestHelpers';

describe('System Endpoints', () => {
    let app: Express;
    let testHelpers: TestHelpers;

    beforeAll(async () => {
        testLogger.startSuite(
            'System Endpoints',
            'Tests des endpoints système (health check et ping) pour vérifier le bon fonctionnement de base de l\'API'
        );

        // Initialiser l'application
        // @ts-ignore - Express type error
        app = await createApp();

        const context: TestContext = { app };
        testHelpers = new TestHelpers(context);

        testLogger.logInfo('Application de test initialisée');
    });

    afterAll(() => {
        testLogger.endSuite();
    });

    test('GET /api/health - Health check endpoint', async () => {
        await testHelpers.makeRequest({
            description: 'Vérifier l\'état de santé de l\'API',
            method: 'GET',
            endpoint: '/api/health',
            expectedStatus: 200,
            validateResponse: ResponseValidators.healthCheck
        });
    });

    test('GET /api/ping - Ping endpoint', async () => {
        await testHelpers.makeRequest({
            description: 'Test de connectivité simple avec ping',
            method: 'GET',
            endpoint: '/api/ping',
            expectedStatus: 200,
            validateResponse: ResponseValidators.ping
        });
    });

    test('GET /api/nonexistent - Non-existent endpoint', async () => {
        await testHelpers.makeRequest({
            description: 'Tester la gestion d\'un endpoint inexistant',
            method: 'GET',
            endpoint: '/api/nonexistent',
            expectedStatus: 404,
            validateResponse: (response) => {
                expect(response).toHaveProperty('error');
                expect(response).toHaveProperty('message');
            }
        });
    });

    test('POST /api/health - Method not allowed', async () => {
        await testHelpers.makeRequest({
            description: 'Tester une méthode HTTP non autorisée sur health',
            method: 'POST',
            endpoint: '/api/health',
            expectedStatus: 405,
            body: { test: 'data' }
        });
    });

    test('GET /api/health - Validate response structure', async () => {
        const response = await testHelpers.makeRequest({
            description: 'Valider la structure complète de la réponse health',
            method: 'GET',
            endpoint: '/api/health',
            expectedStatus: 200
        });

        // Validations supplémentaires spécifiques
        expect(response.body.status).toBe('healthy');
        expect(response.body.service).toBe('GitHub Insight Engine API');
        expect(typeof response.body.version).toBe('string');
        expect(typeof response.body.uptime).toBe('number');
        expect(response.body.uptime).toBeGreaterThan(0);
        expect(['development', 'test', 'staging', 'production']).toContain(response.body.environment);

        // Vérifier le format de timestamp ISO
        expect(() => new Date(response.body.timestamp)).not.toThrow();
        expect(new Date(response.body.timestamp).toISOString()).toBe(response.body.timestamp);
    });

    test('GET /api/ping - Validate timestamp format', async () => {
        const response = await testHelpers.makeRequest({
            description: 'Valider le format de timestamp dans ping',
            method: 'GET',
            endpoint: '/api/ping',
            expectedStatus: 200
        });

        // Vérifier que le timestamp est récent (moins de 5 secondes)
        const responseTime = new Date(response.body.timestamp);
        const now = new Date();
        const timeDiff = now.getTime() - responseTime.getTime();

        expect(timeDiff).toBeLessThan(5000); // Moins de 5 secondes
        expect(response.body.message).toBe('pong');
    });

    test('GET /api/health - Response headers', async () => {
        const response = await testHelpers.makeRequest({
            description: 'Vérifier les headers de sécurité sur health',
            method: 'GET',
            endpoint: '/api/health',
            expectedStatus: 200
        });

        // Vérifier les headers de sécurité (si configurés)
        expect(response.headers['content-type']).toMatch(/application\/json/);

        // Log des headers pour debug
        testLogger.logInfo('Headers de réponse health:', response.headers);
    });

    test('GET /api/ping - Concurrent requests', async () => {
        testLogger.logInfo('Test de requêtes concurrentes sur ping');

        // Faire 5 requêtes simultanées
        const promises = Array(5).fill(null).map((_, index) =>
            testHelpers.makeRequest({
                description: `Requête ping concurrente #${index + 1}`,
                method: 'GET',
                endpoint: '/api/ping',
                expectedStatus: 200
            })
        );

        const responses = await Promise.all(promises);

        // Vérifier que toutes les réponses sont correctes
        responses.forEach((response, index) => {
            expect(response.body.message).toBe('pong');
            expect(response.body.timestamp).toBeDefined();
            testLogger.logInfo(`Réponse concurrente #${index + 1}:`, {
                timestamp: response.body.timestamp,
                duration: response.duration
            });
        });
    });
}); 