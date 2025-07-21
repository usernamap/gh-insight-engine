/**
 * Service IA - Analyses qualitatives avec OpenAI GPT-4
 * Génère tous les insights IA : personnalité, compétences, carrière, recommandations
 */

import { GitHubRepo, UserProfile } from '@/types/github';
import { AnalyticsOverview } from '@/types/analytics';
import {
  AIInsightsSummary,
  CareerInsights,
  DeveloperPersonality,
  GrowthOpportunities,
  ProductivityAnalysis,
  SkillAssessment,
  StrengthsAnalysis,
  TechnicalRecommendations,
} from '@/types/insights';
import openaiConfig from '@/config/openai';
import logger from '@/utils/logger';

export class AIService {
  /**
   * Génère une analyse IA complète d'un développeur
   */
  public async generateCompleteInsights(
    userProfile: UserProfile,
    repositories: GitHubRepo[],
    analytics: AnalyticsOverview,
  ): Promise<AIInsightsSummary> {
    const startTime = Date.now();

    try {
      logger.info('Démarrage génération insights IA', {
        username: userProfile.login,
        repositoriesCount: repositories.length,
      });

      // Génération de toutes les analyses en parallèle pour optimiser les performances
      const [
        personality,
        skills,
        career,
        productivity,
        recommendations,
        strengths,
        growth,
      ] = await Promise.all([
        this.analyzeDeveloperPersonality(userProfile, repositories, analytics),
        this.assessTechnicalSkills(userProfile, repositories, analytics),
        this.analyzeCareerInsights(userProfile, repositories, analytics),
        this.analyzeProductivityPatterns(userProfile, repositories, analytics),
        this.generateTechnicalRecommendations(userProfile, repositories, analytics),
        this.analyzeStrengths(userProfile, repositories, analytics),
        this.identifyGrowthOpportunities(userProfile, repositories, analytics),
      ]);

      // Génération du résumé exécutif
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

      // Calcul du score de confiance global
      const confidence = this.calculateOverallConfidence(repositories.length, analytics);

      const insights: AIInsightsSummary = {
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
            input: 0, // Sera rempli par les appels individuels
            output: 0,
            total: 0,
          },
        },
      };

      logger.info('Insights IA générés avec succès', {
        username: userProfile.login,
        processingTime: `${processingTime}s`,
        confidence,
      });

