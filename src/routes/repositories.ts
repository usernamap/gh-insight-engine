import { Router } from 'express';
import { RepoController } from '@/controllers';
import { authenticateJWT } from '@/middleware';
import { optionalJWT } from '@/middleware';
import { validateRepoParams } from '@/middleware';
import { validateRepoSearch } from '@/middleware';


const router = Router();

/**
 * @route   GET /api/repositories/search
 * @desc    Recherche de repositories avec filtres avancés
 * @access  Public
 * @query   { query?: string, language?: string, topic?: string, minStars?: number, minForks?: number, isPrivate?: boolean, isFork?: boolean, isArchived?: boolean, page?: number, limit?: number, sortBy?: string, sortOrder?: 'asc'|'desc' }
 */
router.get(
  '/search',
  optionalJWT,
  validateRepoSearch,
  RepoController.searchRepositories,
);

/**
 * @route   GET /api/repositories/languages/stats
 * @desc    Statistiques des langages de programmation
 * @access  Public
 */
router.get('/languages/stats', optionalJWT, RepoController.getLanguagesStats);

/**
 * @route   GET /api/repositories/trending
 * @desc    Repositories tendance par période et langage
 * @access  Public
 * @query   { period?: '1d'|'7d'|'30d', limit?: number, language?: string }
 */
router.get('/trending', optionalJWT, RepoController.getTrendingRepositories);

/**
 * @route   GET /api/repositories/:owner/:repo
 * @desc    Récupération des détails d'un repository
 * @access  Public
 */
router.get(
  '/:owner/:repo',
  optionalJWT,
  validateRepoParams,
  RepoController.getRepository,
);

/**
 * @route   POST /api/repositories/:owner/:repo/enrich
 * @desc    Enrichissement DevOps d'un repository
 * @access  Private (JWT requis pour accès aux données privées)
 */
router.post(
  '/:owner/:repo/enrich',
  authenticateJWT,
  validateRepoParams,
  RepoController.enrichRepository,
);

export default router;
