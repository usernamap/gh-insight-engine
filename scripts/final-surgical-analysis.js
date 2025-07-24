#!/usr/bin/env node

/**
 * ANALYSE CHIRURGICALE FINALE - ENDPOINT PAR ENDPOINT
 * Examine chaque endpoint dans l'ordre chronologique réel
 */

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔬 ANALYSE CHIRURGICALE FINALE - ENDPOINT PAR ENDPOINT');
console.log('=' .repeat(80));

// Chargement de la spécification OpenAPI
const openApiPath = path.join(__dirname, '../openapi.yaml');
const openApiContent = fs.readFileSync(openApiPath, 'utf8');
const openApiSpec = yaml.load(openApiContent);

// Ordre chronologique logique des endpoints (workflow utilisateur)
const ENDPOINT_ORDER = [
  // 1. SYSTÈME (sans auth)
  { method: 'GET', path: '/health', controller: 'routes/index.ts', description: 'Health check système' },
  { method: 'GET', path: '/ping', controller: 'routes/index.ts', description: 'Test de connectivité' },
  
  // 2. AUTHENTIFICATION (séquence login)
  { method: 'POST', path: '/auth/login', controller: 'AuthController.ts', description: 'Connexion utilisateur' },
  { method: 'GET', path: '/auth/validate', controller: 'AuthController.ts', description: 'Validation token' },
  { method: 'GET', path: '/auth/me', controller: 'AuthController.ts', description: 'Profil utilisateur connecté' },
  { method: 'POST', path: '/auth/refresh', controller: 'AuthController.ts', description: 'Rafraîchissement token' },
  { method: 'DELETE', path: '/auth/logout', controller: 'AuthController.ts', description: 'Déconnexion' },
  
  // 3. UTILISATEURS (exploration)
  { method: 'GET', path: '/users/stats', controller: 'UserController.ts', description: 'Statistiques globales' },
  { method: 'GET', path: '/users/{username}', controller: 'UserController.ts', description: 'Profil utilisateur spécifique' },
  { method: 'GET', path: '/users/{username}/repositories', controller: 'UserController.ts', description: 'Repositories utilisateur' },
  { method: 'GET', path: '/users/{username}/status', controller: 'UserController.ts', description: 'Statut analyse utilisateur' },
  { method: 'DELETE', path: '/users/{username}', controller: 'UserController.ts', description: 'Suppression données GDPR' },
  
  // 4. REPOSITORIES (exploration)
  { method: 'GET', path: '/repositories/search', controller: 'RepoController.ts', description: 'Recherche repositories' },
  { method: 'GET', path: '/repositories/languages/stats', controller: 'RepoController.ts', description: 'Stats langages' },
  { method: 'GET', path: '/repositories/trending', controller: 'RepoController.ts', description: 'Repositories tendance' },
  { method: 'GET', path: '/repositories/{owner}/{repo}', controller: 'RepoController.ts', description: 'Détails repository' },
  { method: 'POST', path: '/repositories/{owner}/{repo}/enrich', controller: 'RepoController.ts', description: 'Enrichissement DevOps' },
  
  // 5. ANALYTICS (analyse quantitative)
  { method: 'POST', path: '/analytics/{username}/analyze', controller: 'AnalyticsController.ts', description: 'Lancement analyse complète' },
  { method: 'GET', path: '/analytics/{username}/overview', controller: 'AnalyticsController.ts', description: 'Vue ensemble métriques' },
  { method: 'GET', path: '/analytics/{username}/performance', controller: 'AnalyticsController.ts', description: 'Scores performance' },
  { method: 'GET', path: '/analytics/{username}/languages', controller: 'AnalyticsController.ts', description: 'Analyse langages' },
  { method: 'GET', path: '/analytics/{username}/activity', controller: 'AnalyticsController.ts', description: 'Patterns activité' },
  { method: 'GET', path: '/analytics/{username}/productivity', controller: 'AnalyticsController.ts', description: 'Score productivité' },
  { method: 'GET', path: '/analytics/{username}/devops', controller: 'AnalyticsController.ts', description: 'Maturité DevOps' },
  
  // 6. INSIGHTS (analyse qualitative IA)
  { method: 'POST', path: '/insights/{username}/generate', controller: 'InsightsController.ts', description: 'Génération insights IA' },
  { method: 'GET', path: '/insights/{username}/summary', controller: 'InsightsController.ts', description: 'Résumé insights' },
  { method: 'GET', path: '/insights/{username}/personality', controller: 'InsightsController.ts', description: 'Personnalité développeur' },
  { method: 'GET', path: '/insights/{username}/recommendations', controller: 'InsightsController.ts', description: 'Recommandations IA' },
  { method: 'GET', path: '/insights/{username}/strengths', controller: 'InsightsController.ts', description: 'Forces identifiées' },
  { method: 'GET', path: '/insights/{username}/growth', controller: 'InsightsController.ts', description: 'Axes amélioration' },
  { method: 'GET', path: '/insights/{username}/skills', controller: 'InsightsController.ts', description: 'Évaluation compétences' },
  { method: 'GET', path: '/insights/{username}/career', controller: 'InsightsController.ts', description: 'Insights carrière' }
];

let analysisResults = {
  total: ENDPOINT_ORDER.length,
  analyzed: 0,
  conforming: 0,
  issues: [],
  warnings: []
};