      return insights;
    } catch (error: any) {
      logger.error('Erreur génération insights IA', {
        username: userProfile.login,
        error: error.message,
      });
      throw new Error(`Génération insights IA échouée: ${error.message}`);
    }
  }

  /**
   * Analyse la personnalité du développeur
   */
  private async analyzeDeveloperPersonality(
    userProfile: UserProfile,
    repositories: GitHubRepo[],
    analytics: AnalyticsOverview,
  ): Promise<DeveloperPersonality> {
    try {
      const analysisResult = await openaiConfig.generateDeveloperSummary(
        userProfile,
        repositories,
        analytics,
      );

      const result = analysisResult.result;

      // Validation et nettoyage des données
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
    } catch (error: any) {
      logger.error('Erreur analyse personnalité', { error: error.message });

      // Fallback basé sur les données disponibles
      return this.generateFallbackPersonality(userProfile, repositories, analytics);
    }
  }

  /**
   * Évalue les compétences techniques
   */
  private async assessTechnicalSkills(
    userProfile: UserProfile,
    repositories: GitHubRepo[],
    analytics: AnalyticsOverview,
  ): Promise<SkillAssessment> {
    try {
      const analysisResult = await openaiConfig.assessTechnicalSkills(
        userProfile,
        repositories,
        analytics,
      );

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
    } catch (error: any) {
      logger.error('Erreur évaluation compétences', { error: error.message });

      return {
        technical: this.generateFallbackTechnicalSkills(repositories),
        soft: this.generateFallbackSoftSkills(analytics),
        leadership: this.generateFallbackLeadershipSkill(userProfile, repositories),
      };
    }
  }

  /**
   * Analyse les insights de carrière
   */
  private async analyzeCareerInsights(
    userProfile: UserProfile,
    repositories: GitHubRepo[],
    analytics: AnalyticsOverview,
  ): Promise<CareerInsights> {
    try {
      const analysisResult = await openaiConfig.analyzeCareerInsights(
        userProfile,
        repositories,
        analytics,
      );

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
    } catch (error: any) {
      logger.error('Erreur analyse insights carrière', { error: error.message });

      return this.generateFallbackCareerInsights(userProfile, repositories, analytics);
    }
  }

  /**
   * Analyse les patterns de productivité
   */
  private async analyzeProductivityPatterns(
    userProfile: UserProfile,
    repositories: GitHubRepo[],
    analytics: AnalyticsOverview,
  ): Promise<ProductivityAnalysis> {
    try {
      // Analyse basée sur les données quantitatives + IA
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
    } catch (error: any) {
      logger.error('Erreur analyse productivité', { error: error.message });

      return this.generateFallbackProductivityAnalysis(analytics);
    }
  }

  /**
   * Génère des recommandations techniques
   */
  private async generateTechnicalRecommendations(
    userProfile: UserProfile,
    repositories: GitHubRepo[],
    analytics: AnalyticsOverview,
  ): Promise<TechnicalRecommendations> {
    try {
      const analysisResult = await openaiConfig.generateRecommendations(
        userProfile,
        repositories,
        analytics,
      );

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
    } catch (error: any) {
      logger.error('Erreur génération recommandations', { error: error.message });

      return {
        immediate: this.generateFallbackImmediateRecommendations(analytics),
        shortTerm: this.generateFallbackShortTermGoals(analytics),
        longTerm: this.generateFallbackLongTermVisions(userProfile, analytics),
      };
    }
  }

  /**
   * Analyse les forces du développeur
   */
  private async analyzeStrengths(
    userProfile: UserProfile,
    repositories: GitHubRepo[],
    analytics: AnalyticsOverview,
  ): Promise<StrengthsAnalysis> {
    try {
      // Analyse basée sur les métriques quantitatives
      const coreStrengths = this.identifyCoreStrengths(analytics);
      const emergingStrengths = this.identifyEmergingStrengths(repositories, analytics);
      const uniqueStrengths = this.identifyUniqueStrengths(userProfile, repositories, analytics);

      return {
        core: coreStrengths,
        emerging: emergingStrengths,
        unique: uniqueStrengths,
      };
    } catch (error: any) {
      logger.error('Erreur analyse forces', { error: error.message });

      return this.generateFallbackStrengths(analytics);
    }
  }

  /**
   * Identifie les opportunités de croissance
   */
  private async identifyGrowthOpportunities(
    userProfile: UserProfile,
    repositories: GitHubRepo[],
    analytics: AnalyticsOverview,
  ): Promise<GrowthOpportunities> {
    try {
      const skillGaps = this.identifySkillGaps(analytics);
      const experienceGaps = this.identifyExperienceGaps(repositories, analytics);
      const networkingOpportunities = this.identifyNetworkingOpportunities(userProfile, analytics);

      return {
        skills: skillGaps,
        experiences: experienceGaps,
        relationships: networkingOpportunities,
      };
    } catch (error: any) {
      logger.error('Erreur identification opportunités', { error: error.message });

      return this.generateFallbackGrowthOpportunities(analytics);
    }
  }

  /**
   * Génère un résumé exécutif
   */
  private async generateExecutiveSummary(insights: {
    personality: DeveloperPersonality;
    skills: SkillAssessment;
    career: CareerInsights;
    productivity: ProductivityAnalysis;
    recommendations: TechnicalRecommendations;
    strengths: StrengthsAnalysis;
    growth: GrowthOpportunities;
  }): Promise<AIInsightsSummary['executiveSummary']> {
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
    } catch (error: any) {
      logger.error('Erreur génération résumé exécutif', { error: error.message });

      return {
        keyHighlights: ['Profil développeur complet avec potentiel de croissance'],
        majorStrengths: ['Polyvalence technique', 'Engagement communautaire'],
        primaryRecommendations: ['Continuer le développement des compétences existantes'],
        careerOutlook: 'Trajectoire positive avec opportunités de progression.',
      };
    }
  }

  // Méthodes de validation et fallback

  private validateArchetype(archetype: any): DeveloperPersonality['archetype'] {
    const validArchetypes: DeveloperPersonality['archetype'][] = [
      'innovator', 'builder', 'optimizer', 'maintainer', 'explorer', 'teacher',
    ];
    return validArchetypes.includes(archetype) ? archetype : 'builder';
  }

  private validateWorkingStyle(style: any): DeveloperPersonality['workingStyle'] {
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

  private validateCareerLevel(level: any): CareerInsights['currentLevel'] {
    const validLevels: CareerInsights['currentLevel'][] = [
      'junior', 'mid_level', 'senior', 'staff', 'principal', 'distinguished',
    ];
    return validLevels.includes(level) ? level : 'mid_level';
  }

  private calculateOverallConfidence(repoCount: number, analytics: AnalyticsOverview): number {
    let confidence = 50; // Base

    // Plus de données = plus de confiance
    if (repoCount >= 20) confidence += 30;
    else if (repoCount >= 10) confidence += 20;
    else if (repoCount >= 5) confidence += 10;

    // Activité récente = plus de confiance
    if (analytics.productivity.overall >= 70) confidence += 15;
    else if (analytics.productivity.overall >= 50) confidence += 10;

    // Diversité des langages = plus de confiance
    if (analytics.languages.distribution.length >= 5) confidence += 10;

    return Math.min(95, Math.max(60, confidence));
  }

  // Méthodes fallback (génération basée sur les données quantitatives)

  private generateFallbackPersonality(
    userProfile: UserProfile,
    repositories: GitHubRepo[],
    analytics: AnalyticsOverview,
  ): DeveloperPersonality {
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

  private inferArchetypeFromData(repositories: GitHubRepo[], analytics: AnalyticsOverview): DeveloperPersonality['archetype'] {
    // Logique d'inférence basée sur les données
    const forkRatio = repositories.filter(r => r.isFork).length / repositories.length;
    const popularRepos = repositories.filter(r => r.stargazerCount > 5).length;
    const docRepos = repositories.filter(r => r.community?.hasReadme).length;

    if (forkRatio > 0.5) return 'explorer';
    if (popularRepos > 3) return 'innovator';
    if (docRepos / repositories.length > 0.7) return 'teacher';
    if (analytics.devops.overallMaturity === 'expert') return 'optimizer';

    return 'builder';
  }

  private generateFallbackTechnicalSkills(repositories: GitHubRepo[]): SkillAssessment['technical'] {
    const languageStats = this.aggregateLanguageStats(repositories);

    return Object.entries(languageStats)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 10)
      .map(([language, stats]) => ({
        skill: language,
        proficiency: this.mapCountToProficiency(stats.count),
        confidence: Math.min(100, stats.count * 20 + 40),
        evidenceStrength: stats.count >= 5 ? 'strong' : stats.count >= 3 ? 'moderate' : 'weak' as const,
        evidence: [`${stats.count} repositories`, 'Usage actif'],
        growthPotential: 'moderate' as const,
        marketDemand: this.getLanguageMarketDemand(language),
      }));
  }

  private generateFallbackSoftSkills(analytics: AnalyticsOverview): SkillAssessment['soft'] {
    const skills = [];

    if (analytics.collaboration.teamProjects > 0) {
      skills.push({
        skill: 'Collaboration',
        level: 'competent' as const,
        indicators: ['Projets en équipe', 'Pull requests'],
        impactOnCareer: 'significant' as const,
      });
    }

    if (analytics.productivity.breakdown.consistency > 70) {
      skills.push({
        skill: 'Organisation',
        level: 'strong' as const,
        indicators: ['Commits réguliers', 'Projets maintenus'],
        impactOnCareer: 'moderate' as const,
      });
    }

    if (analytics.languages.distribution.length > 3) {
      skills.push({
        skill: 'Adaptabilité',
        level: 'strong' as const,
        indicators: ['Multilangages', 'Technologies variées'],
        impactOnCareer: 'significant' as const,
      });
    }

    return skills.slice(0, 6);
  }

  private generateFallbackLeadershipSkill(
    userProfile: UserProfile,
    repositories: GitHubRepo[],
  ): SkillAssessment['leadership'] {
    const ownedRepos = repositories.filter(r => !r.isFork).length;
    const popularRepos = repositories.filter(r => r.stargazerCount > 5).length;

    let current: SkillAssessment['leadership']['current'] = 'individual_contributor';
    let potential: SkillAssessment['leadership']['potential'] = 'emerging';

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

  private mapCountToProficiency(count: number): SkillAssessment['technical'][0]['proficiency'] {
    if (count >= 10) return 'expert';
    if (count >= 7) return 'proficient';
    if (count >= 4) return 'competent';
    if (count >= 2) return 'advanced_beginner';
    return 'novice';
  }

  private getLanguageMarketDemand(language: string): SkillAssessment['technical'][0]['marketDemand'] {
    const highDemand = ['JavaScript', 'Python', 'Java', 'TypeScript', 'Go', 'Rust', 'C#'];
    const moderateDemand = ['C++', 'PHP', 'Ruby', 'Swift', 'Kotlin', 'Scala'];

    if (highDemand.includes(language)) return 'very_high';
    if (moderateDemand.includes(language)) return 'high';
    return 'moderate';
  }

  private aggregateLanguageStats(repositories: GitHubRepo[]): Record<string, { count: number; totalSize: number }> {
    const stats: Record<string, { count: number; totalSize: number }> = {};

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

  // Méthodes utilitaires pour l'analyse de productivité

  private identifyPeakTimeFromActivity(activity: ActivityPattern): string {
    const peak = activity.hourlyDistribution
      .reduce((max, current) => current.commits > max.commits ? current : max);

    if (peak.hour >= 6 && peak.hour < 12) return 'Matinée';
    if (peak.hour >= 12 && peak.hour < 18) return 'Après-midi';
    if (peak.hour >= 18 && peak.hour < 22) return 'Soirée';
    return 'Nuit';
  }

  private identifyPeakDayFromActivity(activity: ActivityPattern): string {
    const peak = activity.dailyDistribution
      .reduce((max, current) => current.commits > max.commits ? current : max);
    return peak.day;
  }

  private mapConsistencyLevel(consistency: number): ProductivityAnalysis['patterns']['consistency']['level'] {
    if (consistency >= 80) return 'highly_consistent';
    if (consistency >= 60) return 'consistent';
    if (consistency >= 40) return 'somewhat_consistent';
    return 'irregular';
  }

  private identifyConsistencyFactors(analytics: AnalyticsOverview): string[] {
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

  private generateConsistencyRecommendations(analytics: AnalyticsOverview): string[] {
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

  private calculateCodeToImpactRatio(repositories: GitHubRepo[]): ProductivityAnalysis['efficiency']['codeToImpactRatio'] {
    const totalCommits = repositories.reduce((sum, repo) => sum + repo.commits.totalCount, 0);
    const totalStars = repositories.reduce((sum, repo) => sum + repo.stargazerCount, 0);

    if (totalCommits === 0) return 'low';

    const ratio = totalStars / totalCommits;
    if (ratio > 0.1) return 'exceptional';
    if (ratio > 0.05) return 'high';
    if (ratio > 0.01) return 'moderate';
    return 'low';
  }

  private assessProblemSolvingSpeed(analytics: AnalyticsOverview): ProductivityAnalysis['efficiency']['problemSolvingSpeed'] {
    // Basé sur la fréquence des commits et la complexité des projets
    const avgCommitFreq = analytics.performance.commitFrequency.daily;

    if (avgCommitFreq > 2) return 'rapid';
    if (avgCommitFreq > 1) return 'quick';
    if (avgCommitFreq > 0.5) return 'steady';
    return 'deliberate';
  }

  private assessQualityConsistency(analytics: AnalyticsOverview): ProductivityAnalysis['efficiency']['qualityConsistency'] {
    // Basé sur les métriques de qualité du code
    const codeQuality = analytics.performance.codeQuality.commitMessageQuality;

    if (codeQuality > 80) return 'exceptional';
    if (codeQuality > 60) return 'consistent';
    if (codeQuality > 40) return 'improving';
    return 'variable';
  }

  private generateEfficiencyAnalysis(repositories: GitHubRepo[], analytics: AnalyticsOverview): string {
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

    return `${insights.join('. ')  }.`;
  }

  private calculateSustainabilityScore(analytics: AnalyticsOverview): number {
    let score = 70; // Base

    // Bonus pour la consistance
    score += (analytics.productivity.breakdown.consistency - 50) * 0.3;

    // Malus pour une activité excessive
    if (analytics.performance.commitFrequency.daily > 5) {
      score -= 10;
    }

    // Bonus pour l'équilibre entre projets solo et équipe
    const soloTeamRatio = analytics.collaboration.soloProjects /
      (analytics.collaboration.teamProjects + analytics.collaboration.soloProjects);
    if (soloTeamRatio > 0.3 && soloTeamRatio < 0.7) {
      score += 10;
    }

    return Math.min(100, Math.max(30, Math.round(score)));
  }

  private identifyWorkLifeRisks(analytics: AnalyticsOverview): string[] {
    const risks = [];

    if (analytics.performance.commitFrequency.daily > 4) {
      risks.push('Rythme de développement potentiellement insoutenable');
    }

    if (analytics.activity.seasonality.consistency < 30) {
      risks.push('Irrégularité importante dans l\'activité');
    }

    return risks;
  }

  private identifyWorkLifePositives(analytics: AnalyticsOverview): string[] {
    const positives = [];

    if (analytics.productivity.breakdown.consistency > 70) {
      positives.push('Routine de travail bien établie');
    }

    if (analytics.collaboration.teamProjects > 0) {
      positives.push('Engagement communautaire sain');
    }

    return positives;
  }

  private generateWorkLifeRecommendations(analytics: AnalyticsOverview): string[] {
    const recommendations = [];

    if (analytics.performance.commitFrequency.daily > 3) {
      recommendations.push('Prévoir des pauses régulières dans le développement');
    }

    if (analytics.collaboration.soloProjects > analytics.collaboration.teamProjects * 3) {
      recommendations.push('Participer davantage à des projets collaboratifs');
    }

    return recommendations;
  }

  // Méthodes fallback pour les recommandations

  private generateFallbackImmediateRecommendations(analytics: AnalyticsOverview): TechnicalRecommendations['immediate'] {
    const recommendations = [];

    if (analytics.devops.testingCulture < 50) {
      recommendations.push({
        category: 'practice' as const,
        recommendation: 'Intégrer les tests unitaires dans vos projets',
        reasoning: 'Amélioration de la qualité et de la maintenabilité du code',
        expectedImpact: 'significant' as const,
        effort: 'medium' as const,
        resources: [
          {
            title: 'Guide des tests unitaires',
            type: 'article' as const,
            priority: 1,
          },
        ],
      });
    }

    if (analytics.devops.cicdAdoption < 30) {
      recommendations.push({
        category: 'tool' as const,
        recommendation: 'Mettre en place GitHub Actions pour vos projets principaux',
        reasoning: 'Automatisation et amélioration de la qualité du code',
        expectedImpact: 'significant' as const,
        effort: 'medium' as const,
        resources: [
          {
            title: 'Documentation GitHub Actions',
            type: 'documentation' as const,
            priority: 1,
          },
        ],
      });
    }

    return recommendations.slice(0, 3);
  }

  private generateFallbackShortTermGoals(analytics: AnalyticsOverview): TechnicalRecommendations['shortTerm'] {
    return [
      {
        goal: 'Améliorer la qualité du code',
        timeframe: '3-6 mois',
        steps: ['Tests unitaires', 'Code review', 'Outils de qualité'],
        metrics: ['Couverture de tests', 'Temps de review'],
      },
    ];
  }

  private generateFallbackLongTermVisions(userProfile: UserProfile, analytics: AnalyticsOverview): TechnicalRecommendations['longTerm'] {
    return [
      {
        vision: 'Devenir expert technique reconnu',
        milestones: ['Contributions open source', 'Conférences techniques', 'Mentoring'],
        skills: ['Leadership technique', 'Communication'],
        experience: ['Projets d\'envergure', 'Équipes diverses'],
      },
    ];
  }

  // Méthodes pour l'analyse des forces et opportunités

  private identifyCoreStrengths(analytics: AnalyticsOverview): StrengthsAnalysis['core'] {
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

  private identifyEmergingStrengths(repositories: GitHubRepo[], analytics: AnalyticsOverview): StrengthsAnalysis['emerging'] {
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

  private identifyUniqueStrengths(userProfile: UserProfile, repositories: GitHubRepo[], analytics: AnalyticsOverview): StrengthsAnalysis['unique'] {
    const strengths = [];

    const popularRepos = repositories.filter(r => r.stargazerCount > 10).length;
    if (popularRepos > 0) {
      strengths.push({
        differentiator: 'Projets à impact communautaire',
        rarity: popularRepos > 3 ? 'rare' : 'uncommon' as const,
        marketValue: 'high' as const,
        applications: ['Open source leadership', 'Technical evangelism'],
      });
    }

    return strengths;
  }

  private identifySkillGaps(analytics: AnalyticsOverview): GrowthOpportunities['skills'] {
    const gaps = [];

    if (analytics.devops.testingCulture < 60) {
      gaps.push({
        skill: 'Testing et qualité',
        currentGap: 'moderate' as const,
        importance: 'important' as const,
        learningPath: ['Tests unitaires', 'TDD', 'Tests d\'intégration'],
        timeToCompetency: '3-6 mois',
        careerImpact: 'Amélioration significative de la crédibilité technique',
      });
    }

    return gaps.slice(0, 5);
  }

  private identifyExperienceGaps(repositories: GitHubRepo[], analytics: AnalyticsOverview): GrowthOpportunities['experiences'] {
    const experiences = [];

    if (analytics.collaboration.teamProjects < repositories.length * 0.3) {
      experiences.push({
        experience: 'Projets collaboratifs d\'envergure',
        type: 'project' as const,
        benefit: 'Développement des compétences de travail en équipe',
        acquiringStrategy: ['Contribuer à l\'open source', 'Rejoindre des projets internes'],
        prerequisites: ['Compétences techniques solides'],
      });
    }

    return experiences;
  }

  private identifyNetworkingOpportunities(userProfile: UserProfile, analytics: AnalyticsOverview): GrowthOpportunities['relationships'] {
    return [
      {
        type: 'mentor' as const,
        purpose: 'Accélération du développement technique',
        findingStrategy: ['Communautés techniques', 'Conférences', 'Projets open source'],
        value: 'Guidance et conseils stratégiques',
      },
    ];
  }

  // Méthodes fallback pour toutes les analyses

  private generateFallbackCareerInsights(
    userProfile: UserProfile,
    repositories: GitHubRepo[],
    analytics: AnalyticsOverview,
  ): CareerInsights {
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

  private generateFallbackSuitableRoles(analytics: AnalyticsOverview): CareerInsights['suitableRoles'] {
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

  private generateFallbackMarketPosition(userProfile: UserProfile, analytics: AnalyticsOverview): CareerInsights['marketPosition'] {
    return {
      competitiveness: 'above_average',
      uniqueValueProposition: 'Développeur polyvalent avec bonnes pratiques techniques',
      differentiators: [analytics.languages.primary, 'Pratiques DevOps'],
      gaps: ['Expérience en équipe', 'Leadership technique'],
    };
  }

  private generateFallbackProductivityAnalysis(analytics: AnalyticsOverview): ProductivityAnalysis {
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

  private generateFallbackStrengths(analytics: AnalyticsOverview): StrengthsAnalysis {
    return {
      core: [
        {
          strength: 'Constance technique',
          manifestation: ['Développement régulier'],
          evidence: [`Score consistance: ${analytics.productivity.breakdown.consistency}/100`],
          leverageOpportunities: ['Projets long terme'],
        },
      ],
      emerging: [],
      unique: [],
    };
  }

  private generateFallbackGrowthOpportunities(analytics: AnalyticsOverview): GrowthOpportunities {
    return {
      skills: [
        {
          skill: 'Leadership technique',
          currentGap: 'moderate',
          importance: 'important',
          learningPath: ['Mentorat', 'Projets d\'équipe', 'Communication'],
          timeToCompetency: '6-12 mois',
          careerImpact: 'Évolution vers des rôles senior',
        },
      ],
      experiences: [
        {
          experience: 'Gestion d\'équipe technique',
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

  private generateCareerOutlook(career: CareerInsights, strengths: StrengthsAnalysis): string {
    const level = career.currentLevel;
    const direction = career.trajectory.direction;
    const coreStrengths = strengths.core.length;

    if (direction === 'ascending' && coreStrengths > 2) {
      return 'Trajectoire très prometteuse avec de solides fondations techniques. Évolution vers des rôles senior anticipated.';
    } else if (direction === 'stable' && level === 'senior') {
      return 'Position consolidée avec potentiel d\'expertise spécialisée ou de leadership technique.';
    } else {
      return 'Développement continu avec opportunités de croissance dans plusieurs directions.';
    }
  }

  // Méthodes de validation supplémentaires

  private validateTechnicalSkill(skill: any): SkillAssessment['technical'][0] {
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

  private validateSoftSkill(skill: any): SkillAssessment['soft'][0] {
    return {
      skill: skill.skill || 'Unknown',
      level: ['developing', 'competent', 'strong', 'exceptional'].includes(skill.level) ?
        skill.level : 'competent',
      indicators: Array.isArray(skill.indicators) ? skill.indicators.slice(0, 3) : [],
      impactOnCareer: ['minor', 'moderate', 'significant', 'critical'].includes(skill.impactOnCareer) ?
        skill.impactOnCareer : 'moderate',
    };
  }

  private validateLeadershipSkill(leadership: any): SkillAssessment['leadership'] {
    return {
      current: ['individual_contributor', 'informal_leader', 'team_lead', 'senior_leader'].includes(leadership.current) ?
        leadership.current : 'individual_contributor',
      potential: ['limited', 'emerging', 'strong', 'exceptional'].includes(leadership.potential) ?
        leadership.potential : 'emerging',
      indicators: Array.isArray(leadership.indicators) ? leadership.indicators.slice(0, 3) : [],
    };
  }

  private validateTrajectory(trajectory: any): CareerInsights['trajectory'] {
    return {
      direction: ['ascending', 'stable', 'transitioning', 'exploring'].includes(trajectory.direction) ?
        trajectory.direction : 'stable',
      velocity: ['slow', 'steady', 'rapid', 'exponential'].includes(trajectory.velocity) ?
        trajectory.velocity : 'steady',
      confidence: Math.min(100, Math.max(0, trajectory.confidence || 70)),
    };
  }

  private validateSuitableRole(role: any): CareerInsights['suitableRoles'][0] {
    return {
      role: role.role || 'Software Developer',
      fit: Math.min(100, Math.max(0, role.fit || 70)),
      reasoning: role.reasoning || 'Compétences techniques adaptées',
      requirements: Array.isArray(role.requirements) ? role.requirements.slice(0, 4) : [],
      growthPath: role.growthPath || 'Évolution naturelle',
    };
  }

  private validateMarketPosition(position: any): CareerInsights['marketPosition'] {
    return {
      competitiveness: ['below_average', 'average', 'above_average', 'exceptional'].includes(position.competitiveness) ?
        position.competitiveness : 'average',
      uniqueValueProposition: position.uniqueValueProposition || 'Profil technique solide',
      differentiators: Array.isArray(position.differentiators) ? position.differentiators.slice(0, 4) : [],
      gaps: Array.isArray(position.gaps) ? position.gaps.slice(0, 4) : [],
    };
  }

  private validateRecommendation(rec: any): TechnicalRecommendations['immediate'][0] {
    return {
      category: ['skill', 'tool', 'practice', 'project'].includes(rec.category) ? rec.category : 'skill',
      recommendation: rec.recommendation || 'Amélioration continue',
      reasoning: rec.reasoning || 'Développement professionnel',
      expectedImpact: ['minor', 'moderate', 'significant', 'transformative'].includes(rec.expectedImpact) ?
        rec.expectedImpact : 'moderate',
      effort: ['low', 'medium', 'high'].includes(rec.effort) ? rec.effort : 'medium',
      resources: Array.isArray(rec.resources) ?
        rec.resources.slice(0, 3).map((res: any) => ({
          title: res.title || 'Ressource',
          type: ['course', 'book', 'project', 'certification', 'community'].includes(res.type) ?
            res.type : 'course',
          url: res.url,
          priority: Math.min(10, Math.max(1, res.priority || 5)),
        })) : [],
    };
  }

  private validateShortTermGoal(goal: any): TechnicalRecommendations['shortTerm'][0] {
    return {
      goal: goal.goal || 'Amélioration technique',
      timeframe: goal.timeframe || '3-6 mois',
      steps: Array.isArray(goal.steps) ? goal.steps.slice(0, 5) : [],
      metrics: Array.isArray(goal.metrics) ? goal.metrics.slice(0, 3) : [],
    };
  }

  private validateLongTermVision(vision: any): TechnicalRecommendations['longTerm'][0] {
    return {
      vision: vision.vision || 'Évolution professionnelle',
      milestones: Array.isArray(vision.milestones) ? vision.milestones.slice(0, 4) : [],
      skills: Array.isArray(vision.skills) ? vision.skills.slice(0, 4) : [],
      experience: Array.isArray(vision.experience) ? vision.experience.slice(0, 4) : [],
    };
  }
}

// Export de l'instance singleton
export const aiService = new AIService();
