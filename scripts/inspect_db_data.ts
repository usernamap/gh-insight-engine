
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const prisma = new PrismaClient();

async function inspectDB() {
    console.log('🔍 Inspecting Database for AI Data...');

    const username = 'usernamap'; // Target user

    try {
        // 1. Check AIAnalysis (Latest)
        console.log(`\nChecking AIAnalysis for ${username}...`);
        const analysis = await prisma.aIAnalysis.findFirst({
            where: { username },
            orderBy: { createdAt: 'desc' },
            take: 1
        });

        if (analysis) {
            console.log('✅ Found AI Analysis!');
            console.log('ID:', analysis.id);
            console.log('Date:', analysis.createdAt);
            console.log('Scores:', JSON.stringify({
                quality: analysis.qualityScore,
                security: analysis.securityScore,
                maintainability: analysis.maintenabilityScore
            }, null, 2));

            console.log('\n--- Metadata (Possible AI Classification Data) ---');
            console.log(JSON.stringify(analysis.metadata, null, 2));

            console.log('\n--- Insights ---');
            console.log(JSON.stringify(analysis.insights, null, 2));
        } else {
            console.log('❌ No AI Analysis found for user.');
        }

        // 2. Check Repositories (Languages)
        console.log(`\nChecking Repositories for ${username}...`);
        const repos = await prisma.repository.findMany({
            where: { user: { login: username } },
            take: 5
        });

        console.log(`Found ${repos.length} sample repos.`);
        for (const repo of repos) {
            console.log(`\nRepo: ${repo.name}`);
            console.log('Languages:', JSON.stringify(repo.languages, null, 2));
        }

    } catch (error) {
        console.error('Error inspecting DB:', error);
    } finally {
        await prisma.$disconnect();
    }
}

inspectDB();
