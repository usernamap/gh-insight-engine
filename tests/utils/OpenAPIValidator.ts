import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { testLogger } from './TestLogger';

export interface OpenAPISpec {
    openapi: string;
    info: {
        title: string;
        version: string;
    };
    paths: Record<string, any>;
    components: {
        schemas: Record<string, any>;
        responses: Record<string, any>;
    };
}

export interface EndpointInfo {
    path: string;
    method: string;
    operationId: string;
    summary: string;
    expectedStatus: number[];
    parameters?: any[];
    requestBody?: any;
    responses: Record<string, any>;
    security?: any[];
}

export interface ValidationResult {
    isValid: boolean;
    coverage: {
        totalEndpoints: number;
        testedEndpoints: number;
        coveragePercentage: number;
    };
    missingTests: EndpointInfo[];
    extraTests: string[];
    errors: string[];
    warnings: string[];
}

export class OpenAPIValidator {
    private spec: OpenAPISpec;
    private testedEndpoints: Set<string> = new Set();

    constructor(specPath: string = 'openapi.yaml') {
        this.loadSpec(specPath);
    }

    private loadSpec(specPath: string): void {
        try {
            const fullPath = path.resolve(process.cwd(), specPath);
            const fileContent = fs.readFileSync(fullPath, 'utf8');
            this.spec = yaml.load(fileContent) as OpenAPISpec;
            testLogger.logInfo(`Spécification OpenAPI chargée: ${this.spec.info.title} v${this.spec.info.version}`);
        } catch (error) {
            testLogger.logError('Erreur lors du chargement de la spécification OpenAPI', error);
            throw new Error(`Cannot load OpenAPI spec from ${specPath}: ${error}`);
        }
    }

    public getAllEndpoints(): EndpointInfo[] {
        const endpoints: EndpointInfo[] = [];

        for (const [path, pathItem] of Object.entries(this.spec.paths)) {
            for (const [method, operationRaw] of Object.entries(pathItem)) {
                // Vérification stricte du typage et null
                const operation = operationRaw as Record<string, unknown> | null;
                if (
                    operation &&
                    typeof operation === 'object' &&
                    'operationId' in operation &&
                    typeof operation.operationId === 'string'
                ) {
                    const expectedStatus = this.extractExpectedStatuses((operation as any).responses);

                    endpoints.push({
                        path,
                        method: method.toUpperCase(),
                        operationId: (operation as any).operationId,
                        summary: (operation as any).summary || '',
                        expectedStatus,
                        parameters: (operation as any).parameters,
                        requestBody: (operation as any).requestBody,
                        responses: (operation as any).responses,
                        security: (operation as any).security
                    });
                }
            }
        }

        return endpoints;
    }

    private extractExpectedStatuses(responses: Record<string, any>): number[] {
        return Object.keys(responses)
            .filter(status => status !== 'default')
            .map(status => parseInt(status, 10))
            .filter(status => !isNaN(status));
    }

    public registerTestedEndpoint(method: string, path: string): void {
        const key = `${method.toUpperCase()} ${path}`;
        this.testedEndpoints.add(key);
    }

