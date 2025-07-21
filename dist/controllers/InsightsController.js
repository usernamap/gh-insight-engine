"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.InsightsController = void 0;
const errorHandler_1 = require("@/middleware/errorHandler");
const errorHandler_2 = require("@/middleware/errorHandler");
const DatabaseService_1 = require("@/services/DatabaseService");
const AIService_1 = require("@/services/AIService");
const logger_1 = require("@/utils/logger");
class InsightsController {
}
exports.InsightsController = InsightsController;
_a = InsightsController;
InsightsController.generateInsights = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { username } = req.params;
    const authenticatedUser = req.user;
    if (authenticatedUser.username !== username) {
        throw errorHandler_2.createError.authorization('Vous ne pouvez générer des insights que pour votre propre profil');
    }
    logger_1.logWithContext.ai('generate_insights_start', username, true, {
        requesterId: authenticatedUser.id,
    });
    try {
        const userData = await DatabaseService_1.databaseService.getUser(username);
        if (!userData) {
            throw errorHandler_2.createError.notFound('Utilisateur');
        }
        const latestDataset = await DatabaseService_1.databaseService.getLatestDatasetForUser(userData.id);
        if (!latestDataset) {
            throw errorHandler_2.createError.notFound('Aucun dataset trouvé. Veuillez d\'abord lancer une analyse');
        }
        if (!latestDataset.analytics) {
            throw errorHandler_2.createError.validation('Les métriques analytiques sont requises avant de générer des insights IA');
        }
        if (latestDataset.aiInsights) {
            const insightsAge = Date.now() - new Date(latestDataset.updatedAt).getTime();
            const maxAge = 24 * 60 * 60 * 1000;
            if (insightsAge < maxAge) {
                logger_1.logWithContext.ai('generate_insights_cached', username, true, {
                    ageHours: Math.round(insightsAge / (60 * 60 * 1000)),
                });
                res.status(200).json({
                    message: 'Insights déjà générés et à jour',
                    insights: {
                        cached: true,
                        ageHours: Math.round(insightsAge / (60 * 60 * 1000)),
                        lastGenerated: latestDataset.updatedAt,
                    },
                    timestamp: new Date().toISOString(),
                });
                return;
            }
        }
        const repositories = await DatabaseService_1.databaseService.getUserRepositories(userData.id);
        logger_1.logWithContext.ai('ai_analysis_start', username, true);
        const aiInsights = await AIService_1.aiService.generateInsights(userData, repositories, latestDataset.analytics);
        await DatabaseService_1.databaseService.updateDatasetInsights(latestDataset.id, aiInsights);
        logger_1.logWithContext.ai('generate_insights_complete', username, true, {
            datasetId: latestDataset.id,
            insightsGenerated: true,
        });
        res.status(200).json({
            message: 'Insights IA générés avec succès',
            insights: {
                generated: true,
                fresh: true,
            },
            summary: {
                developerPersonality: aiInsights.developerPersonality.summary,
                mainStrengths: aiInsights.strengths.mainStrengths,
                keyRecommendations: aiInsights.recommendations.immediate.slice(0, 3),
                overallAssessment: aiInsights.summary,
            },
            metadata: {
                datasetId: latestDataset.id,
                generatedAt: new Date().toISOString(),
                repositoriesAnalyzed: repositories.length,
            },
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        logger_1.logWithContext.ai('generate_insights_failed', username, false, {
            error: error.message,
            errorType: error.constructor.name,
        });
        throw error;
    }
});
InsightsController.getInsightsSummary = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { username } = req.params;
    const authenticatedUser = req.user;
    logger_1.logWithContext.api('get_insights_summary', req.path, true, {
        targetUsername: username,
        requesterId: authenticatedUser?.id,
    });
    try {
        const userData = await DatabaseService_1.databaseService.getUser(username);
        if (!userData) {
            throw errorHandler_2.createError.notFound('Utilisateur');
        }
        const latestDataset = await DatabaseService_1.databaseService.getLatestDatasetForUser(userData.id);
        if (!latestDataset || !latestDataset.aiInsights) {
            throw errorHandler_2.createError.notFound('Aucun insight IA trouvé pour cet utilisateur');
        }
        const aiInsights = latestDataset.aiInsights;
        res.status(200).json({
            user: {
                username: userData.login,
                name: userData.name,
                avatarUrl: userData.avatarUrl,
            },
            summary: {
                overall: aiInsights.summary,
                personality: aiInsights.developerPersonality.summary,
                keyStrengths: aiInsights.strengths.mainStrengths,
                topSkills: aiInsights.skills.technical.slice(0, 5),
                careerLevel: aiInsights.career.currentLevel,
                experience: aiInsights.career.experienceYears,
            },
            highlights: {
                bestQualities: aiInsights.developerPersonality.traits
                    .filter((t) => t.score > 0.7)
                    .map((t) => t.trait),
                topRecommendations: aiInsights.recommendations.immediate.slice(0, 3),
                growthAreas: aiInsights.growth.areas.slice(0, 3),
            },
            metadata: {
                generatedAt: latestDataset.updatedAt,
                confidence: aiInsights.confidence || 0.8,
                repositoriesAnalyzed: Array.isArray(latestDataset.repositories) ? latestDataset.repositories.length : 0,
            },
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        logger_1.logWithContext.api('get_insights_summary', req.path, false, {
            targetUsername: username,
            error: error.message,
        });
        throw error;
    }
});
InsightsController.getDeveloperPersonality = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { username } = req.params;
    const authenticatedUser = req.user;
    logger_1.logWithContext.api('get_developer_personality', req.path, true, {
        targetUsername: username,
        requesterId: authenticatedUser?.id,
    });
    try {
        const userData = await DatabaseService_1.databaseService.getUser(username);
        if (!userData) {
            throw errorHandler_2.createError.notFound('Utilisateur');
        }
        const latestDataset = await DatabaseService_1.databaseService.getLatestDatasetForUser(userData.id);
        if (!latestDataset || !latestDataset.aiInsights) {
            throw errorHandler_2.createError.notFound('Aucune analyse de personnalité trouvée');
        }
        const aiInsights = latestDataset.aiInsights;
        const personality = aiInsights.developerPersonality;
        res.status(200).json({
            user: {
                username: userData.login,
                name: userData.name,
            },
            personality: {
                summary: personality.summary,
                profile: personality.profile,
                traits: personality.traits,
                workingStyle: {
                    preferences: personality.workingStyle,
                    collaboration: personality.collaborationStyle,
                    problemSolving: personality.problemSolvingApproach,
                },
                archetype: personality.developerArchetype,
                motivation: personality.motivationFactors,
            },
            insights: {
                strengthsBasedOnPersonality: personality.personalityStrengths,
                developmentAreas: personality.personalityGrowthAreas,
                teamCompatibility: personality.teamRoleCompatibility,
            },
            metadata: {
                analysisDate: latestDataset.updatedAt,
                confidence: personality.confidence || 0.8,
            },
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        logger_1.logWithContext.api('get_developer_personality', req.path, false, {
            targetUsername: username,
            error: error.message,
        });
        throw error;
    }
});
InsightsController.getRecommendations = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { username } = req.params;
    const { category } = req.query;
    const authenticatedUser = req.user;
    logger_1.logWithContext.api('get_recommendations', req.path, true, {
        targetUsername: username,
        category,
        requesterId: authenticatedUser?.id,
    });
    try {
        const userData = await DatabaseService_1.databaseService.getUser(username);
        if (!userData) {
            throw errorHandler_2.createError.notFound('Utilisateur');
        }
        const latestDataset = await DatabaseService_1.databaseService.getLatestDatasetForUser(userData.id);
        if (!latestDataset || !latestDataset.aiInsights) {
            throw errorHandler_2.createError.notFound('Aucune recommandation trouvée');
        }
        const aiInsights = latestDataset.aiInsights;
        const recommendations = aiInsights.recommendations;
        let filteredRecommendations = recommendations;
        if (category && ['immediate', 'shortTerm', 'longTerm'].includes(category)) {
            filteredRecommendations = {
                [category]: recommendations[category],
            };
        }
        res.status(200).json({
            user: {
                username: userData.login,
                name: userData.name,
            },
            recommendations: {
                immediate: filteredRecommendations.immediate || [],
                shortTerm: filteredRecommendations.shortTerm || [],
                longTerm: filteredRecommendations.longTerm || [],
            },
            prioritized: {
                topPriority: recommendations.immediate?.[0] || null,
                skillDevelopment: recommendations.skillDevelopment || [],
                careerAdvancement: recommendations.careerAdvancement || [],
                technicalGrowth: recommendations.technicalGrowth || [],
            },
            actionPlan: {
                nextSteps: recommendations.actionPlan?.nextSteps || [],
                timeline: recommendations.actionPlan?.timeline || {},
                resources: recommendations.actionPlan?.resources || [],
            },
            metadata: {
                generatedAt: latestDataset.updatedAt,
                basedOnAnalysis: 'AI-powered analysis of coding patterns and project history',
            },
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        logger_1.logWithContext.api('get_recommendations', req.path, false, {
            targetUsername: username,
            error: error.message,
        });
        throw error;
    }
});
InsightsController.getStrengths = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { username } = req.params;
    const authenticatedUser = req.user;
    logger_1.logWithContext.api('get_strengths', req.path, true, {
        targetUsername: username,
        requesterId: authenticatedUser?.id,
    });
    try {
        const userData = await DatabaseService_1.databaseService.getUser(username);
        if (!userData) {
            throw errorHandler_2.createError.notFound('Utilisateur');
        }
        const latestDataset = await DatabaseService_1.databaseService.getLatestDatasetForUser(userData.id);
        if (!latestDataset || !latestDataset.aiInsights) {
            throw errorHandler_2.createError.notFound('Aucune analyse des forces trouvée');
        }
        const aiInsights = latestDataset.aiInsights;
        const strengths = aiInsights.strengths;
        res.status(200).json({
            user: {
                username: userData.login,
                name: userData.name,
            },
            strengths: {
                main: strengths.mainStrengths,
                technical: strengths.technicalStrengths,
                soft: strengths.softSkills,
                leadership: strengths.leadershipQualities,
                innovation: strengths.innovationCapacity,
            },
            evidence: {
                codeQuality: strengths.evidence?.codeQuality || [],
                projectManagement: strengths.evidence?.projectManagement || [],
                collaboration: strengths.evidence?.collaboration || [],
                problemSolving: strengths.evidence?.problemSolving || [],
            },
            differentiators: {
                uniqueSkills: strengths.uniqueSkills || [],
                competitiveAdvantages: strengths.competitiveAdvantages || [],
                marketValue: strengths.marketValue || {},
            },
            metadata: {
                analysisDate: latestDataset.updatedAt,
                confidence: strengths.confidence || 0.8,
                strengthsCount: strengths.mainStrengths?.length || 0,
            },
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        logger_1.logWithContext.api('get_strengths', req.path, false, {
            targetUsername: username,
            error: error.message,
        });
        throw error;
    }
});
InsightsController.getGrowthOpportunities = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { username } = req.params;
    const authenticatedUser = req.user;
    logger_1.logWithContext.api('get_growth_opportunities', req.path, true, {
        targetUsername: username,
        requesterId: authenticatedUser?.id,
    });
    try {
        const userData = await DatabaseService_1.databaseService.getUser(username);
        if (!userData) {
            throw errorHandler_2.createError.notFound('Utilisateur');
        }
        const latestDataset = await DatabaseService_1.databaseService.getLatestDatasetForUser(userData.id);
        if (!latestDataset || !latestDataset.aiInsights) {
            throw errorHandler_2.createError.notFound('Aucune analyse des opportunités de croissance trouvée');
        }
        const aiInsights = latestDataset.aiInsights;
        const growth = aiInsights.growth;
        res.status(200).json({
            user: {
                username: userData.login,
                name: userData.name,
            },
            growth: {
                areas: growth.areas,
                priority: {
                    high: growth.areas?.filter((area) => area.priority === 'high') || [],
                    medium: growth.areas?.filter((area) => area.priority === 'medium') || [],
                    low: growth.areas?.filter((area) => area.priority === 'low') || [],
                },
                skillGaps: growth.skillGaps || [],
                learningPath: growth.suggestedLearningPath || [],
            },
            opportunities: {
                immediate: growth.immediateOpportunities || [],
                emerging: growth.emergingTechnologies || [],
                career: growth.careerProgression || [],
                specialization: growth.specializationAreas || [],
            },
            roadmap: {
                nextThreeMonths: growth.roadmap?.nextThreeMonths || [],
                nextSixMonths: growth.roadmap?.nextSixMonths || [],
                nextYear: growth.roadmap?.nextYear || [],
            },
            resources: {
                learningResources: growth.resources?.learning || [],
                practiceProjects: growth.resources?.projects || [],
                communities: growth.resources?.communities || [],
            },
            metadata: {
                analysisDate: latestDataset.updatedAt,
                potentialImpact: growth.potentialImpact || 'medium',
                timeToImpact: growth.timeToImpact || '3-6 months',
            },
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        logger_1.logWithContext.api('get_growth_opportunities', req.path, false, {
            targetUsername: username,
            error: error.message,
        });
        throw error;
    }
});
InsightsController.getSkillAssessment = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { username } = req.params;
    const authenticatedUser = req.user;
    logger_1.logWithContext.api('get_skill_assessment', req.path, true, {
        targetUsername: username,
        requesterId: authenticatedUser?.id,
    });
    try {
        const userData = await DatabaseService_1.databaseService.getUser(username);
        if (!userData) {
            throw errorHandler_2.createError.notFound('Utilisateur');
        }
        const latestDataset = await DatabaseService_1.databaseService.getLatestDatasetForUser(userData.id);
        if (!latestDataset || !latestDataset.aiInsights) {
            throw errorHandler_2.createError.notFound('Aucune évaluation des compétences trouvée');
        }
        const aiInsights = latestDataset.aiInsights;
        const skills = aiInsights.skills;
        res.status(200).json({
            user: {
                username: userData.login,
                name: userData.name,
            },
            skills: {
                technical: skills.technical.map((skill) => ({
                    ...skill,
                    level: skill.proficiency > 0.8 ? 'Expert' :
                        skill.proficiency > 0.6 ? 'Advanced' :
                            skill.proficiency > 0.4 ? 'Intermediate' : 'Beginner',
                })),
                frameworks: skills.frameworks || [],
                tools: skills.tools || [],
                methodologies: skills.methodologies || [],
            },
            assessment: {
                overallLevel: skills.overallLevel,
                seniorityLevel: skills.seniorityLevel,
                specializations: skills.specializations || [],
                versatility: skills.versatilityScore || 0,
            },
            marketability: {
                inDemandSkills: skills.inDemandSkills || [],
                emergingSkills: skills.emergingSkills || [],
                rareCombinations: skills.rareCombinations || [],
                marketValue: skills.marketValue || 'medium',
            },
            progression: {
                recentGrowth: skills.recentGrowth || [],
                stagnantAreas: skills.stagnantAreas || [],
                trendingUp: skills.trendingUp || [],
                recommendations: skills.skillRecommendations || [],
            },
            metadata: {
                analysisDate: latestDataset.updatedAt,
                skillsEvaluated: skills.technical?.length || 0,
                confidence: skills.confidence || 0.8,
            },
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        logger_1.logWithContext.api('get_skill_assessment', req.path, false, {
            targetUsername: username,
            error: error.message,
        });
        throw error;
    }
});
InsightsController.getCareerInsights = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { username } = req.params;
    const authenticatedUser = req.user;
    logger_1.logWithContext.api('get_career_insights', req.path, true, {
        targetUsername: username,
        requesterId: authenticatedUser?.id,
    });
    try {
        const userData = await DatabaseService_1.databaseService.getUser(username);
        if (!userData) {
            throw errorHandler_2.createError.notFound('Utilisateur');
        }
        const latestDataset = await DatabaseService_1.databaseService.getLatestDatasetForUser(userData.id);
        if (!latestDataset || !latestDataset.aiInsights) {
            throw errorHandler_2.createError.notFound('Aucun insight de carrière trouvé');
        }
        const aiInsights = latestDataset.aiInsights;
        const career = aiInsights.career;
        res.status(200).json({
            user: {
                username: userData.login,
                name: userData.name,
            },
            career: {
                current: {
                    level: career.currentLevel,
                    experience: career.experienceYears,
                    trajectory: career.careerTrajectory,
                    phase: career.careerPhase,
                },
                readiness: {
                    promotion: career.promotionReadiness || {},
                    leadership: career.leadershipReadiness || {},
                    specialization: career.specializationReadiness || {},
                },
                opportunities: {
                    nextRoles: career.suggestedRoles || [],
                    industries: career.suitableIndustries || [],
                    companies: career.companyTypes || [],
                    transitions: career.careerTransitions || [],
                },
                development: {
                    skillsForNextLevel: career.skillsForNextLevel || [],
                    experienceGaps: career.experienceGaps || [],
                    networkingNeeds: career.networkingNeeds || [],
                    certifications: career.recommendedCertifications || [],
                },
            },
            insights: {
                strengths: career.careerStrengths || [],
                blockers: career.potentialBlockers || [],
                timeline: career.progressionTimeline || {},
                salary: career.salaryInsights || {},
            },
            metadata: {
                analysisDate: latestDataset.updatedAt,
                confidence: career.confidence || 0.8,
                basedOnYears: career.analysisYears || 1,
            },
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        logger_1.logWithContext.api('get_career_insights', req.path, false, {
            targetUsername: username,
            error: error.message,
        });
        throw error;
    }
});
exports.default = InsightsController;
//# sourceMappingURL=InsightsController.js.map