#!/usr/bin/env ts-node
import fs from 'fs';
import path from 'path';
import recast from 'recast';

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

function fixIndent(content: string): string {
    try {
        const ast = recast.parse(content, {
            parser: require('recast/parsers/typescript'),
        });
        return recast.print(ast, { tabWidth: 2, reuseWhitespace: false }).code;
    } catch (e) {
        // fallback: ne rien changer si parsing échoue
        return content;
    }
}

function processFile(filePath: string): void {
    const original = fs.readFileSync(filePath, 'utf8');
    const fixed = fixIndent(original);
    if (original !== fixed) {
        fs.writeFileSync(filePath, fixed, 'utf8');
        console.log(`✔️  Fixed indentation in: ${filePath}`);
    }
}

function main() {
    const root = process.cwd();
    const files = getAllFiles(root);
    files.forEach(processFile);
    console.log('✅ All eligible files processed.');
}

main(); 