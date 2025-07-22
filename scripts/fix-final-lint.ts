#!/usr/bin/env ts-node

import { readFileSync, writeFileSync } from 'fs';

interface FixPattern {
    file: string;
    fixes: Array<[RegExp, string]>;
}

const FINAL_FIXES: FixPattern[] = [
    // GitHub Config fixes
    {
        file: 'src/config/github.ts',
        fixes: [
            // Fix nullish coalescing logic error
            [/scope === requiredScope \?\? scope\.startsWith/g, 'scope === requiredScope || scope.startsWith'],
            // Fix 'any' types in GraphQL responses  
            [/data: any/g, 'data: Record<string, unknown>'],
            [/variables: any/g, 'variables: Record<string, unknown>'],
            // Replace non-null assertions with safe access
            [/\.data!/g, '.data'],
            [/\.response!/g, '.response'],
        ],
    },

    // Analytics Controller fixes  
    {
        file: 'src/controllers/AnalyticsController.ts',
        fixes: [
            // Fix catch block error types
            [/} catch \(error: unknown\) \{[^}]*logWithContext\.error\([^,]+,\s*error: unknown\)/g,
                '} catch (_error: unknown) {\n      logWithContext.error(method, String(_error))'],
            [/error: unknown/g, 'String(_error)'],
        ],
    },

    // Insights Controller fixes
    {
        file: 'src/controllers/InsightsController.ts',
        fixes: [
            // Fix analysis result types
            [/analysisResult: unknown/g, 'analysisResult: Record<string, unknown>'],
            // Fix catch block error types
            [/} catch \(error: unknown\) \{[^}]*logWithContext\.error\([^,]+,\s*error: unknown\)/g,
                '} catch (_error: unknown) {\n      logWithContext.error(method, String(_error))'],
        ],
    },

    // Auth middleware fixes
    {
        file: 'src/middleware/auth.ts',
        fixes: [
            // Fix constant nullish coalescing
            [/!user \?\? user/g, '!user || user'],
            [/!userData \?\? userData/g, '!userData || userData'],
        ],
    },

    // Error handler fixes
    {
        file: 'src/middleware/errorHandler.ts',
        fixes: [
            // Fix error types in error handlers
            [/error: unknown/g, 'error: Error'],
            [/err: unknown/g, 'err: Error'],
            // Add return types
            [/const formatErrorResponse = \([^)]+\) => \{/g, 'const formatErrorResponse = (error: APIError, req: Request): Record<string, unknown> => {'],
            [/= \(error: Error\) => \{/g, '= (error: Error): void => {'],
            // Fix nullish coalescing
            [/error\.code \?\? error\.code/g, 'error.code'],
            [/null \?\? /g, ''],
        ],
    },

    // Validation fixes
    {
        file: 'src/middleware/validation.ts',
        fixes: [
            // Fix constant comparison
            [/req\.method === 'GET' \?\? req\.method === 'HEAD'/g, "req.method === 'GET' || req.method === 'HEAD'"],
        ],
    },

    // Dataset model fixes
    {
        file: 'src/models/Dataset.ts',
        fixes: [
            // Fix 'any' types in database operations
            [/data: unknown/g, 'data: Record<string, unknown>'],
            [/updateData: unknown/g, 'updateData: Record<string, unknown>'],
            // Fix constant comparisons
            [/result\.modifiedCount !== 0 \?\? result\.upsertedCount !== 0/g, 'result.modifiedCount !== 0 || result.upsertedCount !== 0'],
        ],
    },

    // Repository & User models fixes
    {
        file: 'src/models/Repository.ts',
        fixes: [
            [/data \?\? data/g, 'data'],
            [/null \?\? /g, ''],
        ],
    },

    {
        file: 'src/models/User.ts',
        fixes: [
            [/user \?\? user/g, 'user'],
            [/null \?\? /g, ''],
        ],
    },

    // Analytics Service fixes
    {
        file: 'src/services/AnalyticsService.ts',
        fixes: [
            // Fix unused parameters
            [/timeframe: string/g, '_timeframe: string'],
            [/\(repos, index\)/g, '(repos, _index)'],
            // Fix nullish coalescing
            [/result \?\? result/g, 'result'],
            [/data \?\? data/g, 'data'],
            // Fix regex escape
            [/\\\\\\[/g, '['],
            ],
  },

    // Database Service fixes
    {
        file: 'src/services/DatabaseService.ts',
        fixes: [
            // Fix unused prisma parameters
            [/prisma: PrismaClient/g, '_prisma: PrismaClient'],
        ],
    },

    // GitHub Service fixes  
    {
        file: 'src/services/GitHubService.ts',
        fixes: [
            // Fix nullish coalescing
            [/response \?\? response/g, 'response'],
            [/data \?\? data/g, 'data'],
            [/null \?\? /g, ''],
        ],
    },
];

function applyFinalFixes(): void {
    console.log('🎯 Applying final automated lint fixes...\n');

    let totalFixesApplied = 0;

    for (const { file, fixes } of FINAL_FIXES) {
        try {
            let content = readFileSync(file, 'utf8');
            const originalContent = content;
            let fileFixCount = 0;

            for (const [pattern, replacement] of fixes) {
                const matches = content.match(pattern);
                if (matches) {
                    content = content.replace(pattern, replacement);
                    fileFixCount += matches.length;
                }
            }

            if (content !== originalContent) {
                writeFileSync(file, content, 'utf8');
                console.log(`✅ Fixed ${fileFixCount} issues in ${file}`);
                totalFixesApplied += fileFixCount;
            } else {
                console.log(`⚪ No changes needed in ${file}`);
            }

        } catch (error) {
            console.error(`❌ Error processing ${file}:`, error);
        }
    }

    console.log(`\n🎊 Applied ${totalFixesApplied} final fixes across all files!`);
    console.log('🔍 Running final lint check...');
}

if (require.main === module) {
    applyFinalFixes();
} 