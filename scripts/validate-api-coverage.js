#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  // Use process.stdout for better control in CI environments
  process.stdout.write(`${colors[color]}${message}${colors.reset}\n`);
}

function loadOpenAPISpec() {
  try {
    const specPath = path.join(process.cwd(), 'openapi.yaml');
    const fileContents = fs.readFileSync(specPath, 'utf8');
    return yaml.load(fileContents);
  } catch (error) {
    log(`❌ Error loading openapi.yaml: ${error.message}`, 'red');
    process.exit(1);
  }
}

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

function extractRealEndpoints() {
  const endpoints = [];
  const routesDir = path.join(process.cwd(), 'src/routes');
  
  try {
    const routeFiles = fs.readdirSync(routesDir).filter(file => file.endsWith('.ts') && file !== 'index.ts');
    
    for (const file of routeFiles) {
      const filePath = path.join(routesDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      
      const routeMatches = content.match(/router\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g);
      
      if (routeMatches) {
        for (const match of routeMatches) {
          const methodMatch = match.match(/router\.(\w+)/);
          const pathMatch = match.match(/['"`]([^'"`]+)['"`]/);
          
          if (methodMatch && pathMatch) {
            const method = methodMatch[1].toUpperCase();
            let routePath = pathMatch[1];
            
            routePath = routePath.replace(/:(\w+)/g, '{$1}');
            
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
    
    const indexPath = path.join(routesDir, 'index.ts');
    if (fs.existsSync(indexPath)) {
      const indexContent = fs.readFileSync(indexPath, 'utf8');
      
      if (indexContent.includes("apiRouter.get('/health'")) {
        endpoints.push({ method: 'GET', path: '/health', file: 'index.ts', source: 'routes' });
      }
      if (indexContent.includes("apiRouter.get('/ping'")) {
        endpoints.push({ method: 'GET', path: '/ping', file: 'index.ts', source: 'routes' });
      }
    }
    
  } catch (error) {
    log(`❌ Error analyzing routes: ${error.message}`, 'red');
  }
  
  return endpoints.sort((a, b) => `${a.method} ${a.path}`.localeCompare(`${b.method} ${b.path}`));
}

function compareEndpoints(openApiEndpoints, realEndpoints) {
  const results = {
    matching: [],
    missingInOpenAPI: [],
    missingInCode: [],
    pathMismatches: []
  };
  
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
  
  for (const [key, openApiEp] of openApiMap) {
    if (realMap.has(key)) {
      results.matching.push({ openApi: openApiEp, real: realMap.get(key) });
    } else {
      results.missingInCode.push(openApiEp);
    }
  }
  
  for (const [key, realEp] of realMap) {
    if (!openApiMap.has(key)) {
      results.missingInOpenAPI.push(realEp);
    }
  }
  
  return results;
}

function main() {
  log('🔍 API coverage validation...', 'blue');
  log('', 'reset');
  
  const spec = loadOpenAPISpec();
  const openApiEndpoints = extractOpenAPIEndpoints(spec);
  const realEndpoints = extractRealEndpoints();
  
  log(`📋 OpenAPI endpoints found: ${openApiEndpoints.length}`, 'blue');
  log(`📁 Real endpoints found: ${realEndpoints.length}`, 'blue');
  log('', 'reset');
  
  const comparison = compareEndpoints(openApiEndpoints, realEndpoints);
  
  log(`✅ Matching endpoints: ${comparison.matching.length}`, 'green');
  
  if (comparison.matching.length > 0) {
    comparison.matching.forEach(match => {
      log(`   ${match.openApi.method} ${match.openApi.path}`, 'green');
    });
  }
  
  log('', 'reset');
  
  if (comparison.missingInOpenAPI.length > 0) {
    log(`❌ Endpoints missing in OpenAPI: ${comparison.missingInOpenAPI.length}`, 'red');
    comparison.missingInOpenAPI.forEach(ep => {
      log(`   ${ep.method} ${ep.path} (in ${ep.file})`, 'red');
    });
    log('', 'reset');
  }
  
  if (comparison.missingInCode.length > 0) {
    log(`⚠️  Endpoints documented but not implemented: ${comparison.missingInCode.length}`, 'yellow');
    comparison.missingInCode.forEach(ep => {
      log(`   ${ep.method} ${ep.path} (${ep.operationId})`, 'yellow');
    });
    log('', 'reset');
  }
  
  const totalEndpoints = Math.max(openApiEndpoints.length, realEndpoints.length);
  const coverage = totalEndpoints > 0 ? (comparison.matching.length / totalEndpoints * 100).toFixed(1) : 0;
  
  log(`📊 Coverage: ${coverage}%`, coverage >= 90 ? 'green' : coverage >= 70 ? 'yellow' : 'red');
  
  if (comparison.missingInOpenAPI.length > 0 || comparison.missingInCode.length > 0) {
    log('', 'reset');
    log('💡 Recommendations:', 'blue');
    if (comparison.missingInOpenAPI.length > 0) {
      log('   - Add missing endpoints to openapi.yaml', 'blue');
    }
    if (comparison.missingInCode.length > 0) {
      log('   - Implement documented endpoints or remove them from the documentation', 'blue');
    }
  }
  
  const hasIssues = comparison.missingInOpenAPI.length > 0 || comparison.missingInCode.length > 0;
  if (hasIssues) {
    log('', 'reset');
    log('❌ Validation failed - Inconsistencies detected', 'red');
    process.exit(1);
  } else {
    log('', 'reset');
    log('✅ Validation successful - API coverage complete!', 'green');
    process.exit(0);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export {
  loadOpenAPISpec,
  extractOpenAPIEndpoints,
  extractRealEndpoints,
  compareEndpoints
}; 