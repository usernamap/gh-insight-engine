#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

console.log('🔍 Validation de la configuration des tests avec données réelles GitHub\n');

// Charger les variables d'environnement de test
const envTestPath = path.join(process.cwd(), '.env.test');

if (!fs.existsSync(envTestPath)) {
    console.error('❌ ERREUR: Fichier .env.test manquant');
    console.error('📝 Copiez env.test.template vers .env.test et remplissez avec vos vraies valeurs GitHub');
    process.exit(1);
}

// Charger le fichier .env.test
dotenv.config({ path: envTestPath });

console.log('✅ Fichier .env.test trouvé');

// Validation des variables requises
const requiredVars = {
    'GH_TOKEN': {
        value: process.env.GH_TOKEN,
        validation: (val) => val && (val.startsWith('ghp_') || val.startsWith('github_pat_')),
        error: 'Token GitHub Classic requis (format: ghp_...)'
    },
    'GITHUB_USERNAME': {
        value: process.env.GITHUB_USERNAME,
        validation: (val) => val && val.length > 0 && val !== 'your_github_username_here',
        error: 'Nom d\'utilisateur GitHub requis'
    },
    'GITHUB_FULL_NAME': {
        value: process.env.GITHUB_FULL_NAME,
        validation: (val) => val && val.length > 0 && val !== 'Your Full Name Here',
        error: 'Nom complet requis'
    }
};

let hasErrors = false;

console.log('🔍 Validation des variables d\'environnement:\n');

for (const [key, config] of Object.entries(requiredVars)) {
    if (!config.validation(config.value)) {
        console.error(`❌ ${key}: ${config.error}`);
        hasErrors = true;
    } else {
        const displayValue = key === 'GH_TOKEN' 
            ? `${config.value.substring(0, 10)}...` 
            : config.value;
        console.log(`✅ ${key}: ${displayValue}`);
    }
}

// Validation optionnelle OpenAI
if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here') {
    console.log(`✅ OPENAI_API_KEY: ${process.env.OPENAI_API_KEY.substring(0, 10)}...`);
} else {
    console.log('⚠️  OPENAI_API_KEY: Non configuré (tests d\'insights IA indisponibles)');
}

if (hasErrors) {
    console.error('\n❌ Configuration invalide. Corrigez les erreurs ci-dessus.');
    process.exit(1);
}

// Vérification de la structure des tests
console.log('\n🔍 Validation de la structure des tests:\n');

const testFiles = [
    'tests/setup.ts',
    'tests/01-system.test.ts',
    'tests/02-authentication.test.ts',
    'tests/03-users.test.ts',
    'tests/04-repositories.test.ts',
    'tests/05-analytics.test.ts',
    'tests/06-insights.test.ts',
    'tests/07-integration.test.ts',
    'tests/utils/TestHelpers.ts',
    'tests/utils/TestLogger.ts'
];

for (const testFile of testFiles) {
    if (fs.existsSync(testFile)) {
        console.log(`✅ ${testFile}`);
    } else {
        console.error(`❌ ${testFile} manquant`);
        hasErrors = true;
    }
}

// Vérification que le dossier __mocks__ n'existe plus
if (fs.existsSync('__mocks__')) {
    console.error('❌ Le dossier __mocks__ existe encore. Il devrait être supprimé pour les tests réels.');
    hasErrors = true;
} else {
    console.log('✅ Dossier __mocks__ supprimé (tests réels activés)');
}

// Vérification de la configuration Jest
const jestConfigPath = path.join(process.cwd(), 'jest.config.js');
if (fs.existsSync(jestConfigPath)) {
    const jestConfig = fs.readFileSync(jestConfigPath, 'utf8');
    
    if (jestConfig.includes('maxWorkers: 1')) {
        console.log('✅ Jest configuré pour tests séquentiels');
    } else {
        console.error('❌ Jest non configuré pour tests séquentiels (requis pour contexte partagé)');
        hasErrors = true;
    }
    
    if (jestConfig.includes('testTimeout: 60000')) {
        console.log('✅ Jest configuré avec timeout étendu pour API réelles');
    } else {
        console.error('❌ Jest timeout trop court pour les requêtes API réelles');
        hasErrors = true;
    }
} else {
    console.error('❌ Fichier jest.config.js manquant');
    hasErrors = true;
}

if (hasErrors) {
    console.error('\n❌ Validation échouée. Corrigez les erreurs ci-dessus avant d\'exécuter les tests.');
    process.exit(1);
}

console.log('\n🎉 Configuration validée avec succès !');
console.log('\n📋 Étapes suivantes:');
console.log('1. npm run test:all  # Exécuter tous les tests avec données réelles');
console.log('2. npm test tests/02-authentication.test.ts  # Tester l\'authentification');
console.log('3. npm test tests/03-users.test.ts  # Tester les utilisateurs');
console.log('\n🔒 Rappel de sécurité:');
console.log('- Ne jamais commiter le fichier .env.test');
console.log('- Utiliser des tokens avec permissions minimales');
console.log('- Définir une expiration sur vos tokens GitHub');

console.log('\n✨ Vos tests sont maintenant configurés pour utiliser de vraies données GitHub !'); 