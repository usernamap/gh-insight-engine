import { Router } from 'express';
import { UserController } from '@/controllers';
import {
    validateUserParams,
    validateUserSearch,
    validateUserWithPagination,
    validatePagination,
    authenticateJWT,
    optionalJWT,
    requireOwnership
} from '@/middleware';

const router = Router();

/**
 * @route   GET /api/users/search
 * @desc    Recherche d'utilisateurs avec filtres
 * @access  Public
 * @query   { query?: string, location?: string, language?: string, minFollowers?: number, minRepos?: number, page?: number, limit?: number, sortBy?: string, sortOrder?: 'asc'|'desc' }
 */
router.get('/search',
    optionalJWT,
    validateUserSearch,
    UserController.searchUsers
);

/**
 * @route   GET /api/users/stats
 * @desc    Statistiques globales des utilisateurs
 * @access  Public
 */
router.get('/stats',
    optionalJWT,
    UserController.getUsersStats
);

/**
 * @route   GET /api/users/:username
 * @desc    Récupération du profil d'un utilisateur
 * @access  Public
 */
router.get('/:username',
    optionalJWT,
    validateUserParams,
    UserController.getUserProfile
);

/**
 * @route   GET /api/users/:username/repositories
 * @desc    Récupération des repositories d'un utilisateur
 * @access  Public
 * @query   { page?: number, limit?: number, sortBy?: string, sortOrder?: 'asc'|'desc' }
 */
router.get('/:username/repositories',
    optionalJWT,
    validateUserWithPagination,
    UserController.getUserRepositories
);

/**
 * @route   GET /api/users/:username/status
 * @desc    Statut de l'analyse d'un utilisateur
 * @access  Public
 */
router.get('/:username/status',
    optionalJWT,
    validateUserParams,
    UserController.getUserAnalysisStatus
);

/**
 * @route   DELETE /api/users/:username
 * @desc    Suppression des données utilisateur (GDPR)
 * @access  Private (JWT requis + ownership)
 */
router.delete('/:username',
    authenticateJWT,
    validateUserParams,
    requireOwnership,
    UserController.deleteUserData
);

export default router; 