// Fonction pour analyser un endpoint spécifique
function analyzeEndpoint(endpoint, index) {
  const { method, path: endpointPath, controller, description } = endpoint;
  
  console.log(`\n📋 [${index + 1}/${ENDPOINT_ORDER.length}] ${method} ${endpointPath}`);
  console.log(`   📝 ${description}`);
  console.log(`   🎯 Contrôleur: ${controller}`);
  
  // 1. Vérifier si l'endpoint existe dans OpenAPI
  const openApiEndpoint = openApiSpec.paths?.[endpointPath]?.[method.toLowerCase()];
  
  if (!openApiEndpoint) {
    analysisResults.issues.push({
      endpoint: `${method} ${endpointPath}`,
      issue: 'Endpoint manquant dans OpenAPI',
      severity: 'critical'
    });
    console.log('   ❌ MANQUANT dans OpenAPI');
    return false;
  }
  
  console.log('   ✅ Trouvé dans OpenAPI');
  
  // 2. Analyser les schémas de réponse
  const responses = openApiEndpoint.responses || {};
  const successResponses = Object.keys(responses).filter(code => code.startsWith('2'));
  
  if (successResponses.length === 0) {
    analysisResults.issues.push({
      endpoint: `${method} ${endpointPath}`,
      issue: 'Aucune réponse de succès définie',
      severity: 'warning'
    });
    console.log('   ⚠️  Aucune réponse de succès');
  } else {
    console.log(`   ✅ ${successResponses.length} réponse(s) de succès`);
  }
  
  // 3. Vérifier la sécurité
  const security = openApiEndpoint.security;
  let securityLevel = 'Unknown';
  
  if (!security || security.length === 0) {
    securityLevel = 'Public';
  } else if (security.some(sec => Object.keys(sec).length === 0)) {
    securityLevel = 'Optional Auth';
  } else {
    securityLevel = 'Protected';
  }
  
  console.log(`   🔒 Sécurité: ${securityLevel}`);
  
  // 4. Vérifications spécifiques de sécurité
  if (endpointPath.includes('/analytics/') && securityLevel !== 'Protected') {
    analysisResults.warnings.push({
      endpoint: `${method} ${endpointPath}`,
      warning: 'Endpoint analytics devrait être protégé'
    });
  }
  
  if (endpointPath.includes('/insights/') && endpointPath.includes('/generate') && securityLevel !== 'Protected') {
    analysisResults.warnings.push({
      endpoint: `${method} ${endpointPath}`,
      warning: 'Génération insights devrait être protégée'
    });
  }
  
  analysisResults.analyzed++;
  if (successResponses.length > 0) {
    analysisResults.conforming++;
  }
  
  return true;
}

// Exécution de l'analyse complète
function runCompleteAnalysis() {
  console.log(`🎯 Analyse de ${ENDPOINT_ORDER.length} endpoints dans l'ordre chronologique\n`);
  
  for (let i = 0; i < ENDPOINT_ORDER.length; i++) {
    analyzeEndpoint(ENDPOINT_ORDER[i], i);
  }
  
  // Rapport final
  console.log('\n' + '='.repeat(80));
  console.log('📊 RAPPORT D\'ANALYSE CHIRURGICALE FINALE');
  console.log('='.repeat(80));
  
  console.log(`\n📈 STATISTIQUES:`);
  console.log(`  • Total endpoints analysés: ${analysisResults.analyzed}/${analysisResults.total}`);
  console.log(`  • Endpoints conformes: ${analysisResults.conforming}`);
  console.log(`  • Taux de conformité: ${Math.round((analysisResults.conforming / analysisResults.total) * 100)}%`);
  
  if (analysisResults.issues.length > 0) {
    console.log(`\n❌ PROBLÈMES DÉTECTÉS (${analysisResults.issues.length}):`);
    analysisResults.issues.forEach((issue, index) => {
      console.log(`  ${index + 1}. [${issue.severity.toUpperCase()}] ${issue.endpoint}: ${issue.issue}`);
    });
  } else {
    console.log('\n✅ AUCUN PROBLÈME CRITIQUE DÉTECTÉ');
  }
  
  if (analysisResults.warnings.length > 0) {
    console.log(`\n⚠️  AVERTISSEMENTS (${analysisResults.warnings.length}):`);
    analysisResults.warnings.forEach((warning, index) => {
      console.log(`  ${index + 1}. ${warning.endpoint}: ${warning.warning}`);
    });
  } else {
    console.log('\n✅ AUCUN AVERTISSEMENT');
  }
  
  // Évaluation finale
  console.log('\n🎯 ÉVALUATION FINALE:');
  const criticalIssues = analysisResults.issues.filter(i => i.severity === 'critical').length;
  
  if (criticalIssues === 0) {
    if (analysisResults.conforming === analysisResults.total) {
      console.log('🟢 PARFAIT - Tous les endpoints sont parfaitement conformes');
    } else {
      console.log('🟡 EXCELLENT - Conformité très élevée avec corrections mineures');
    }
  } else {
    console.log('🔴 CORRECTIONS REQUISES - Problèmes critiques détectés');
  }
  
  console.log('\n✅ Analyse chirurgicale finale terminée!');
  
  return criticalIssues === 0;
}

// Exécution
const success = runCompleteAnalysis();
process.exit(success ? 0 : 1); 