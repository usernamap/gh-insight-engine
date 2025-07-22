"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controllers_1 = require("@/controllers");
const middleware_1 = require("@/middleware");
const middleware_2 = require("@/middleware");
const middleware_3 = require("@/middleware");
const middleware_4 = require("@/middleware");
const middleware_5 = require("@/middleware");
const router = (0, express_1.Router)();
router.post('/:username/analyze', (req, res, next) => {
    const analysisLimiter = req.app.get('analysisLimiter');
    if (typeof analysisLimiter === 'function') {
        analysisLimiter(req, res, next);
    }
    else {
        next();
    }
}, middleware_1.authenticateJWT, middleware_4.validateUserAnalysis, middleware_3.requireOwnership, controllers_1.AnalyticsController.analyzeUser);
router.get('/:username/overview', middleware_2.optionalJWT, middleware_5.validateUserParams, controllers_1.AnalyticsController.getAnalyticsOverview);
router.get('/:username/performance', middleware_2.optionalJWT, middleware_5.validateUserParams, controllers_1.AnalyticsController.getPerformanceMetrics);
router.get('/:username/languages', middleware_2.optionalJWT, middleware_5.validateUserParams, controllers_1.AnalyticsController.getLanguageAnalytics);
router.get('/:username/activity', middleware_2.optionalJWT, middleware_5.validateUserParams, controllers_1.AnalyticsController.getActivityPatterns);
router.get('/:username/productivity', middleware_2.optionalJWT, middleware_5.validateUserParams, controllers_1.AnalyticsController.getProductivityScore);
router.get('/:username/devops', middleware_2.optionalJWT, middleware_5.validateUserParams, controllers_1.AnalyticsController.getDevOpsMaturity);
exports.default = router;
//# sourceMappingURL=analytics.js.map