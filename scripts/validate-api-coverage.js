#!/usr/bin/env node

/**
 * Script de validation de la couverture API
 * Vérifie que tous les endpoints réels correspondent à la documentation OpenAPI
 */

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Couleurs pour la console
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Charger la spécification OpenAPI
function loadOpenAPISpec() {
  try {
    const specPath = path.join(process.cwd(), 'openapi.yaml');
    const fileContents = fs.readFileSync(specPath, 'utf8');
    return yaml.load(fileContents);
  } catch (error) {
    log(`❌ Erreur lors du chargement de openapi.yaml: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Extraire les endpoints de la spécification OpenAPI
function extractOpenAPIEndpoints(spec) {
  const endpoints = [];
  
  for (const [path, methods] of Object.entries(spec.paths || {})) {
    for (const [method, operation] of Object.entries(methods)) {
      if (typeof operation === 'object' && operation.operationId) {
        endpoints.push({
          method: method.toUpperCase(),
          path: path,
          operationId: operation.operationId,
          tags: operation.tags || [],
          summary: operation.summary || '',
        });
      }
    }
  }
  
  return endpoints.sort((a, b) => `${a.method} ${a.path}`.localeCompare(`${b.method} ${b.path}`));
}

// Analyser les fichiers de routes pour extraire les endpoints réels
function extractRealEndpoints() {
  const endpoints = [];
  const routesDir = path.join(process.cwd(), 'src/routes');
  
  try {
    const routeFiles = fs.readdirSync(routesDir).filter(file => file.endsWith('.ts') && file !== 'index.ts');
    
    for (const file of routeFiles) {
      const filePath = path.join(routesDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Extraire les routes avec regex
      const routeMatches = content.match(/router\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g);
      
      if (routeMatches) {
        for (const match of routeMatches) {
          const methodMatch = match.match(/router\.(\w+)/);
          const pathMatch = match.match(/['"`]([^'"`]+)['"`]/);
          
          if (methodMatch && pathMatch) {
            const method = methodMatch[1].toUpperCase();
            let routePath = pathMatch[1];
            
            // Convertir les paramètres Express vers OpenAPI
            routePath = routePath.replace(/:(\w+)/g, '{$1}');
            
            // Ajouter le préfixe basé sur le fichier
            const prefix = file.replace('.ts', '');
            if (prefix !== 'auth' && prefix !== 'index') {
              routePath = `/${prefix}${routePath}`;
            } else if (prefix === 'auth') {
              routePath = `/auth${routePath}`;
            }
            
            endpoints.push({
              method,
              path: routePath,
              file: file,
              source: 'routes'
            });
          }
        }
      }
    }
    
    // Ajouter les routes définies dans index.ts
    const indexPath = path.join(routesDir, 'index.ts');
    if (fs.existsSync(indexPath)) {
      const indexContent = fs.readFileSync(indexPath, 'utf8');
      
      // Routes health et ping
      if (indexContent.includes("apiRouter.get('/health'")) {
        endpoints.push({ method: 'GET', path: '/health', file: 'index.ts', source: 'routes' });
      }
      if (indexContent.includes("apiRouter.get('/ping'")) {
        endpoints.push({ method: 'GET', path: '/ping', file: 'index.ts', source: 'routes' });
      }
    }
    
  } catch (error) {
    log(`❌ Erreur lors de l'analyse des routes: ${error.message}`, 'red');
  }
  
  return endpoints.sort((a, b) => `${a.method} ${a.path}`.localeCompare(`${b.method} ${b.path}`));
}

