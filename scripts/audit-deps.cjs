const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const packageJson = require('../package.json');
const dependencies = Object.keys(packageJson.dependencies || {});
const devDependencies = Object.keys(packageJson.devDependencies || {});
const allDeps = [...dependencies, ...devDependencies];

const rootDir = path.resolve(__dirname, '..');
const srcDir = path.join(rootDir, 'src');

console.log('Scanning for usage of ' + allDeps.length + ' packages...');

const unused = [];
const lowUsage = [];

for (const dep of allDeps) {
    // Common false positives / types / tools
    if (dep.startsWith('@types/')) continue;
    if (dep === 'typescript') continue;
    if (dep === 'tsx') continue;
    if (dep === 'ts-node') continue;
    if (dep === 'eslint') continue;
    if (dep === 'prettier') continue;
    if (dep === 'husky') continue;
    if (dep === 'prisma') continue; // CLI tool

    try {
        // Grep for "from 'dep'" or "require('dep')" or "from "dep""
        // This is a rough heuristic
        const cmd = `grep -rEi "from ['\\"]${dep}['\\"]|require\\(['\\"]${dep}['\\"]\\)|import\\(['\\"]${dep}['\\"]\\)" "${srcDir}" "${path.join(rootDir, 'scripts')}" "${path.join(rootDir, '*.ts')}" "${path.join(rootDir, '*.js')}"  2>/dev/null | wc -l`;
        const count = parseInt(execSync(cmd, { encoding: 'utf-8' }).trim());

        if (count === 0) {
            // Try searching just the string "dep" in case of non-standard usage, but careful with short names
            // For now, assume 0 means likely unused
            unused.push(dep);
        } else if (count < 3) {
            lowUsage.push({ dep, count });
        }
    } catch (e) {
        console.error(`Error checking ${dep}: ${e.message}`);
    }
}

console.log('\n--- POTENTIALLY UNUSED ---');
unused.forEach(d => console.log(d));

console.log('\n--- LOW USAGE (< 3 matches) ---');
lowUsage.forEach(item => console.log(`${item.dep}: ${item.count}`));
