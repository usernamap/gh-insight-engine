import { Router } from 'express';
import { AIController } from '@/controllers/AIController';
import { optionalJWT, authenticateJWT } from '@/middleware';
import { validateUserParams } from '@/middleware';

const router = Router();

/**
 * Routes AI - Analyses avancées avec Intelligence Artificielle
 * Fournit les métriques IA: qualité, vulnérabilités, bugs, performances
 */

/**
 * @route   GET /api/ai/status
 * @desc    Récupère le statut du service IA et ses capacités
 * @access  Public
 * @note    IMPORTANT: Cette route doit être définie AVANT /:username pour éviter les conflits
 */
router.get(
  '/status',
  AIController.getAIServiceStatus,
);

/**
 * @route   POST /api/ai/:username
 * @desc    Lance une nouvelle analyse IA complète d'un utilisateur
 * @access  Private (authentification requise - utilisateur ne peut analyser que son propre profil)
 */
router.post(
  '/:username',
  authenticateJWT,
  validateUserParams,
  AIController.performAIAnalysis,
);

/**
 * @route   GET /api/ai/:username
 * @desc    Récupère l'analyse IA existante d'un utilisateur
 * @access  Public (authentification optionnelle - données complètes si propriétaire, publiques sinon)
 */
router.get(
  '/:username',
  optionalJWT,
  validateUserParams,
  AIController.getAIAnalysis,
);

export default router;
