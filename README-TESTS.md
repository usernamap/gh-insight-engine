# 🧪 Pipeline de Tests - GitHub Insight Engine API

## Vue d'ensemble

Cette pipeline de tests complète valide tous les endpoints de l'API GitHub Insight Engine avec des logs détaillés, une validation OpenAPI et des rapports de couverture.

## 🏗️ Architecture des Tests

### Structure des Fichiers

```
tests/
├── setup.ts                    # Configuration globale Jest
├── utils/
│   ├── TestLogger.ts           # Système de logging coloré et détaillé
│   ├── TestHelpers.ts          # Utilitaires pour les requêtes API
│   └── OpenAPIValidator.ts     # Validation dynamique contre OpenAPI
├── 01-system.test.ts           # Tests endpoints système (health, ping)
├── 02-authentication.test.ts   # Tests flow complet d'authentification
├── 03-users.test.ts           # Tests endpoints utilisateurs
├── 04-repositories.test.ts     # Tests endpoints repositories
├── 05-analytics.test.ts        # Tests endpoints analytics
├── 06-insights.test.ts         # Tests endpoints insights IA
├── 07-integration.test.ts      # Tests d'intégration + validation OpenAPI
└── run-all-tests.ts           # Script principal de pipeline
```

## 🚀 Exécution des Tests

### Scripts Disponibles

```bash
# Pipeline complète avec rapport final
npm run test:api

# Tests individuels par suite
npm run test:system      # Endpoints système
npm run test:auth        # Authentification
npm run test:users       # Utilisateurs
npm run test:repos       # Repositories
npm run test:analytics   # Analytics
npm run test:insights    # Insights IA
npm run test:integration # Intégration

# Validation OpenAPI uniquement
npm run test:openapi

# Tests Jest standards
npm run test            # Tous les tests
npm run test:watch      # Mode watch
npm run test:coverage   # Avec couverture
```

### Pipeline Complète

```bash
npm run test:api
```

Cette commande exécute tous les tests dans l'ordre logique avec :
- ✅ Logs détaillés colorés
- ✅ Validation contre la spécification OpenAPI
- ✅ Rapport de couverture des endpoints
- ✅ Détection des tests manquants
- ✅ Validation des schémas de réponse
- ✅ Tests de performance et concurrence

## 📊 Ordre d'Exécution Logique

### 1. System Endpoints (Critique)
- `GET /api/health` - Health check
- `GET /api/ping` - Test connectivité
- Tests de méthodes non autorisées
- Validation des headers de sécurité

### 2. Authentication (Critique)
- `POST /api/auth/login` - Connexion
- `GET /api/auth/validate` - Validation token
- `GET /api/auth/me` - Infos utilisateur
- `POST /api/auth/refresh` - Rafraîchissement
- `DELETE /api/auth/logout` - Déconnexion
- Flow complet d'authentification

### 3. Users (Critique)
- `GET /api/users/search` - Recherche utilisateurs
- `GET /api/users/{username}` - Profil utilisateur
- `GET /api/users/{username}/status` - Statut analyse
- `GET /api/users/stats` - Statistiques plateforme
- `GET /api/users/{username}/repositories` - Repos utilisateur
- `DELETE /api/users/{username}` - Suppression GDPR

### 4. Repositories (Non-critique)
- `GET /api/repositories/search` - Recherche repos
- `GET /api/repositories/languages/stats` - Stats langages
- `GET /api/repositories/trending` - Repos tendance
- `GET /api/repositories/{owner}/{repo}` - Détails repo
- `POST /api/repositories/{owner}/{repo}/enrich` - Enrichissement DevOps

### 5. Analytics (Non-critique)
- `POST /api/analytics/{username}/analyze` - Lancer analyse
- `GET /api/analytics/{username}/overview` - Vue d'ensemble
- `GET /api/analytics/{username}/performance` - Scores performance
- `GET /api/analytics/{username}/languages` - Analyse langages
- `GET /api/analytics/{username}/activity` - Analyse activité
- `GET /api/analytics/{username}/productivity` - Score productivité
- `GET /api/analytics/{username}/devops` - Maturité DevOps

### 6. Insights (Non-critique)
- `POST /api/insights/{username}/generate` - Génération IA
- `GET /api/insights/{username}/summary` - Résumé IA
- `GET /api/insights/{username}/recommendations` - Recommandations
- `GET /api/insights/{username}/strengths` - Forces
- `GET /api/insights/{username}/growth` - Axes d'amélioration
- `GET /api/insights/{username}/personality` - Personnalité
- `GET /api/insights/{username}/career` - Insights carrière
- `GET /api/insights/{username}/skills` - Évaluation compétences

### 7. Integration (Critique)
- Parcours utilisateur complet (32 étapes)
- Validation conformité OpenAPI
- Tests de performance et concurrence
- Validation croisée des données

## 🎯 Fonctionnalités Avancées

### Système de Logging

```typescript
// Logs colorés et structurés
testLogger.startSuite('Suite Name', 'Description');
testLogger.logStep({
  description: 'Test description',
  method: 'GET',
  endpoint: '/api/endpoint',
  expectedStatus: 200,
  actualStatus: 200,
  duration: 150,
  data: responseData
});
testLogger.endSuite();
```

### Validation OpenAPI Dynamique

```typescript
// Validation automatique des endpoints
openAPIValidator.registerTestedEndpoint('GET', '/api/health');
openAPIValidator.validateEndpoint('GET', '/api/health', 200);
openAPIValidator.generateCoverageReport();
```

### Helpers de Test

