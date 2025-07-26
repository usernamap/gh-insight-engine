import { Router } from 'express';
import { RefreshController } from '@/controllers/RefreshController';
import { authenticateJWT } from '@/middleware/auth';
import { validateUserParams } from '@/middleware/validation';

const router = Router();

/**
 * Routes de refresh - Mise à jour complète des données utilisateur
 */

/**
 * @openapi
 * /api/refresh/{username}:
 *   post:
 *     summary: Rafraîchit toutes les données d'un utilisateur
 *     description: |
 *       Lance la mise à jour complète d'un utilisateur en enchaînant :
 *       1. Collecte des données utilisateur (POST /users/{username})
 *       2. Collecte des repositories (POST /repositories/{username})
 *       3. Analyse IA (POST /ai/{username})
 *
 *       Cette opération peut prendre plusieurs minutes. En cas d'échec partiel,
 *       les données collectées avec succès sont conservées.
 *     tags:
 *       - Refresh
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[a-zA-Z0-9]([a-zA-Z0-9_-]*[a-zA-Z0-9])?$'
 *           minLength: 1
 *           maxLength: 39
 *         description: Nom d'utilisateur GitHub
 *         example: octocat
 *     responses:
 *       200:
 *         description: Toutes les données ont été rafraîchies avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Toutes les données ont été rafraîchies avec succès"
 *                 username:
 *                   type: string
 *                   example: "octocat"
 *                 totalDuration:
 *                   type: number
 *                   description: Durée totale en millisecondes
 *                   example: 125000
 *                 steps:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       step:
 *                         type: string
 *                         enum: [users, repositories, ai]
 *                       success:
 *                         type: boolean
 *                       duration:
 *                         type: number
 *                         description: Durée de l'étape en millisecondes
 *                       error:
 *                         type: string
 *                         description: Message d'erreur si l'étape a échoué
 *                 completedSteps:
 *                   type: number
 *                   example: 3
 *       207:
 *         description: Succès partiel - Certaines étapes ont échoué
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Échec lors de l'étape 'ai': Erreur d'analyse"
 *                 username:
 *                   type: string
 *                   example: "octocat"
 *                 totalDuration:
 *                   type: number
 *                   example: 95000
 *                 steps:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       step:
 *                         type: string
 *                         enum: [users, repositories, ai]
 *                       success:
 *                         type: boolean
 *                       duration:
 *                         type: number
 *                       error:
 *                         type: string
 *                 completedSteps:
 *                   type: number
 *                   example: 2
 *                 failedAt:
 *                   type: string
 *                   example: "ai"
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Non autorisé - vous ne pouvez rafraîchir que vos propres données
 *       500:
 *         description: Erreur serveur - Échec complet
 */
router.post(
  '/:username',
  authenticateJWT,
  validateUserParams,
  RefreshController.refreshUserData,
);

export default router;
