import { Router } from 'express';
import { AuthController } from '@/controllers';
import { authenticateJWT } from '@/middleware';
import { validateAuth } from '@/middleware';

const router = Router();

/**
 * @route   POST /api/auth/login
 * @desc    Authentification avec token GitHub et génération JWT
 * @access  Public
 * @body    { username: string, fullName: string, githubToken: string }
 */
router.post('/login', validateAuth, AuthController.login);

/**
 * @route   POST /api/auth/refresh
 * @desc    Rafraîchissement du token JWT
 * @access  Private (JWT requis)
 */
router.post('/refresh', authenticateJWT, AuthController.refresh);

/**
 * @route   DELETE /api/auth/logout
 * @desc    Déconnexion (invalidation côté client)
 * @access  Private (JWT requis)
 */
router.delete('/logout', authenticateJWT, AuthController.logout);

/**
 * @route   GET /api/auth/validate
 * @desc    Validation du token GitHub actuel
 * @access  Private (JWT requis)
 */
router.get('/validate', authenticateJWT, AuthController.validateToken);

/**
 * @route   GET /api/auth/me
 * @desc    Information sur l'utilisateur connecté
 * @access  Private (JWT requis)
 */
router.get('/me', authenticateJWT, AuthController.getCurrentUser);

export default router;
