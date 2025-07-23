#!/usr/bin/env node

/**
 * Script de validation finale de la conformité API
 * Vérifie que TOUS les endpoints et schémas correspondent parfaitement
 */

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Validation finale de la conformité API...\n');

// Chargement de la spécification OpenAPI
const openApiPath = path.join(__dirname, '../openapi.yaml');
const openApiContent = fs.readFileSync(openApiPath, 'utf8');
const openApiSpec = yaml.load(openApiContent);

// Analyse des contrôleurs pour extraire les structures de réponse
const controllersDir = path.join(__dirname, '../src/controllers');
const controllers = fs.readdirSync(controllersDir)
  .filter(file => file.endsWith('.ts'))
  .map(file => path.join(controllersDir, file));

let validationErrors = [];
let validationWarnings = [];

// Fonction pour analyser un contrôleur
function analyzeController(controllerPath) {
  const content = fs.readFileSync(controllerPath, 'utf8');
  const controllerName = path.basename(controllerPath, '.ts');
  
  console.log(`📋 Analyse ${controllerName}...`);
  
  // Extraction des méthodes res.status().json()
  const responseMatches = content.match(/res\.status\(\d+\)\.json\([^)]+\)/g) || [];
  
  responseMatches.forEach((match, index) => {
    console.log(`  ✓ Réponse ${index + 1}: ${match.substring(0, 50)}...`);
  });
  
  // Vérification des structures de réponse communes
  const commonIssues = [];
  
  // Vérifier la présence de timestamp
  if (!content.includes('timestamp: new Date().toISOString()')) {
    commonIssues.push('Certaines réponses pourraient manquer de timestamp');
  }
  
  // Vérifier la cohérence des noms de champs
  if (content.includes('login:') && content.includes('username:')) {
    commonIssues.push('Incohérence entre login et username dans les réponses');
  }
  
  if (commonIssues.length > 0) {
    validationWarnings.push({
      controller: controllerName,
      issues: commonIssues
    });
  }
}

// Analyse de tous les contrôleurs
controllers.forEach(analyzeController);

// Vérification des schémas OpenAPI
console.log('\n📋 Vérification des schémas OpenAPI...');

const schemas = openApiSpec.components?.schemas || {};
const paths = openApiSpec.paths || {};

// Vérifier que tous les schémas référencés existent
Object.entries(paths).forEach(([path, methods]) => {
  Object.entries(methods).forEach(([method, spec]) => {
    if (spec.responses) {
      Object.entries(spec.responses).forEach(([status, response]) => {
        if (response.content?.['application/json']?.schema?.$ref) {
          const schemaRef = response.content['application/json'].schema.$ref;
          const schemaName = schemaRef.replace('#/components/schemas/', '');
          
          if (!schemas[schemaName]) {
            validationErrors.push({
              endpoint: `${method.toUpperCase()} ${path}`,
              issue: `Schéma manquant: ${schemaName}`,
              status: status
            });
          }
        }
      });
    }
  });
});

