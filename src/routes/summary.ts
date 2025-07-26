import { Router } from 'express';
import { SummaryController } from '@/controllers/SummaryController';
import { optionalJWT } from '@/middleware';

const router = Router();

/**
 * Routes Summary - Analytics ultra-complets
 * Optimisé pour intégrations portfolio, CV et présentations
 */

/**
 * GET /api/summary/:username
 * Génère un summary ultra-complet d'un développeur
 *
 * Authentification: Optionnelle
 * - Sans auth: Données publiques avec analytics de base
 * - Avec auth (propriétaire): Données complètes + insights privés + données temps réel
 */
router.get(
  '/:username',
  optionalJWT, // Authentification optionnelle
  SummaryController.getDeveloperSummary,
);

export default router;
