/**
 * Extension des types Express pour notre application
 */

import { AuthenticatedUser } from './github';

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;

      // Extensions pour la validation des données
      validatedData?: {
        body?: Record<string, unknown>;
        query?: Record<string, unknown>;
        params?: Record<string, string>;
      };

      // Extensions pour le rate limiting
      rateLimit?: {
        remaining: number;
        reset: Date;
        total: number;
      };
    }
  }
}
