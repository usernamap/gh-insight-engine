import { Router } from 'express';
import { AnalyticsController } from '@/controllers';
import {
    validateUserParams,
    validateAnalysisParams,
    validateUserAnalysis,
    authenticateJWT,
    optionalJWT,
    requireOwnership
} from '@/middleware';

const router = Router();

/**
 * @route   POST /api/users/:username/analyze
 * @desc    Lance une analyse complète d'un utilisateur (GitHub + Analytics)
 * @access  Private (JWT requis + ownership + rate limit analyse)
 * @query   { includePrivate?: boolean, forceRefresh?: boolean, maxAge?: number }
 */
router.post('/:username/analyze',
    // Rate limiting spécialisé pour les analyses (coûteuses)
    (req: any, res: any, next: any) => {
        const analysisLimiter = req.app.get('analysisLimiter');
        if (analysisLimiter) {
            analysisLimiter(req, res, next);
        } else {
            next();
        }
    },
    authenticateJWT,
    validateUserAnalysis,
    requireOwnership,
    AnalyticsController.analyzeUser
);

/**
 * @route   GET /api/analytics/:username/overview
 * @desc    Vue d'ensemble des métriques d'un utilisateur
 * @access  Public (mais données limitées sans auth)
 */
router.get('/:username/overview',
    optionalJWT,
    validateUserParams,
    AnalyticsController.getAnalyticsOverview
);

/**
 * @route   GET /api/analytics/:username/performance
 * @desc    Métriques de performance détaillées
 * @access  Public
 */
router.get('/:username/performance',
    optionalJWT,
    validateUserParams,
    AnalyticsController.getPerformanceMetrics
);

/**
 * @route   GET /api/analytics/:username/languages
 * @desc    Analyse des langages de programmation
 * @access  Public
 */
router.get('/:username/languages',
    optionalJWT,
    validateUserParams,
    AnalyticsController.getLanguageAnalytics
);

/**
 * @route   GET /api/analytics/:username/activity
 * @desc    Patterns d'activité et habitudes de développement
 * @access  Public
 */
router.get('/:username/activity',
    optionalJWT,
    validateUserParams,
    AnalyticsController.getActivityPatterns
);

/**
 * @route   GET /api/analytics/:username/productivity
 * @desc    Score de productivité et métriques associées
 * @access  Public
 */
router.get('/:username/productivity',
    optionalJWT,
    validateUserParams,
    AnalyticsController.getProductivityScore
);

/**
 * @route   GET /api/analytics/:username/devops
 * @desc    Maturité DevOps et pratiques de développement
 * @access  Public
 */
router.get('/:username/devops',
    optionalJWT,
    validateUserParams,
    AnalyticsController.getDevOpsMaturity
);

export default router; 