import { Express, Request, Response, Router } from 'express';
import authRoutes from './auth';
import repositoryRoutes from './repositories';
import userRoutes from './users';
import summaryRoutes from './summary';
import aiRoutes from './ai';
import refreshRoutes from './refresh';
import logger from '@/utils/logger';

export const setupRoutes = (app: Express): void => {
  const apiRouter = Router();

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

  apiRouter.get('/ping', (_req: Request, res: Response) => {
    res.status(200).json({ message: 'pong', timestamp: new Date().toISOString() });
  });

  apiRouter.use('/auth', authRoutes);
  apiRouter.use('/users', userRoutes);
  apiRouter.use('/repositories', repositoryRoutes);
  apiRouter.use('/summary', summaryRoutes);
  apiRouter.use('/ai', aiRoutes);
  apiRouter.use('/refresh', refreshRoutes);

  app.use('/api', apiRouter);

  logger.info('Routes API configured', {
    routes: [
      '/api/health',
      '/api/ping',
      '/api/auth/login',
      '/api/users/{username} - Complete GitHub data',
      '/api/repositories/{username} - Repositories with DevOps analyses',
      '/api/summary/{username} - Ultra-complete analytics for portfolio/CV',
      '/api/ai/{username} - AI analyses: quality, security, performance',
      '/api/refresh/{username} - Complete user data update',
    ],
    totalRoutes: 8,
  });
};

export { authRoutes, userRoutes, repositoryRoutes, summaryRoutes, refreshRoutes };
