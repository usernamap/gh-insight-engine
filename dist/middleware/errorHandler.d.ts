import { Request, Response, NextFunction, ErrorRequestHandler } from "express";
export interface APIError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
  isOperational?: boolean;
}
export declare class ValidationError extends Error implements APIError {
  details?: any | undefined;
  statusCode: number;
  code: string;
  isOperational: boolean;
  constructor(message: string, details?: any | undefined);
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
  constructor(service: string, originalError?: Error);
}
export declare class DatabaseError extends Error implements APIError {
  statusCode: number;
  code: string;
  isOperational: boolean;
  constructor(message: string, originalError?: Error);
}
export declare const errorHandler: ErrorRequestHandler;
export declare const notFoundHandler: (
  req: Request,
  res: Response,
  next: NextFunction,
) => void;
export declare const setupGlobalErrorHandlers: () => void;
export declare const asyncHandler: (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>,
) => (req: Request, res: Response, next: NextFunction) => void;
export declare const createError: {
  validation: (message: string, details?: any) => ValidationError;
  authentication: (message?: string) => AuthenticationError;
  authorization: (message?: string) => AuthorizationError;
  notFound: (resource?: string) => NotFoundError;
  conflict: (message: string) => ConflictError;
  rateLimit: (message?: string, retryAfter?: number) => RateLimitError;
  externalService: (
    service: string,
    originalError?: Error,
  ) => ExternalServiceError;
  database: (message: string, originalError?: Error) => DatabaseError;
};
//# sourceMappingURL=errorHandler.d.ts.map
