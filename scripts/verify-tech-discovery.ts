
// Set dummy API key BEFORE imports so config initializes
process.env.OPENAI_API_KEY = "mock_sk_1234567890";

import openaiConfig from '../src/config/openai';
import { AIClassificationService } from '../src/services/AIClassificationService';

async function main() {
    console.log('Starting Tech Discovery Verification (Mocked)...');

    // MOCK OpenAI Response
    const mockTechData = {
        categories: {
            "frontend": ["React", "Next.js", "Tailwind CSS"],
            "backend": ["Express", "Mongoose"],
            "database": ["PostgreSQL", "Redis"],
            "infra": ["Docker"]
        },
        raw_sources: {
            "React": ["demo-frontend/package.json"],
            "Next.js": ["demo-frontend/package.json"],
            "Express": ["demo-backend/package.json"],
            "PostgreSQL": ["demo-infra/docker-compose.yml"]
        },
        ignored_items: ["lodash", "chalk"]
    };

    // Monkey-patch getClient to return our mock
    // Using 'any' to bypass strict type checks for the mock
    const mockClient = {
        responses: {
            parse: async () => {
                console.log('🤖 Mock OpenAI called with inputs');
                return {
                    output_parsed: mockTechData
                };
            }
        },
        chat: {
            completions: {
                create: async () => {
                    // Fallback for other calls if any
                    return { choices: [{ message: { content: JSON.stringify(mockTechData) } }] }
                }
            }
        }
    };

    // Force override the private client or the getter
    // Since getClient returns the private client, and we can't easily set private field,
    // we override the method on the instance.
    (openaiConfig as any).getClient = () => mockClient;

    console.log('✅ OpenAI Config Mocked');

    const mockArtifacts = [
        {
            repoName: "demo-frontend",
            source: "manifest-file",
            path: "package.json",
            content: "..." // Content doesn't matter for mock response
        }
    ];

    try {
        console.log('Running AIClassificationService.refineTechnologyStack...');
        // We need to cast the input because the service expects RawArtifactInput locally defined
        const result = await AIClassificationService.refineTechnologyStack(mockArtifacts as any[]);

        console.log('\n--- VERIFICATION RESULT ---');
        console.log(JSON.stringify(result, null, 2));

        // Basic Assertions
        const cats = result.categories;
        if (
            cats['frontend']?.includes('React') &&
            cats['frontend']?.includes('Next.js')
        ) {
            console.log('✅ Frontend verification passed');
        } else {
            console.error('❌ Frontend verification failed');
            process.exit(1);
        }

        if (
            cats['database']?.includes('PostgreSQL')
        ) {
            console.log('✅ Database verification passed');
        } else {
            console.error('❌ Database verification failed');
            process.exit(1);
        }

        if (result.ignored_items?.includes('lodash')) {
            console.log('✅ Noise filtering verification passed');
        } else {
            console.warn('⚠️ Noise filtering verification warning');
        }

        console.log('🎉 ALL TESTS PASSED');

    } catch (error) {
        console.error('❌ Verification Failed:', error);
        process.exit(1);
    }
}

main();
