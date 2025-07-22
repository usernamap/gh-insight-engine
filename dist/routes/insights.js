"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controllers_1 = require("@/controllers");
const middleware_1 = require("@/middleware");
const middleware_2 = require("@/middleware");
const middleware_3 = require("@/middleware");
const middleware_4 = require("@/middleware");
const router = (0, express_1.Router)();
router.post('/:username/generate', (req, res, next) => {
    const analysisLimiter = req.app.get('analysisLimiter');
    if (typeof analysisLimiter === 'function') {
        analysisLimiter(req, res, next);
    }
    else {
        next();
    }
}, middleware_1.authenticateJWT, middleware_4.validateUserParams, middleware_3.requireOwnership, controllers_1.InsightsController.generateInsights);
router.get('/:username/summary', middleware_2.optionalJWT, middleware_4.validateUserParams, controllers_1.InsightsController.getInsightsSummary);
router.get('/:username/personality', middleware_2.optionalJWT, middleware_4.validateUserParams, controllers_1.InsightsController.getDeveloperPersonality);
router.get('/:username/recommendations', middleware_2.optionalJWT, middleware_4.validateUserParams, controllers_1.InsightsController.getRecommendations);
router.get('/:username/strengths', middleware_2.optionalJWT, middleware_4.validateUserParams, controllers_1.InsightsController.getStrengths);
router.get('/:username/growth', middleware_2.optionalJWT, middleware_4.validateUserParams, controllers_1.InsightsController.getGrowthOpportunities);
router.get('/:username/skills', middleware_2.optionalJWT, middleware_4.validateUserParams, controllers_1.InsightsController.getSkillAssessment);
router.get('/:username/career', middleware_2.optionalJWT, middleware_4.validateUserParams, controllers_1.InsightsController.getCareerInsights);
exports.default = router;
//# sourceMappingURL=insights.js.map