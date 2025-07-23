#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

/**
 * Script de mise à jour automatique de version
 * Incrémente la version patch automatiquement
 */

const colors = {
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function updatePackageVersion() {
  const packagePath = path.join(process.cwd(), 'package.json');
  const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  const currentVersion = packageContent.version;
  const versionParts = currentVersion.split('.');
  const major = parseInt(versionParts[0]);
  const minor = parseInt(versionParts[1]);
  const patch = parseInt(versionParts[2]) + 1;
  
  const newVersion = `${major}.${minor}.${patch}`;
  packageContent.version = newVersion;
  
  fs.writeFileSync(packagePath, JSON.stringify(packageContent, null, 2) + '\n');
  
  log(`📦 Version mise à jour: ${currentVersion} → ${newVersion}`, 'green');
  return { oldVersion: currentVersion, newVersion };
}

function updateOpenAPIVersion(newVersion) {
  const openAPIPath = path.join(process.cwd(), 'openapi.yaml');
  let content = fs.readFileSync(openAPIPath, 'utf8');
  
  // Mettre à jour la version dans openapi.yaml
  content = content.replace(
    /version:\s*[\d.]+/,
    `version: ${newVersion}`
  );
  
  fs.writeFileSync(openAPIPath, content);
  log(`📋 OpenAPI version mise à jour: ${newVersion}`, 'blue');
}

function main() {
  try {
    log('🚀 Mise à jour automatique de version...', 'bold');
    
    const { oldVersion, newVersion } = updatePackageVersion();
    updateOpenAPIVersion(newVersion);
    
    log(`✅ Version mise à jour avec succès!`, 'green');
    log(`   Ancienne: ${oldVersion}`, 'yellow');
    log(`   Nouvelle: ${newVersion}`, 'green');
    
    // Retourner la nouvelle version pour les scripts suivants
    console.log(newVersion);
    
  } catch (error) {
    log(`❌ Erreur lors de la mise à jour: ${error.message}`, 'red');
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { updatePackageVersion, updateOpenAPIVersion }; 