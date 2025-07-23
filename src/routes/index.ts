import { Express, Request, Response, Router } from 'express';
import analyticsRoutes from './analytics';
import authRoutes from './auth';
import insightsRoutes from './insights';
import repositoryRoutes from './repositories';
import userRoutes from './users';
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

  // Routes utilisateurs
  apiRouter.use('/users', userRoutes);

  // Routes repositories
  apiRouter.use('/repositories', repositoryRoutes);

  // Routes analytics (métriques quantitatives)
  // Note: Les routes d'analyse utilisateur sont dans analytics
  // car elles génèrent les données analytiques
  apiRouter.use('/analytics', analyticsRoutes);

  // Routes insights (analyses IA qualitatives)
  apiRouter.use('/insights', insightsRoutes);

  // Montage du router API sous le préfixe /api
  app.use('/api', apiRouter);

  // Log de la configuration des routes
  logger.info('Routes API configurées', {
    routes: [
      '/api/health',
      '/api/ping',
      '/api/auth/*',
      '/api/users/*',
      '/api/repositories/*',
      '/api/analytics/*',
      '/api/insights/*',
    ],
    totalRoutes: 7,
  });
};

// Export des routes individuelles pour les tests
export {
  authRoutes,
  userRoutes,
  repositoryRoutes,
  analyticsRoutes,
  insightsRoutes,
};
