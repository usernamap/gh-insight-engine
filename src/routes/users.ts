import { Router } from 'express';
import { UserController } from '@/controllers';
import { optionalJWT, authenticateJWT, requireOwnership } from '@/middleware';
import { validateUserParams } from '@/middleware';

const router = Router();

/**
 * @route   POST /api/users/:username
 * @desc    Collecte et stockage des données GitHub d'un utilisateur (déclenche la récupération depuis l'API GitHub)
 * @access  Private (authentification requise - utilisateur ne peut collecter que ses propres données)
 */
router.post(
  '/:username',
  authenticateJWT,
  requireOwnership('username'),
  validateUserParams,
  UserController.collectUserData,
);

/**
 * @route   GET /api/users/:username
 * @desc    Récupération des données utilisateur depuis la base de données (consultation des données stockées)
 * @access  Public (authentification optionnelle - données complètes si propriétaire, publiques sinon)
 */
router.get(
  '/:username',
  optionalJWT,
  validateUserParams,
  UserController.getUserProfile,
);

export default router;
