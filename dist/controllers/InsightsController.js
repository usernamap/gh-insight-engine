"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.InsightsController = void 0;
const errorHandler_1 = require("@/middleware/errorHandler");
const errorHandler_2 = require("@/middleware/errorHandler");
const DatabaseService_1 = require("@/services/DatabaseService");
const AIService_1 = require("@/services/AIService");
const logger_1 = require("@/utils/logger");
const User_1 = require("@/models/User");
function isDeploymentData(obj) {
    return typeof obj === 'object' && obj !== null && 'totalCount' in obj;
}
function isEnvironmentData(obj) {
    return typeof obj === 'object' && obj !== null && 'totalCount' in obj;
}
function isReleaseData(obj) {
    return typeof obj === 'object' && obj !== null && 'totalCount' in obj;
}
function isIssueData(obj) {
    return typeof obj === 'object' && obj !== null && 'totalCount' in obj;
}
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
    logger_1.logWithContext.api('generate_insights_start', req.path, true, {
        requesterId: authenticatedUser.id,
    });
    try {
        const userData = await User_1.UserModel.findByLogin(username);
        if (!userData) {
            throw errorHandler_2.createError.notFound('Utilisateur');
        }
        const latestDataset = await DatabaseService_1.databaseService.getLatestUserDataset(username);
        if (!latestDataset) {
            throw errorHandler_2.createError.notFound("Aucun dataset trouvé. Veuillez d'abord lancer une analyse");
        }
        const analytics = latestDataset.dataset.analytics &&
            typeof latestDataset.dataset.analytics === 'object' &&
            'overview' in latestDataset.dataset.analytics
            ? latestDataset.dataset
                .analytics
            : undefined;
        if (!analytics) {
            throw errorHandler_2.createError.validation('Les métriques analytiques sont requises avant de générer des insights IA');
        }
        if (latestDataset.dataset.aiInsights) {
            const insightsAge = Date.now() - new Date(latestDataset.dataset.updatedAt).getTime();
            const maxAge = 24 * 60 * 60 * 1000;
            if (insightsAge < maxAge) {
                logger_1.logWithContext.api('generate_insights_cached', req.path, true, {
                    ageHours: Math.round(insightsAge / (60 * 60 * 1000)),
                });
                res.status(200).json({
                    message: 'Insights déjà générés et à jour',
                    insights: {
                        cached: true,
                        ageHours: Math.round(insightsAge / (60 * 60 * 1000)),
                        lastGenerated: latestDataset.dataset.updatedAt,
                    },
                    timestamp: new Date().toISOString(),
                });
                return;
            }
        }
        const repositories = latestDataset.repositories;
        logger_1.logWithContext.api('ai_analysis_start', req.path, true);
        const userProfileStrict = {
            ...userData,
            bio: userData.bio ?? '',
            company: userData.company ?? '',
            location: userData.location ?? '',
            blog: userData.blog ?? '',
            twitterUsername: userData.twitterUsername ?? '',
            privateRepos: userData.privateRepos ?? 0,
            ownedPrivateRepos: userData.ownedPrivateRepos ?? 0,
            totalPrivateRepos: userData.totalPrivateRepos ?? 0,
            collaborators: userData.collaborators ?? 0,
            hireable: userData.hireable ?? false,
            organizations: userData.organizations &&
                typeof userData.organizations === 'object' &&
                'totalCount' in userData.organizations &&
                'nodes' in userData.organizations
                ? userData.organizations
                : { totalCount: 0, nodes: [] },
        };
        function isValid(obj, keys) {
            return (!!obj &&
                typeof obj === 'object' &&
                keys.every((k) => k in obj));
        }
        const isValidCommits = (c) => {
            return !!c && typeof c === 'object' && 'totalCount' in c && 'recent' in c && Array.isArray(c.recent);
        };
        const repositoriesStrict = repositories.map((repo) => ({
            ...repo,
            description: repo.description ?? '',
            subscriberCount: repo.subscriberCount ?? 0,
            networkCount: repo.networkCount ?? 0,
            primaryLanguage: repo.primaryLanguage ?? '',
            pushedAt: repo.pushedAt ?? new Date(),
            homepageUrl: repo.homepageUrl ?? '',
            defaultBranchRef: repo.defaultBranchRef ?? '',
            license: typeof repo.license === 'object' &&
                repo.license !== null &&
                !Array.isArray(repo.license) &&
                typeof repo.license.name === 'string' &&
                typeof repo.license.spdxId === 'string' &&
                typeof repo.license.url === 'string'
                ? {
                    name: String(repo.license.name),
                    spdxId: String(repo.license.spdxId),
                    url: String(repo.license.url),
                }
                : null,
            hasPages: repo.hasPages ?? false,
            hasDownloads: repo.hasDownloads ?? false,
            hasDiscussions: repo.hasDiscussions ?? false,
            hasIssuesEnabled: repo.hasIssuesEnabled ?? false,
            hasProjectsEnabled: repo.hasProjectsEnabled ?? false,
            hasWikiEnabled: repo.hasWikiEnabled ?? false,
            vulnerabilityAlertsEnabled: repo.vulnerabilityAlertsEnabled ?? false,
            securityPolicyEnabled: repo.securityPolicyEnabled ?? false,
            codeOfConductEnabled: repo.codeOfConductEnabled ?? false,
            contributingGuidelinesEnabled: repo.contributingGuidelinesEnabled ?? false,
            readmeEnabled: repo.readmeEnabled ?? false,
            deployments: repo.deployments &&
                typeof repo.deployments === 'object' &&
                isDeploymentData(repo.deployments)
                ? { totalCount: repo.deployments.totalCount }
                : { totalCount: 0 },
            environments: repo.environments &&
                typeof repo.environments === 'object' &&
                isEnvironmentData(repo.environments)
                ? { totalCount: repo.environments.totalCount }
                : { totalCount: 0 },
            commits: isValidCommits(repo.commits)
                ? {
                    totalCount: repo.commits.totalCount,
                    recent: repo.commits.recent.map((commit) => ({
                        oid: commit.oid,
                        message: commit.message,
                        committedDate: commit.committedDate,
                        author: commit.author ?? { name: '', email: '', login: null },
                        additions: commit.additions ?? 0,
                        deletions: commit.deletions ?? 0,
                        changedFiles: commit.changedFiles ?? 0,
                    })),
                }
                : { totalCount: 0, recent: [] },
            releases: repo.releases &&
                typeof repo.releases === 'object' &&
                isReleaseData(repo.releases)
                ? {
                    totalCount: repo.releases.totalCount,
                    latestRelease: repo.releases.latestRelease,
                }
                : { totalCount: 0, latestRelease: null },
            issues: repo.issues &&
                typeof repo.issues === 'object' &&
                isIssueData(repo.issues)
                ? {
                    totalCount: repo.issues.totalCount,
                    openCount: repo.issues.openCount,
                    closedCount: repo.issues.closedCount,
                }
                : { totalCount: 0, openCount: 0, closedCount: 0 },
            pullRequests: repo.pullRequests &&
                typeof repo.pullRequests === 'object' &&
                'totalCount' in repo.pullRequests
                ? {
                    totalCount: repo.pullRequests.totalCount ?? 0,
                    openCount: repo.pullRequests.openCount ?? 0,
                    closedCount: repo.pullRequests.closedCount ?? 0,
                    mergedCount: repo.pullRequests.mergedCount ?? 0,
                }
                : { totalCount: 0, openCount: 0, closedCount: 0, mergedCount: 0 },
            branchProtectionRules: repo.branchProtectionRules &&
                typeof repo.branchProtectionRules === 'object' &&
                'totalCount' in repo.branchProtectionRules
                ? {
                    totalCount: repo.branchProtectionRules.totalCount ?? 0,
                }
                : { totalCount: 0 },
            collaborators: repo.collaborators &&
                typeof repo.collaborators === 'object' &&
                'totalCount' in repo.collaborators
                ? { totalCount: repo.collaborators.totalCount ?? 0 }
                : { totalCount: 0 },
            githubActions: isValid(repo.githubActions, [
                'workflowsCount',
                'lastRunStatus',
                'workflows',
                'runs',
            ])
                ? repo.githubActions
                : undefined,
            security: isValid(repo.security, [
                'dependabotAlerts',
                'secretScanning',
                'codeScanning',
                'hasSecurityPolicy',
                'hasVulnerabilityAlertsEnabled',
            ])
                ? repo.security
                : undefined,
            packages: isValid(repo.packages, ['totalCount', 'types'])
                ? repo.packages
                : undefined,
            branchProtection: isValid(repo.branchProtection, ['rules'])
                ? repo.branchProtection
                : undefined,
            community: isValid(repo.community, [
                'healthPercentage',
                'hasReadme',
                'hasLicense',
                'hasContributing',
                'hasCodeOfConduct',
                'hasIssueTemplate',
                'hasPullRequestTemplate',
            ])
                ? repo.community
                : undefined,
            traffic: isValid(repo.traffic, ['views', 'clones', 'popularPaths'])
                ? repo.traffic
                : undefined,
            diskUsage: repo.diskUsage ?? 0,
            languages: repo.languages &&
                typeof repo.languages === 'object' &&
                'totalSize' in repo.languages &&
                'nodes' in repo.languages
                ? repo.languages
                : { totalSize: 0, nodes: [] },
            owner: repo.owner &&
                typeof repo.owner === 'object' &&
                'login' in repo.owner &&
                'type' in repo.owner &&
                'avatarUrl' in repo.owner
                ? {
                    login: repo.owner.login ?? '',
                    type: repo.owner.type ?? '',
                    avatarUrl: repo.owner.avatarUrl ?? '',
                }
                : { login: '', type: '', avatarUrl: '' },
        }));
        const aiInsights = await AIService_1.aiService.generateCompleteInsights(userProfileStrict, repositoriesStrict, analytics);
        await DatabaseService_1.databaseService.updateDatasetAnalyses(latestDataset.dataset.id, undefined, { aiInsights, updatedAt: new Date() });
        logger_1.logWithContext.api('generate_insights_complete', req.path, true, {
            datasetId: latestDataset.dataset.id,
            insightsGenerated: true,
        });
        res.status(200).json({
            message: 'Insights IA générés avec succès',
            insights: {
                generated: true,
                fresh: true,
            },
            summary: {
                developerPersonality: {
                    archetype: aiInsights.personality.archetype,
                    description: aiInsights.personality.description,
                    strengths: aiInsights.personality.strengths,
                    workingStyle: aiInsights.personality.workingStyle,
                    motivations: aiInsights.personality.motivations,
                    potentialChallenges: aiInsights.personality.potentialChallenges,
                },
                mainStrengths: aiInsights.strengths.core,
                keyRecommendations: aiInsights.recommendations.immediate.slice(0, 3),
                overallAssessment: aiInsights.executiveSummary,
            },
            metadata: {
                datasetId: latestDataset.dataset.id,
                generatedAt: new Date().toISOString(),
                repositoriesAnalyzed: repositories.length,
            },
            timestamp: new Date().toISOString(),
        });
        return;
    }
    catch (_error) {
        logger_1.logWithContext.api('generate_insights_failed', req.path, false, {
            error: String(_error),
            errorType: _error.constructor.name,
        });
        throw _error;
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
        const userData = await User_1.UserModel.findByLogin(username);
        if (!userData) {
            throw errorHandler_2.createError.notFound('Utilisateur');
        }
        const latestDataset = await DatabaseService_1.databaseService.getLatestUserDataset(username);
        if (!latestDataset?.dataset.aiInsights) {
            throw errorHandler_2.createError.notFound('Aucun insight IA trouvé pour cet utilisateur');
        }
        const aiInsights = latestDataset.dataset
            .aiInsights;
        res.status(200).json({
            user: {
                username: userData.login,
                name: userData.name,
                avatarUrl: userData.avatarUrl,
            },
            summary: {
                overall: aiInsights.executiveSummary,
                personality: {
                    archetype: aiInsights.personality.archetype,
                    description: aiInsights.personality.description,
                    strengths: aiInsights.personality.strengths,
                    workingStyle: aiInsights.personality.workingStyle,
                    motivations: aiInsights.personality.motivations,
                    potentialChallenges: aiInsights.personality.potentialChallenges,
                },
                keyStrengths: aiInsights.strengths.core,
                topSkills: aiInsights.skills.technical.slice(0, 5),
                careerLevel: aiInsights.career.currentLevel,
                experience: aiInsights.career.trajectory,
            },
            highlights: {
                bestQualities: aiInsights.personality.strengths,
                topRecommendations: aiInsights.recommendations.immediate.slice(0, 3),
                growthAreas: aiInsights.growth.skills.slice(0, 3),
            },
            metadata: {
                generatedAt: latestDataset.dataset.updatedAt,
                confidence: aiInsights.confidence ?? 0.8,
                repositoriesAnalyzed: Array.isArray(latestDataset.dataset.repositories)
                    ? latestDataset.dataset.repositories.length
                    : 0,
            },
            timestamp: new Date().toISOString(),
        });
        return;
    }
    catch (_error) {
        logger_1.logWithContext.api('get_insights_summary', req.path, false, {
            targetUsername: username,
            error: String(_error),
        });
        throw _error;
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
        const userData = await User_1.UserModel.findByLogin(username);
        if (!userData) {
            throw errorHandler_2.createError.notFound('Utilisateur');
        }
        const latestDataset = await DatabaseService_1.databaseService.getLatestUserDataset(username);
        if (!latestDataset?.dataset.aiInsights) {
            throw errorHandler_2.createError.notFound('Aucune analyse de personnalité trouvée');
        }
        const aiInsights = latestDataset.dataset
            .aiInsights;
        const personality = aiInsights.personality;
        res.status(200).json({
            user: {
                username: userData.login,
                name: userData.name,
            },
            personality: {
                archetype: personality.archetype,
                description: personality.description,
                strengths: personality.strengths,
                workingStyle: personality.workingStyle,
                motivations: personality.motivations,
                potentialChallenges: personality.potentialChallenges,
            },
            insights: {},
            metadata: {
                analysisDate: latestDataset.dataset.updatedAt,
            },
            timestamp: new Date().toISOString(),
        });
        return;
    }
    catch (_error) {
        logger_1.logWithContext.api('get_developer_personality', req.path, false, {
            targetUsername: username,
            error: String(_error),
        });
        throw _error;
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
        const userData = await User_1.UserModel.findByLogin(username);
        if (!userData) {
            throw errorHandler_2.createError.notFound('Utilisateur');
        }
        const latestDataset = await DatabaseService_1.databaseService.getLatestUserDataset(username);
        if (!latestDataset?.dataset.aiInsights) {
            throw errorHandler_2.createError.notFound('Aucune recommandation trouvée');
        }
        const aiInsights = latestDataset.dataset
            .aiInsights;
        const recommendations = aiInsights.recommendations;
        res.status(200).json({
            user: {
                username: userData.login,
                name: userData.name,
            },
            recommendations: {
                immediate: recommendations.immediate ?? [],
                shortTerm: recommendations.shortTerm ?? [],
                longTerm: recommendations.longTerm ?? [],
            },
            prioritized: {},
            actionPlan: {},
            metadata: {
                generatedAt: latestDataset.dataset.updatedAt,
            },
            timestamp: new Date().toISOString(),
        });
        return;
    }
    catch (_error) {
        logger_1.logWithContext.api('get_recommendations', req.path, false, {
            targetUsername: username,
            error: String(_error),
        });
        throw _error;
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
        const userData = await User_1.UserModel.findByLogin(username);
        if (!userData) {
            throw errorHandler_2.createError.notFound('Utilisateur');
        }
        const latestDataset = await DatabaseService_1.databaseService.getLatestUserDataset(username);
        if (!latestDataset?.dataset.aiInsights) {
            throw errorHandler_2.createError.notFound('Aucune analyse des forces trouvée');
        }
        const aiInsights = latestDataset.dataset
            .aiInsights;
        const strengths = aiInsights.strengths;
        res.status(200).json({
            user: {
                username: userData.login,
                name: userData.name,
            },
            strengths: {
                core: strengths.core,
                emerging: strengths.emerging,
                unique: strengths.unique,
            },
            evidence: {},
            differentiators: {},
            metadata: {
                analysisDate: latestDataset.dataset.updatedAt,
            },
            timestamp: new Date().toISOString(),
        });
        return;
    }
    catch (_error) {
        logger_1.logWithContext.api('get_strengths', req.path, false, {
            targetUsername: username,
            error: String(_error),
        });
        throw _error;
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
        const userData = await User_1.UserModel.findByLogin(username);
        if (!userData) {
            throw errorHandler_2.createError.notFound('Utilisateur');
        }
        const latestDataset = await DatabaseService_1.databaseService.getLatestUserDataset(username);
        if (!latestDataset?.dataset.aiInsights) {
            throw errorHandler_2.createError.notFound('Aucune analyse des opportunités de croissance trouvée');
        }
        const aiInsights = latestDataset.dataset
            .aiInsights;
        const growth = aiInsights.growth;
        res.status(200).json({
            user: {
                username: userData.login,
                name: userData.name,
            },
            growth: {
                skills: growth.skills,
                experiences: growth.experiences,
                relationships: growth.relationships,
            },
            opportunities: {},
            roadmap: {},
            resources: {},
            metadata: {
                analysisDate: latestDataset.dataset.updatedAt,
            },
            timestamp: new Date().toISOString(),
        });
        return;
    }
    catch (_error) {
        logger_1.logWithContext.api('get_growth_opportunities', req.path, false, {
            targetUsername: username,
            error: String(_error),
        });
        throw _error;
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
        const userData = await User_1.UserModel.findByLogin(username);
        if (!userData) {
            throw errorHandler_2.createError.notFound('Utilisateur');
        }
        const latestDataset = await DatabaseService_1.databaseService.getLatestUserDataset(username);
        if (!latestDataset?.dataset.aiInsights) {
            throw errorHandler_2.createError.notFound('Aucune évaluation des compétences trouvée');
        }
        const aiInsights = latestDataset.dataset
            .aiInsights;
        const skills = aiInsights.skills;
        res.status(200).json({
            user: {
                username: userData.login,
                name: userData.name,
            },
            skills: {
                technical: skills.technical,
                soft: skills.soft,
                leadership: skills.leadership,
            },
            assessment: {},
            marketability: {},
            progression: {},
            metadata: {
                analysisDate: latestDataset.dataset.updatedAt,
            },
            timestamp: new Date().toISOString(),
        });
        return;
    }
    catch (_error) {
        logger_1.logWithContext.api('get_skill_assessment', req.path, false, {
            targetUsername: username,
            error: String(_error),
        });
        throw _error;
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
        const userData = await User_1.UserModel.findByLogin(username);
        if (!userData) {
            throw errorHandler_2.createError.notFound('Utilisateur');
        }
        const latestDataset = await DatabaseService_1.databaseService.getLatestUserDataset(username);
        if (!latestDataset?.dataset.aiInsights) {
            throw errorHandler_2.createError.notFound('Aucun insight de carrière trouvé');
        }
        const aiInsights = latestDataset.dataset
            .aiInsights;
        const career = aiInsights.career;
        res.status(200).json({
            user: {
                username: userData.login,
                name: userData.name,
            },
            career: {
                currentLevel: career.currentLevel,
                experienceIndicators: career.experienceIndicators,
                trajectory: career.trajectory,
                suitableRoles: career.suitableRoles,
                marketPosition: career.marketPosition,
            },
            insights: {},
            metadata: {
                analysisDate: latestDataset.dataset.updatedAt,
            },
            timestamp: new Date().toISOString(),
        });
        return;
    }
    catch (_error) {
        logger_1.logWithContext.api('get_career_insights', req.path, false, {
            targetUsername: username,
            error: String(_error),
        });
        throw _error;
    }
});
exports.default = InsightsController;
//# sourceMappingURL=InsightsController.js.map