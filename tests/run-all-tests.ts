#!/usr/bin/env tsx

import { spawn } from 'child_process';
import path from 'path';
import { testLogger } from './utils/TestLogger';

interface TestSuite {
    name: string;
    file: string;
    description: string;
    critical: boolean;
}

const testSuites: TestSuite[] = [
    {
        name: 'System Endpoints',
        file: '01-system.test.ts',
        description: 'Tests des endpoints système (health, ping)',
        critical: true
    },
    {
        name: 'Authentication',
        file: '02-authentication.test.ts',
        description: 'Tests complets du flow d\'authentification',
        critical: true
    },
    {
        name: 'Users',
        file: '03-users.test.ts',
        description: 'Tests des endpoints utilisateurs',
        critical: true
    },
    {
        name: 'Repositories',
        file: '04-repositories.test.ts',
        description: 'Tests des endpoints repositories',
        critical: true
    },
    {
        name: 'Analytics',
        file: '05-analytics.test.ts',
        description: 'Tests des endpoints analytics',
        critical: true
    },
    {
        name: 'Insights',
        file: '06-insights.test.ts',
        description: 'Tests des endpoints insights IA',
        critical: true
    },
    {
        name: 'Integration',
        file: '07-integration.test.ts',
        description: 'Tests d\'intégration et validation OpenAPI',
        critical: true
    }
];

interface TestResult {
    suite: TestSuite;
    success: boolean;
    duration: number;
    output: string;
    error?: string;
}

class TestRunner {
    private results: TestResult[] = [];
    private startTime: Date;

    constructor() {
        this.startTime = new Date();
    }

    async runAllTests(): Promise<void> {
        console.log('🚀 Démarrage de la pipeline de tests GitHub Insight Engine API');
        console.log('='.repeat(80));

        testLogger.logInfo(`Début des tests: ${this.startTime.toISOString()}`);
        testLogger.logInfo(`Total des suites de tests: ${testSuites.length}`);

        // Afficher le plan de test
        this.displayTestPlan();

        // Exécuter chaque suite de tests
        for (let i = 0; i < testSuites.length; i++) {
            const suite = testSuites[i];
            const result = await this.runTestSuite(suite, i + 1);
            this.results.push(result);

            // Si un test critique échoue, arrêter l'exécution
            if (!result.success && suite.critical) {
                testLogger.logError(`Test critique échoué: ${suite.name}. Arrêt de la pipeline.`);
                break;
            }
        }

        // Générer le rapport final
        this.generateFinalReport();
    }

    private displayTestPlan(): void {
        testLogger.logInfo('\n📋 Plan de test:');
        testSuites.forEach((suite, index) => {
            const criticalIcon = suite.critical ? '🔴' : '🟡';
            testLogger.logInfo(`  ${index + 1}. ${criticalIcon} ${suite.name} - ${suite.description}`);
        });
        testLogger.logInfo('\n🔴 = Critique (arrête la pipeline en cas d\'échec)');
        testLogger.logInfo('🟡 = Non-critique (continue même en cas d\'échec)\n');
    }

    private async runTestSuite(suite: TestSuite, index: number): Promise<TestResult> {
        const startTime = Date.now();

        testLogger.logInfo(`\n[${index}/${testSuites.length}] 🧪 Exécution: ${suite.name}`);
        testLogger.logInfo(`📝 Description: ${suite.description}`);
        testLogger.logInfo(`🔧 Fichier: ${suite.file}`);

        return new Promise((resolve) => {
            const testFile = path.join(__dirname, suite.file);
            const jestProcess = spawn('npx', ['jest', testFile, '--verbose', '--no-cache'], {
                stdio: ['pipe', 'pipe', 'pipe'],
                cwd: process.cwd()
            });

            let output = '';
            let errorOutput = '';

            jestProcess.stdout?.on('data', (data) => {
                output += data.toString();
            });

            jestProcess.stderr?.on('data', (data) => {
                errorOutput += data.toString();
            });

            jestProcess.on('close', (code) => {
                const duration = Date.now() - startTime;
                const success = code === 0;

                const result: TestResult = {
                    suite,
                    success,
                    duration,
                    output: output + errorOutput,
                    error: success ? undefined : errorOutput
                };

                if (success) {
                    testLogger.logSuccess(`✅ ${suite.name} - Réussi en ${duration}ms`);
                } else {
                    testLogger.logError(`❌ ${suite.name} - Échoué en ${duration}ms`);
                    if (errorOutput) {
                        testLogger.logError('Erreur:', errorOutput.substring(0, 500) + '...');
                    }
                }

                resolve(result);
            });

            jestProcess.on('error', (error) => {
                const duration = Date.now() - startTime;
                testLogger.logError(`💥 Erreur lors de l'exécution de ${suite.name}:`, error);

                resolve({
                    suite,
                    success: false,
                    duration,
                    output: '',
                    error: error.message
                });
            });
        });
    }