// Comparer les endpoints
function compareEndpoints(openApiEndpoints, realEndpoints) {
  const results = {
    matching: [],
    missingInOpenAPI: [],
    missingInCode: [],
    pathMismatches: []
  };
  
  // Créer des maps pour faciliter la comparaison
  const openApiMap = new Map();
  const realMap = new Map();
  
  openApiEndpoints.forEach(ep => {
    const key = `${ep.method} ${ep.path}`;
    openApiMap.set(key, ep);
  });
  
  realEndpoints.forEach(ep => {
    const key = `${ep.method} ${ep.path}`;
    realMap.set(key, ep);
  });
  
  // Vérifier les endpoints OpenAPI vs réels
  for (const [key, openApiEp] of openApiMap) {
    if (realMap.has(key)) {
      results.matching.push({ openApi: openApiEp, real: realMap.get(key) });
    } else {
      results.missingInCode.push(openApiEp);
    }
  }
  
  // Vérifier les endpoints réels vs OpenAPI
  for (const [key, realEp] of realMap) {
    if (!openApiMap.has(key)) {
      results.missingInOpenAPI.push(realEp);
    }
  }
  
  return results;
}

// Fonction principale
function main() {
  log('🔍 Validation de la couverture API...', 'blue');
  log('', 'reset');
  
  // Charger et analyser
  const spec = loadOpenAPISpec();
  const openApiEndpoints = extractOpenAPIEndpoints(spec);
  const realEndpoints = extractRealEndpoints();
  
  log(`📋 Endpoints OpenAPI trouvés: ${openApiEndpoints.length}`, 'blue');
  log(`📁 Endpoints réels trouvés: ${realEndpoints.length}`, 'blue');
  log('', 'reset');
  
  // Comparer
  const comparison = compareEndpoints(openApiEndpoints, realEndpoints);
  
  // Afficher les résultats
  log(`✅ Endpoints correspondants: ${comparison.matching.length}`, 'green');
  
  if (comparison.matching.length > 0) {
    comparison.matching.forEach(match => {
      log(`   ${match.openApi.method} ${match.openApi.path}`, 'green');
    });
  }
  
  log('', 'reset');
  
  if (comparison.missingInOpenAPI.length > 0) {
    log(`❌ Endpoints manquants dans OpenAPI: ${comparison.missingInOpenAPI.length}`, 'red');
    comparison.missingInOpenAPI.forEach(ep => {
      log(`   ${ep.method} ${ep.path} (dans ${ep.file})`, 'red');
    });
    log('', 'reset');
  }
  
  if (comparison.missingInCode.length > 0) {
    log(`⚠️  Endpoints documentés mais non implémentés: ${comparison.missingInCode.length}`, 'yellow');
    comparison.missingInCode.forEach(ep => {
      log(`   ${ep.method} ${ep.path} (${ep.operationId})`, 'yellow');
    });
    log('', 'reset');
  }
  
  // Statistiques finales
  const totalEndpoints = Math.max(openApiEndpoints.length, realEndpoints.length);
  const coverage = totalEndpoints > 0 ? (comparison.matching.length / totalEndpoints * 100).toFixed(1) : 0;
  
  log(`📊 Couverture: ${coverage}%`, coverage >= 90 ? 'green' : coverage >= 70 ? 'yellow' : 'red');
  
  // Recommandations
  if (comparison.missingInOpenAPI.length > 0 || comparison.missingInCode.length > 0) {
    log('', 'reset');
    log('💡 Recommandations:', 'blue');
    if (comparison.missingInOpenAPI.length > 0) {
      log('   - Ajouter les endpoints manquants à openapi.yaml', 'blue');
    }
    if (comparison.missingInCode.length > 0) {
      log('   - Implémenter les endpoints documentés ou les supprimer de la documentation', 'blue');
    }
  }
  
  // Code de sortie
  const hasIssues = comparison.missingInOpenAPI.length > 0 || comparison.missingInCode.length > 0;
  if (hasIssues) {
    log('', 'reset');
    log('❌ Validation échouée - Des incohérences ont été détectées', 'red');
    process.exit(1);
  } else {
    log('', 'reset');
    log('✅ Validation réussie - Couverture API complète!', 'green');
    process.exit(0);
  }
}

// Exécuter le script
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export {
  loadOpenAPISpec,
  extractOpenAPIEndpoints,
  extractRealEndpoints,
  compareEndpoints
}; 