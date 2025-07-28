import { Router } from 'express';
import { RefreshController } from '@/controllers/RefreshController';
import { authenticateJWT, validateUserParams } from '@/middleware';

const router = Router();

/**
 * @route   POST /api/refresh/:username
 * @desc    Complete user data update
 * @access  Private (authentication required - user can only refresh their own data)
 */
router.post('/:username', authenticateJWT, validateUserParams, RefreshController.refreshUserData);

/**
 * @route   GET /api/refresh/:username/status
 * @desc    Get refresh status for a user
 * @access  Private (authentication required - user can only check their own status)
 */
router.get(
  '/:username/status',
  authenticateJWT,
  validateUserParams,
  RefreshController.getRefreshStatus
);

export default router;
