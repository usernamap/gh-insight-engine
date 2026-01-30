
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from root
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { LanguageCategoryAIService, type LanguageInput } from '@/services/LanguageCategoryAIService';

async function verifyAIClassification() {
    console.log('🚀 Starting AI Classification Verification...');

    // Mock data approximating user's scenario
    const languages: LanguageInput[] = [
        { name: 'TypeScript', bytes: 5000000 },
        { name: 'JavaScript', bytes: 2500000 },
        { name: 'CSS', bytes: 1500000 },
        { name: 'HTML', bytes: 1200000 },
        { name: 'Python', bytes: 800000 },
        { name: 'Shell', bytes: 50000 },
        { name: 'Dockerfile', bytes: 10000 },
        { name: 'Ruby', bytes: 5000 }
    ];

    console.log(`Input: ${languages.length} languages`);

    try {
        const result = await LanguageCategoryAIService.classifyLanguages(languages);
        console.log('\n✅ Classification Success!');
        console.log('Categories found:', result.categories.length);
        console.log('Mapped languages:', result.languageToCategories.length);

        console.log('\nResult Sample:');
        console.log(JSON.stringify(result, null, 2));

    } catch (error) {
        console.error('\n❌ Classification Failed:', error);
        process.exit(1);
    }
}

verifyAIClassification();
