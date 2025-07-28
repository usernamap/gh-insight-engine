import { AuthenticatedUser } from '@/types';

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;

      validatedData?: {
        body?: Record<string, unknown>;
        query?: Record<string, unknown>;
        params?: Record<string, string>;
      };

      rateLimit?: {
        remaining: number;
        reset: Date;
        total: number;
      };
    }
  }
}
