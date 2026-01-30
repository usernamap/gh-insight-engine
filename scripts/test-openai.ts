#!/usr/bin/env npx tsx
/**
 * OpenAI API Test Script
 * 
 * Tests the OpenAI configuration using the SSOT from the codebase.
 * Uses the same OpenAIConfig class and constants as the production code.
 * 
 * Usage: npx tsx scripts/test-openai.ts
 */

import 'dotenv/config';
import OpenAIConfig from '../src/config/openai.js';
import { OPENAI_CONSTANTS } from '../src/constants/openai.constants.js';

const ANSI = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    dim: '\x1b[2m',
};

function log(color: string, prefix: string, message: string) {
    console.log(`${color}[${prefix}]${ANSI.reset} ${message}`);
}

async function testOpenAI() {
    console.log('\n' + '='.repeat(60));
    console.log(`${ANSI.blue}OpenAI API Test Script (SSOT)${ANSI.reset}`);
    console.log('='.repeat(60) + '\n');

    // Step 1: Check environment variable
    log(ANSI.blue, 'CHECK', 'Checking OPENAI_API_KEY environment variable...');
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
        log(ANSI.red, 'FAIL', 'OPENAI_API_KEY is not set in environment');
        log(ANSI.dim, 'INFO', 'Set it with: export OPENAI_API_KEY=sk-...');
        process.exit(1);
    }

    log(ANSI.green, 'PASS', `OPENAI_API_KEY is set (${apiKey.substring(0, 7)}...${apiKey.substring(apiKey.length - 4)})`);

    // Step 2: Check config availability
    log(ANSI.blue, 'CHECK', 'Testing OpenAIConfig.isAvailable()...');

    const isAvailable = OpenAIConfig.isAvailable();
    if (!isAvailable) {
        log(ANSI.red, 'FAIL', 'OpenAIConfig.isAvailable() returned false');
        process.exit(1);
    }

    log(ANSI.green, 'PASS', 'OpenAI client is available');

    // Step 3: Get default config (with updated max_completion_tokens)
    log(ANSI.blue, 'CHECK', 'Testing OpenAIConfig.getDefaultConfig()...');

    const config = OpenAIConfig.getDefaultConfig();
    console.log(`${ANSI.dim}  - model: ${config.model}${ANSI.reset}`);
    console.log(`${ANSI.dim}  - max_completion_tokens: ${config.max_completion_tokens}${ANSI.reset}`);
    console.log(`${ANSI.dim}  - temperature: ${config.temperature}${ANSI.reset}`);

    // Verify the fix: should be max_completion_tokens, not max_tokens
    if ('max_tokens' in config) {
        log(ANSI.red, 'FAIL', 'Config still contains deprecated "max_tokens" field!');
        process.exit(1);
    }

    if (!('max_completion_tokens' in config)) {
        log(ANSI.red, 'FAIL', 'Config is missing "max_completion_tokens" field!');
        process.exit(1);
    }

    log(ANSI.green, 'PASS', 'Config uses correct "max_completion_tokens" parameter');

    // Step 4: Test actual connection
    log(ANSI.blue, 'CHECK', 'Testing OpenAIConfig.testConnection()...');

    try {
        const connectionResult = await OpenAIConfig.testConnection();

        if (connectionResult) {
            log(ANSI.green, 'PASS', 'OpenAI API connection successful');
        } else {
            log(ANSI.red, 'FAIL', 'testConnection() returned false');
            process.exit(1);
        }
    } catch (error) {
        log(ANSI.red, 'FAIL', `testConnection() threw: ${(error as Error).message}`);

        // Check for specific error types
        const errorMessage = (error as Error).message.toLowerCase();

        if (errorMessage.includes('max_tokens')) {
            log(ANSI.red, 'ERROR', 'Still getting max_tokens error! Fix not applied correctly.');
        } else if (errorMessage.includes('invalid_api_key')) {
            log(ANSI.yellow, 'HINT', 'Check your OPENAI_API_KEY is valid');
        } else if (errorMessage.includes('rate_limit')) {
            log(ANSI.yellow, 'HINT', 'Rate limited - wait and try again');
        } else if (errorMessage.includes('insufficient_quota')) {
            log(ANSI.yellow, 'HINT', 'OpenAI account has insufficient quota');
        }

        process.exit(1);
    }

    // Step 5: Test a minimal completion with max_completion_tokens
    log(ANSI.blue, 'CHECK', 'Testing minimal completion with max_completion_tokens...');

    try {
        const client = OpenAIConfig.getClient();

        if (!client) {
            log(ANSI.red, 'FAIL', 'OpenAI client is null');
            process.exit(1);
        }

        const randomId = Math.random().toString(36).substring(2, 8).toUpperCase();
        console.log(`${ANSI.dim}  - Random ID: ${randomId}${ANSI.reset}`);

        const response = await client.chat.completions.create({
            model: config.model,
            messages: [
                { role: 'user', content: `Please repeat exactly this verification code: ${randomId}` }
            ],
            max_completion_tokens: 1000,
            temperature: 1,
        });

        console.log(`${ANSI.dim}  - Full Choice: ${JSON.stringify(response.choices[0], null, 2)}${ANSI.reset}`);

        const content = response.choices[0]?.message?.content ?? '';
        console.log(`${ANSI.dim}  - Response: "${content}"${ANSI.reset}`);
        console.log(`${ANSI.dim}  - Tokens used: ${response.usage?.total_tokens ?? 'N/A'}${ANSI.reset}`);

        if (content.includes(randomId)) {
            log(ANSI.green, 'PASS', 'Completion returned correct random ID');
        } else {
            log(ANSI.red, 'FAIL', `Expected response to contain "${randomId}"`);
            process.exit(1);
        }
    } catch (error) {
        const errorMessage = (error as Error).message;
        log(ANSI.red, 'FAIL', `Completion failed: ${errorMessage}`);

        if (errorMessage.includes('max_tokens')) {
            log(ANSI.red, 'CRITICAL', 'The max_tokens parameter is still being rejected!');
        }

        process.exit(1);
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    log(ANSI.green, 'SUCCESS', 'All OpenAI API tests passed!');
    console.log('='.repeat(60) + '\n');

    console.log(`${ANSI.dim}Configuration verified:`);
    console.log(`  ✓ OPENAI_API_KEY is set`);
    console.log(`  ✓ OpenAIConfig.isAvailable() works`);
    console.log(`  ✓ getDefaultConfig() returns max_completion_tokens`);
    console.log(`  ✓ testConnection() succeeds`);
    console.log(`  ✓ Completion API works with max_completion_tokens${ANSI.reset}\n`);
}

// Run the test
testOpenAI().catch((error) => {
    log(ANSI.red, 'FATAL', `Unexpected error: ${error.message}`);
    process.exit(1);
});
