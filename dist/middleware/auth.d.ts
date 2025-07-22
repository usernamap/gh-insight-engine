import { NextFunction, Request, Response } from 'express';
import { JWTPayload } from '@/types/github';
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                username: string;
                fullName: string;
                githubToken: string;
            };
            jwt?: JWTPayload;
        }
    }
}
export declare const validateGitHubToken: (req: Request, _res: Response, _next: NextFunction) => Promise<void>;
export declare const authenticateJWT: (req: Request, _res: Response, _next: NextFunction) => Promise<void>;
export declare const optionalJWT: (req: Request, _res: Response, _next: NextFunction) => Promise<void>;
export declare const generateJWT: (payload: {
    userId: string;
    username: string;
}) => string;
export declare const requireRole: (_roles: string[]) => (req: Request, _res: Response, _next: NextFunction) => Promise<void>;
export declare const requireOwnership: (paramName?: string) => (req: Request, _res: Response, _next: NextFunction) => Promise<void>;
export declare const userRateLimit: (options: {
    windowMs: number;
    maxRequests: number;
    skipSuccessfulRequests?: boolean;
}) => (req: Request, _res: Response, _next: NextFunction) => Promise<void>;
export declare const refreshGitHubValidation: (intervalMinutes?: number) => (req: Request, _res: Response, _next: NextFunction) => Promise<void>;
//# sourceMappingURL=auth.d.ts.map