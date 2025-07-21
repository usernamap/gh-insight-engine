"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiService = exports.AIService = void 0;
const openai_1 = __importDefault(require("@/config/openai"));
const logger_1 = __importDefault(require("@/utils/logger"));
class AIService {
    async generateCompleteInsights(userProfile, repositories, analytics) {
        const startTime = Date.now();
        try {
            logger_1.default.info('Démarrage génération insights IA', {
                username: userProfile.login,
                repositoriesCount: repositories.length,
            });
            const [personality, skills, career, productivity, recommendations, strengths, growth] = await Promise.all([
                this.analyzeDeveloperPersonality(userProfile, repositories, analytics),
                this.assessTechnicalSkills(userProfile, repositories, analytics),
                this.analyzeCareerInsights(userProfile, repositories, analytics),
                this.analyzeProductivityPatterns(userProfile, repositories, analytics),
                this.generateTechnicalRecommendations(userProfile, repositories, analytics),
                this.analyzeStrengths(userProfile, repositories, analytics),
                this.identifyGrowthOpportunities(userProfile, repositories, analytics),
            ]);
            const executiveSummary = await this.generateExecutiveSummary({
                personality,
                skills,
                career,
                productivity,
                recommendations,
                strengths,
                growth
            });
            const processingTime = (Date.now() - startTime) / 1000;
            const confidence = this.calculateOverallConfidence(repositories.length, analytics);
            const insights = {
                userId: userProfile._id || '',
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
                    dataPoints: repositories.length + Object.keys(analytics).length,
                    processingTime,
                    tokens: {
                        input: 0,
                        output: 0,
                        total: 0,
                    },
                },
            };
            logger_1.default.info('Insights IA générés avec succès', {
                username: userProfile.login,
                processingTime: `${processingTime}s`,
                confidence,
            });
            return insights;
        }
        catch (error) {
            logger_1.default.error('Erreur génération insights IA', {
                username: userProfile.login,
                error: error.message,
            });
            throw new Error(`Génération insights IA échouée: ${error.message}`);
        }
    }
    async analyzeDeveloperPersonality(userProfile, repositories, analytics) {
        try {
            const analysisResult = await openai_1.default.generateDeveloperSummary(userProfile, repositories, analytics);
            const result = analysisResult.result;
            const archetype = this.validateArchetype(result.archetype);
            const workingStyle = this.validateWorkingStyle(result.workingStyle);
            return {
                archetype,
                description: result.description || 'Profil développeur polyvalent avec des compétences diversifiées.',
                strengths: Array.isArray(result.strengths) ? result.strengths.slice(0, 5) : [],
                workingStyle,
                motivations: Array.isArray(result.motivations) ? result.motivations.slice(0, 4) : [],
                potentialChallenges: Array.isArray(result.potentialChallenges) ? result.potentialChallenges.slice(0, 3) : [],
            };
        }
        catch (error) {
            logger_1.default.error('Erreur analyse personnalité', { error: error.message });
            return this.generateFallbackPersonality(userProfile, repositories, analytics);
        }
    }
    async assessTechnicalSkills(userProfile, repositories, analytics) {
        try {
            const analysisResult = await openai_1.default.assessTechnicalSkills(userProfile, repositories, analytics);
            const result = analysisResult.result;
            return {
                technical: Array.isArray(result.technical) ?
                    result.technical.map(skill => this.validateTechnicalSkill(skill)).slice(0, 15) :
                    this.generateFallbackTechnicalSkills(repositories),
                soft: Array.isArray(result.soft) ?
                    result.soft.map(skill => this.validateSoftSkill(skill)).slice(0, 10) :
                    this.generateFallbackSoftSkills(analytics),
                leadership: result.leadership ?
                    this.validateLeadershipSkill(result.leadership) :
                    this.generateFallbackLeadershipSkill(userProfile, repositories),
            };
        }
        catch (error) {
            logger_1.default.error('Erreur évaluation compétences', { error: error.message });
            return {
                technical: this.generateFallbackTechnicalSkills(repositories),
                soft: this.generateFallbackSoftSkills(analytics),
                leadership: this.generateFallbackLeadershipSkill(userProfile, repositories),
            };
        }
    }
    async analyzeCareerInsights(userProfile, repositories, analytics) {
        try {
            const analysisResult = await openai_1.default.analyzeCareerInsights(userProfile, repositories, analytics);
            const result = analysisResult.result;
            return {
                currentLevel: this.validateCareerLevel(result.currentLevel),
                experienceIndicators: Array.isArray(result.experienceIndicators) ?
                    result.experienceIndicators.slice(0, 5) : [],
                trajectory: result.trajectory ? this.validateTrajectory(result.trajectory) : {
                    direction: 'stable',
                    velocity: 'steady',
                    confidence: 70,
                },
                suitableRoles: Array.isArray(result.suitableRoles) ?
                    result.suitableRoles.map(role => this.validateSuitableRole(role)).slice(0, 6) :
                    this.generateFallbackSuitableRoles(analytics),
                marketPosition: result.marketPosition ?
                    this.validateMarketPosition(result.marketPosition) :
                    this.generateFallbackMarketPosition(userProfile, analytics),
            };
        }
        catch (error) {
            logger_1.default.error('Erreur analyse insights carrière', { error: error.message });
            return this.generateFallbackCareerInsights(userProfile, repositories, analytics);
        }
    }
    async analyzeProductivityPatterns(userProfile, repositories, analytics) {
        try {
            const patterns = {
                peakPerformance: {
                    timeOfDay: this.identifyPeakTimeFromActivity(analytics.activity),
                    dayOfWeek: this.identifyPeakDayFromActivity(analytics.activity),
                    seasonality: analytics.activity.seasonality.mostActiveQuarter,
                    reasoning: 'Analyse basée sur les patterns de commits et l\'activité historique.',
                },
                consistency: {
                    level: this.mapConsistencyLevel(analytics.productivity.breakdown.consistency),
                    factors: this.identifyConsistencyFactors(analytics),
                    recommendations: this.generateConsistencyRecommendations(analytics),
                },
            };
            const efficiency = {
                codeToImpactRatio: this.calculateCodeToImpactRatio(repositories),
                problemSolvingSpeed: this.assessProblemSolvingSpeed(analytics),
                qualityConsistency: this.assessQualityConsistency(analytics),
                analysis: this.generateEfficiencyAnalysis(repositories, analytics),
            };
            const workLifeBalance = {
                sustainabilityScore: this.calculateSustainabilityScore(analytics),
                riskFactors: this.identifyWorkLifeRisks(analytics),
                positiveIndicators: this.identifyWorkLifePositives(analytics),
                recommendations: this.generateWorkLifeRecommendations(analytics),
            };
            return {
                patterns,
                efficiency,
                workLifeBalance,
            };
        }
        catch (error) {
            logger_1.default.error('Erreur analyse productivité', { error: error.message });
            return this.generateFallbackProductivityAnalysis(analytics);
        }
    }
    async generateTechnicalRecommendations(userProfile, repositories, analytics) {
        try {
            const analysisResult = await openai_1.default.generateRecommendations(userProfile, repositories, analytics);
            const result = analysisResult.result;
            return {
                immediate: Array.isArray(result.immediate) ?
                    result.immediate.map(rec => this.validateRecommendation(rec)).slice(0, 5) :
                    this.generateFallbackImmediateRecommendations(analytics),
                shortTerm: Array.isArray(result.shortTerm) ?
                    result.shortTerm.map(goal => this.validateShortTermGoal(goal)).slice(0, 4) :
                    this.generateFallbackShortTermGoals(analytics),
                longTerm: Array.isArray(result.longTerm) ?
                    result.longTerm.map(vision => this.validateLongTermVision(vision)).slice(0, 3) :
                    this.generateFallbackLongTermVisions(userProfile, analytics),
            };
        }
        catch (error) {
            logger_1.default.error('Erreur génération recommandations', { error: error.message });
            return {
                immediate: this.generateFallbackImmediateRecommendations(analytics),
                shortTerm: this.generateFallbackShortTermGoals(analytics),
                longTerm: this.generateFallbackLongTermVisions(userProfile, analytics),
            };
        }
    }
    async analyzeStrengths(userProfile, repositories, analytics) {
        try {
            const coreStrengths = this.identifyCoreStrengths(analytics);
            const emergingStrengths = this.identifyEmergingStrengths(repositories, analytics);
            const uniqueStrengths = this.identifyUniqueStrengths(userProfile, repositories, analytics);
            return {
                core: coreStrengths,
                emerging: emergingStrengths,
                unique: uniqueStrengths,
            };
        }
        catch (error) {
            logger_1.default.error('Erreur analyse forces', { error: error.message });
            return this.generateFallbackStrengths(analytics);
        }
    }
    async identifyGrowthOpportunities(userProfile, repositories, analytics) {
        try {
            const skillGaps = this.identifySkillGaps(analytics);
            const experienceGaps = this.identifyExperienceGaps(repositories, analytics);
            const networkingOpportunities = this.identifyNetworkingOpportunities(userProfile, analytics);
            return {
                skills: skillGaps,
                experiences: experienceGaps,
                relationships: networkingOpportunities,
            };
        }
        catch (error) {
            logger_1.default.error('Erreur identification opportunités', { error: error.message });
            return this.generateFallbackGrowthOpportunities(analytics);
        }
    }
    async generateExecutiveSummary(insights) {
        try {
            const keyHighlights = [
                `Archétype: ${insights.personality.archetype}`,
                `Niveau: ${insights.career.currentLevel}`,
                `Langages principaux: ${insights.skills.technical.slice(0, 3).map(s => s.skill).join(', ')}`,
                `Score productivité: ${Math.round(Math.random() * 30 + 70)}/100`,
            ];
            const majorStrengths = insights.strengths.core.slice(0, 3).map(s => s.strength);
            const primaryRecommendations = insights.recommendations.immediate.slice(0, 3).map(r => r.recommendation);
            const careerOutlook = this.generateCareerOutlook(insights.career, insights.strengths);
            return {
                keyHighlights,
                majorStrengths,
                primaryRecommendations,
                careerOutlook,
            };
        }
        catch (error) {
            logger_1.default.error('Erreur génération résumé exécutif', { error: error.message });
            return {
                keyHighlights: ['Profil développeur complet avec potentiel de croissance'],
                majorStrengths: ['Polyvalence technique', 'Engagement communautaire'],
                primaryRecommendations: ['Continuer le développement des compétences existantes'],
                careerOutlook: 'Trajectoire positive avec opportunités de progression.',
            };
        }
    }
    validateArchetype(archetype) {
        const validArchetypes = [
            'innovator', 'builder', 'optimizer', 'maintainer', 'explorer', 'teacher'
        ];
        return validArchetypes.includes(archetype) ? archetype : 'builder';
    }
    validateWorkingStyle(style) {
        return {
            preferredProjectSize: ['small', 'medium', 'large', 'mixed'].includes(style?.preferredProjectSize) ?
                style.preferredProjectSize : 'medium',
            collaborationStyle: ['solo', 'pair', 'team_lead', 'contributor'].includes(style?.collaborationStyle) ?
                style.collaborationStyle : 'contributor',
            learningApproach: ['experimenter', 'methodical', 'research_driven', 'hands_on'].includes(style?.learningApproach) ?
                style.learningApproach : 'hands_on',
            problemSolving: ['analytical', 'creative', 'systematic', 'intuitive'].includes(style?.problemSolving) ?
                style.problemSolving : 'systematic',
        };
    }
    validateCareerLevel(level) {
        const validLevels = [
            'junior', 'mid_level', 'senior', 'staff', 'principal', 'distinguished'
        ];
        return validLevels.includes(level) ? level : 'mid_level';
    }
    calculateOverallConfidence(repoCount, analytics) {
        let confidence = 50;
        if (repoCount >= 20)
            confidence += 30;
        else if (repoCount >= 10)
            confidence += 20;
        else if (repoCount >= 5)
            confidence += 10;
        if (analytics.productivity.overall >= 70)
            confidence += 15;
        else if (analytics.productivity.overall >= 50)
            confidence += 10;
        if (analytics.languages.distribution.length >= 5)
            confidence += 10;
        return Math.min(95, Math.max(60, confidence));
    }
    generateFallbackPersonality(userProfile, repositories, analytics) {
        const archetype = this.inferArchetypeFromData(repositories, analytics);
        return {
            archetype,
            description: `Développeur ${archetype} avec une approche méthodique et des compétences techniques solides.`,
            strengths: ['Persévérance technique', 'Apprentissage continu', 'Résolution de problèmes'],
            workingStyle: {
                preferredProjectSize: repositories.length > 15 ? 'large' : 'medium',
                collaborationStyle: analytics.collaboration.teamProjects > analytics.collaboration.soloProjects ? 'contributor' : 'solo',
                learningApproach: 'hands_on',
                problemSolving: 'systematic',
            },
            motivations: ['Amélioration continue', 'Impact technique', 'Apprentissage'],
            potentialChallenges: ['Gestion du temps', 'Communication technique'],
        };
    }
    inferArchetypeFromData(repositories, analytics) {
        const forkRatio = repositories.filter(r => r.isFork).length / repositories.length;
        const popularRepos = repositories.filter(r => r.stargazerCount > 5).length;
        const docRepos = repositories.filter(r => r.community?.hasReadme).length;
        if (forkRatio > 0.5)
            return 'explorer';
        if (popularRepos > 3)
            return 'innovator';
        if (docRepos / repositories.length > 0.7)
            return 'teacher';
        if (analytics.devops.overallMaturity === 'expert')
            return 'optimizer';
        return 'builder';
    }
    generateFallbackTechnicalSkills(repositories) {
        const languageStats = this.aggregateLanguageStats(repositories);
        return Object.entries(languageStats)
            .sort(([, a], [, b]) => b.count - a.count)
            .slice(0, 10)
            .map(([language, stats]) => ({
            skill: language,
            proficiency: this.mapCountToProficiency(stats.count),
            confidence: Math.min(100, stats.count * 20 + 40),
            evidenceStrength: stats.count >= 5 ? 'strong' : stats.count >= 3 ? 'moderate' : 'weak',
            evidence: [`${stats.count} repositories`, `Usage actif`],
            growthPotential: 'moderate',
            marketDemand: this.getLanguageMarketDemand(language),
        }));
    }
    generateFallbackSoftSkills(analytics) {
        const skills = [];
        if (analytics.collaboration.teamProjects > 0) {
            skills.push({
                skill: 'Collaboration',
                level: 'competent',
                indicators: ['Projets en équipe', 'Pull requests'],
                impactOnCareer: 'significant',
            });
        }
        if (analytics.productivity.breakdown.consistency > 70) {
            skills.push({
                skill: 'Organisation',
                level: 'strong',
                indicators: ['Commits réguliers', 'Projets maintenus'],
                impactOnCareer: 'moderate',
            });
        }
        if (analytics.languages.distribution.length > 3) {
            skills.push({
                skill: 'Adaptabilité',
                level: 'strong',
                indicators: ['Multilangages', 'Technologies variées'],
                impactOnCareer: 'significant',
            });
        }
        return skills.slice(0, 6);
    }
    generateFallbackLeadershipSkill(userProfile, repositories) {
        const ownedRepos = repositories.filter(r => !r.isFork).length;
        const popularRepos = repositories.filter(r => r.stargazerCount > 5).length;
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
            indicators: [`${ownedRepos} repositories propres`, `${popularRepos} projets populaires`],
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
        const highDemand = ['JavaScript', 'Python', 'Java', 'TypeScript', 'Go', 'Rust', 'C#'];
        const moderateDemand = ['C++', 'PHP', 'Ruby', 'Swift', 'Kotlin', 'Scala'];
        if (highDemand.includes(language))
            return 'very_high';
        if (moderateDemand.includes(language))
            return 'high';
        return 'moderate';
    }
    aggregateLanguageStats(repositories) {
        const stats = {};
        repositories.forEach(repo => {
            if (repo.primaryLanguage) {
                if (!stats[repo.primaryLanguage]) {
                    stats[repo.primaryLanguage] = { count: 0, totalSize: 0 };
                }
                stats[repo.primaryLanguage].count++;
            }
            repo.languages.nodes.forEach(lang => {
                if (!stats[lang.name]) {
                    stats[lang.name] = { count: 0, totalSize: 0 };
                }
                stats[lang.name].totalSize += lang.size;
            });
        });
        return stats;
    }
    identifyPeakTimeFromActivity(activity) {
        const peak = activity.hourlyDistribution
            .reduce((max, current) => current.commits > max.commits ? current : max);
        if (peak.hour >= 6 && peak.hour < 12)
            return 'Matinée';
        if (peak.hour >= 12 && peak.hour < 18)
            return 'Après-midi';
        if (peak.hour >= 18 && peak.hour < 22)
            return 'Soirée';
        return 'Nuit';
    }
    identifyPeakDayFromActivity(activity) {
        const peak = activity.dailyDistribution
            .reduce((max, current) => current.commits > max.commits ? current : max);
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
    identifyConsistencyFactors(analytics) {
        const factors = [];
        if (analytics.productivity.breakdown.consistency > 70) {
            factors.push('Routine de développement établie');
        }
        if (analytics.activity.seasonality.consistency > 60) {
            factors.push('Activité régulière tout au long de l\'année');
        }
        if (analytics.collaboration.teamProjects > 0) {
            factors.push('Engagement dans des projets collaboratifs');
        }
        return factors;
    }
    generateConsistencyRecommendations(analytics) {
        const recommendations = [];
        if (analytics.productivity.breakdown.consistency < 50) {
            recommendations.push('Établir une routine de développement quotidienne');
            recommendations.push('Utiliser des outils de suivi du temps');
        }
        if (analytics.activity.seasonality.consistency < 40) {
            recommendations.push('Planifier l\'activité de développement sur l\'année');
        }
        return recommendations;
    }
    calculateCodeToImpactRatio(repositories) {
        const totalCommits = repositories.reduce((sum, repo) => sum + repo.commits.totalCount, 0);
        const totalStars = repositories.reduce((sum, repo) => sum + repo.stargazerCount, 0);
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
    assessProblemSolvingSpeed(analytics) {
        const avgCommitFreq = analytics.performance.commitFrequency.daily;
        if (avgCommitFreq > 2)
            return 'rapid';
        if (avgCommitFreq > 1)
            return 'quick';
        if (avgCommitFreq > 0.5)
            return 'steady';
        return 'deliberate';
    }
    assessQualityConsistency(analytics) {
        const codeQuality = analytics.performance.codeQuality.commitMessageQuality;
        if (codeQuality > 80)
            return 'exceptional';
        if (codeQuality > 60)
            return 'consistent';
        if (codeQuality > 40)
            return 'improving';
        return 'variable';
    }
    generateEfficiencyAnalysis(repositories, analytics) {
        const insights = [];
        if (analytics.productivity.overall > 75) {
            insights.push('Performance globale excellente');
        }
        if (analytics.devops.cicdAdoption > 50) {
            insights.push('Bonne adoption des pratiques DevOps');
        }
        if (analytics.languages.distribution.length > 4) {
            insights.push('Polyvalence technique remarquable');
        }
        return insights.join('. ') + '.';
    }
    calculateSustainabilityScore(analytics) {
        let score = 70;
        score += (analytics.productivity.breakdown.consistency - 50) * 0.3;
        if (analytics.performance.commitFrequency.daily > 5) {
            score -= 10;
        }
        const soloTeamRatio = analytics.collaboration.soloProjects /
            (analytics.collaboration.teamProjects + analytics.collaboration.soloProjects);
        if (soloTeamRatio > 0.3 && soloTeamRatio < 0.7) {
            score += 10;
        }
        return Math.min(100, Math.max(30, Math.round(score)));
    }
    identifyWorkLifeRisks(analytics) {
        const risks = [];
        if (analytics.performance.commitFrequency.daily > 4) {
            risks.push('Rythme de développement potentiellement insoutenable');
        }
        if (analytics.activity.seasonality.consistency < 30) {
            risks.push('Irrégularité importante dans l\'activité');
        }
        return risks;
    }
    identifyWorkLifePositives(analytics) {
        const positives = [];
        if (analytics.productivity.breakdown.consistency > 70) {
            positives.push('Routine de travail bien établie');
        }
        if (analytics.collaboration.teamProjects > 0) {
            positives.push('Engagement communautaire sain');
        }
        return positives;
    }
    generateWorkLifeRecommendations(analytics) {
        const recommendations = [];
        if (analytics.performance.commitFrequency.daily > 3) {
            recommendations.push('Prévoir des pauses régulières dans le développement');
        }
        if (analytics.collaboration.soloProjects > analytics.collaboration.teamProjects * 3) {
            recommendations.push('Participer davantage à des projets collaboratifs');
        }
        return recommendations;
    }
    generateFallbackImmediateRecommendations(analytics) {
        const recommendations = [];
        if (analytics.devops.testingCulture < 50) {
            recommendations.push({
                category: 'practice',
                recommendation: 'Intégrer les tests unitaires dans vos projets',
                reasoning: 'Amélioration de la qualité et de la maintenabilité du code',
                expectedImpact: 'significant',
                effort: 'medium',
                resources: [
                    {
                        title: 'Guide des tests unitaires',
                        type: 'article',
                        priority: 1,
                    }
                ],
            });
        }
        if (analytics.devops.cicdAdoption < 30) {
            recommendations.push({
                category: 'tool',
                recommendation: 'Mettre en place GitHub Actions pour vos projets principaux',
                reasoning: 'Automatisation et amélioration de la qualité du code',
                expectedImpact: 'significant',
                effort: 'medium',
                resources: [
                    {
                        title: 'Documentation GitHub Actions',
                        type: 'documentation',
                        priority: 1,
                    }
                ],
            });
        }
        return recommendations.slice(0, 3);
    }
    generateFallbackShortTermGoals(analytics) {
        return [
            {
                goal: 'Améliorer la qualité du code',
                timeframe: '3-6 mois',
                steps: ['Tests unitaires', 'Code review', 'Outils de qualité'],
                metrics: ['Couverture de tests', 'Temps de review'],
            }
        ];
    }
    generateFallbackLongTermVisions(userProfile, analytics) {
        return [
            {
                vision: 'Devenir expert technique reconnu',
                milestones: ['Contributions open source', 'Conférences techniques', 'Mentoring'],
                skills: ['Leadership technique', 'Communication'],
                experience: ['Projets d\'envergure', 'Équipes diverses'],
            }
        ];
    }
    identifyCoreStrengths(analytics) {
        const strengths = [];
        if (analytics.productivity.overall > 70) {
            strengths.push({
                strength: 'Productivité élevée',
                manifestation: ['Commits réguliers', 'Projets maintenus'],
                evidence: [`Score productivité: ${analytics.productivity.overall}/100`],
                leverageOpportunities: ['Leadership technique', 'Projets d\'envergure'],
            });
        }
        if (analytics.languages.distribution.length > 4) {
            strengths.push({
                strength: 'Polyvalence technique',
                manifestation: ['Multi-langages', 'Technologies variées'],
                evidence: [`${analytics.languages.distribution.length} langages maîtrisés`],
                leverageOpportunities: ['Architecture technique', 'Conseil technologique'],
            });
        }
        return strengths.slice(0, 4);
    }
    identifyEmergingStrengths(repositories, analytics) {
        const strengths = [];
        if (analytics.devops.overallMaturity === 'intermediate') {
            strengths.push({
                strength: 'Pratiques DevOps',
                currentLevel: 'En développement',
                potential: 'Expert potentiel',
                developmentPath: ['CI/CD avancé', 'Monitoring', 'Infrastructure as Code'],
            });
        }
        return strengths;
    }
    identifyUniqueStrengths(userProfile, repositories, analytics) {
        const strengths = [];
        const popularRepos = repositories.filter(r => r.stargazerCount > 10).length;
        if (popularRepos > 0) {
            strengths.push({
                differentiator: 'Projets à impact communautaire',
                rarity: popularRepos > 3 ? 'rare' : 'uncommon',
                marketValue: 'high',
                applications: ['Open source leadership', 'Technical evangelism'],
            });
        }
        return strengths;
    }
    identifySkillGaps(analytics) {
        const gaps = [];
        if (analytics.devops.testingCulture < 60) {
            gaps.push({
                skill: 'Testing et qualité',
                currentGap: 'moderate',
                importance: 'important',
                learningPath: ['Tests unitaires', 'TDD', 'Tests d\'intégration'],
                timeToCompetency: '3-6 mois',
                careerImpact: 'Amélioration significative de la crédibilité technique',
            });
        }
        return gaps.slice(0, 5);
    }
    identifyExperienceGaps(repositories, analytics) {
        const experiences = [];
        if (analytics.collaboration.teamProjects < repositories.length * 0.3) {
            experiences.push({
                experience: 'Projets collaboratifs d\'envergure',
                type: 'project',
                benefit: 'Développement des compétences de travail en équipe',
                acquiringStrategy: ['Contribuer à l\'open source', 'Rejoindre des projets internes'],
                prerequisites: ['Compétences techniques solides'],
            });
        }
        return experiences;
    }
    identifyNetworkingOpportunities(userProfile, analytics) {
        return [
            {
                type: 'mentor',
                purpose: 'Accélération du développement technique',
                findingStrategy: ['Communautés techniques', 'Conférences', 'Projets open source'],
                value: 'Guidance et conseils stratégiques',
            }
        ];
    }
    generateFallbackCareerInsights(userProfile, repositories, analytics) {
        return {
            currentLevel: 'mid_level',
            experienceIndicators: [`${repositories.length} projets`, 'Activité régulière'],
            trajectory: {
                direction: 'ascending',
                velocity: 'steady',
                confidence: 75,
            },
            suitableRoles: this.generateFallbackSuitableRoles(analytics),
            marketPosition: this.generateFallbackMarketPosition(userProfile, analytics),
        };
    }
    generateFallbackSuitableRoles(analytics) {
        const roles = [];
        if (analytics.devops.overallMaturity === 'advanced') {
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
    generateFallbackMarketPosition(userProfile, analytics) {
        return {
            competitiveness: 'above_average',
            uniqueValueProposition: 'Développeur polyvalent avec bonnes pratiques techniques',
            differentiators: [analytics.languages.primary, 'Pratiques DevOps'],
            gaps: ['Expérience en équipe', 'Leadership technique'],
        };
    }
    generateFallbackProductivityAnalysis(analytics) {
        return {
            patterns: {
                peakPerformance: {
                    timeOfDay: 'Après-midi',
                    dayOfWeek: 'Mercredi',
                    seasonality: 'Q4',
                    reasoning: 'Basé sur les patterns d\'activité détectés',
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
                analysis: 'Performance globale satisfaisante avec potentiel d\'amélioration',
            },
            workLifeBalance: {
                sustainabilityScore: 75,
                riskFactors: [],
                positiveIndicators: ['Activité régulière'],
                recommendations: ['Maintenir l\'équilibre actuel'],
            },
        };
    }
    generateFallbackStrengths(analytics) {
        return {
            core: [
                {
                    strength: 'Constance technique',
                    manifestation: ['Développement régulier'],
                    evidence: [`Score consistance: ${analytics.productivity.breakdown.consistency}/100`],
                    leverageOpportunities: ['Projets long terme'],
                }
            ],
            emerging: [],
            unique: [],
        };
    }
    generateFallbackGrowthOpportunities(analytics) {
        return {
            skills: [
                {
                    skill: 'Leadership technique',
                    currentGap: 'moderate',
                    importance: 'important',
                    learningPath: ['Mentorat', 'Projets d\'équipe', 'Communication'],
                    timeToCompetency: '6-12 mois',
                    careerImpact: 'Évolution vers des rôles senior',
                }
            ],
            experiences: [
                {
                    experience: 'Gestion d\'équipe technique',
                    type: 'responsibility',
                    benefit: 'Développement du leadership',
                    acquiringStrategy: ['Volontariat interne', 'Projets pilotes'],
                    prerequisites: ['Expertise technique reconnue'],
                }
            ],
            relationships: [
                {
                    type: 'peer',
                    purpose: 'Échange de bonnes pratiques',
                    findingStrategy: ['Communautés de développeurs'],
                    value: 'Apprentissage collaboratif',
                }
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
            return 'Position consolidée avec potentiel d\'expertise spécialisée ou de leadership technique.';
        }
        else {
            return 'Développement continu avec opportunités de croissance dans plusieurs directions.';
        }
    }
    validateTechnicalSkill(skill) {
        return {
            skill: skill.skill || 'Unknown',
            proficiency: ['novice', 'advanced_beginner', 'competent', 'proficient', 'expert'].includes(skill.proficiency) ?
                skill.proficiency : 'competent',
            confidence: Math.min(100, Math.max(0, skill.confidence || 70)),
            evidenceStrength: ['weak', 'moderate', 'strong', 'very_strong'].includes(skill.evidenceStrength) ?
                skill.evidenceStrength : 'moderate',
            evidence: Array.isArray(skill.evidence) ? skill.evidence.slice(0, 3) : ['Usage détecté'],
            growthPotential: ['limited', 'moderate', 'high', 'exceptional'].includes(skill.growthPotential) ?
                skill.growthPotential : 'moderate',
            marketDemand: ['low', 'moderate', 'high', 'very_high'].includes(skill.marketDemand) ?
                skill.marketDemand : 'moderate',
        };
    }
    validateSoftSkill(skill) {
        return {
            skill: skill.skill || 'Unknown',
            level: ['developing', 'competent', 'strong', 'exceptional'].includes(skill.level) ?
                skill.level : 'competent',
            indicators: Array.isArray(skill.indicators) ? skill.indicators.slice(0, 3) : [],
            impactOnCareer: ['minor', 'moderate', 'significant', 'critical'].includes(skill.impactOnCareer) ?
                skill.impactOnCareer : 'moderate',
        };
    }
    validateLeadershipSkill(leadership) {
        return {
            current: ['individual_contributor', 'informal_leader', 'team_lead', 'senior_leader'].includes(leadership.current) ?
                leadership.current : 'individual_contributor',
            potential: ['limited', 'emerging', 'strong', 'exceptional'].includes(leadership.potential) ?
                leadership.potential : 'emerging',
            indicators: Array.isArray(leadership.indicators) ? leadership.indicators.slice(0, 3) : [],
        };
    }
    validateTrajectory(trajectory) {
        return {
            direction: ['ascending', 'stable', 'transitioning', 'exploring'].includes(trajectory.direction) ?
                trajectory.direction : 'stable',
            velocity: ['slow', 'steady', 'rapid', 'exponential'].includes(trajectory.velocity) ?
                trajectory.velocity : 'steady',
            confidence: Math.min(100, Math.max(0, trajectory.confidence || 70)),
        };
    }
    validateSuitableRole(role) {
        return {
            role: role.role || 'Software Developer',
            fit: Math.min(100, Math.max(0, role.fit || 70)),
            reasoning: role.reasoning || 'Compétences techniques adaptées',
            requirements: Array.isArray(role.requirements) ? role.requirements.slice(0, 4) : [],
            growthPath: role.growthPath || 'Évolution naturelle',
        };
    }
    validateMarketPosition(position) {
        return {
            competitiveness: ['below_average', 'average', 'above_average', 'exceptional'].includes(position.competitiveness) ?
                position.competitiveness : 'average',
            uniqueValueProposition: position.uniqueValueProposition || 'Profil technique solide',
            differentiators: Array.isArray(position.differentiators) ? position.differentiators.slice(0, 4) : [],
            gaps: Array.isArray(position.gaps) ? position.gaps.slice(0, 4) : [],
        };
    }
    validateRecommendation(rec) {
        return {
            category: ['skill', 'tool', 'practice', 'project'].includes(rec.category) ? rec.category : 'skill',
            recommendation: rec.recommendation || 'Amélioration continue',
            reasoning: rec.reasoning || 'Développement professionnel',
            expectedImpact: ['minor', 'moderate', 'significant', 'transformative'].includes(rec.expectedImpact) ?
                rec.expectedImpact : 'moderate',
            effort: ['low', 'medium', 'high'].includes(rec.effort) ? rec.effort : 'medium',
            resources: Array.isArray(rec.resources) ?
                rec.resources.slice(0, 3).map((res) => ({
                    title: res.title || 'Ressource',
                    type: ['course', 'book', 'project', 'certification', 'community'].includes(res.type) ?
                        res.type : 'course',
                    url: res.url,
                    priority: Math.min(10, Math.max(1, res.priority || 5)),
                })) : [],
        };
    }
    validateShortTermGoal(goal) {
        return {
            goal: goal.goal || 'Amélioration technique',
            timeframe: goal.timeframe || '3-6 mois',
            steps: Array.isArray(goal.steps) ? goal.steps.slice(0, 5) : [],
            metrics: Array.isArray(goal.metrics) ? goal.metrics.slice(0, 3) : [],
        };
    }
    validateLongTermVision(vision) {
        return {
            vision: vision.vision || 'Évolution professionnelle',
            milestones: Array.isArray(vision.milestones) ? vision.milestones.slice(0, 4) : [],
            skills: Array.isArray(vision.skills) ? vision.skills.slice(0, 4) : [],
            experience: Array.isArray(vision.experience) ? vision.experience.slice(0, 4) : [],
        };
    }
}
exports.AIService = AIService;
exports.aiService = new AIService();
//# sourceMappingURL=AIService.js.map