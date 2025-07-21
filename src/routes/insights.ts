import { Router } from 'express';
import { InsightsController } from '@/controllers';
import {
    validateUserParams,
    authenticateJWT,
    optionalJWT,
    requireOwnership
} from '@/middleware';

const router = Router();

/**
 * @route   POST /api/insights/:username/generate
 * @desc    Génération d'insights IA pour un utilisateur
 * @access  Private (JWT requis + ownership + rate limit IA)
 */
router.post('/:username/generate',
    // Rate limiting spécialisé pour les analyses IA (très coûteuses)
    (req: any, res: any, next: any) => {
        const analysisLimiter = req.app.get('analysisLimiter');
        if (analysisLimiter) {
            analysisLimiter(req, res, next);
        } else {
            next();
        }
    },
    authenticateJWT,
    validateUserParams,
    requireOwnership,
    InsightsController.generateInsights
);

/**
 * @route   GET /api/insights/:username/summary
 * @desc    Résumé des insights IA d'un utilisateur
 * @access  Public
 */
router.get('/:username/summary',
    optionalJWT,
    validateUserParams,
    InsightsController.getInsightsSummary
);

/**
 * @route   GET /api/insights/:username/personality
 * @desc    Personnalité de développeur analysée par IA
 * @access  Public
 */
router.get('/:username/personality',
    optionalJWT,
    validateUserParams,
    InsightsController.getDeveloperPersonality
);

/**
 * @route   GET /api/insights/:username/recommendations
 * @desc    Recommandations IA pour amélioration
 * @access  Public
 * @query   { category?: 'immediate'|'shortTerm'|'longTerm' }
 */
router.get('/:username/recommendations',
    optionalJWT,
    validateUserParams,
    InsightsController.getRecommendations
);

/**
 * @route   GET /api/insights/:username/strengths
 * @desc    Forces et points forts identifiés par l'IA
 * @access  Public
 */
router.get('/:username/strengths',
    optionalJWT,
    validateUserParams,
    InsightsController.getStrengths
);

/**
 * @route   GET /api/insights/:username/growth
 * @desc    Opportunités de croissance identifiées par l'IA
 * @access  Public
 */
router.get('/:username/growth',
    optionalJWT,
    validateUserParams,
    InsightsController.getGrowthOpportunities
);

/**
 * @route   GET /api/insights/:username/skills
 * @desc    Évaluation des compétences par l'IA
 * @access  Public
 */
router.get('/:username/skills',
    optionalJWT,
    validateUserParams,
    InsightsController.getSkillAssessment
);

/**
 * @route   GET /api/insights/:username/career
 * @desc    Insights de carrière par l'IA
 * @access  Public
 */
router.get('/:username/career',
    optionalJWT,
    validateUserParams,
    InsightsController.getCareerInsights
);

export default router; 