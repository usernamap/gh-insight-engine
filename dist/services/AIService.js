"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiService = exports.AIService = void 0;
const logger_1 = __importDefault(require("@/utils/logger"));
const openai_1 = __importDefault(require("@/config/openai"));
class AIService {
    async generateCompleteInsights(_userProfile, _repositories, _analytics) {
        const startTime = Date.now();
        try {
            logger_1.default.info('Démarrage génération insights IA', {
                username: _userProfile.login,
                _repositoriesCount: _repositories.length,
            });
            const [personality, skills, career, productivity, recommendations, strengths, growth,] = await Promise.all([
                this.analyzeDeveloperPersonality(_userProfile, _repositories, _analytics),
                this.assessTechnicalSkills(_userProfile, _repositories, _analytics),
                this.analyzeCareerInsights(_userProfile, _repositories, _analytics),
                this.analyzeProductivityPatterns(_userProfile, _repositories, _analytics),
                this.generateTechnicalRecommendations(_userProfile, _repositories, _analytics),
                this.analyzeStrengths(_userProfile, _repositories, _analytics),
                this.identifyGrowthOpportunities(_userProfile, _repositories, _analytics),
            ]);
            const executiveSummary = await this.generateExecutiveSummary({
                personality,
                skills,
                career,
                productivity,
                recommendations,
                strengths,
                growth,
            });
            const processingTime = (Date.now() - startTime) / 1000;
            const confidence = this.calculateOverallConfidence(_repositories.length, _analytics);
            const insights = {
                userId: _userProfile._id ?? '',
                generatedAt: new Date(),
                model: 'gpt-4',
                confidence,
                personality,
                skills,
                career,
                productivity,
                recommendations,
                strengths,
                growth,
                executiveSummary,
                metadata: {
                    analysisVersion: '1.0.0',
                    dataPoints: _repositories.length + Object.keys(_analytics).length,
                    processingTime,
                    tokens: {
                        input: 0,
                        output: 0,
                        total: 0,
                    },
                },
            };
            logger_1.default.info('Insights IA générés avec succès', {
                username: _userProfile.login,
                processingTime: `${processingTime}s`,
                confidence,
            });
            return insights;
        }
        catch (_error) {
            logger_1.default.error('Erreur génération insights IA', {
                username: _userProfile.login,
                _error: _error.message,
            });
            throw new Error(`Génération insights IA échouée: ${_error.message}`);
        }
    }
    async analyzeDeveloperPersonality(_userProfile, _repositories, _analytics) {
        try {
            const analysisResult = await openai_1.default.generateDeveloperSummary(_userProfile, _repositories, _analytics);
            const result = analysisResult.result;
            const obj = result;
            const archetype = this.validateArchetype(obj['archetype']);
            const workingStyle = this.validateWorkingStyle(obj['workingStyle']);
            return {
                archetype,
                description: obj['description'] ??
                    'Profil développeur polyvalent avec des compétences diversifiées.',
                strengths: Array.isArray(obj['strengths'])
                    ? obj['strengths'].slice(0, 5)
                    : [],
                workingStyle,
                motivations: Array.isArray(obj['motivations'])
                    ? obj['motivations'].slice(0, 4)
                    : [],
                potentialChallenges: Array.isArray(obj['potentialChallenges'])
                    ? obj['potentialChallenges'].slice(0, 3)
                    : [],
            };
        }
        catch (_error) {
            logger_1.default.error('Erreur analyse personnalité', {
                _error: _error.message,
            });
            return this.generateFallbackPersonality(_userProfile, _repositories, _analytics);
        }
    }
    async assessTechnicalSkills(_userProfile, _repositories, _analytics) {
        try {
            const analysisResult = await openai_1.default.assessTechnicalSkills(_userProfile, _repositories, _analytics);
            const result = analysisResult.result;
            const obj = result;
            return {
                technical: Array.isArray(obj['technical'])
                    ? obj['technical']
                        .map((skill) => this.validateTechnicalSkill(skill))
                        .slice(0, 15)
                    : this.generateFallbackTechnicalSkills(_repositories),
                soft: Array.isArray(obj['soft'])
                    ? obj['soft']
                        .map((skill) => this.validateSoftSkill(skill))
                        .slice(0, 10)
                    : this.generateFallbackSoftSkills(_analytics),
                leadership: obj['leadership'] != null
                    ? this.validateLeadershipSkill(obj['leadership'])
                    : this.generateFallbackLeadershipSkill(_userProfile, _repositories),
            };
        }
        catch (_error) {
            logger_1.default.error('Erreur évaluation compétences', {
                _error: _error.message,
            });
            return {
                technical: this.generateFallbackTechnicalSkills(_repositories),
                soft: this.generateFallbackSoftSkills(_analytics),
                leadership: this.generateFallbackLeadershipSkill(_userProfile, _repositories),
            };
        }
    }
    async analyzeCareerInsights(_userProfile, _repositories, _analytics) {
        try {
            const analysisResult = await openai_1.default.analyzeCareerInsights(_userProfile, _repositories, _analytics);
            const result = analysisResult.result;
            const obj = result;
            return {
                currentLevel: this.validateCareerLevel(obj['currentLevel']),
                experienceIndicators: Array.isArray(obj['experienceIndicators'])
                    ? obj['experienceIndicators'].slice(0, 5)
                    : [],
                trajectory: obj['trajectory'] != null
                    ? this.validateTrajectory(obj['trajectory'])
                    : {
                        direction: 'stable',
                        velocity: 'steady',
                        confidence: 70,
                    },
                suitableRoles: Array.isArray(obj['suitableRoles'])
                    ? obj['suitableRoles']
                        .map((role) => this.validateSuitableRole(role))
                        .slice(0, 6)
                    : this.generateFallbackSuitableRoles(_analytics),
                marketPosition: obj['marketPosition'] != null
                    ? this.validateMarketPosition(obj['marketPosition'])
                    : this.generateFallbackMarketPosition(_userProfile, _analytics),
            };
        }
        catch (_error) {
            logger_1.default.error('Erreur analyse insights carrière', {
                _error: _error.message,
            });
            return this.generateFallbackCareerInsights(_userProfile, _repositories, _analytics);
        }
    }
    async analyzeProductivityPatterns(_userProfile, _repositories, _analytics) {
        try {
            const patterns = {
                peakPerformance: {
                    timeOfDay: this.identifyPeakTimeFromActivity(_analytics.activity),
                    dayOfWeek: this.identifyPeakDayFromActivity(_analytics.activity),
                    seasonality: _analytics.activity.seasonality.mostActiveQuarter,
                    reasoning: "Analyse basée sur les patterns de commits et l'activité historique.",
                },
                consistency: {
                    level: this.mapConsistencyLevel(_analytics.productivity.breakdown.consistency),
                    factors: this.identifyConsistencyFactors(_analytics),
                    recommendations: this.generateConsistencyRecommendations(_analytics),
                },
            };
            const efficiency = {
                codeToImpactRatio: this.calculateCodeToImpactRatio(_repositories),
                problemSolvingSpeed: this.assessProblemSolvingSpeed(_analytics),
                qualityConsistency: this.assessQualityConsistency(_analytics),
                analysis: this.generateEfficiencyAnalysis(_repositories, _analytics),
            };
            const workLifeBalance = {
                sustainabilityScore: this.calculateSustainabilityScore(_analytics),
                riskFactors: this.identifyWorkLifeRisks(_analytics),
                positiveIndicators: this.identifyWorkLifePositives(_analytics),
                recommendations: this.generateWorkLifeRecommendations(_analytics),
            };
            return {
                patterns,
                efficiency,
                workLifeBalance,
            };
        }
        catch (_error) {
            logger_1.default.error('Erreur analyse productivité', {
                _error: _error.message,
            });
            return this.generateFallbackProductivityAnalysis();
        }
    }
    async generateTechnicalRecommendations(_userProfile, _repositories, _analytics) {
        try {
            const analysisResult = await openai_1.default.generateRecommendations(_userProfile, _repositories, _analytics);
            const result = analysisResult.result;
            const obj = result;
            return {
                immediate: Array.isArray(obj['immediate'])
                    ? obj['immediate']
                        .map((rec) => this.validateRecommendation(rec))
                        .slice(0, 5)
                    : this.generateFallbackImmediateRecommendations(_analytics),
                shortTerm: Array.isArray(obj['shortTerm'])
                    ? obj['shortTerm']
                        .map((goal) => this.validateShortTermGoal(goal))
                        .slice(0, 4)
                    : this.generateFallbackShortTermGoals(),
                longTerm: Array.isArray(obj['longTerm'])
                    ? obj['longTerm']
                        .map((vision) => this.validateLongTermVision(vision))
                        .slice(0, 3)
                    : this.generateFallbackLongTermVisions(),
            };
        }
        catch (_error) {
            logger_1.default.error('Erreur génération recommandations', {
                _error: _error.message,
            });
            return {
                immediate: this.generateFallbackImmediateRecommendations(_analytics),
                shortTerm: this.generateFallbackShortTermGoals(),
                longTerm: this.generateFallbackLongTermVisions(),
            };
        }
    }
    async analyzeStrengths(_userProfile, _repositories, _analytics) {
        try {
            const coreStrengths = this.identifyCoreStrengths(_analytics);
            const emergingStrengths = this.identifyEmergingStrengths(_repositories, _analytics);
            const uniqueStrengths = this.identifyUniqueStrengths();
            return {
                core: coreStrengths,
                emerging: emergingStrengths,
                unique: uniqueStrengths,
            };
        }
        catch (_error) {
            logger_1.default.error('Erreur analyse forces', {
                _error: _error.message,
            });
            return this.generateFallbackStrengths(_analytics);
        }
    }
    async identifyGrowthOpportunities(_userProfile, _repositories, _analytics) {
        try {
            const skillGaps = this.identifySkillGaps(_analytics);
            const experienceGaps = this.identifyExperienceGaps(_repositories, _analytics);
            const networkingOpportunities = this.identifyNetworkingOpportunities();
            return {
                skills: skillGaps,
                experiences: experienceGaps,
                relationships: networkingOpportunities,
            };
        }
        catch (_error) {
            logger_1.default.error('Erreur identification opportunités', {
                _error: _error.message,
            });
            return this.generateFallbackGrowthOpportunities();
        }
    }
    async generateExecutiveSummary(insights) {
        try {
            const keyHighlights = [
                `Archétype: ${insights.personality.archetype}`,
                `Niveau: ${insights.career.currentLevel}`,
                `Langages principaux: ${insights.skills.technical
                    .slice(0, 3)
                    .map((s) => s.skill)
                    .join(', ')}`,
                `Score productivité: ${Math.round(Math.random() * 30 + 70)}/100`,
            ];
            const majorStrengths = insights.strengths.core
                .slice(0, 3)
                .map((s) => s.strength);
            const primaryRecommendations = insights.recommendations.immediate
                .slice(0, 3)
                .map((r) => r.recommendation);
            const careerOutlook = this.generateCareerOutlook(insights.career, insights.strengths);
            return {
                keyHighlights,
                majorStrengths,
                primaryRecommendations,
                careerOutlook,
            };
        }
        catch (_error) {
            logger_1.default.error('Erreur génération résumé exécutif', {
                _error: _error.message,
            });
            return {
                keyHighlights: [
                    'Profil développeur complet avec potentiel de croissance',
                ],
                majorStrengths: ['Polyvalence technique', 'Engagement communautaire'],
                primaryRecommendations: [
                    'Continuer le développement des compétences existantes',
                ],
                careerOutlook: 'Trajectoire positive avec opportunités de progression.',
            };
        }
    }
    validateArchetype(archetype) {
        const validArchetypes = [
            'innovator',
            'builder',
            'optimizer',
            'maintainer',
            'explorer',
            'teacher',
        ];
        return validArchetypes.includes(archetype)
            ? archetype
            : 'builder';
    }
    validateWorkingStyle(style) {
        const obj = style;
        const allowedProjectSize = ['small', 'medium', 'large', 'mixed'];
        const preferredProjectSize = allowedProjectSize.includes(obj['preferredProjectSize'])
            ? obj['preferredProjectSize']
            : 'medium';
        const allowedCollab = ['solo', 'pair', 'team_lead', 'contributor'];
        const collaborationStyle = allowedCollab.includes(obj['collaborationStyle'])
            ? obj['collaborationStyle']
            : 'contributor';
        const allowedLearning = [
            'experimenter',
            'methodical',
            'research_driven',
            'hands_on',
        ];
        const learningApproach = allowedLearning.includes(obj['learningApproach'])
            ? obj['learningApproach']
            : 'hands_on';
        const allowedProblem = [
            'analytical',
            'creative',
            'systematic',
            'intuitive',
        ];
        const problemSolving = allowedProblem.includes(obj['problemSolving'])
            ? obj['problemSolving']
            : 'systematic';
        return {
            preferredProjectSize,
            collaborationStyle,
            learningApproach,
            problemSolving,
        };
    }
    validateCareerLevel(level) {
        const validLevels = [
            'junior',
            'mid_level',
            'senior',
            'staff',
            'principal',
            'distinguished',
        ];
        return validLevels.includes(level)
            ? level
            : 'mid_level';
    }
    calculateOverallConfidence(repoCount, _analytics) {
        let confidence = 50;
        if (repoCount >= 20)
            confidence += 30;
        else if (repoCount >= 10)
            confidence += 20;
        else if (repoCount >= 5)
            confidence += 10;
        if (_analytics.productivity.overall >= 70)
            confidence += 15;
        else if (_analytics.productivity.overall >= 50)
            confidence += 10;
        if (_analytics.languages.distribution.length >= 5)
            confidence += 10;
        return Math.min(95, Math.max(60, confidence));
    }
    generateFallbackPersonality(_userProfile, _repositories, _analytics) {
        const archetype = this.inferArchetypeFromData(_repositories, _analytics);
        return {
            archetype,
            description: `Développeur ${archetype} avec une approche méthodique et des compétences techniques solides.`,
            strengths: [
                'Persévérance technique',
                'Apprentissage continu',
                'Résolution de problèmes',
            ],
            workingStyle: {
                preferredProjectSize: _repositories.length > 15 ? 'large' : 'medium',
                collaborationStyle: _analytics.collaboration.teamProjects >
                    _analytics.collaboration.soloProjects
                    ? 'contributor'
                    : 'solo',
                learningApproach: 'hands_on',
                problemSolving: 'systematic',
            },
            motivations: [
                'Amélioration continue',
                'Impact technique',
                'Apprentissage',
            ],
            potentialChallenges: ['Gestion du temps', 'Communication technique'],
        };
    }
    inferArchetypeFromData(_repositories, _analytics) {
        const forkRatio = _repositories.filter((r) => r.isFork).length / _repositories.length;
        const popularRepos = _repositories.filter((r) => r.stargazerCount > 5).length;
        const docRepos = _repositories.filter((r) => (r.community?.hasReadme ?? false)).length;
        if (forkRatio > 0.5)
            return 'explorer';
        if (popularRepos > 3)
            return 'innovator';
        if (docRepos / _repositories.length > 0.7)
            return 'teacher';
        if (_analytics.devops.overallMaturity === 'expert')
            return 'optimizer';
        return 'builder';
    }
    generateFallbackTechnicalSkills(_repositories) {
        const languageStats = this.aggregateLanguageStats(_repositories);
        return Object.entries(languageStats)
            .sort(([, a], [, b]) => b.count - a.count)
            .slice(0, 10)
            .map(([language, stats]) => ({
            skill: language,
            proficiency: this.mapCountToProficiency(stats.count),
            confidence: Math.min(100, stats.count * 20 + 40),
            evidenceStrength: stats.count >= 5
                ? 'strong'
                : stats.count >= 3
                    ? 'moderate'
                    : 'weak',
            evidence: [`${stats.count} _repositories`, 'Usage actif'],
            growthPotential: 'moderate',
            marketDemand: this.getLanguageMarketDemand(language),
        }));
    }
    generateFallbackSoftSkills(_analytics) {
        const skills = [];
        if (_analytics.collaboration.teamProjects > 0) {
            skills.push({
                skill: 'Collaboration',
                level: 'competent',
                indicators: ['Projets en équipe', 'Pull requests'],
                impactOnCareer: 'significant',
            });
        }
        if (_analytics.productivity.breakdown.consistency > 70) {
            skills.push({
                skill: 'Organisation',
                level: 'strong',
                indicators: ['Commits réguliers', 'Projets maintenus'],
                impactOnCareer: 'moderate',
            });
        }
        if (_analytics.languages.distribution.length > 3) {
            skills.push({
                skill: 'Adaptabilité',
                level: 'strong',
                indicators: ['Multilangages', 'Technologies variées'],
                impactOnCareer: 'significant',
            });
        }
        return skills.slice(0, 6);
    }
    generateFallbackLeadershipSkill(_userProfile, _repositories) {
        const ownedRepos = _repositories.filter((r) => !r.isFork).length;
        const popularRepos = _repositories.filter((r) => r.stargazerCount > 5).length;
        let current = 'individual_contributor';
        let potential = 'emerging';
        if (popularRepos > 2) {
            current = 'informal_leader';
            potential = 'strong';
        }
        if (ownedRepos > 10 && popularRepos > 1) {
            potential = 'strong';
        }
        return {
            current,
            potential,
            indicators: [
                `${ownedRepos} _repositories propres`,
                `${popularRepos} projets populaires`,
            ],
        };
    }
    mapCountToProficiency(count) {
        if (count >= 10)
            return 'expert';
        if (count >= 7)
            return 'proficient';
        if (count >= 4)
            return 'competent';
        if (count >= 2)
            return 'advanced_beginner';
        return 'novice';
    }
    getLanguageMarketDemand(language) {
        const highDemand = [
            'JavaScript',
            'Python',
            'Java',
            'TypeScript',
            'Go',
            'Rust',
            'C#',
        ];
        const moderateDemand = ['C++', 'PHP', 'Ruby', 'Swift', 'Kotlin', 'Scala'];
        if (highDemand.includes(language))
            return 'very_high';
        if (moderateDemand.includes(language))
            return 'high';
        return 'moderate';
    }
    aggregateLanguageStats(_repositories) {
        const stats = {};
        _repositories.forEach((repo) => {
            if (repo.primaryLanguage && typeof stats[repo.primaryLanguage] === 'undefined') {
                stats[repo.primaryLanguage] = { count: 0, totalSize: 0 };
            }
            if (repo.primaryLanguage) {
                stats[repo.primaryLanguage].count++;
            }
            repo.languages.nodes.forEach((lang) => {
                if (typeof stats[lang.name] === 'undefined') {
                    stats[lang.name] = { count: 0, totalSize: 0 };
                }
                stats[lang.name].totalSize += lang.size;
            });
        });
        return stats;
    }
    identifyPeakTimeFromActivity(activity) {
        const peak = activity.hourlyDistribution.reduce((max, current) => current.commits > max.commits ? current : max);
        if (peak.hour >= 6 && peak.hour < 12)
            return 'Matinée';
        if (peak.hour >= 12 && peak.hour < 18)
            return 'Après-midi';
        if (peak.hour >= 18 && peak.hour < 22)
            return 'Soirée';
        return 'Nuit';
    }
    identifyPeakDayFromActivity(activity) {
        const peak = activity.dailyDistribution.reduce((max, current) => current.commits > max.commits ? current : max);
        return peak.day;
    }
    mapConsistencyLevel(consistency) {
        if (consistency >= 80)
            return 'highly_consistent';
        if (consistency >= 60)
            return 'consistent';
        if (consistency >= 40)
            return 'somewhat_consistent';
        return 'irregular';
    }
    identifyConsistencyFactors(_analytics) {
        const factors = [];
        if (_analytics.productivity.breakdown.consistency > 70) {
            factors.push('Routine de développement établie');
        }
        if (_analytics.activity.seasonality.consistency > 60) {
            factors.push("Activité régulière tout au long de l'année");
        }
        if (_analytics.collaboration.teamProjects > 0) {
            factors.push('Engagement dans des projets collaboratifs');
        }
        return factors;
    }
    generateConsistencyRecommendations(_analytics) {
        const recommendations = [];
        if (_analytics.productivity.breakdown.consistency < 50) {
            recommendations.push('Établir une routine de développement quotidienne');
            recommendations.push('Utiliser des outils de suivi du temps');
        }
        if (_analytics.activity.seasonality.consistency < 40) {
            recommendations.push("Planifier l'activité de développement sur l'année");
        }
        return recommendations;
    }
    calculateCodeToImpactRatio(_repositories) {
        const totalCommits = _repositories.reduce((sum, repo) => sum + repo.commits.totalCount, 0);
        const totalStars = _repositories.reduce((sum, repo) => sum + repo.stargazerCount, 0);
        if (totalCommits === 0)
            return 'low';
        const ratio = totalStars / totalCommits;
        if (ratio > 0.1)
            return 'exceptional';
        if (ratio > 0.05)
            return 'high';
        if (ratio > 0.01)
            return 'moderate';
        return 'low';
    }
    assessProblemSolvingSpeed(_analytics) {
        const avgCommitFreq = _analytics.performance.commitFrequency.daily;
        if (avgCommitFreq > 2)
            return 'rapid';
        if (avgCommitFreq > 1)
            return 'quick';
        if (avgCommitFreq > 0.5)
            return 'steady';
        return 'deliberate';
    }
    assessQualityConsistency(_analytics) {
        const codeQuality = _analytics.performance.codeQuality.commitMessageQuality;
        if (codeQuality > 80)
            return 'exceptional';
        if (codeQuality > 60)
            return 'consistent';
        if (codeQuality > 40)
            return 'improving';
        return 'variable';
    }
    generateEfficiencyAnalysis(_repositories, _analytics) {
        const insights = [];
        if (_analytics.productivity.overall > 75) {
            insights.push('Performance globale excellente');
        }
        if (_analytics.devops.cicdAdoption > 50) {
            insights.push('Bonne adoption des pratiques DevOps');
        }
        if (_analytics.languages.distribution.length > 4) {
            insights.push('Polyvalence technique remarquable');
        }
        return `${insights.join('. ')}.`;
    }
    calculateSustainabilityScore(_analytics) {
        let score = 70;
        score += (_analytics.productivity.breakdown.consistency - 50) * 0.3;
        if (_analytics.performance.commitFrequency.daily > 5) {
            score -= 10;
        }
        const soloTeamRatio = _analytics.collaboration.soloProjects /
            (_analytics.collaboration.teamProjects +
                _analytics.collaboration.soloProjects);
        if (soloTeamRatio > 0.3 && soloTeamRatio < 0.7) {
            score += 10;
        }
        return Math.min(100, Math.max(30, Math.round(score)));
    }
    identifyWorkLifeRisks(_analytics) {
        const risks = [];
        if (_analytics.performance.commitFrequency.daily > 4) {
            risks.push('Rythme de développement potentiellement insoutenable');
        }
        if (_analytics.activity.seasonality.consistency < 30) {
            risks.push("Irrégularité importante dans l'activité");
        }
        return risks;
    }
    identifyWorkLifePositives(_analytics) {
        const positives = [];
        if (_analytics.productivity.breakdown.consistency > 70) {
            positives.push('Routine de travail bien établie');
        }
        if (_analytics.collaboration.teamProjects > 0) {
            positives.push('Engagement communautaire sain');
        }
        return positives;
    }
    generateWorkLifeRecommendations(_analytics) {
        const recommendations = [];
        if (_analytics.performance.commitFrequency.daily > 3) {
            recommendations.push('Prévoir des pauses régulières dans le développement');
        }
        if (_analytics.collaboration.soloProjects >
            _analytics.collaboration.teamProjects * 3) {
            recommendations.push('Participer davantage à des projets collaboratifs');
        }
        return recommendations;
    }
    generateFallbackImmediateRecommendations(_analytics) {
        const recommendations = [];
        if (_analytics.devops.testingCulture < 50) {
            recommendations.push({
                category: 'practice',
                recommendation: 'Intégrer les tests unitaires dans vos projets',
                reasoning: 'Amélioration de la qualité et de la maintenabilité du code',
                expectedImpact: 'significant',
                effort: 'medium',
                resources: [
                    {
                        title: 'Guide des tests unitaires',
                        type: 'course',
                        priority: 1,
                    },
                ],
            });
        }
        if (_analytics.devops.cicdAdoption < 30) {
            recommendations.push({
                category: 'tool',
                recommendation: 'Mettre en place GitHub Actions pour vos projets principaux',
                reasoning: 'Automatisation et amélioration de la qualité du code',
                expectedImpact: 'significant',
                effort: 'medium',
                resources: [
                    {
                        title: 'Documentation GitHub Actions',
                        type: 'course',
                        priority: 1,
                    },
                ],
            });
        }
        return recommendations.slice(0, 3);
    }
    generateFallbackShortTermGoals() {
        return [
            {
                goal: 'Améliorer la qualité du code',
                timeframe: '3-6 mois',
                steps: ['Tests unitaires', 'Code review', 'Outils de qualité'],
                metrics: ['Couverture de tests', 'Temps de review'],
            },
        ];
    }
    generateFallbackLongTermVisions() {
        return [
            {
                vision: 'Devenir expert technique reconnu',
                milestones: [
                    'Contributions open source',
                    'Conférences techniques',
                    'Mentoring',
                ],
                skills: ['Leadership technique', 'Communication'],
                experience: ["Projets d'envergure", 'Équipes diverses'],
            },
        ];
    }
    identifyCoreStrengths(_analytics) {
        const strengths = [];
        if (_analytics.productivity.overall > 70) {
            strengths.push({
                strength: 'Productivité élevée',
                manifestation: ['Commits réguliers', 'Projets maintenus'],
                evidence: [
                    `Score productivité: ${_analytics.productivity.overall}/100`,
                ],
                leverageOpportunities: ['Leadership technique', "Projets d'envergure"],
            });
        }
        if (_analytics.languages.distribution.length > 4) {
            strengths.push({
                strength: 'Polyvalence technique',
                manifestation: ['Multi-langages', 'Technologies variées'],
                evidence: [
                    `${_analytics.languages.distribution.length} langages maîtrisés`,
                ],
                leverageOpportunities: [
                    'Architecture technique',
                    'Conseil technologique',
                ],
            });
        }
        return strengths.slice(0, 4);
    }
    identifyEmergingStrengths(_repositories, _analytics) {
        const strengths = [];
        if (_analytics.devops.overallMaturity === 'intermediate') {
            strengths.push({
                strength: 'Pratiques DevOps',
                currentLevel: 'En développement',
                potential: 'Expert potentiel',
                developmentPath: [
                    'CI/CD avancé',
                    'Monitoring',
                    'Infrastructure as Code',
                ],
            });
        }
        return strengths;
    }
    identifyUniqueStrengths() {
        return [];
    }
    identifySkillGaps(_analytics) {
        const gaps = [];
        if (_analytics.devops.testingCulture < 60) {
            gaps.push({
                skill: 'Testing et qualité',
                currentGap: 'moderate',
                importance: 'important',
                learningPath: ['Tests unitaires', 'TDD', "Tests d'intégration"],
                timeToCompetency: '3-6 mois',
                careerImpact: 'Amélioration significative de la crédibilité technique',
            });
        }
        return gaps.slice(0, 5);
    }
    identifyExperienceGaps(_repositories, _analytics) {
        const experiences = [];
        if (_analytics.collaboration.teamProjects < _repositories.length * 0.3) {
            experiences.push({
                experience: "Projets collaboratifs d'envergure",
                type: 'project',
                benefit: 'Développement des compétences de travail en équipe',
                acquiringStrategy: [
                    "Contribuer à l'open source",
                    'Rejoindre des projets internes',
                ],
                prerequisites: ['Compétences techniques solides'],
            });
        }
        return experiences;
    }
    identifyNetworkingOpportunities() {
        return [
            {
                type: 'mentor',
                purpose: 'Accélération du développement technique',
                findingStrategy: [
                    'Communautés techniques',
                    'Conférences',
                    'Projets open source',
                ],
                value: 'Guidance et conseils stratégiques',
            },
        ];
    }
    generateFallbackCareerInsights(_userProfile, _repositories, _analytics) {
        return {
            currentLevel: 'mid_level',
            experienceIndicators: [
                `${_repositories.length} projets`,
                'Activité régulière',
            ],
            trajectory: {
                direction: 'ascending',
                velocity: 'steady',
                confidence: 75,
            },
            suitableRoles: this.generateFallbackSuitableRoles(_analytics),
            marketPosition: this.generateFallbackMarketPosition(_userProfile, _analytics),
        };
    }
    generateFallbackSuitableRoles(_analytics) {
        const roles = [];
        if (_analytics.devops.overallMaturity === 'advanced') {
            roles.push({
                role: 'DevOps Engineer',
                fit: 85,
                reasoning: 'Forte maîtrise des pratiques DevOps',
                requirements: ['Infrastructure', 'Monitoring'],
                growthPath: 'Expertise cloud et orchestration',
            });
        }
        roles.push({
            role: 'Software Developer',
            fit: 80,
            reasoning: 'Compétences techniques polyvalentes',
            requirements: ['Développement logiciel'],
            growthPath: 'Spécialisation ou leadership technique',
        });
        return roles;
    }
    generateFallbackMarketPosition(_userProfile, _analytics) {
        return {
            competitiveness: 'above_average',
            uniqueValueProposition: 'Développeur polyvalent avec bonnes pratiques techniques',
            differentiators: [_analytics.languages.primary, 'Pratiques DevOps'],
            gaps: ['Expérience en équipe', 'Leadership technique'],
        };
    }
    generateFallbackProductivityAnalysis() {
        return {
            patterns: {
                peakPerformance: {
                    timeOfDay: 'Après-midi',
                    dayOfWeek: 'Mercredi',
                    seasonality: 'Q4',
                    reasoning: "Basé sur les patterns d'activité détectés",
                },
                consistency: {
                    level: 'consistent',
                    factors: ['Routine établie'],
                    recommendations: ['Maintenir la régularité'],
                },
            },
            efficiency: {
                codeToImpactRatio: 'moderate',
                problemSolvingSpeed: 'steady',
                qualityConsistency: 'consistent',
                analysis: "Performance globale satisfaisante avec potentiel d'amélioration",
            },
            workLifeBalance: {
                sustainabilityScore: 75,
                riskFactors: [],
                positiveIndicators: ['Activité régulière'],
                recommendations: ["Maintenir l'équilibre actuel"],
            },
        };
    }
    generateFallbackStrengths(_analytics) {
        return {
            core: [
                {
                    strength: 'Constance technique',
                    manifestation: ['Développement régulier'],
                    evidence: [
                        `Score consistance: ${_analytics.productivity.breakdown.consistency}/100`,
                    ],
                    leverageOpportunities: ['Projets long terme'],
                },
            ],
            emerging: [],
            unique: [],
        };
    }
    generateFallbackGrowthOpportunities() {
        return {
            skills: [
                {
                    skill: 'Leadership technique',
                    currentGap: 'moderate',
                    importance: 'important',
                    learningPath: ['Mentorat', "Projets d'équipe", 'Communication'],
                    timeToCompetency: '6-12 mois',
                    careerImpact: 'Évolution vers des rôles senior',
                },
            ],
            experiences: [
                {
                    experience: "Gestion d'équipe technique",
                    type: 'responsibility',
                    benefit: 'Développement du leadership',
                    acquiringStrategy: ['Volontariat interne', 'Projets pilotes'],
                    prerequisites: ['Expertise technique reconnue'],
                },
            ],
            relationships: [
                {
                    type: 'peer',
                    purpose: 'Échange de bonnes pratiques',
                    findingStrategy: ['Communautés de développeurs'],
                    value: 'Apprentissage collaboratif',
                },
            ],
        };
    }
    generateCareerOutlook(career, strengths) {
        const level = career.currentLevel;
        const direction = career.trajectory.direction;
        const coreStrengths = strengths.core.length;
        if (direction === 'ascending' && coreStrengths > 2) {
            return 'Trajectoire très prometteuse avec de solides fondations techniques. Évolution vers des rôles senior anticipated.';
        }
        else if (direction === 'stable' && level === 'senior') {
            return "Position consolidée avec potentiel d'expertise spécialisée ou de leadership technique.";
        }
        else {
            return 'Développement continu avec opportunités de croissance dans plusieurs directions.';
        }
    }
    validateTechnicalSkill(skill) {
        const obj = skill;
        const allowedProficiency = [
            'novice',
            'advanced_beginner',
            'competent',
            'proficient',
            'expert',
        ];
        const proficiency = allowedProficiency.includes(obj['proficiency'])
            ? obj['proficiency']
            : 'competent';
        const allowedEvidenceStrength = [
            'weak',
            'moderate',
            'strong',
            'very_strong',
        ];
        const evidenceStrength = allowedEvidenceStrength.includes(obj['evidenceStrength'])
            ? obj['evidenceStrength']
            : 'moderate';
        const allowedGrowthPotential = [
            'limited',
            'moderate',
            'high',
            'exceptional',
        ];
        const growthPotential = allowedGrowthPotential.includes(obj['growthPotential'])
            ? obj['growthPotential']
            : 'moderate';
        const allowedMarketDemand = [
            'low',
            'moderate',
            'high',
            'very_high',
        ];
        const marketDemand = allowedMarketDemand.includes(obj['marketDemand'])
            ? obj['marketDemand']
            : 'moderate';
        return {
            skill: obj['skill'] ?? 'Unknown',
            proficiency,
            confidence: Math.min(100, Math.max(0, obj['confidence'] ?? 70)),
            evidenceStrength,
            evidence: Array.isArray(obj['evidence'])
                ? obj['evidence'].slice(0, 3)
                : ['Usage détecté'],
            growthPotential,
            marketDemand,
        };
    }
    validateSoftSkill(skill) {
        const obj = skill;
        const allowedLevel = [
            'developing',
            'competent',
            'strong',
            'exceptional',
        ];
        const level = allowedLevel.includes(obj['level'])
            ? obj['level']
            : 'competent';
        return {
            skill: obj['skill'] ?? 'Unknown',
            level,
            indicators: Array.isArray(obj['indicators'])
                ? obj['indicators'].slice(0, 3)
                : [],
            impactOnCareer: 'significant',
        };
    }
    validateLeadershipSkill(leadership) {
        const obj = leadership;
        const allowedCurrent = [
            'individual_contributor',
            'informal_leader',
            'team_lead',
            'senior_leader',
        ];
        const current = allowedCurrent.includes(obj['current'])
            ? obj['current']
            : 'individual_contributor';
        const allowedPotential = [
            'limited',
            'emerging',
            'strong',
            'exceptional',
        ];
        const potential = allowedPotential.includes(obj['potential'])
            ? obj['potential']
            : 'emerging';
        return {
            current,
            potential,
            indicators: Array.isArray(obj['indicators'])
                ? obj['indicators'].slice(0, 3)
                : [],
        };
    }
    validateTrajectory(trajectory) {
        const obj = trajectory;
        const allowedDirection = [
            'ascending',
            'stable',
            'transitioning',
            'exploring',
        ];
        const direction = allowedDirection.includes(obj['direction'])
            ? obj['direction']
            : 'stable';
        const allowedVelocity = ['slow', 'steady', 'rapid', 'exponential'];
        const velocity = allowedVelocity.includes(obj['velocity'])
            ? obj['velocity']
            : 'steady';
        return {
            direction,
            velocity,
            confidence: Math.min(100, Math.max(0, obj['confidence'] ?? 70)),
        };
    }
    validateSuitableRole(role) {
        const obj = role;
        return {
            role: obj['role'] ?? 'Software Developer',
            fit: Math.min(100, Math.max(0, obj['fit'] ?? 70)),
            reasoning: obj['reasoning'] ?? 'Compétences techniques adaptées',
            requirements: Array.isArray(obj['requirements'])
                ? obj['requirements'].slice(0, 4)
                : [],
            growthPath: obj['growthPath'] ?? 'Évolution naturelle',
        };
    }
    validateMarketPosition(position) {
        const obj = position;
        const allowedCompetitiveness = [
            'below_average',
            'average',
            'above_average',
            'exceptional',
        ];
        const competitiveness = allowedCompetitiveness.includes(obj['competitiveness'])
            ? obj['competitiveness']
            : 'average';
        return {
            competitiveness,
            uniqueValueProposition: obj['uniqueValueProposition'] ?? 'Profil technique solide',
            differentiators: Array.isArray(obj['differentiators'])
                ? obj['differentiators'].slice(0, 4)
                : [],
            gaps: Array.isArray(obj['gaps'])
                ? obj['gaps'].slice(0, 4)
                : [],
        };
    }
    validateRecommendation(rec) {
        const obj = rec;
        const allowedCategory = ['skill', 'tool', 'practice', 'project'];
        const category = allowedCategory.includes(obj['category'])
            ? obj['category']
            : 'skill';
        const allowedExpectedImpact = [
            'minor',
            'moderate',
            'significant',
            'transformative',
        ];
        const expectedImpact = allowedExpectedImpact.includes(obj['expectedImpact'])
            ? obj['expectedImpact']
            : 'moderate';
        const allowedEffort = ['low', 'medium', 'high'];
        const effort = allowedEffort.includes(obj['effort'])
            ? obj['effort']
            : 'medium';
        const allowedResourceType = [
            'project',
            'course',
            'book',
            'certification',
            'community',
        ];
        return {
            category,
            recommendation: obj['recommendation'] ?? 'Amélioration continue',
            reasoning: obj['reasoning'] ?? 'Développement professionnel',
            expectedImpact,
            effort,
            resources: Array.isArray(obj['resources'])
                ? obj['resources']
                    .slice(0, 3)
                    .map((res) => {
                    const resourceType = allowedResourceType.includes(res.type)
                        ? res.type
                        : 'course';
                    return {
                        title: res.title ?? 'Ressource',
                        type: resourceType,
                        url: res.url ?? undefined,
                        priority: Math.min(10, Math.max(1, res.priority ?? 5)),
                    };
                })
                : [],
        };
    }
    validateShortTermGoal(goal) {
        const obj = goal;
        return {
            goal: obj['goal'] ?? 'Amélioration technique',
            timeframe: obj['timeframe'] ?? '3-6 mois',
            steps: Array.isArray(obj['steps'])
                ? obj['steps'].slice(0, 5)
                : [],
            metrics: Array.isArray(obj['metrics'])
                ? obj['metrics'].slice(0, 3)
                : [],
        };
    }
    validateLongTermVision(vision) {
        const obj = vision;
        return {
            vision: obj['vision'] ?? 'Évolution professionnelle',
            milestones: Array.isArray(obj['milestones'])
                ? obj['milestones'].slice(0, 4)
                : [],
            skills: Array.isArray(obj['skills'])
                ? obj['skills'].slice(0, 4)
                : [],
            experience: Array.isArray(obj['experience'])
                ? obj['experience'].slice(0, 4)
                : [],
        };
    }
}
exports.AIService = AIService;
exports.aiService = new AIService();
//# sourceMappingURL=AIService.js.map