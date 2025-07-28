#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const colors = {
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  // Use process.stdout for better control in CI environments
  process.stdout.write(`${colors[color]}${message}${colors.reset}\n`);
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
  
  log(`📦 Version updated: ${currentVersion} → ${newVersion}`, 'green');
  return { oldVersion: currentVersion, newVersion };
}

function updateOpenAPIVersion(newVersion) {
  const openAPIPath = path.join(process.cwd(), 'openapi.yaml');
  let content = fs.readFileSync(openAPIPath, 'utf8');
  
  content = content.replace(
    /version:\s*[\d.]+/,
    `version: ${newVersion}`
  );
  
  fs.writeFileSync(openAPIPath, content);
  log(`📋 OpenAPI version updated: ${newVersion}`, 'blue');
}

function main() {
  try {
    log('🚀 Automatic version update...', 'bold');
    
    const { oldVersion, newVersion } = updatePackageVersion();
    updateOpenAPIVersion(newVersion);
    
    log(`✅ Version updated successfully!`, 'green');
    log(`   Old version: ${oldVersion}`, 'yellow');
    log(`   New version: ${newVersion}`, 'green');
    
    // Output version for CI/CD pipelines
    process.stdout.write(newVersion + '\n');
    
  } catch (error) {
    log(`❌ Error updating version: ${error.message}`, 'red');
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { updatePackageVersion, updateOpenAPIVersion }; 