import { Router } from 'express';
import { RepoController } from '@/controllers';
import { optionalJWT, authenticateJWT, requireOwnership } from '@/middleware';
import { validateUserParams } from '@/middleware';

const router = Router();

/**
 * @route   POST /api/repositories/:username
 * @desc    Collecte et stockage des repositories d'un utilisateur (déclenche la récupération depuis l'API GitHub)
 * @access  Private (authentification requise - utilisateur ne peut collecter que ses propres repositories)
 */
router.post(
  '/:username',
  authenticateJWT,
  requireOwnership('username'),
  validateUserParams,
  RepoController.collectRepositoriesData,
);

/**
 * @route   GET /api/repositories/:username
 * @desc    Récupération des repositories depuis la base de données (consultation des données stockées)
 * @access  Public (authentification optionnelle - données complètes si propriétaire, publiques sinon)
 */
router.get(
  '/:username',
  optionalJWT,
  validateUserParams,
  RepoController.getUserRepositories,
);

export default router;
