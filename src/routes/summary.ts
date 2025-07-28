import { Router } from 'express';
import { SummaryController } from '@/controllers/SummaryController';
import { authenticateJWT } from '@/middleware';

const router = Router();

/**
 * @route   GET /api/summary/:username
 * @desc    Generate a complete summary of a developer
 * @access  Private (authentication required - complete data if owner, private otherwise)
 */
router.get('/:username', authenticateJWT, SummaryController.getDeveloperSummary);

export default router;
