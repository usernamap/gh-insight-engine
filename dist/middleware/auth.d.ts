import { Request, Response, NextFunction } from 'express';
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
export declare const validateGitHubToken: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const authenticateJWT: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const optionalJWT: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const generateJWT: (payload: {
    userId: string;
    username: string;
}) => string;
export declare const requireRole: (roles: string[]) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const requireOwnership: (paramName?: string) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const userRateLimit: (options: {
    windowMs: number;
    maxRequests: number;
    skipSuccessfulRequests?: boolean;
}) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const refreshGitHubValidation: (intervalMinutes?: number) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=auth.d.ts.map