import { Express, Request, Response, Router } from 'express';
import authRoutes from './auth';
import repositoryRoutes from './repositories';
import userRoutes from './users';
import summaryRoutes from './summary';
import aiRoutes from './ai';
import refreshRoutes from './refresh';
import logger from '@/utils/logger';

/**
 * Configuration centralisée des routes API
 */
export const setupRoutes = (app: Express): void => {
  const apiRouter = Router();

  // Route de santé (health check)
  apiRouter.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'healthy',
      service: 'GitHub Insight Engine API',
      version: process.env.npm_package_version ?? '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV ?? 'development',
    });
  });

  // Route ping simple
  apiRouter.get('/ping', (_req: Request, res: Response) => {
    res
      .status(200)
      .json({ message: 'pong', timestamp: new Date().toISOString() });
  });

  // Routes d'authentification
  apiRouter.use('/auth', authRoutes);

  // Routes utilisateurs - Endpoint unique pour toutes les données GitHub d'un utilisateur
  apiRouter.use('/users', userRoutes);

  // Routes repositories - Endpoint unique pour tous les repositories d'un utilisateur avec analyses complètes
  apiRouter.use('/repositories', repositoryRoutes);

  // Routes summary - Analytics ultra-complets pour intégrations portfolio/CV
  apiRouter.use('/summary', summaryRoutes);

  // Routes AI - Analyses avancées avec Intelligence Artificielle
  apiRouter.use('/ai', aiRoutes);

  // Routes refresh - Mise à jour complète des données utilisateur
  apiRouter.use('/refresh', refreshRoutes);

  // Montage du router API sous le préfixe /api
  app.use('/api', apiRouter);

  // Log de la configuration des routes
  logger.info('Routes API configurées', {
    routes: [
      '/api/health',
      '/api/ping',
      '/api/auth/login',
      '/api/users/{username} - Données GitHub complètes',
      '/api/repositories/{username} - Repositories avec analyses DevOps',
      '/api/summary/{username} - Analytics ultra-complets pour portfolio/CV',
      '/api/ai/{username} - Analyses IA: qualité, sécurité, performances',
      '/api/refresh/{username} - Mise à jour complète des données utilisateur',
    ],
    totalRoutes: 8,
  });
};

// Export des routes individuelles pour les tests
export {
  authRoutes,
  userRoutes,
  repositoryRoutes,
  summaryRoutes,
  refreshRoutes,
};
