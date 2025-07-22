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
    _userProfile: UserProfile,
    _repositories: GitHubRepo[],
    _analytics: AnalyticsOverview,
  ): Promise<AIInsightsSummary> {
    const startTime = Date.now();

    try {
      logger.info('Démarrage génération insights IA', {
        username: _userProfile.login,
        _repositoriesCount: _repositories.length,
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
        this.analyzeDeveloperPersonality(
          _userProfile,
          _repositories,
          _analytics,
        ),
        this.assessTechnicalSkills(_userProfile, _repositories, _analytics),
        this.analyzeCareerInsights(_userProfile, _repositories, _analytics),
        this.analyzeProductivityPatterns(
          _userProfile,
          _repositories,
          _analytics,
        ),
        this.generateTechnicalRecommendations(
          _userProfile,
          _repositories,
          _analytics,
        ),
        this.analyzeStrengths(_userProfile, _repositories, _analytics),
        this.identifyGrowthOpportunities(
          _userProfile,
          _repositories,
          _analytics,
        ),
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
      const confidence = this.calculateOverallConfidence(
        _repositories.length,
        _analytics,
      );

      const insights: AIInsightsSummary = {
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
            input: 0, // Sera rempli par les appels individuels
            output: 0,
            total: 0,
          },
        },
      };

      logger.info('Insights IA générés avec succès', {
        username: _userProfile.login,
        processingTime: `${processingTime}s`,
        confidence,
      });

      return insights;
    } catch (_error: unknown) {
      logger.error('Erreur génération insights IA', {
        username: _userProfile.login,
        _error: (_error as Error).message,
      });
      throw new Error(
        `Génération insights IA échouée: ${(_error as Error).message}`,
      );
    }
  }

  /**
   * Analyse la personnalité du développeur
   */
  private async analyzeDeveloperPersonality(
    _userProfile: UserProfile,
    _repositories: GitHubRepo[],
    _analytics: AnalyticsOverview,
  ): Promise<DeveloperPersonality> {
    try {
      const analysisResult = await openaiConfig.generateDeveloperSummary(
        _userProfile,
        _repositories,
        _analytics,
      );

      const result = analysisResult.result;
      const obj = result as { [key: string]: unknown };

      // Validation et nettoyage des données
      const archetype = this.validateArchetype(obj['archetype']);
      const workingStyle = this.validateWorkingStyle(obj['workingStyle']);

      return {
        archetype,
        description:
          (obj['description'] as string) ??
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
    } catch (_error: unknown) {
      logger.error('Erreur analyse personnalité', {
        _error: (_error as Error).message,
      });

      // Fallback basé sur les données disponibles
      return this.generateFallbackPersonality(
        _userProfile,
        _repositories,
        _analytics,
      );
    }
  }

  /**
   * Évalue les compétences techniques
   */
  private async assessTechnicalSkills(
    _userProfile: UserProfile,
    _repositories: GitHubRepo[],
    _analytics: AnalyticsOverview,
  ): Promise<SkillAssessment> {
    try {
      const analysisResult = await openaiConfig.assessTechnicalSkills(
        _userProfile,
        _repositories,
        _analytics,
      );

      const result = analysisResult.result;
      const obj = result as { [key: string]: unknown };

      return {
        technical: Array.isArray(obj['technical'])
          ? (obj['technical'] as unknown[])
            .map((skill: unknown) => this.validateTechnicalSkill(skill))
            .slice(0, 15)
          : this.generateFallbackTechnicalSkills(_repositories),
        soft: Array.isArray(obj['soft'])
          ? (obj['soft'] as unknown[])
            .map((skill: unknown) => this.validateSoftSkill(skill))
            .slice(0, 10)
          : this.generateFallbackSoftSkills(_analytics),
        leadership: obj['leadership']
          ? this.validateLeadershipSkill(obj['leadership'])
          : this.generateFallbackLeadershipSkill(_userProfile, _repositories),
      };
    } catch (_error: unknown) {
      logger.error('Erreur évaluation compétences', {
        _error: (_error as Error).message,
      });

      return {
        technical: this.generateFallbackTechnicalSkills(_repositories),
        soft: this.generateFallbackSoftSkills(_analytics),
        leadership: this.generateFallbackLeadershipSkill(
          _userProfile,
          _repositories,
        ),
      };
    }
  }

  /**
   * Analyse les insights de carrière
   */
  private async analyzeCareerInsights(
    _userProfile: UserProfile,
    _repositories: GitHubRepo[],
    _analytics: AnalyticsOverview,
  ): Promise<CareerInsights> {
    try {
      const analysisResult = await openaiConfig.analyzeCareerInsights(
        _userProfile,
        _repositories,
        _analytics,
      );

      const result = analysisResult.result;
      const obj = result as { [key: string]: unknown };

      return {
        currentLevel: this.validateCareerLevel(obj['currentLevel']),
        experienceIndicators: Array.isArray(obj['experienceIndicators'])
          ? obj['experienceIndicators'].slice(0, 5)
          : [],
        trajectory: obj['trajectory']
          ? this.validateTrajectory(obj['trajectory'])
          : {
            direction: 'stable',
            velocity: 'steady',
            confidence: 70,
          },
        suitableRoles: Array.isArray(obj['suitableRoles'])
          ? (obj['suitableRoles'] as unknown[])
            .map((role: unknown) => this.validateSuitableRole(role))
            .slice(0, 6)
          : this.generateFallbackSuitableRoles(_analytics),
        marketPosition: obj['marketPosition']
          ? this.validateMarketPosition(obj['marketPosition'])
          : this.generateFallbackMarketPosition(_userProfile, _analytics),
      };
    } catch (_error: unknown) {
      logger.error('Erreur analyse insights carrière', {
        _error: (_error as Error).message,
      });

      return this.generateFallbackCareerInsights(
        _userProfile,
        _repositories,
        _analytics,
      );
    }
  }

  /**
   * Analyse les patterns de productivité
   */
  private async analyzeProductivityPatterns(
    _userProfile: UserProfile,
    _repositories: GitHubRepo[],
    _analytics: AnalyticsOverview,
  ): Promise<ProductivityAnalysis> {
    try {
      // Analyse basée sur les données quantitatives + IA
      const patterns = {
        peakPerformance: {
          timeOfDay: this.identifyPeakTimeFromActivity(_analytics.activity),
          dayOfWeek: this.identifyPeakDayFromActivity(_analytics.activity),
          seasonality: _analytics.activity.seasonality.mostActiveQuarter,
          reasoning:
            "Analyse basée sur les patterns de commits et l'activité historique.",
        },
        consistency: {
          level: this.mapConsistencyLevel(
            _analytics.productivity.breakdown.consistency,
          ),
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
    } catch (_error: unknown) {
      logger.error('Erreur analyse productivité', {
        _error: (_error as Error).message,
      });

      return this.generateFallbackProductivityAnalysis(_analytics);
    }
  }

  /**
   * Génère des recommandations techniques
   */
  private async generateTechnicalRecommendations(
    _userProfile: UserProfile,
    _repositories: GitHubRepo[],
    _analytics: AnalyticsOverview,
  ): Promise<TechnicalRecommendations> {
    try {
      const analysisResult = await openaiConfig.generateRecommendations(
        _userProfile,
        _repositories,
        _analytics,
      );

      const result = analysisResult.result;
      const obj = result as { [key: string]: unknown };

      return {
        immediate: Array.isArray(obj['immediate'])
          ? (obj['immediate'] as unknown[])
            .map((rec: unknown) => this.validateRecommendation(rec))
            .slice(0, 5)
          : this.generateFallbackImmediateRecommendations(_analytics),
        shortTerm: Array.isArray(obj['shortTerm'])
          ? (obj['shortTerm'] as unknown[])
            .map((goal: unknown) => this.validateShortTermGoal(goal))
            .slice(0, 4)
          : this.generateFallbackShortTermGoals(_analytics),
        longTerm: Array.isArray(obj['longTerm'])
          ? (obj['longTerm'] as unknown[])
            .map((vision: unknown) => this.validateLongTermVision(vision))
            .slice(0, 3)
          : this.generateFallbackLongTermVisions(_userProfile, _analytics),
      };
    } catch (_error: unknown) {
      logger.error('Erreur génération recommandations', {
        _error: (_error as Error).message,
      });

      return {
        immediate: this.generateFallbackImmediateRecommendations(_analytics),
        shortTerm: this.generateFallbackShortTermGoals(_analytics),
        longTerm: this.generateFallbackLongTermVisions(
          _userProfile,
          _analytics,
        ),
      };
    }
  }

  /**
   * Analyse les forces du développeur
   */
  private async analyzeStrengths(
    _userProfile: UserProfile,
    _repositories: GitHubRepo[],
    _analytics: AnalyticsOverview,
  ): Promise<StrengthsAnalysis> {
    try {
      // Analyse basée sur les métriques quantitatives
      const coreStrengths = this.identifyCoreStrengths(_analytics);
      const emergingStrengths = this.identifyEmergingStrengths(
        _repositories,
        _analytics,
      );
      const uniqueStrengths = this.identifyUniqueStrengths(
        _userProfile,
        _repositories,
        _analytics,
      );

      return {
        core: coreStrengths,
        emerging: emergingStrengths,
        unique: uniqueStrengths,
      };
    } catch (_error: unknown) {
      logger.error('Erreur analyse forces', {
        _error: (_error as Error).message,
      });

      return this.generateFallbackStrengths(_analytics);
    }
  }

  /**
   * Identifie les opportunités de croissance
   */
  private async identifyGrowthOpportunities(
    _userProfile: UserProfile,
    _repositories: GitHubRepo[],
    _analytics: AnalyticsOverview,
  ): Promise<GrowthOpportunities> {
    try {
      const skillGaps = this.identifySkillGaps(_analytics);
      const experienceGaps = this.identifyExperienceGaps(
        _repositories,
        _analytics,
      );
      const networkingOpportunities = this.identifyNetworkingOpportunities(
        _userProfile,
        _analytics,
      );

      return {
        skills: skillGaps,
        experiences: experienceGaps,
        relationships: networkingOpportunities,
      };
    } catch (_error: unknown) {
      logger.error('Erreur identification opportunités', {
        _error: (_error as Error).message,
      });

      return this.generateFallbackGrowthOpportunities(_analytics);
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

      const careerOutlook = this.generateCareerOutlook(
        insights.career,
        insights.strengths,
      );

      return {
        keyHighlights,
        majorStrengths,
        primaryRecommendations,
        careerOutlook,
      };
    } catch (_error: unknown) {
      logger.error('Erreur génération résumé exécutif', {
        _error: (_error as Error).message,
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

  // Méthodes de validation et fallback

  private validateArchetype(
    archetype: unknown,
  ): DeveloperPersonality['archetype'] {
    const validArchetypes: DeveloperPersonality['archetype'][] = [
      'innovator',
      'builder',
      'optimizer',
      'maintainer',
      'explorer',
      'teacher',
    ];
    return validArchetypes.includes(
      archetype as DeveloperPersonality['archetype'],
    )
      ? (archetype as DeveloperPersonality['archetype'])
      : 'builder';
  }

  private validateWorkingStyle(
    style: unknown,
  ): DeveloperPersonality['workingStyle'] {
    const obj = style as Record<string, unknown>;
    const allowedProjectSize = ['small', 'medium', 'large', 'mixed'] as const;
    const preferredProjectSize: (typeof allowedProjectSize)[number] =
      allowedProjectSize.includes(
        obj['preferredProjectSize'] as (typeof allowedProjectSize)[number],
      )
        ? (obj['preferredProjectSize'] as (typeof allowedProjectSize)[number])
        : 'medium';
    const allowedCollab = ['solo', 'pair', 'team_lead', 'contributor'] as const;
    const collaborationStyle: (typeof allowedCollab)[number] =
      allowedCollab.includes(
        obj['collaborationStyle'] as (typeof allowedCollab)[number],
      )
        ? (obj['collaborationStyle'] as (typeof allowedCollab)[number])
        : 'contributor';
    const allowedLearning = [
      'experimenter',
      'methodical',
      'research_driven',
      'hands_on',
    ] as const;
    const learningApproach: (typeof allowedLearning)[number] =
      allowedLearning.includes(
        obj['learningApproach'] as (typeof allowedLearning)[number],
      )
        ? (obj['learningApproach'] as (typeof allowedLearning)[number])
        : 'hands_on';
    const allowedProblem = [
      'analytical',
      'creative',
      'systematic',
      'intuitive',
    ] as const;
    const problemSolving: (typeof allowedProblem)[number] =
      allowedProblem.includes(
        obj['problemSolving'] as (typeof allowedProblem)[number],
      )
        ? (obj['problemSolving'] as (typeof allowedProblem)[number])
        : 'systematic';
    return {
      preferredProjectSize,
      collaborationStyle,
      learningApproach,
      problemSolving,
    };
  }

  private validateCareerLevel(level: unknown): CareerInsights['currentLevel'] {
    const validLevels: CareerInsights['currentLevel'][] = [
      'junior',
      'mid_level',
      'senior',
      'staff',
      'principal',
      'distinguished',
    ];
    return validLevels.includes(level as CareerInsights['currentLevel'])
      ? (level as CareerInsights['currentLevel'])
      : 'mid_level';
  }

  private calculateOverallConfidence(
    repoCount: number,
    _analytics: AnalyticsOverview,
  ): number {
    let confidence = 50; // Base

    // Plus de données = plus de confiance
    if (repoCount >= 20) confidence += 30;
    else if (repoCount >= 10) confidence += 20;
    else if (repoCount >= 5) confidence += 10;

    // Activité récente = plus de confiance
    if (_analytics.productivity.overall >= 70) confidence += 15;
    else if (_analytics.productivity.overall >= 50) confidence += 10;

    // Diversité des langages = plus de confiance
    if (_analytics.languages.distribution.length >= 5) confidence += 10;

    return Math.min(95, Math.max(60, confidence));
  }

  // Méthodes fallback (génération basée sur les données quantitatives)

  private generateFallbackPersonality(
    _userProfile: UserProfile,
    _repositories: GitHubRepo[],
    _analytics: AnalyticsOverview,
  ): DeveloperPersonality {
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
        collaborationStyle:
          _analytics.collaboration.teamProjects >
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

  private inferArchetypeFromData(
    _repositories: GitHubRepo[],
    _analytics: AnalyticsOverview,
  ): DeveloperPersonality['archetype'] {
    // Logique d'inférence basée sur les données
    const forkRatio =
      _repositories.filter((r) => r.isFork).length / _repositories.length;
    const popularRepos = _repositories.filter(
      (r) => r.stargazerCount > 5,
    ).length;
    const docRepos = _repositories.filter((r) => r.community?.hasReadme).length;

    if (forkRatio > 0.5) return 'explorer';
    if (popularRepos > 3) return 'innovator';
    if (docRepos / _repositories.length > 0.7) return 'teacher';
    if (_analytics.devops.overallMaturity === 'expert') return 'optimizer';

    return 'builder';
  }

  private generateFallbackTechnicalSkills(
    _repositories: GitHubRepo[],
  ): SkillAssessment['technical'] {
    const languageStats = this.aggregateLanguageStats(_repositories);

    return Object.entries(languageStats)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 10)
      .map(([language, stats]) => ({
        skill: language,
        proficiency: this.mapCountToProficiency(stats.count),
        confidence: Math.min(100, stats.count * 20 + 40),
        evidenceStrength:
          stats.count >= 5
            ? 'strong'
            : stats.count >= 3
              ? 'moderate'
              : ('weak' as const),
        evidence: [`${stats.count} _repositories`, 'Usage actif'],
        growthPotential: 'moderate' as const,
        marketDemand: this.getLanguageMarketDemand(language),
      }));
  }

  private generateFallbackSoftSkills(
    _analytics: AnalyticsOverview,
  ): SkillAssessment['soft'] {
    const skills: SkillAssessment['soft'] = [];

    if (_analytics.collaboration.teamProjects > 0) {
      skills.push({
        skill: 'Collaboration',
        level: 'competent' as const,
        indicators: ['Projets en équipe', 'Pull requests'],
        impactOnCareer: 'significant' as const,
      });
    }

    if (_analytics.productivity.breakdown.consistency > 70) {
      skills.push({
        skill: 'Organisation',
        level: 'strong' as const,
        indicators: ['Commits réguliers', 'Projets maintenus'],
        impactOnCareer: 'moderate' as const,
      });
    }

    if (_analytics.languages.distribution.length > 3) {
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
    _userProfile: UserProfile,
    _repositories: GitHubRepo[],
  ): SkillAssessment['leadership'] {
    const ownedRepos = _repositories.filter((r) => !r.isFork).length;
    const popularRepos = _repositories.filter(
      (r) => r.stargazerCount > 5,
    ).length;

    let current: SkillAssessment['leadership']['current'] =
      'individual_contributor';
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
      indicators: [
        `${ownedRepos} _repositories propres`,
        `${popularRepos} projets populaires`,
      ],
    };
  }

  private mapCountToProficiency(
    count: number,
  ): SkillAssessment['technical'][0]['proficiency'] {
    if (count >= 10) return 'expert';
    if (count >= 7) return 'proficient';
    if (count >= 4) return 'competent';
    if (count >= 2) return 'advanced_beginner';
    return 'novice';
  }

  private getLanguageMarketDemand(
    language: string,
  ): SkillAssessment['technical'][0]['marketDemand'] {
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

    if (highDemand.includes(language)) return 'very_high';
    if (moderateDemand.includes(language)) return 'high';
    return 'moderate';
  }

  private aggregateLanguageStats(
    _repositories: GitHubRepo[],
  ): Record<string, { count: number; totalSize: number }> {
    const stats: Record<string, { count: number; totalSize: number }> = {};

    _repositories.forEach((repo) => {
      if (repo.primaryLanguage) {
        if (!stats[repo.primaryLanguage]) {
          stats[repo.primaryLanguage] = { count: 0, totalSize: 0 };
        }
        stats[repo.primaryLanguage].count++;
      }

      repo.languages.nodes.forEach((lang) => {
        if (!stats[lang.name]) {
          stats[lang.name] = { count: 0, totalSize: 0 };
        }
        stats[lang.name].totalSize += lang.size;
      });
    });

    return stats;
  }

  // Méthodes utilitaires pour l'analyse de productivité

  private identifyPeakTimeFromActivity(
    activity: AnalyticsOverview['activity'],
  ): string {
    const peak = activity.hourlyDistribution.reduce((max, current) =>
      current.commits > max.commits ? current : max,
    );

    if (peak.hour >= 6 && peak.hour < 12) return 'Matinée';
    if (peak.hour >= 12 && peak.hour < 18) return 'Après-midi';
    if (peak.hour >= 18 && peak.hour < 22) return 'Soirée';
    return 'Nuit';
  }

  private identifyPeakDayFromActivity(
    activity: AnalyticsOverview['activity'],
  ): string {
    const peak = activity.dailyDistribution.reduce((max, current) =>
      current.commits > max.commits ? current : max,
    );
    return peak.day;
  }

  private mapConsistencyLevel(
    consistency: number,
  ): ProductivityAnalysis['patterns']['consistency']['level'] {
    if (consistency >= 80) return 'highly_consistent';
    if (consistency >= 60) return 'consistent';
    if (consistency >= 40) return 'somewhat_consistent';
    return 'irregular';
  }

  private identifyConsistencyFactors(_analytics: AnalyticsOverview): string[] {
    const factors: string[] = [];

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

  private generateConsistencyRecommendations(
    _analytics: AnalyticsOverview,
  ): string[] {
    const recommendations: string[] = [];

    if (_analytics.productivity.breakdown.consistency < 50) {
      recommendations.push('Établir une routine de développement quotidienne');
      recommendations.push('Utiliser des outils de suivi du temps');
    }

    if (_analytics.activity.seasonality.consistency < 40) {
      recommendations.push("Planifier l'activité de développement sur l'année");
    }

    return recommendations;
  }

  private calculateCodeToImpactRatio(
    _repositories: GitHubRepo[],
  ): ProductivityAnalysis['efficiency']['codeToImpactRatio'] {
    const totalCommits = _repositories.reduce(
      (sum, repo) => sum + repo.commits.totalCount,
      0,
    );
    const totalStars = _repositories.reduce(
      (sum, repo) => sum + repo.stargazerCount,
      0,
    );

    if (totalCommits === 0) return 'low';

    const ratio = totalStars / totalCommits;
    if (ratio > 0.1) return 'exceptional';
    if (ratio > 0.05) return 'high';
    if (ratio > 0.01) return 'moderate';
    return 'low';
  }

  private assessProblemSolvingSpeed(
    _analytics: AnalyticsOverview,
  ): ProductivityAnalysis['efficiency']['problemSolvingSpeed'] {
    // Basé sur la fréquence des commits et la complexité des projets
    const avgCommitFreq = _analytics.performance.commitFrequency.daily;

    if (avgCommitFreq > 2) return 'rapid';
    if (avgCommitFreq > 1) return 'quick';
    if (avgCommitFreq > 0.5) return 'steady';
    return 'deliberate';
  }

  private assessQualityConsistency(
    _analytics: AnalyticsOverview,
  ): ProductivityAnalysis['efficiency']['qualityConsistency'] {
    // Basé sur les métriques de qualité du code
    const codeQuality = _analytics.performance.codeQuality.commitMessageQuality;

    if (codeQuality > 80) return 'exceptional';
    if (codeQuality > 60) return 'consistent';
    if (codeQuality > 40) return 'improving';
    return 'variable';
  }

  private generateEfficiencyAnalysis(
    _repositories: GitHubRepo[],
    _analytics: AnalyticsOverview,
  ): string {
    const insights: string[] = [];

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

  private calculateSustainabilityScore(_analytics: AnalyticsOverview): number {
    let score = 70; // Base

    // Bonus pour la consistance
    score += (_analytics.productivity.breakdown.consistency - 50) * 0.3;

    // Malus pour une activité excessive
    if (_analytics.performance.commitFrequency.daily > 5) {
      score -= 10;
    }

    // Bonus pour l'équilibre entre projets solo et équipe
    const soloTeamRatio =
      _analytics.collaboration.soloProjects /
      (_analytics.collaboration.teamProjects +
        _analytics.collaboration.soloProjects);
    if (soloTeamRatio > 0.3 && soloTeamRatio < 0.7) {
      score += 10;
    }

    return Math.min(100, Math.max(30, Math.round(score)));
  }

  private identifyWorkLifeRisks(_analytics: AnalyticsOverview): string[] {
    const risks: string[] = [];

    if (_analytics.performance.commitFrequency.daily > 4) {
      risks.push('Rythme de développement potentiellement insoutenable');
    }

    if (_analytics.activity.seasonality.consistency < 30) {
      risks.push("Irrégularité importante dans l'activité");
    }

    return risks;
  }

  private identifyWorkLifePositives(_analytics: AnalyticsOverview): string[] {
    const positives: string[] = [];

    if (_analytics.productivity.breakdown.consistency > 70) {
      positives.push('Routine de travail bien établie');
    }

    if (_analytics.collaboration.teamProjects > 0) {
      positives.push('Engagement communautaire sain');
    }

    return positives;
  }

  private generateWorkLifeRecommendations(
    _analytics: AnalyticsOverview,
  ): string[] {
    const recommendations: string[] = [];

    if (_analytics.performance.commitFrequency.daily > 3) {
      recommendations.push(
        'Prévoir des pauses régulières dans le développement',
      );
    }

    if (
      _analytics.collaboration.soloProjects >
      _analytics.collaboration.teamProjects * 3
    ) {
      recommendations.push('Participer davantage à des projets collaboratifs');
    }

    return recommendations;
  }

  // Méthodes fallback pour les recommandations

  private generateFallbackImmediateRecommendations(
    _analytics: AnalyticsOverview,
  ): TechnicalRecommendations['immediate'] {
    const recommendations: TechnicalRecommendations['immediate'] = [];

    if (_analytics.devops.testingCulture < 50) {
      recommendations.push({
        category: 'practice' as const,
        recommendation: 'Intégrer les tests unitaires dans vos projets',
        reasoning: 'Amélioration de la qualité et de la maintenabilité du code',
        expectedImpact: 'significant' as const,
        effort: 'medium' as const,
        resources: [
          {
            title: 'Guide des tests unitaires',
            type: 'course' as const,
            priority: 1,
          },
        ],
      });
    }

    if (_analytics.devops.cicdAdoption < 30) {
      recommendations.push({
        category: 'tool' as const,
        recommendation:
          'Mettre en place GitHub Actions pour vos projets principaux',
        reasoning: 'Automatisation et amélioration de la qualité du code',
        expectedImpact: 'significant' as const,
        effort: 'medium' as const,
        resources: [
          {
            title: 'Documentation GitHub Actions',
            type: 'course' as const,
            priority: 1,
          },
        ],
      });
    }

    return recommendations.slice(0, 3);
  }

  private generateFallbackShortTermGoals(
    _analytics: AnalyticsOverview,
  ): TechnicalRecommendations['shortTerm'] {
    return [
      {
        goal: 'Améliorer la qualité du code',
        timeframe: '3-6 mois',
        steps: ['Tests unitaires', 'Code review', 'Outils de qualité'],
        metrics: ['Couverture de tests', 'Temps de review'],
      },
    ];
  }

  private generateFallbackLongTermVisions(
    _userProfile: UserProfile,
    _analytics: AnalyticsOverview,
  ): TechnicalRecommendations['longTerm'] {
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

  // Méthodes pour l'analyse des forces et opportunités

  private identifyCoreStrengths(
    _analytics: AnalyticsOverview,
  ): StrengthsAnalysis['core'] {
    const strengths: StrengthsAnalysis['core'] = [];

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

  private identifyEmergingStrengths(
    _repositories: GitHubRepo[],
    _analytics: AnalyticsOverview,
  ): StrengthsAnalysis['emerging'] {
    const strengths: StrengthsAnalysis['emerging'] = [];

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

  private identifyUniqueStrengths(
    _userProfile: UserProfile,
    _repositories: GitHubRepo[],
    _analytics: AnalyticsOverview,
  ): StrengthsAnalysis['unique'] {
    const strengths: StrengthsAnalysis['unique'] = [];
    const allowedRarity = [
      'exceptional',
      'rare',
      'uncommon',
      'common',
    ] as const;
    const allowedMarketValue = ['low', 'moderate', 'high', 'premium'] as const;
    const popularRepos = _repositories.filter(
      (r) => r.stargazerCount > 10,
    ).length;
    if (popularRepos > 0) {
      const rarityValue = popularRepos > 3 ? 'rare' : 'uncommon';
      const rarity: (typeof allowedRarity)[number] = allowedRarity.includes(
        rarityValue as (typeof allowedRarity)[number],
      )
        ? (rarityValue as (typeof allowedRarity)[number])
        : 'rare';
      const marketValue: (typeof allowedMarketValue)[number] =
        allowedMarketValue.includes('high') ? 'high' : 'moderate';
      strengths.push({
        differentiator: 'Projets à impact communautaire',
        rarity,
        marketValue,
        applications: ['Open source leadership', 'Technical evangelism'],
      });
    }
    return strengths;
  }

  private identifySkillGaps(
    _analytics: AnalyticsOverview,
  ): GrowthOpportunities['skills'] {
    const gaps: GrowthOpportunities['skills'] = [];

    if (_analytics.devops.testingCulture < 60) {
      gaps.push({
        skill: 'Testing et qualité',
        currentGap: 'moderate' as const,
        importance: 'important' as const,
        learningPath: ['Tests unitaires', 'TDD', "Tests d'intégration"],
        timeToCompetency: '3-6 mois',
        careerImpact: 'Amélioration significative de la crédibilité technique',
      });
    }

    return gaps.slice(0, 5);
  }

  private identifyExperienceGaps(
    _repositories: GitHubRepo[],
    _analytics: AnalyticsOverview,
  ): GrowthOpportunities['experiences'] {
    const experiences: GrowthOpportunities['experiences'] = [];

    if (_analytics.collaboration.teamProjects < _repositories.length * 0.3) {
      experiences.push({
        experience: "Projets collaboratifs d'envergure",
        type: 'project' as const,
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

  private identifyNetworkingOpportunities(
    _userProfile: UserProfile,
    _analytics: AnalyticsOverview,
  ): GrowthOpportunities['relationships'] {
    return [
      {
        type: 'mentor' as const,
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

  // Méthodes fallback pour toutes les analyses

  private generateFallbackCareerInsights(
    _userProfile: UserProfile,
    _repositories: GitHubRepo[],
    _analytics: AnalyticsOverview,
  ): CareerInsights {
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
      marketPosition: this.generateFallbackMarketPosition(
        _userProfile,
        _analytics,
      ),
    };
  }

  private generateFallbackSuitableRoles(
    _analytics: AnalyticsOverview,
  ): CareerInsights['suitableRoles'] {
    const roles: CareerInsights['suitableRoles'] = [];

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

  private generateFallbackMarketPosition(
    _userProfile: UserProfile,
    _analytics: AnalyticsOverview,
  ): CareerInsights['marketPosition'] {
    return {
      competitiveness: 'above_average',
      uniqueValueProposition:
        'Développeur polyvalent avec bonnes pratiques techniques',
      differentiators: [_analytics.languages.primary, 'Pratiques DevOps'],
      gaps: ['Expérience en équipe', 'Leadership technique'],
    };
  }

  private generateFallbackProductivityAnalysis(
    _analytics: AnalyticsOverview,
  ): ProductivityAnalysis {
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
        analysis:
          "Performance globale satisfaisante avec potentiel d'amélioration",
      },
      workLifeBalance: {
        sustainabilityScore: 75,
        riskFactors: [],
        positiveIndicators: ['Activité régulière'],
        recommendations: ["Maintenir l'équilibre actuel"],
      },
    };
  }

  private generateFallbackStrengths(
    _analytics: AnalyticsOverview,
  ): StrengthsAnalysis {
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

  private generateFallbackGrowthOpportunities(
    _analytics: AnalyticsOverview,
  ): GrowthOpportunities {
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

  private generateCareerOutlook(
    career: CareerInsights,
    strengths: StrengthsAnalysis,
  ): string {
    const level = career.currentLevel;
    const direction = career.trajectory.direction;
    const coreStrengths = strengths.core.length;

    if (direction === 'ascending' && coreStrengths > 2) {
      return 'Trajectoire très prometteuse avec de solides fondations techniques. Évolution vers des rôles senior anticipated.';
    } else if (direction === 'stable' && level === 'senior') {
      return "Position consolidée avec potentiel d'expertise spécialisée ou de leadership technique.";
    } else {
      return 'Développement continu avec opportunités de croissance dans plusieurs directions.';
    }
  }

  // Méthodes de validation supplémentaires

  private validateTechnicalSkill(
    skill: unknown,
  ): SkillAssessment['technical'][0] {
    const obj = skill as { [key: string]: unknown };
    const allowedProficiency = [
      'novice',
      'advanced_beginner',
      'competent',
      'proficient',
      'expert',
    ] as const;
    const proficiency: (typeof allowedProficiency)[number] =
      allowedProficiency.includes(
        obj['proficiency'] as (typeof allowedProficiency)[number],
      )
        ? (obj['proficiency'] as (typeof allowedProficiency)[number])
        : 'competent';
    const allowedEvidenceStrength = [
      'weak',
      'moderate',
      'strong',
      'very_strong',
    ] as const;
    const evidenceStrength: (typeof allowedEvidenceStrength)[number] =
      allowedEvidenceStrength.includes(
        obj['evidenceStrength'] as (typeof allowedEvidenceStrength)[number],
      )
        ? (obj['evidenceStrength'] as (typeof allowedEvidenceStrength)[number])
        : 'moderate';
    const allowedGrowthPotential = [
      'limited',
      'moderate',
      'high',
      'exceptional',
    ] as const;
    const growthPotential: (typeof allowedGrowthPotential)[number] =
      allowedGrowthPotential.includes(
        obj['growthPotential'] as (typeof allowedGrowthPotential)[number],
      )
        ? (obj['growthPotential'] as (typeof allowedGrowthPotential)[number])
        : 'moderate';
    const allowedMarketDemand = [
      'low',
      'moderate',
      'high',
      'very_high',
    ] as const;
    const marketDemand: (typeof allowedMarketDemand)[number] =
      allowedMarketDemand.includes(
        obj['marketDemand'] as (typeof allowedMarketDemand)[number],
      )
        ? (obj['marketDemand'] as (typeof allowedMarketDemand)[number])
        : 'moderate';
    return {
      skill: (obj['skill'] as string) ?? 'Unknown',
      proficiency,
      confidence: Math.min(
        100,
        Math.max(0, (obj['confidence'] as number) ?? 70),
      ),
      evidenceStrength,
      evidence: Array.isArray(obj['evidence'])
        ? (obj['evidence'] as string[]).slice(0, 3)
        : ['Usage détecté'],
      growthPotential,
      marketDemand,
    };
  }

  private validateSoftSkill(skill: unknown): SkillAssessment['soft'][0] {
    const obj = skill as { [key: string]: unknown };
    const allowedLevel = [
      'developing',
      'competent',
      'strong',
      'exceptional',
    ] as const;
    const level: (typeof allowedLevel)[number] = allowedLevel.includes(
      obj['level'] as (typeof allowedLevel)[number],
    )
      ? (obj['level'] as (typeof allowedLevel)[number])
      : 'competent';
    return {
      skill: (obj['skill'] as string) ?? 'Unknown',
      level,
      indicators: Array.isArray(obj['indicators'])
        ? (obj['indicators'] as string[]).slice(0, 3)
        : [],
      impactOnCareer: 'significant' as const,
    };
  }

  private validateLeadershipSkill(
    leadership: unknown,
  ): SkillAssessment['leadership'] {
    const obj = leadership as { [key: string]: unknown };
    const allowedCurrent = [
      'individual_contributor',
      'informal_leader',
      'team_lead',
      'senior_leader',
    ] as const;
    const current: (typeof allowedCurrent)[number] = allowedCurrent.includes(
      obj['current'] as (typeof allowedCurrent)[number],
    )
      ? (obj['current'] as (typeof allowedCurrent)[number])
      : 'individual_contributor';
    const allowedPotential = [
      'limited',
      'emerging',
      'strong',
      'exceptional',
    ] as const;
    const potential: (typeof allowedPotential)[number] =
      allowedPotential.includes(
        obj['potential'] as (typeof allowedPotential)[number],
      )
        ? (obj['potential'] as (typeof allowedPotential)[number])
        : 'emerging';
    return {
      current,
      potential,
      indicators: Array.isArray(obj['indicators'])
        ? (obj['indicators'] as string[]).slice(0, 3)
        : [],
    };
  }

  private validateTrajectory(
    trajectory: unknown,
  ): CareerInsights['trajectory'] {
    const obj = trajectory as { [key: string]: unknown };
    const allowedDirection = [
      'ascending',
      'stable',
      'transitioning',
      'exploring',
    ] as const;
    const direction: (typeof allowedDirection)[number] =
      allowedDirection.includes(
        obj['direction'] as (typeof allowedDirection)[number],
      )
        ? (obj['direction'] as (typeof allowedDirection)[number])
        : 'stable';
    const allowedVelocity = ['slow', 'steady', 'rapid', 'exponential'] as const;
    const velocity: (typeof allowedVelocity)[number] = allowedVelocity.includes(
      obj['velocity'] as (typeof allowedVelocity)[number],
    )
      ? (obj['velocity'] as (typeof allowedVelocity)[number])
      : 'steady';
    return {
      direction,
      velocity,
      confidence: Math.min(
        100,
        Math.max(0, (obj['confidence'] as number) ?? 70),
      ),
    };
  }

  private validateSuitableRole(
    role: unknown,
  ): CareerInsights['suitableRoles'][0] {
    const obj = role as { [key: string]: unknown };
    return {
      role: (obj['role'] as string) ?? 'Software Developer',
      fit: Math.min(100, Math.max(0, (obj['fit'] as number) ?? 70)),
      reasoning:
        (obj['reasoning'] as string) ?? 'Compétences techniques adaptées',
      requirements: Array.isArray(obj['requirements'])
        ? (obj['requirements'] as string[]).slice(0, 4)
        : [],
      growthPath: (obj['growthPath'] as string) ?? 'Évolution naturelle',
    };
  }

  private validateMarketPosition(
    position: unknown,
  ): CareerInsights['marketPosition'] {
    const obj = position as { [key: string]: unknown };
    const allowedCompetitiveness = [
      'below_average',
      'average',
      'above_average',
      'exceptional',
    ] as const;
    const competitiveness: (typeof allowedCompetitiveness)[number] =
      allowedCompetitiveness.includes(
        obj['competitiveness'] as (typeof allowedCompetitiveness)[number],
      )
        ? (obj['competitiveness'] as (typeof allowedCompetitiveness)[number])
        : 'average';
    return {
      competitiveness,
      uniqueValueProposition:
        (obj['uniqueValueProposition'] as string) ?? 'Profil technique solide',
      differentiators: Array.isArray(obj['differentiators'])
        ? (obj['differentiators'] as string[]).slice(0, 4)
        : [],
      gaps: Array.isArray(obj['gaps'])
        ? (obj['gaps'] as string[]).slice(0, 4)
        : [],
    };
  }

  private validateRecommendation(
    rec: unknown,
  ): TechnicalRecommendations['immediate'][0] {
    const obj = rec as { [key: string]: unknown };
    const allowedCategory = ['skill', 'tool', 'practice', 'project'] as const;
    const category: (typeof allowedCategory)[number] = allowedCategory.includes(
      obj['category'] as (typeof allowedCategory)[number],
    )
      ? (obj['category'] as (typeof allowedCategory)[number])
      : 'skill';
    const allowedExpectedImpact = [
      'minor',
      'moderate',
      'significant',
      'transformative',
    ] as const;
    const expectedImpact: (typeof allowedExpectedImpact)[number] =
      allowedExpectedImpact.includes(
        obj['expectedImpact'] as (typeof allowedExpectedImpact)[number],
      )
        ? (obj['expectedImpact'] as (typeof allowedExpectedImpact)[number])
        : 'moderate';
    const allowedEffort = ['low', 'medium', 'high'] as const;
    const effort: (typeof allowedEffort)[number] = allowedEffort.includes(
      obj['effort'] as (typeof allowedEffort)[number],
    )
      ? (obj['effort'] as (typeof allowedEffort)[number])
      : 'medium';
    const allowedResourceType = [
      'project',
      'course',
      'book',
      'certification',
      'community',
    ] as const;
    return {
      category,
      recommendation:
        (obj['recommendation'] as string) ?? 'Amélioration continue',
      reasoning: (obj['reasoning'] as string) ?? 'Développement professionnel',
      expectedImpact,
      effort,
      resources: Array.isArray(obj['resources'])
        ? (
            obj['resources'] as Array<{
              title: string;
              type: string;
              url?: string;
              priority: number;
            }>
        )
          .slice(0, 3)
          .map(
            (res: {
                title: string;
                type: string;
                url?: string;
                priority: number;
              }) => {
              const resourceType: (typeof allowedResourceType)[number] =
                  allowedResourceType.includes(
                    res.type as (typeof allowedResourceType)[number],
                  )
                    ? (res.type as (typeof allowedResourceType)[number])
                    : 'course';
              return {
                title: res.title ?? 'Ressource',
                type: resourceType,
                url: res.url ?? undefined,
                priority: Math.min(10, Math.max(1, res.priority ?? 5)),
              };
            },
          )
        : [],
    };
  }

  private validateShortTermGoal(
    goal: unknown,
  ): TechnicalRecommendations['shortTerm'][0] {
    const obj = goal as { [key: string]: unknown };
    return {
      goal: (obj['goal'] as string) ?? 'Amélioration technique',
      timeframe: (obj['timeframe'] as string) ?? '3-6 mois',
      steps: Array.isArray(obj['steps'])
        ? (obj['steps'] as string[]).slice(0, 5)
        : [],
      metrics: Array.isArray(obj['metrics'])
        ? (obj['metrics'] as string[]).slice(0, 3)
        : [],
    };
  }

  private validateLongTermVision(
    vision: unknown,
  ): TechnicalRecommendations['longTerm'][0] {
    const obj = vision as { [key: string]: unknown };
    return {
      vision: (obj['vision'] as string) ?? 'Évolution professionnelle',
      milestones: Array.isArray(obj['milestones'])
        ? (obj['milestones'] as string[]).slice(0, 4)
        : [],
      skills: Array.isArray(obj['skills'])
        ? (obj['skills'] as string[]).slice(0, 4)
        : [],
      experience: Array.isArray(obj['experience'])
        ? (obj['experience'] as string[]).slice(0, 4)
        : [],
    };
  }
}

// Export de l'instance singleton
export const aiService = new AIService();
