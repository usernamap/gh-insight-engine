import { Router } from 'express';
import { UserController } from '@/controllers';
import { authenticateJWT, requireOwnership, validateUserParams } from '@/middleware';

const router = Router();

/**
 * @route   POST /api/users/:username
 * @desc    Collect and store GitHub data of a user (triggers the retrieval from the GitHub API)
 * @access  Private (authentication required - user can only collect their own data)
 */
router.post(
  '/:username',
  authenticateJWT,
  requireOwnership('username'),
  validateUserParams,
  UserController.collectUserData
);

/**
 * @route   GET /api/users/:username
 * @desc    Retrieval of user data from the database (consultation of stored data)
 * @access  Private (authentication required - complete data if owner, private otherwise)
 */
router.get('/:username', authenticateJWT, validateUserParams, UserController.getUserProfile);

/**
 * @route   DELETE /api/users/:username
 * @desc    Delete user and all associated data (repositories, AI analyses)
 * @access  Private (authentication required - user can only delete their own data)
 */
router.delete(
  '/:username',
  authenticateJWT,
  requireOwnership('username'),
  validateUserParams,
  UserController.deleteUserData
);

export default router;
