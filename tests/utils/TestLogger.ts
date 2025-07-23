import chalk from 'chalk';

export interface TestStep {
    step: number;
    description: string;
    method: string;
    endpoint: string;
    expectedStatus: number;
    actualStatus?: number;
    duration?: number;
    error?: string;
    data?: any;
    headers?: Record<string, string>;
}

export interface TestSuite {
    name: string;
    description: string;
    steps: TestStep[];
    startTime: Date;
    endTime?: Date;
    duration?: number;
    passed: number;
    failed: number;
    total: number;
}

export class TestLogger {
    private static instance: TestLogger;
    private suites: TestSuite[] = [];
    private currentSuite: TestSuite | null = null;

    private constructor() { }

    public static getInstance(): TestLogger {
        if (!TestLogger.instance) {
            TestLogger.instance = new TestLogger();
        }
        return TestLogger.instance;
    }

    public startSuite(name: string, description: string): void {
        this.currentSuite = {
            name,
            description,
            steps: [],
            startTime: new Date(),
            passed: 0,
            failed: 0,
            total: 0
        };

        console.log('\n' + '='.repeat(80));
        console.log(chalk.blue.bold(`🧪 Test Suite: ${name}`));
        console.log(chalk.gray(`📝 Description: ${description}`));
        console.log(chalk.gray(`⏰ Started at: ${this.currentSuite.startTime.toISOString()}`));
        console.log('='.repeat(80));
    }

    public logStep(step: TestStep): void {
        if (!this.currentSuite) return;

        step.step = this.currentSuite.steps.length + 1;
        this.currentSuite.steps.push(step);
        this.currentSuite.total++;

        const statusColor = step.actualStatus === step.expectedStatus ? 'green' : 'red';
        const statusIcon = step.actualStatus === step.expectedStatus ? '✅' : '❌';

        if (step.actualStatus === step.expectedStatus) {
            this.currentSuite.passed++;
        } else {
            this.currentSuite.failed++;
        }

        console.log('\n' + '-'.repeat(60));
        console.log(chalk.cyan.bold(`Step ${step.step}: ${step.description}`));
        console.log(chalk.yellow(`🔗 ${step.method} ${step.endpoint}`));
        console.log(chalk[statusColor](`${statusIcon} Status: ${step.actualStatus} (expected: ${step.expectedStatus})`));

        if (step.duration) {
            console.log(chalk.gray(`⏱️  Duration: ${step.duration}ms`));
        }

        if (step.headers && Object.keys(step.headers).length > 0) {
            console.log(chalk.magenta('📋 Headers:'));
            Object.entries(step.headers).forEach(([key, value]) => {
                console.log(chalk.gray(`   ${key}: ${value}`));
            });
        }

        if (step.data) {
            console.log(chalk.blue('📊 Response Data:'));
            console.log(chalk.gray(JSON.stringify(step.data, null, 2)));
        }

        if (step.error) {
            console.log(chalk.red.bold('💥 Error:'));
            console.log(chalk.red(step.error));
        }
    }

    public endSuite(): void {
        if (!this.currentSuite) return;

        this.currentSuite.endTime = new Date();
        this.currentSuite.duration = this.currentSuite.endTime.getTime() - this.currentSuite.startTime.getTime();

        console.log('\n' + '='.repeat(80));
        console.log(chalk.blue.bold(`📊 Suite Summary: ${this.currentSuite.name}`));
        console.log(chalk.green(`✅ Passed: ${this.currentSuite.passed}`));
        console.log(chalk.red(`❌ Failed: ${this.currentSuite.failed}`));
        console.log(chalk.cyan(`📈 Total: ${this.currentSuite.total}`));
        console.log(chalk.yellow(`⏱️  Duration: ${this.currentSuite.duration}ms`));

        const successRate = (this.currentSuite.passed / this.currentSuite.total) * 100;
        const rateColor = successRate === 100 ? 'green' : successRate >= 80 ? 'yellow' : 'red';
        console.log(chalk[rateColor](`📊 Success Rate: ${successRate.toFixed(1)}%`));

        console.log('='.repeat(80));

        this.suites.push(this.currentSuite);
        this.currentSuite = null;
    }

    public logInfo(message: string, data?: any): void {
        console.log(chalk.blue(`ℹ️  ${message}`));
        if (data) {
            console.log(chalk.gray(JSON.stringify(data, null, 2)));
        }
    }

    public logWarning(message: string, data?: any): void {
        console.log(chalk.yellow(`⚠️  ${message}`));
        if (data) {
            console.log(chalk.gray(JSON.stringify(data, null, 2)));
        }
    }

    public logError(message: string, error?: any): void {
        console.log(chalk.red.bold(`💥 ${message}`));
        if (error) {
            console.log(chalk.red(error.toString()));
        }
    }

    public logSuccess(message: string, data?: any): void {
        console.log(chalk.green.bold(`🎉 ${message}`));
        if (data) {
            console.log(chalk.gray(JSON.stringify(data, null, 2)));
        }
    }

    public generateReport(): void {
        const totalSuites = this.suites.length;
        const totalTests = this.suites.reduce((sum, suite) => sum + suite.total, 0);
        const totalPassed = this.suites.reduce((sum, suite) => sum + suite.passed, 0);
        const totalFailed = this.suites.reduce((sum, suite) => sum + suite.failed, 0);
        const totalDuration = this.suites.reduce((sum, suite) => sum + (suite.duration || 0), 0);

        console.log('\n' + '█'.repeat(80));
        console.log(chalk.blue.bold.underline('🎯 FINAL TEST REPORT'));
        console.log('█'.repeat(80));
        console.log(chalk.cyan(`📦 Total Suites: ${totalSuites}`));
        console.log(chalk.cyan(`🧪 Total Tests: ${totalTests}`));
        console.log(chalk.green(`✅ Total Passed: ${totalPassed}`));
        console.log(chalk.red(`❌ Total Failed: ${totalFailed}`));
        console.log(chalk.yellow(`⏱️  Total Duration: ${totalDuration}ms`));

        const overallSuccessRate = totalTests > 0 ? (totalPassed / totalTests) * 100 : 0;
        const rateColor = overallSuccessRate === 100 ? 'green' : overallSuccessRate >= 80 ? 'yellow' : 'red';
        console.log(chalk[rateColor].bold(`📊 Overall Success Rate: ${overallSuccessRate.toFixed(1)}%`));

        console.log('\n' + chalk.blue.bold('📋 Suite Details:'));
        this.suites.forEach((suite, index) => {
            const suiteRate = (suite.passed / suite.total) * 100;
            const suiteColor = suiteRate === 100 ? 'green' : suiteRate >= 80 ? 'yellow' : 'red';
            console.log(chalk[suiteColor](`  ${index + 1}. ${suite.name}: ${suite.passed}/${suite.total} (${suiteRate.toFixed(1)}%)`));
        });

        console.log('█'.repeat(80));
    }

    public reset(): void {
        this.suites = [];
        this.currentSuite = null;
    }
}

export const testLogger = TestLogger.getInstance(); 