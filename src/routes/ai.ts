import { Router } from 'express';
import { AIController } from '@/controllers/AIController';
import { authenticateJWT, validateUserParams } from '@/middleware';

const router = Router();

/**
 * @route   GET /api/ai/status
 * @desc    Get the status of the AI service and its capabilities
 * @access  Private (authentication required)
 * @note    IMPORTANT: This route must be defined BEFORE /:username to avoid conflicts
 */
router.get('/status', authenticateJWT, AIController.getAIServiceStatus);

/**
 * @route   POST /api/ai/:username
 * @desc    Perform a complete AI analysis of a user
 * @access  Private (authentication required - user can only analyze their own profile)
 */
router.post('/:username', authenticateJWT, validateUserParams, AIController.performAIAnalysis);

/**
 * @route   GET /api/ai/:username
 * @desc    Get the existing AI analysis of a user
 * @access  Private (authentication required - complete data if owner, private otherwise)
 */
router.get('/:username', authenticateJWT, validateUserParams, AIController.getAIAnalysis);

/**
 * @route   DELETE /api/ai/:username
 * @desc    Supprime toutes les analyses IA d'un utilisateur
 * @access  Privé (authentification requise - l'utilisateur ne peut supprimer que ses propres analyses)
 */
router.delete('/:username', authenticateJWT, validateUserParams, AIController.deleteAIAnalysis);

export default router;