    public validateEndpoint(method: string, path: string, expectedStatus: number): {
        isValid: boolean;
        errors: string[];
        warnings: string[];
    } {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Trouver l'endpoint dans la spec
        const normalizedPath = this.normalizePath(path);
        const pathItem = this.spec.paths[normalizedPath];

        if (!pathItem) {
            // Essayer de trouver un path avec des paramètres
            const matchingPath = this.findMatchingPath(path);
            if (!matchingPath) {
                errors.push(`Path not found in OpenAPI spec: ${path}`);
                return { isValid: false, errors, warnings };
            }
        }

        const operation = pathItem?.[method.toLowerCase()];
        if (!operation) {
            errors.push(`Method ${method} not allowed for path ${path}`);
            return { isValid: false, errors, warnings };
        }

        // Vérifier le status code
        const expectedStatuses = this.extractExpectedStatuses(operation.responses);
        if (!expectedStatuses.includes(expectedStatus)) {
            warnings.push(`Status ${expectedStatus} not documented for ${method} ${path}. Expected: ${expectedStatuses.join(', ')}`);
        }

        // Vérifier la sécurité
        if (operation.security && operation.security.length > 0) {
            const requiresAuth = operation.security.some((sec: any) => Object.keys(sec).length > 0);
            if (requiresAuth) {
                warnings.push(`Endpoint ${method} ${path} requires authentication according to spec`);
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    private normalizePath(path: string): string {
        // Remplacer les paramètres de path par leur pattern OpenAPI
        return path.replace(/\/[^\/]+\/([^\/]*)/g, (match, segment) => {
            // Si le segment contient des caractères non-alphanumériques, c'est probablement un paramètre
            if (/^[a-zA-Z0-9_-]+$/.test(segment)) {
                return match;
            }
            return `/{${segment}}`;
        });
    }

    private findMatchingPath(testPath: string): string | null {
        const testSegments = testPath.split('/').filter(Boolean);

        for (const specPath of Object.keys(this.spec.paths)) {
            const specSegments = specPath.split('/').filter(Boolean);

            if (testSegments.length !== specSegments.length) {
                continue;
            }

            let matches = true;
            for (let i = 0; i < testSegments.length; i++) {
                const testSegment = testSegments[i];
                const specSegment = specSegments[i];

                // Si c'est un paramètre dans la spec ({param}), ça match toujours
                if (specSegment.startsWith('{') && specSegment.endsWith('}')) {
                    continue;
                }

                // Sinon, doit être identique
                if (testSegment !== specSegment) {
                    matches = false;
                    break;
                }
            }

            if (matches) {
                return specPath;
            }
        }

        return null;
    }

    public generateValidationReport(): ValidationResult {
        const allEndpoints = this.getAllEndpoints();
        const totalEndpoints = allEndpoints.length;
        const testedEndpoints = this.testedEndpoints.size;
        const coveragePercentage = totalEndpoints > 0 ? (testedEndpoints / totalEndpoints) * 100 : 0;

        // Trouver les endpoints manquants
        const missingTests: EndpointInfo[] = [];
        for (const endpoint of allEndpoints) {
            const key = `${endpoint.method} ${endpoint.path}`;
            if (!this.testedEndpoints.has(key)) {
                missingTests.push(endpoint);
            }
        }

        // Trouver les tests supplémentaires (non documentés)
        const extraTests: string[] = [];
        for (const testedEndpoint of this.testedEndpoints) {
            const [method, path] = testedEndpoint.split(' ', 2);
            const matchingPath = this.findMatchingPath(path) || path;
            const pathItem = this.spec.paths[matchingPath];

            if (!pathItem || !pathItem[method.toLowerCase()]) {
                extraTests.push(testedEndpoint);
            }
        }

        const errors: string[] = [];
        const warnings: string[] = [];

        // Analyser la couverture
        if (coveragePercentage < 80) {
            warnings.push(`Low test coverage: ${coveragePercentage.toFixed(1)}% (recommended: >80%)`);
        }

        if (missingTests.length > 0) {
            warnings.push(`${missingTests.length} endpoints are not tested`);
        }

        if (extraTests.length > 0) {
            warnings.push(`${extraTests.length} tests for undocumented endpoints`);
        }

        return {
            isValid: errors.length === 0,
            coverage: {
                totalEndpoints,
                testedEndpoints,
                coveragePercentage
            },
            missingTests,
            extraTests,
            errors,
            warnings
        };
    }

    public generateCoverageReport(): void {
        const report = this.generateValidationReport();

        testLogger.logInfo('='.repeat(80));
        testLogger.logInfo('📊 OPENAPI VALIDATION REPORT');
        testLogger.logInfo('='.repeat(80));

        // Couverture globale
        testLogger.logInfo(`📈 Coverage: ${report.coverage.testedEndpoints}/${report.coverage.totalEndpoints} endpoints (${report.coverage.coveragePercentage.toFixed(1)}%)`);

        if (report.coverage.coveragePercentage >= 90) {
            testLogger.logSuccess('🎉 Excellent coverage!');
        } else if (report.coverage.coveragePercentage >= 80) {
            testLogger.logWarning('⚠️  Good coverage, but could be improved');
        } else {
            testLogger.logError('❌ Low coverage - more tests needed');
        }

        // Endpoints manquants
        if (report.missingTests.length > 0) {
            testLogger.logWarning(`\n🔍 Missing Tests (${report.missingTests.length}):`);
            report.missingTests.forEach(endpoint => {
                testLogger.logWarning(`  • ${endpoint.method} ${endpoint.path} - ${endpoint.summary}`);
            });
        }

        // Tests supplémentaires
        if (report.extraTests.length > 0) {
            testLogger.logInfo(`\n📝 Extra Tests (${report.extraTests.length}):`);
            report.extraTests.forEach(test => {
                testLogger.logInfo(`  • ${test}`);
            });
        }

        // Erreurs
        if (report.errors.length > 0) {
            testLogger.logError(`\n❌ Errors (${report.errors.length}):`);
            report.errors.forEach(error => {
                testLogger.logError(`  • ${error}`);
            });
        }

        // Avertissements
        if (report.warnings.length > 0) {
            testLogger.logWarning(`\n⚠️  Warnings (${report.warnings.length}):`);
            report.warnings.forEach(warning => {
                testLogger.logWarning(`  • ${warning}`);
            });
        }

        testLogger.logInfo('='.repeat(80));
    }

    public validateSchema(data: any, schemaName: string): {
        isValid: boolean;
        errors: string[];
    } {
        const errors: string[] = [];

        if (!this.spec.components?.schemas?.[schemaName]) {
            errors.push(`Schema '${schemaName}' not found in OpenAPI spec`);
            return { isValid: false, errors };
        }

        const schema = this.spec.components.schemas[schemaName];

        // Validation basique des propriétés requises
        if (schema.required && Array.isArray(schema.required)) {
            for (const requiredProp of schema.required) {
                if (!(requiredProp in data)) {
                    errors.push(`Missing required property: ${requiredProp}`);
                }
            }
        }

        // Validation des types de propriétés
        if (schema.properties) {
            for (const [propName, propSchema] of Object.entries(schema.properties as Record<string, any>)) {
                if (propName in data) {
                    const value = data[propName];
                    const expectedType = propSchema.type;

                    if (expectedType && typeof value !== expectedType && expectedType !== 'any') {
                        // Cas spéciaux
                        if (expectedType === 'integer' && typeof value === 'number' && Number.isInteger(value)) {
                            continue;
                        }
                        if (expectedType === 'array' && !Array.isArray(value)) {
                            errors.push(`Property '${propName}' should be an array, got ${typeof value}`);
                        } else if (expectedType !== 'array' && typeof value !== expectedType) {
                            errors.push(`Property '${propName}' should be ${expectedType}, got ${typeof value}`);
                        }
                    }
                }
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    public getEndpointsByTag(tag: string): EndpointInfo[] {
        return this.getAllEndpoints().filter(endpoint => {
            const pathItem = this.spec.paths[endpoint.path];
            const operation = pathItem?.[endpoint.method.toLowerCase()];
            return operation?.tags?.includes(tag);
        });
    }

    public getSecurityRequirements(method: string, path: string): string[] {
        const pathItem = this.spec.paths[path];
        const operation = pathItem?.[method.toLowerCase()];

        if (!operation?.security) {
            return [];
        }

        const requirements: string[] = [];
        for (const securityItem of operation.security) {
            requirements.push(...Object.keys(securityItem));
        }

        return requirements;
    }
}

export const openAPIValidator = new OpenAPIValidator(); 