import { Router } from 'express';
import { RepoController } from '@/controllers';
import { authenticateJWT, requireOwnership, validateUserParams } from '@/middleware';

const router = Router();

/**
 * @route   POST /api/repositories/:username
 * @desc    Collect and store repositories of a user (triggers the retrieval from the GitHub API)
 * @access  Private (authentication required - user can only collect their own repositories)
 */
router.post(
  '/:username',
  authenticateJWT,
  requireOwnership('username'),
  validateUserParams,
  RepoController.collectRepositoriesData
);

/**
 * @route   GET /api/repositories/:username/status
 * @desc    Get the status of repository collection for a user
 * @access  Private (authentication required - user can only check their own status)
 */
router.get(
  '/:username/status',
  authenticateJWT,
  requireOwnership('username'),
  validateUserParams,
  RepoController.getCollectionStatus
);

/**
 * @route   GET /api/repositories/:username
 * @desc    Retrieval of repositories from the database (consultation of stored data)
 * @access  Private (authentication required -  complete data if owner, private otherwise)
 */
router.get('/:username', authenticateJWT, validateUserParams, RepoController.getUserRepositories);

/**
 * @route   DELETE /api/repositories/:username
 * @desc    Delete all repositories of a user from the database
 * @access  Private (authentication required - user can only delete their own repositories)
 */
router.delete(
  '/:username',
  authenticateJWT,
  requireOwnership('username'),
  validateUserParams,
  RepoController.deleteUserRepositories
);

export default router;
