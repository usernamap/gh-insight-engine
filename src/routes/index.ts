import { Router, Express } from 'express';
import authRoutes from './auth';
import userRoutes from './users';
import repositoryRoutes from './repositories';
import analyticsRoutes from './analytics';
import insightsRoutes from './insights';
import logger from '@/utils/logger';

/**
 * Configuration centralisée des routes API
 */
export const setupRoutes = (app: Express): void => {
  const apiRouter = Router();

  // Route de santé (health check)
  apiRouter.get('/health', (req, res) => {
    res.status(200).json({
      status: 'healthy',
      service: 'GitHub Insight Engine API',
      version: process.env.npm_package_version || '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    });
  });

  // Route ping simple
  apiRouter.get('/ping', (req, res) => {
    res.status(200).json({ message: 'pong', timestamp: new Date().toISOString() });
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

  // Route racine avec documentation basique
  app.get('/', (req, res) => {
    res.status(200).json({
      name: 'GitHub Insight Engine API',
      description: 'API REST pour l\'analyse en profondeur des données GitHub avec insights IA',
      version: process.env.npm_package_version || '1.0.0',
      documentation: {
        endpoints: {
          '/api/health': 'Health check du service',
          '/api/ping': 'Test de connectivité simple',
          '/api/auth/*': 'Authentification et gestion des tokens',
          '/api/users/*': 'Gestion des utilisateurs GitHub',
          '/api/repositories/*': 'Recherche et gestion des repositories',
          '/api/analytics/*': 'Analyses quantitatives et métriques',
          '/api/insights/*': 'Insights IA qualitatifs et recommandations',
        },
        authentication: {
          type: 'JWT Bearer Token',
          login: 'POST /api/auth/login avec GitHub Classic Token',
          refresh: 'POST /api/auth/refresh',
        },
        rateLimit: {
          global: '100 requêtes par 15 minutes par IP',
          auth: '5 tentatives de connexion par 15 minutes par IP',
          analysis: '10 analyses par heure par IP',
        },
        support: {
          github: process.env.GITHUB_REPOSITORY_URL || 'https://github.com/org/gh-insight-engine',
          documentation: '/docs (à venir)',
        },
      },
      timestamp: new Date().toISOString(),
    });
  });

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