    private generateFinalReport(): void {
        const endTime = new Date();
        const totalDuration = endTime.getTime() - this.startTime.getTime();

        const successful = this.results.filter(r => r.success).length;
        const failed = this.results.filter(r => !r.success).length;
        const total = this.results.length;

        const criticalTests = this.results.filter(r => r.suite.critical);
        const criticalPassed = criticalTests.filter(r => r.success).length;
        const criticalFailed = criticalTests.filter(r => !r.success).length;

        console.log('\n' + '█'.repeat(80));
        console.log('🎯 RAPPORT FINAL DE LA PIPELINE DE TESTS');
        console.log('█'.repeat(80));

        // Résumé global
        testLogger.logInfo(`⏰ Durée totale: ${this.formatDuration(totalDuration)}`);
        testLogger.logInfo(`📊 Tests exécutés: ${total}`);
        testLogger.logSuccess(`✅ Réussis: ${successful}`);
        if (failed > 0) {
            testLogger.logError(`❌ Échoués: ${failed}`);
        }

        // Statut des tests critiques
        console.log('\n🔴 TESTS CRITIQUES:');
        testLogger.logInfo(`📊 Total: ${criticalTests.length}`);
        testLogger.logSuccess(`✅ Réussis: ${criticalPassed}`);
        if (criticalFailed > 0) {
            testLogger.logError(`❌ Échoués: ${criticalFailed}`);
        }

        // Détail par suite
        console.log('\n📋 DÉTAIL PAR SUITE:');
        this.results.forEach((result, index) => {
            const icon = result.success ? '✅' : '❌';
            const criticalIcon = result.suite.critical ? '🔴' : '🟡';
            const duration = this.formatDuration(result.duration);

            console.log(`  ${index + 1}. ${icon} ${criticalIcon} ${result.suite.name} (${duration})`);

            if (!result.success && result.error) {
                console.log(`     💥 ${result.error.split('\n')[0]}`);
            }
        });

        // Statut final
        const overallSuccess = criticalFailed === 0;
        const successRate = (successful / total) * 100;

        console.log('\n' + '='.repeat(80));
        if (overallSuccess) {
            testLogger.logSuccess(`🎉 PIPELINE RÉUSSIE! (${successRate.toFixed(1)}% de réussite)`);
            console.log('✨ Tous les tests critiques sont passés avec succès.');
            console.log('🚀 L\'API est prête pour le déploiement!');
        } else {
            testLogger.logError(`💥 PIPELINE ÉCHOUÉE! (${successRate.toFixed(1)}% de réussite)`);
            console.log('🔧 Des tests critiques ont échoué. Correction requise avant déploiement.');
        }

        console.log('='.repeat(80));

        // Code de sortie
        process.exit(overallSuccess ? 0 : 1);
    }

    private formatDuration(ms: number): string {
        if (ms < 1000) {
            return `${ms}ms`;
        } else if (ms < 60000) {
            return `${(ms / 1000).toFixed(1)}s`;
        } else {
            const minutes = Math.floor(ms / 60000);
            const seconds = Math.floor((ms % 60000) / 1000);
            return `${minutes}m ${seconds}s`;
        }
    }
}

// Exécution du script
async function main(): Promise<void> {
    try {
        const runner = new TestRunner();
        await runner.runAllTests();
    } catch (error) {
        testLogger.logError('Erreur fatale lors de l\'exécution des tests:', error);
        process.exit(1);
    }
}

// Gestion des signaux pour un arrêt propre
process.on('SIGINT', () => {
    testLogger.logWarning('Interruption détectée. Arrêt de la pipeline...');
    process.exit(130);
});

process.on('SIGTERM', () => {
    testLogger.logWarning('Terminaison détectée. Arrêt de la pipeline...');
    process.exit(143);
});

// Exécuter si ce script est appelé directement
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { TestRunner }; 