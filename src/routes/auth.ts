import { Router } from 'express';
import { AuthController } from '@/controllers';
import { validateAuth, authenticateJWT } from '@/middleware';

const router = Router();

/**
 * @route   POST /api/auth/login
 * @desc    Authentication with GitHub token and JWT generation
 * @access  Private (authentication required)
 * @body    { username: string, fullName: string, githubToken: string }
 */
router.post('/login', validateAuth, AuthController.login);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user authentication status
 * @access  Private (authentication required)
 */
router.get('/me', authenticateJWT, AuthController.me);

export default router;
