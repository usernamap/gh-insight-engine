import dotenv from 'dotenv';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { beforeAll, afterAll, beforeEach } from '@jest/globals';

// Configuration des mocks automatiques
jest.mock('chalk');
jest.mock('@octokit/rest');
jest.mock('@octokit/graphql');
jest.mock('@octokit/auth-token');

// Configuration des variables d'environnement pour les tests
dotenv.config({ path: '.env.test' });

let mongoServer: MongoMemoryServer;

// Configuration globale avant tous les tests
beforeAll(async () => {
    // Démarrer le serveur MongoDB en mémoire
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    // Connecter Mongoose au serveur de test
    await mongoose.connect(mongoUri);

    console.log('🧪 Test environment initialized');
    console.log(`📊 MongoDB Memory Server: ${mongoUri}`);
});

// Nettoyage après tous les tests
afterAll(async () => {
    // Fermer la connexion Mongoose
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();

    // Arrêter le serveur MongoDB en mémoire
    await mongoServer.stop();

    console.log('🧹 Test environment cleaned up');
});

// Nettoyage avant chaque test
beforeEach(async () => {
    // Nettoyer toutes les collections
    const collections = mongoose.connection.collections;

    for (const key in collections) {
        const collection = collections[key];
        await collection.deleteMany({});
    }
});

// Configuration des timeouts pour les tests
if (typeof jest !== 'undefined') {
    jest.setTimeout(30000);
}

// Configuration globale des variables d'environnement pour les tests
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key';
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'test-openai-key';
// Utiliser les vraies données GitHub si disponibles, sinon des valeurs de test
process.env.GH_TOKEN = process.env.GH_TOKEN || 'test-github-token';
process.env.GITHUB_USERNAME = process.env.GITHUB_USERNAME || 'test-user';
process.env.GITHUB_FULL_NAME = process.env.GITHUB_FULL_NAME || 'Test User';
process.env.PORT = '3001';
process.env.RATE_LIMIT_WINDOW_MS = '900000';
process.env.RATE_LIMIT_MAX_REQUESTS = '100';

export { }; 