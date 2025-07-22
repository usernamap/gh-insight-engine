import { ErrorRequestHandler, NextFunction, Request, Response } from 'express';
export interface APIError extends Error {
    statusCode?: number;
    code?: string;
    details?: unknown;
    isOperational?: boolean;
}
export declare class ValidationError extends Error implements APIError {
    details?: unknown | undefined;
    statusCode: number;
    code: string;
    isOperational: boolean;
    constructor(message: string, details?: unknown | undefined);
}
export declare class AuthenticationError extends Error implements APIError {
    statusCode: number;
    code: string;
    isOperational: boolean;
    constructor(message?: string);
}
export declare class AuthorizationError extends Error implements APIError {
    statusCode: number;
    code: string;
    isOperational: boolean;
    constructor(message?: string);
}
export declare class NotFoundError extends Error implements APIError {
    statusCode: number;
    code: string;
    isOperational: boolean;
    constructor(resource?: string);
}
export declare class ConflictError extends Error implements APIError {
    statusCode: number;
    code: string;
    isOperational: boolean;
    constructor(message: string);
}
export declare class RateLimitError extends Error implements APIError {
    retryAfter?: number | undefined;
    statusCode: number;
    code: string;
    isOperational: boolean;
    constructor(message?: string, retryAfter?: number | undefined);
}
export declare class ExternalServiceError extends Error implements APIError {
    statusCode: number;
    code: string;
    isOperational: boolean;
    details?: unknown;
    constructor(service: string, originalError?: Error);
}
export declare class DatabaseError extends Error implements APIError {
    statusCode: number;
    code: string;
    isOperational: boolean;
    details?: unknown;
    constructor(message: string, originalError?: Error);
}
export declare const errorHandler: ErrorRequestHandler;
export declare const notFoundHandler: (req: Request, _res: Response, _next: NextFunction) => void;
export declare const setupGlobalErrorHandlers: () => void;
export declare const asyncHandler: (fn: (req: Request, _res: Response, _next: NextFunction) => Promise<Record<string, unknown> | void>) => (req: Request, _res: Response, _next: NextFunction) => void;
export declare const createError: {
    validation: (message: string, details?: unknown) => ValidationError;
    authentication: (message?: string) => AuthenticationError;
    authorization: (message?: string) => AuthorizationError;
    notFound: (resource?: string) => NotFoundError;
    conflict: (message: string) => ConflictError;
    rateLimit: (message?: string, retryAfter?: number) => RateLimitError;
    externalService: (service: string, originalError?: Error) => ExternalServiceError;
    database: (message: string, originalError?: Error) => DatabaseError;
};
//# sourceMappingURL=errorHandler.d.ts.map