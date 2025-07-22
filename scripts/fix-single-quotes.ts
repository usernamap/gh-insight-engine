#!/usr/bin/env ts-node
import fs from 'fs';
import path from 'path';

const IGNORED_DIRS = ['node_modules', 'dist', 'build', '.git'];
const VALID_EXTENSIONS = ['.ts', '.js'];

function shouldIgnore(filePath: string): boolean {
    return IGNORED_DIRS.some((dir) => filePath.includes(path.sep + dir + path.sep));
}

function getAllFiles(dir: string): string[] {
    let results: string[] = [];
    const list = fs.readdirSync(dir);
    list.forEach((file) => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            if (!IGNORED_DIRS.includes(file)) {
                results = results.concat(getAllFiles(filePath));
            }
        } else if (
            VALID_EXTENSIONS.includes(path.extname(file)) &&
            !shouldIgnore(filePath)
        ) {
            results.push(filePath);
        }
    });
    return results;
}

function fixSingleQuotes(content: string): string {
    // Remplacer les '...' par '...' sauf si la chaîne contient déjà un '
    // Ne pas toucher aux templates `...` ni aux imports/export * as '...'
    // On ne touche pas aux commentaires
    return content.replace(/([=\(\[,\s])"((?:[^"\\]|\\.)*)"/g, (match, p1, p2) => {
        if (p2.includes("'")) return match; // skip if already contains single quote
        return `${p1}'${p2.replace(/'/g, "\\'")}'`;
    });
}

function processFile(filePath: string): void {
    const original = fs.readFileSync(filePath, 'utf8');
    const fixed = fixSingleQuotes(original);
    if (original !== fixed) {
        fs.writeFileSync(filePath, fixed, 'utf8');
        console.log(`✔️  Fixed single quotes in: ${filePath}`);
    }
}

function main() {
    const root = process.cwd();
    const files = getAllFiles(root);
    files.forEach(processFile);
    console.log('✅ All eligible files processed.');
}

main(); 