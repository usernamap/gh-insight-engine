export * from './auth';
export * from './validation';
export * from './errorHandler';
import { Express } from 'express';
export declare const setupSecurityMiddlewares: (app: Express) => void;
export declare const setupLoggingMiddleware: (app: Express) => void;
export declare const setupRateLimiting: (app: Express) => void;
export declare const setupDataProcessingMiddlewares: (app: Express) => void;
export declare const setupErrorHandling: (app: Express) => void;
export declare const setupAllMiddlewares: (app: Express) => void;
import express from 'express';
export { express };
//# sourceMappingURL=index.d.ts.map