```typescript
// Utilitaires pour simplifier les tests
const response = await testHelpers.makeRequest({
  description: 'Test description',
  method: 'GET',
  endpoint: '/api/endpoint',
  expectedStatus: 200,
  auth: true,
  validateResponse: ResponseValidators.userProfile
});
```

## 📈 Rapports et Métriques

### Rapport Final

```
🎯 RAPPORT FINAL DE LA PIPELINE DE TESTS
█████████████████████████████████████████████████████████████████████████████████
⏰ Durée totale: 2m 30s
📊 Tests exécutés: 7
✅ Réussis: 7
❌ Échoués: 0

🔴 TESTS CRITIQUES:
📊 Total: 4
✅ Réussis: 4
❌ Échoués: 0

📋 DÉTAIL PAR SUITE:
  1. ✅ 🔴 System Endpoints (15.2s)
  2. ✅ 🔴 Authentication (28.7s)
  3. ✅ 🔴 Users (45.1s)
  4. ✅ 🟡 Repositories (32.8s)
  5. ✅ 🟡 Analytics (67.3s)
  6. ✅ 🟡 Insights (89.4s)
  7. ✅ 🔴 Integration (52.1s)

🎉 PIPELINE RÉUSSIE! (100.0% de réussite)
✨ Tous les tests critiques sont passés avec succès.
🚀 L'API est prête pour le déploiement!
```

### Rapport de Couverture OpenAPI

```
📊 OPENAPI VALIDATION REPORT
================================================================================
📈 Coverage: 32/35 endpoints (91.4%)
🎉 Excellent coverage!

🔍 Missing Tests (3):
  • DELETE /api/users/{username} - Suppression données utilisateur (GDPR)
  • POST /api/auth/refresh - Rafraîchissement du token JWT
  • GET /api/repositories/trending - Repositories tendance

📝 Extra Tests (0):
  (Aucun test pour endpoint non documenté)

⚠️  Warnings (1):
  • Low test coverage: 91.4% (recommended: >95%)
```

## 🔧 Configuration

### Variables d'Environnement de Test

```env
NODE_ENV=test
JWT_SECRET=test-jwt-secret-key
OPENAI_API_KEY=test-openai-key
GH_TOKEN=test-github-token
GITHUB_USERNAME=test-user
GITHUB_FULL_NAME=Test User
PORT=3001
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000
```

### Configuration Jest

```javascript
// jest.config.js
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testTimeout: 30000,
  verbose: true,
  detectOpenHandles: true,
  forceExit: true
};
```

## 🚨 Tests Critiques vs Non-Critiques

### Tests Critiques (Arrêtent la pipeline en cas d'échec)
- **System**: Santé de base de l'API
- **Authentication**: Sécurité fondamentale
- **Users**: Fonctionnalités utilisateur core
- **Integration**: Validation complète

### Tests Non-Critiques (Continuent même en cas d'échec)
- **Repositories**: Fonctionnalités avancées
- **Analytics**: Métriques quantitatives
- **Insights**: Analyses IA (dépendent de services externes)

## 🎨 Personnalisation

### Ajouter une Nouvelle Suite de Tests

1. Créer le fichier `tests/XX-nouvelle-suite.test.ts`
2. Ajouter la suite dans `tests/run-all-tests.ts`:

```typescript
{
  name: 'Nouvelle Suite',
  file: 'XX-nouvelle-suite.test.ts',
  description: 'Description de la nouvelle suite',
  critical: false // ou true si critique
}
```

### Ajouter de Nouveaux Validators

```typescript
// Dans tests/utils/TestHelpers.ts
export const ResponseValidators = {
  // ... validators existants
  nouveauValidator: (response: any) => {
    expect(response).toHaveProperty('proprieteRequise');
    // ... autres validations
  }
};
```

## 🐛 Debugging

### Logs Détaillés

Les tests génèrent des logs colorés détaillés pour chaque étape :

```
Step 1: Vérification de l'état de santé de l'API
🔗 GET /api/health
✅ Status: 200 (expected: 200)
⏱️  Duration: 145ms
📊 Response Data:
{
  "status": "healthy",
  "service": "GitHub Insight Engine API",
  "version": "0.1.5",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600.5,
  "environment": "test"
}
```

### Mode Debug

```bash
# Exécuter un seul test avec debug
npm run test:auth -- --verbose --no-cache

# Exécuter avec timeout étendu
npm run test:integration -- --testTimeout=60000
```

## 🔄 CI/CD Integration

### GitHub Actions

```yaml
name: API Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:api
      - run: npm run test:openapi
```

### Scripts Pre-commit

```bash
# Dans .husky/pre-commit
npm run test:system
npm run test:auth
npm run test:openapi
```

## 🎯 Bonnes Pratiques

1. **Ordre d'Exécution**: Respecter l'ordre logique (système → auth → fonctionnalités)
2. **Tests Atomiques**: Chaque test doit être indépendant
3. **Cleanup**: Nettoyer les données entre les tests
4. **Mocks**: Utiliser des mocks pour les services externes
5. **Assertions**: Valider à la fois le status ET la structure des réponses
6. **Documentation**: Maintenir la correspondance avec OpenAPI

## 📚 Ressources

- [Documentation Jest](https://jestjs.io/docs/getting-started)
- [Supertest](https://github.com/visionmedia/supertest)
- [OpenAPI Specification](https://swagger.io/specification/)
- [MongoDB Memory Server](https://github.com/nodkz/mongodb-memory-server)

---

**🎯 Objectif**: Garantir la qualité et la conformité de l'API GitHub Insight Engine avec une couverture complète des endpoints et une validation rigoureuse contre la spécification OpenAPI. 