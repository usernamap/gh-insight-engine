import dotenv from 'dotenv';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { beforeAll, afterAll, beforeEach } from '@jest/globals';

// Configuration des variables d'environnement pour les tests RÉELS
dotenv.config({ path: '.env.test' });

// Validation des variables d'environnement requises
if (!process.env.GH_TOKEN || process.env.GH_TOKEN === 'your_github_classic_token_here') {
    console.error('❌ ERREUR: GH_TOKEN manquant dans .env.test');
    console.error('📝 Copiez env.test.template vers .env.test et remplissez avec vos vraies valeurs GitHub');
    process.exit(1);
}

if (!process.env.GITHUB_USERNAME || process.env.GITHUB_USERNAME === 'your_github_username_here') {
    console.error('❌ ERREUR: GITHUB_USERNAME manquant dans .env.test');
    console.error('📝 Copiez env.test.template vers .env.test et remplissez avec vos vraies valeurs GitHub');
    process.exit(1);
}

if (!process.env.GITHUB_FULL_NAME || process.env.GITHUB_FULL_NAME === 'Your Full Name Here') {
    console.error('❌ ERREUR: GITHUB_FULL_NAME manquant dans .env.test');
    console.error('📝 Copiez env.test.template vers .env.test et remplissez avec vos vraies valeurs GitHub');
    process.exit(1);
}

let mongoServer: MongoMemoryServer;

// Contexte partagé entre les tests pour maintenir la chronologie
export interface SharedTestContext {
    authToken?: string;
    username: string;
    fullName: string;
    githubToken: string;
    userData?: any;
    repositories?: any[];
    analytics?: any;
    insights?: any;
}

// Contexte global partagé entre tous les tests
export const sharedContext: SharedTestContext = {
    username: process.env.GITHUB_USERNAME!,
    fullName: process.env.GITHUB_FULL_NAME!,
    githubToken: process.env.GH_TOKEN!
};

// Configuration globale avant tous les tests
beforeAll(async () => {
    // Démarrer le serveur MongoDB en mémoire
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    // Connecter Mongoose au serveur de test
    await mongoose.connect(mongoUri);

    console.log('🧪 Test environment initialized with REAL GitHub data');
    console.log(`📊 MongoDB Memory Server: ${mongoUri}`);
    console.log(`👤 GitHub User: ${sharedContext.username}`);
    console.log(`🔑 GitHub Token: ${sharedContext.githubToken.substring(0, 10)}...`);
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

// Nettoyage avant chaque test (mais préservation du contexte partagé)
beforeEach(async () => {
    // Nettoyer toutes les collections MongoDB
    const collections = mongoose.connection.collections;

    for (const key in collections) {
        const collection = collections[key];
        await collection.deleteMany({});
    }

    // NOTE: Le contexte partagé (sharedContext) est préservé entre les tests
    // pour maintenir la chronologie des données réelles
});

// Configuration des timeouts pour les tests avec données réelles
if (typeof jest !== 'undefined') {
    jest.setTimeout(parseInt(process.env.TEST_TIMEOUT || '60000'));
}

// Configuration globale des variables d'environnement pour les tests
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key';
process.env.PORT = process.env.PORT || '3001';
process.env.RATE_LIMIT_WINDOW_MS = process.env.RATE_LIMIT_WINDOW_MS || '900000';
process.env.RATE_LIMIT_MAX_REQUESTS = process.env.RATE_LIMIT_MAX_REQUESTS || '1000';

export { }; 