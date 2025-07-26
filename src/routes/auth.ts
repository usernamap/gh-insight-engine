import { Router } from 'express';
import { AuthController } from '@/controllers';
import { validateAuth } from '@/middleware';

const router = Router();

/**
 * @route   POST /api/auth/login
 * @desc    Authentification avec token GitHub et génération JWT
 * @access  Public
 * @body    { username: string, fullName: string, githubToken: string }
 */
router.post('/login', validateAuth, AuthController.login);

export default router;