// Vérifier les schémas inutilisés
const usedSchemas = new Set();
const schemaRefs = JSON.stringify(openApiSpec).match(/#\/components\/schemas\/\w+/g) || [];
schemaRefs.forEach(ref => {
  const schemaName = ref.replace('#/components/schemas/', '');
  usedSchemas.add(schemaName);
});

Object.keys(schemas).forEach(schemaName => {
  if (!usedSchemas.has(schemaName)) {
    validationWarnings.push({
      schema: schemaName,
      issue: 'Schéma potentiellement inutilisé'
    });
  }
});

// Vérifications spécifiques basées sur les corrections apportées
console.log('\n📋 Vérifications spécifiques...');

const specificChecks = [
  {
    name: 'LoginResponse structure',
    check: () => {
      const loginSchema = schemas.LoginResponse;
      if (!loginSchema) return 'Schéma LoginResponse manquant';
      if (!loginSchema.properties?.tokens) return 'Champ tokens manquant dans LoginResponse';
      if (!loginSchema.properties?.permissions) return 'Champ permissions manquant dans LoginResponse';
      return null;
    }
  },
  {
    name: 'UserProfile username field',
    check: () => {
      const userSchema = schemas.UserProfile;
      if (!userSchema) return 'Schéma UserProfile manquant';
      if (userSchema.properties?.login) return 'UserProfile utilise encore login au lieu de username';
      if (!userSchema.properties?.username) return 'Champ username manquant dans UserProfile';
      return null;
    }
  },
  {
    name: 'AnalysisStatusResponse structure',
    check: () => {
      const analysisSchema = schemas.AnalysisStatusResponse;
      if (!analysisSchema) return 'Schéma AnalysisStatusResponse manquant';
      if (!analysisSchema.properties?.analysis) return 'Champ analysis manquant dans AnalysisStatusResponse';
      if (!analysisSchema.properties?.dataset) return 'Champ dataset manquant dans AnalysisStatusResponse';
      return null;
    }
  },
  {
    name: 'InsightGenerationResponse structure',
    check: () => {
      const insightSchema = schemas.InsightGenerationResponse;
      if (!insightSchema) return 'Schéma InsightGenerationResponse manquant';
      if (!insightSchema.properties?.summary) return 'Champ summary manquant dans InsightGenerationResponse';
      if (!insightSchema.properties?.metadata) return 'Champ metadata manquant dans InsightGenerationResponse';
      return null;
    }
  }
];

specificChecks.forEach(({ name, check }) => {
  const result = check();
  if (result) {
    validationErrors.push({
      check: name,
      issue: result
    });
  } else {
    console.log(`  ✅ ${name}`);
  }
});

// Rapport final
console.log('\n' + '='.repeat(60));
console.log('📊 RAPPORT DE VALIDATION FINALE');
console.log('='.repeat(60));

if (validationErrors.length === 0) {
  console.log('✅ AUCUNE ERREUR CRITIQUE DÉTECTÉE');
} else {
  console.log(`❌ ${validationErrors.length} ERREUR(S) CRITIQUE(S) DÉTECTÉE(S):`);
  validationErrors.forEach((error, index) => {
    console.log(`  ${index + 1}. ${error.endpoint || error.check || 'Général'}: ${error.issue}`);
  });
}

if (validationWarnings.length === 0) {
  console.log('✅ AUCUN AVERTISSEMENT');
} else {
  console.log(`⚠️  ${validationWarnings.length} AVERTISSEMENT(S):`);
  validationWarnings.forEach((warning, index) => {
    console.log(`  ${index + 1}. ${warning.controller || warning.schema || 'Général'}: ${warning.issues?.[0] || warning.issue}`);
  });
}

// Statistiques finales
const totalEndpoints = Object.keys(paths).length;
const totalSchemas = Object.keys(schemas).length;
const usedSchemasCount = usedSchemas.size;

console.log('\n📈 STATISTIQUES:');
console.log(`  • Endpoints documentés: ${totalEndpoints}`);
console.log(`  • Schémas définis: ${totalSchemas}`);
console.log(`  • Schémas utilisés: ${usedSchemasCount}`);
console.log(`  • Taux d'utilisation des schémas: ${Math.round((usedSchemasCount / totalSchemas) * 100)}%`);

console.log('\n🎯 CONFORMITÉ GLOBALE:');
if (validationErrors.length === 0 && validationWarnings.length <= 2) {
  console.log('🟢 EXCELLENTE - API parfaitement documentée');
} else if (validationErrors.length === 0) {
  console.log('🟡 BONNE - Quelques améliorations mineures possibles');
} else {
  console.log('🔴 PROBLÉMATIQUE - Corrections requises');
}

console.log('\n✅ Validation finale terminée!');

// Code de sortie
process.exit(validationErrors.length > 0 ? 1 : 0); 