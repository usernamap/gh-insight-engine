/**
 * Service Analytics - Calculs quantitatifs et métriques de performance
 * Génère toutes les analyses statistiques des données GitHub
 */

import { GitHubRepo, UserProfile } from '@/types/github';
import {
  ActivityPattern,
  AnalyticsOverview,
  CollaborationMetrics,
  DevOpsMaturity,
  LanguageAnalytics,
  PerformanceMetrics,
  ProductivityScore,
  ProjectComplexity,
  _,_TrendAnalysis,
} from '@/types/analytics';
import logger from '@/utils/logger';

export class AnalyticsService {
  /**
   * Génère une analyse complète des performances d'un utilisateur
   */
  public async generateAnalyticsOverview(
    _userProfile: UserProfile,
    repositories: GitHubRepo[],
    timeframe?: { start: Date; end: Date },
  ): Promise<AnalyticsOverview> {
    const startTime = Date.now();

    try {
      logger.info('Démarrage génération analytics', {
        username: userProfile.login,
        repositoriesCount: repositories.length,
      });

      // Calcul des différentes métriques en parallèle pour optimiser les performances
      const [
        performance,
        productivity,
        languages,
        activity,
        complexity,
        devops,
        collaboration,
      ] = await Promise.all([
        this.calculatePerformanceMetrics(userProfile, repositories, timeframe),
        this.calculateProductivityScore(userProfile, repositories, timeframe),
        this.analyzeLanguages(repositories),
        this.analyzeActivityPatterns(repositories, timeframe),
        this.analyzeProjectComplexity(repositories),
        this.analyzeDevOpsMaturity(repositories),
        this.analyzeCollaborationMetrics(userProfile, repositories),
      ]);

      const _analytics: AnalyticsOverview = {
        userId: userProfile._id ?? '',
        generatedAt: new Date(),
        _timeframe: timeframe ?? {
          start: new Date(new Date().setFullYear(new Date().getFullYear() - 1)),
          end: new Date(),
          totalDays: 365,
        },
        performance,
        productivity,
        languages,
        activity,
        complexity,
        devops,
        collaboration,
      };

      const processingTime = (Date.now() - startTime) / 1000;
      logger.info('Analytics générées avec succès', {
        username: userProfile.login,
        processingTime: `${processingTime}s`,
      });

      return analytics;
    } catch (_error: unknown) {
      logger.error('Erreur génération analytics', {
        username: userProfile.login,
        _error: error.message,
      });
      throw new Error(`Génération analytics échouée: ${error.message}`);
    }
  }

  /**
   * Calcule les métriques de performance
   */
  private async calculatePerformanceMetrics(
    _userProfile: UserProfile,
    repositories: GitHubRepo[],
    timeframe?: { start: Date; end: Date },
  ): Promise<PerformanceMetrics> {
    try {
      // Agrégation de tous les commits
      const allCommits = repositories.flatMap(repo => repo.commits.recent);

      // Filtrage par timeframe si spécifié
      const relevantCommits = timeframe ?
        allCommits.filter(commit => {
          const commitDate = new Date(commit.committedDate);
          return commitDate >= timeframe.start && commitDate <= timeframe.end;
        }) : allCommits;

      // Calcul de la fréquence des commits
      _now = new Date();
      const commitFrequency = {
        daily: this.calculateCommitFrequency(relevantCommits, 1),
        weekly: this.calculateCommitFrequency(relevantCommits, 7),
        monthly: this.calculateCommitFrequency(relevantCommits, 30),
        yearly: this.calculateCommitFrequency(relevantCommits, 365),
      };

      // Analyse de la qualité du code
      const averageCommitSize = relevantCommits.length > 0 ?
        relevantCommits.reduce((sum, commit) =>
          sum + (commit.additions ?? 0) + (commit.deletions ?? 0), 0,
        ) / relevantCommits.length : 0;

      const commitMessageQuality = this.analyzeCommitMessageQuality(relevantCommits);
      const branchingStrategy = this.detectBranchingStrategy(repositories);

      // Métriques de collaboration
      const pullRequestRatio = this.calculatePullRequestRatio(repositories, relevantCommits);
      const codeReviewParticipation = this.calculateCodeReviewParticipation(repositories);
      const issueResolutionTime = this.calculateAverageIssueResolutionTime(repositories);

      return {
        commitFrequency,
        codeQuality: {
          averageCommitSize: Math.round(averageCommitSize),
          commitMessageQuality,
          branchingStrategy,
        },
        collaboration: {
          pullRequestRatio,
          codeReviewParticipation,
          issueResolutionTime,
        },
      };
    } catch (_error: unknown) {
      logger.error('Erreur calcul métriques performance', { _error: error.message });
      throw error;
    }
  }

  /**
   * Calcule le score de productivité global
   */
  private async calculateProductivityScore(
    _userProfile: UserProfile,
    repositories: GitHubRepo[],
    timeframe?: { start: Date; end: Date },
  ): Promise<ProductivityScore> {
    try {
      // Métriques de base
      const totalStars = repositories.reduce((sum, repo) => sum + repo.stargazerCount, 0);
      const totalForks = repositories.reduce((sum, repo) => sum + repo.forkCount, 0);
      const totalCommits = repositories.reduce((sum, repo) => sum + repo.commits.totalCount, 0);
      const activeRepos = repositories.filter(repo => !repo.isArchived).length;

      // Score de consistance basé sur la régularité des commits
      const consistency = this.calculateConsistencyScore(repositories);

      // Score de volume basé sur la quantité de code
      const volume = Math.min(100, Math.round((totalCommits / 100) * 20 + (activeRepos / 10) * 30));

      // Score d'impact basé sur l'engagement (stars, forks)
      const impact = Math.min(100, Math.round((totalStars / 50) * 40 + (totalForks / 20) * 60));

      // Score de maintenance basé sur l'activité récente
      const recentActivity = repositories.filter(repo => {
        const lastPush = repo.pushedAt ? new Date(repo.pushedAt) : new Date(0);
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        return lastPush > sixMonthsAgo;
      }).length;

      const maintenance = Math.min(100, Math.round((recentActivity / repositories.length) * 100));

      // Score global pondéré
      const overall = Math.round(
        consistency * 0.25 +
        volume * 0.25 +
        impact * 0.25 +
        maintenance * 0.25,
      );

      // Détection de la tendance
      const trend = this.detectProductivityTrend(repositories);

      // Benchmarking (simulation basée sur les métriques)
      const benchmarkPercentile = this.calculateBenchmarkPercentile(overall, totalStars, totalCommits);

      return {
        overall,
        breakdown: {
          consistency,
          volume,
          impact,
          maintenance,
        },
        trend,
        benchmarkPercentile,
      };
    } catch (_error: unknown) {
      logger.error('Erreur calcul score productivité', { _error: error.message });
      throw error;
    }
  }

  /**
   * Analyse les langages de programmation utilisés
   */
  private async analyzeLanguages(repositories: GitHubRepo[]): Promise<LanguageAnalytics> {
    try {
      const languageStats: Record<string, {
        count: number;
        totalSize: number;
        repositories: string[];
      }> = {};

      // Agrégation des statistiques par langage
      repositories.forEach(repo => {
        if (repo.primaryLanguage) {
          if (!languageStats[repo.primaryLanguage]) {
            languageStats[repo.primaryLanguage] = {
              count: 0,
              totalSize: 0,
              repositories: [],
            };
          }
          languageStats[repo.primaryLanguage].count++;
          languageStats[repo.primaryLanguage].repositories.push(repo.nameWithOwner);
        }

        // Ajout des langages secondaires
        repo.languages.nodes.forEach(lang => {
          if (!languageStats[lang.name]) {
            languageStats[lang.name] = {
              count: 0,
              totalSize: 0,
              repositories: [],
            };
          }
          languageStats[lang.name].totalSize += lang.size;
          if (!languageStats[lang.name].repositories.includes(repo.nameWithOwner)) {
            languageStats[lang.name].repositories.push(repo.nameWithOwner);
          }
        });
      });

      // Calcul des pourcentages et scores de proficiency
      const totalSize = Object.values(languageStats).reduce((sum, stat) => sum + stat.totalSize, 0);
      const distribution = Object.entries(languageStats)
        .map(([language, stat]) => ({
          language,
          percentage: Math.round((stat.totalSize / totalSize) * 100),
          linesOfCode: stat.totalSize,
          repositoriesCount: stat.repositories.length,
          proficiencyScore: this.calculateLanguageProficiency(language, stat.count, stat.totalSize),
        }))
        .sort((a, b) => b.percentage - a.percentage);

      // Détection du langage principal
      const primary = distribution[0]?.language ?? 'Unknown';

      // Analyse des tendances (simulation basée sur l'activité récente)
      const trends = this.analyzeLanguageTrends(repositories);

      // Classification par niveau d'expertise
      const expertise = this.classifyLanguageExpertise(distribution);

      return {
        primary,
        distribution,
        trends,
        expertise,
      };
    } catch (_error: unknown) {
      logger.error('Erreur analyse langages', { _error: error.message });
      throw error;
    }
  }

  /**
   * Analyse les patterns d'activité
   */
  private async analyzeActivityPatterns(
    repositories: GitHubRepo[],
    timeframe?: { start: Date; end: Date },
  ): Promise<ActivityPattern> {
    try {
      const allCommits = repositories.flatMap(repo => repo.commits.recent);

      // Distribution horaire (simulation basée sur les commits)
      const hourlyDistribution = this.calculateHourlyDistribution(allCommits);

      // Distribution hebdomadaire
      const dailyDistribution = this.calculateDailyDistribution(allCommits);

      // Distribution mensuelle
      const monthlyDistribution = this.calculateMonthlyDistribution(repositories);

      // Analyse de la saisonnalité
      const seasonality = this.analyzeSeasonality(allCommits);

      return {
        hourlyDistribution,
        dailyDistribution,
        monthlyDistribution,
        seasonality,
      };
    } catch (_error: unknown) {
      logger.error('Erreur analyse patterns d\'activité', { _error: error.message });
      throw error;
    }
  }

  /**
   * Analyse la complexité des projets
   */
  private async analyzeProjectComplexity(repositories: GitHubRepo[]): Promise<ProjectComplexity> {
    try {
      let simple = 0;
      let moderate = 0;
      let complex = 0;
      let enterprise = 0;

      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const maintainedProjects = repositories.filter(repo => {
        const lastPush = repo.pushedAt ? new Date(repo.pushedAt) : new Date(0);
        return lastPush > sixMonthsAgo;
      }).length;

      repositories.forEach(repo => {
        const commitCount = repo.commits.totalCount;
        const languageCount = repo.languages.nodes.length;
        const hasCI = !!repo.githubActions?.workflowsCount;
        const hasSecurity = !!repo.security;
        const isTeamProject = repo.forkCount > 5 ?? repo.stargazerCount > 20;

        if (commitCount < 10 && languageCount <= 1) {
          simple++;
        } else if (commitCount < 100 && languageCount <= 3) {
          moderate++;
        } else if (commitCount < 1000 && languageCount > 3) {
          complex++;
        } else if (commitCount >= 1000 && (hasCI ?? hasSecurity ?? isTeamProject)) {
          enterprise++;
        } else {
          complex++;
        }
      });

      const total = repositories.length;
      const averageComplexity = total > 0 ?
        Math.round(((simple * 25) + (moderate * 50) + (complex * 75) + (enterprise * 100)) / total) : 0;

      return {
        simple,
        moderate,
        complex,
        enterprise,
        averageComplexity,
        maintainedProjects,
      };
    } catch (_error: unknown) {
      logger.error('Erreur analyse complexité projets', { _error: error.message });
      throw error;
    }
  }

  /**
   * Analyse la maturité DevOps
   */
  private async analyzeDevOpsMaturity(repositories: GitHubRepo[]): Promise<DevOpsMaturity> {
    try {
      const totalRepos = repositories.length;
      if (totalRepos === 0) {
        return {
          cicdAdoption: 0,
          testingCulture: 0,
          securityPractices: 0,
          documentationQuality: 0,
          communityEngagement: 0,
          overallMaturity: 'beginner',
        };
      }

      // Adoption CI/CD (GitHub Actions)
      const reposWithCI = repositories.filter(repo => repo.githubActions?.workflowsCount > 0).length;
      const cicdAdoption = Math.round((reposWithCI / totalRepos) * 100);

      // Culture de tests (approximation basée sur les workflows)
      const reposWithTests = repositories.filter(repo =>
        repo.githubActions?.workflows?.some(workflow =>
          workflow.name.toLowerCase().includes('test') ??           workflow.name.toLowerCase().includes('ci'),
        ),
      ).length;
      const testingCulture = Math.round((reposWithTests / totalRepos) * 100);

      // Pratiques de sécurité
      const reposWithSecurity = repositories.filter(repo =>
        repo.security?.dependabotAlerts.totalCount > 0 ??         repo.security?.hasSecurityPolicy ??         repo.branchProtection?.rules.length > 0,
      ).length;
      const securityPractices = Math.round((reposWithSecurity / totalRepos) * 100);

      // Qualité de la documentation
      const reposWithDocs = repositories.filter(repo =>
        repo.community?.hasReadme ??         repo.community?.hasContributing ??         repo.hasWikiEnabled,
      ).length;
      const documentationQuality = Math.round((reposWithDocs / totalRepos) * 100);

      // Engagement communautaire
      const reposWithEngagement = repositories.filter(repo =>
        repo.stargazerCount > 0 ??         repo.forkCount > 0 ??         repo.issues.totalCount > 0,
      ).length;
      const communityEngagement = Math.round((reposWithEngagement / totalRepos) * 100);

      // Score global
      const overallScore = (cicdAdoption + testingCulture + securityPractices +
                          documentationQuality + communityEngagement) / 5;

      let overallMaturity: 'beginner' | 'intermediate' | 'advanced' | 'expert';
      if (overallScore >= 80) overallMaturity = 'expert';
      else if (overallScore >= 60) overallMaturity = 'advanced';
      else if (overallScore >= 40) overallMaturity = 'intermediate';
      else overallMaturity = 'beginner';

      return {
        cicdAdoption,
        testingCulture,
        securityPractices,
        documentationQuality,
        communityEngagement,
        overallMaturity,
      };
    } catch (_error: unknown) {
      logger.error('Erreur analyse maturité DevOps', { _error: error.message });
      throw error;
    }
  }

  /**
   * Analyse les métriques de collaboration
   */
  private async analyzeCollaborationMetrics(
    _userProfile: UserProfile,
    repositories: GitHubRepo[],
  ): Promise<CollaborationMetrics> {
    try {
      // Classification des projets
      const teamProjects = repositories.filter(repo =>
        repo.forkCount > 0 ?? repo.stargazerCount > 5 ?? repo.collaborators.totalCount > 1,
      ).length;
      const soloProjects = repositories.length - teamProjects;

      // Contributions externes (approximation)
      const contributionsToOthers = repositories.filter(repo =>
        repo.isFork && repo.commits.totalCount > 0,
      ).length;

      // Pull Requests
      const pullRequestsReceived = repositories.reduce((sum, repo) =>
        sum + repo.pullRequests.totalCount, 0,
      );
      const pullRequestsMade = contributionsToOthers * 2; // Estimation

      // Scores de leadership et mentorat (basés sur l'activité)
      const codeReviewsGiven = Math.round(pullRequestsReceived * 0.3); // Estimation
      const mentorshipActivity = this.calculateMentorshipScore(userProfile, repositories);
      const leadershipScore = this.calculateLeadershipScore(userProfile, repositories);

      return {
        teamProjects,
        soloProjects,
        contributionsToOthers,
        pullRequestsReceived,
        pullRequestsMade,
        codeReviewsGiven,
        mentorshipActivity,
        leadershipScore,
      };
    } catch (_error: unknown) {
      logger.error('Erreur analyse métriques collaboration', { _error: error.message });
      throw error;
    }
  }

  // Méthodes utilitaires privées

  private calculateCommitFrequency(commits: Record<string, unknown>[], days: number): number {
    if (commits.length === 0) return 0;

    _now = new Date();
    const startDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));

    const recentCommits = commits.filter(commit => {
      const commitDate = new Date(commit.committedDate);
      return commitDate >= startDate;
    });

    return Math.round((recentCommits.length / days) * 10) / 10;
  }

  private analyzeCommitMessageQuality(commits: Record<string, unknown>[]): number {
    if (commits.length === 0) return 0;

    const qualityScore = commits.reduce((score, commit) => {
      const message = commit.message ?? '';
      let points = 0;

      // Longueur appropriée (entre 20 et 100 caractères)
      if (message.length >= 20 && message.length <= 100) points += 30;

      // Présence de mots-clés structurés
      if (/^(feat|fix|docs|style|refactor|test|chore)[:(\[]/.test(message.toLowerCase())) {
        points += 40;
      }

      // Pas uniquement en majuscules
      if (message !== message.toUpperCase()) points += 10;

      // Pas de message générique
      if (!/^(update|fix|wip|tmp|test)$/i.test(message.trim())) points += 20;

      return score + Math.min(points, 100);
    }, 0);

    return Math.round(qualityScore / commits.length);
  }

  private detectBranchingStrategy(repositories: GitHubRepo[]): 'gitflow' | 'feature' | 'trunk' | 'mixed' {
    // Logique simplifiée basée sur les noms de branches par défaut et l'activité
    const mainBranches = repositories.map(repo => repo.defaultBranchRef).filter(Boolean);
    const hasMain = mainBranches.some(branch => branch === 'main');
    const hasMaster = mainBranches.some(branch => branch === 'master');
    const hasDevelop = repositories.some(repo =>
      repo.branchProtection?.rules.some(rule => rule.pattern.includes('develop')),
    );

    if (hasDevelop) return 'gitflow';
    if (hasMain ?? hasMaster) return 'feature';
    return 'mixed';
  }

  private calculatePullRequestRatio(repositories: GitHubRepo[], commits: Record<string, unknown>[]): number {
    const totalPRs = repositories.reduce((sum, repo) => sum + repo.pullRequests.totalCount, 0);
    const totalCommits = commits.length;

    return totalCommits > 0 ? Math.round((totalPRs / totalCommits) * 100) / 100 : 0;
  }

  private calculateCodeReviewParticipation(repositories: GitHubRepo[]): number {
    // Score basé sur la présence de PRs et la configuration de protection de branche
    const reposWithPRs = repositories.filter(repo => repo.pullRequests.totalCount > 0).length;
    const reposWithReviewRules = repositories.filter(repo =>
      repo.branchProtection?.rules.some(rule => rule.requiresCodeOwnerReviews),
    ).length;

    const total = repositories.length;
    if (total === 0) return 0;

    return Math.round(((reposWithPRs + reposWithReviewRules) / (total * 2)) * 100);
  }

  private calculateAverageIssueResolutionTime(repositories: GitHubRepo[]): number {
    // Estimation basée sur le ratio issues ouvertes/fermées
    const totalIssues = repositories.reduce((sum, repo) => sum + repo.issues.totalCount, 0);
    const openIssues = repositories.reduce((sum, repo) => sum + repo.issues.openCount, 0);

    if (totalIssues === 0) return 0;

    const closureRate = (totalIssues - openIssues) / totalIssues;
    // Estimation : plus le taux de fermeture est élevé, plus la résolution est rapide
    return Math.round((1 - closureRate) * 30); // 0-30 jours
  }

  private calculateConsistencyScore(repositories: GitHubRepo[]): number {
    if (repositories.length === 0) return 0;

    // Basé sur la régularité des dernières activités
    _now = new Date();
    const recentlyActive = repositories.filter(repo => {
      const lastPush = repo.pushedAt ? new Date(repo.pushedAt) : new Date(0);
      const monthsAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
      return lastPush > monthsAgo;
    }).length;

    return Math.round((recentlyActive / repositories.length) * 100);
  }

  private detectProductivityTrend(repositories: GitHubRepo[]): 'increasing' | 'stable' | 'decreasing' {
    // Analyse basée sur l'activité récente vs historique
    _now = new Date();
    const sixMonthsAgo = new Date(now.getTime() - (6 * 30 * 24 * 60 * 60 * 1000));
    const oneYearAgo = new Date(now.getTime() - (12 * 30 * 24 * 60 * 60 * 1000));

    const recentActivity = repositories.filter(repo => {
      const lastPush = repo.pushedAt ? new Date(repo.pushedAt) : new Date(0);
      return lastPush > sixMonthsAgo;
    }).length;

    const oldActivity = repositories.filter(repo => {
      const lastPush = repo.pushedAt ? new Date(repo.pushedAt) : new Date(0);
      return lastPush > oneYearAgo && lastPush <= sixMonthsAgo;
    }).length;

    if (recentActivity > oldActivity * 1.2) return 'increasing';
    if (recentActivity < oldActivity * 0.8) return 'decreasing';
    return 'stable';
  }

  private calculateBenchmarkPercentile(overall: number, stars: number, commits: number): number {
    // Simulation d'un benchmarking basé sur les métriques
    let percentile = 50; // Base

    if (overall > 80) percentile += 30;
    else if (overall > 60) percentile += 15;
    else if (overall < 40) percentile -= 15;

    if (stars > 100) percentile += 15;
    else if (stars > 10) percentile += 5;

    if (commits > 1000) percentile += 10;
    else if (commits > 100) percentile += 5;

    return Math.min(95, Math.max(5, percentile));
  }

  private calculateLanguageProficiency(language: string, repoCount: number, totalSize: number): number {
    // Score de 0-100 basé sur l'usage et la taille de code
    let score = 0;

    // Bonus pour le nombre de repositories
    score += Math.min(repoCount * 15, 60);

    // Bonus pour la taille de code
    if (totalSize > 100000) score += 30;
    else if (totalSize > 10000) score += 20;
    else if (totalSize > 1000) score += 10;

    // Bonus pour les langages populaires
    const popularLanguages = ['JavaScript', 'Python', 'Java', 'TypeScript', 'C++', 'C#', 'Go', 'Rust'];
    if (popularLanguages.includes(language)) score += 10;

    return Math.min(100, score);
  }

  private analyzeLanguageTrends(repositories: GitHubRepo[]): Array<{
    language: string;
    trend: 'rising' | 'stable' | 'declining';
    monthlyGrowth: number;
  }> {
    // Simulation basée sur l'activité récente par langage
    const languageActivity: Record<string, { recent: number; total: number }> = {};

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    repositories.forEach(repo => {
      if (repo.primaryLanguage) {
        if (!languageActivity[repo.primaryLanguage]) {
          languageActivity[repo.primaryLanguage] = { recent: 0, total: 0 };
        }
        languageActivity[repo.primaryLanguage].total++;

        if (repo.pushedAt && new Date(repo.pushedAt) > sixMonthsAgo) {
          languageActivity[repo.primaryLanguage].recent++;
        }
      }
    });

    return Object.entries(languageActivity)
      .map(([language, activity]) => {
        const ratio = activity.recent / activity.total;
        let trend: 'rising' | 'stable' | 'declining';
        let monthlyGrowth: number;

        if (ratio > 0.7) {
          trend = 'rising';
          monthlyGrowth = Math.round(ratio * 20);
        } else if (ratio < 0.3) {
          trend = 'declining';
          monthlyGrowth = Math.round((ratio - 0.5) * 20);
        } else {
          trend = 'stable';
          monthlyGrowth = 0;
        }

        return { language, trend, monthlyGrowth };
      })
      .slice(0, 10);
  }

  private classifyLanguageExpertise(distribution: Record<string, unknown>[]): {
    beginner: string[];
    intermediate: string[];
    advanced: string[];
    expert: string[];
  } {
    const expertise = {
      beginner: [] as string[],
      intermediate: [] as string[],
      advanced: [] as string[],
      expert: [] as string[],
    };

    distribution.forEach(lang => {
      if (lang.proficiencyScore >= 80) {
        expertise.expert.push(lang.language);
      } else if (lang.proficiencyScore >= 60) {
        expertise.advanced.push(lang.language);
      } else if (lang.proficiencyScore >= 30) {
        expertise.intermediate.push(lang.language);
      } else {
        expertise.beginner.push(lang.language);
      }
    });

    return expertise;
  }

  private calculateHourlyDistribution(commits: Record<string, unknown>[]): Array<{
    hour: number;
    commits: number;
    intensity: 'low' | 'medium' | 'high';
  }> {
    const hourlyStats: number[] = new Array(24).fill(0);

    commits.forEach(commit => {
      const hour = new Date(commit.committedDate).getHours();
      hourlyStats[hour]++;
    });

    const maxCommits = Math.max(...hourlyStats);

    return hourlyStats.map((commits, hour) => ({
      hour,
      commits,
      intensity: commits === 0 ? 'low' :
        commits < maxCommits * 0.3 ? 'low' :
          commits < maxCommits * 0.7 ? 'medium' : 'high',
    }));
  }

  private calculateDailyDistribution(commits: Record<string, unknown>[]): Array<{
    day: string;
    commits: number;
    intensity: 'low' | 'medium' | 'high';
  }> {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dailyStats: number[] = new Array(7).fill(0);

    commits.forEach(commit => {
      const dayIndex = new Date(commit.committedDate).getDay();
      dailyStats[dayIndex]++;
    });

    const maxCommits = Math.max(...dailyStats);

    return dailyStats.map((commits, index) => ({
      day: days[index],
      commits,
      intensity: commits === 0 ? 'low' :
        commits < maxCommits * 0.3 ? 'low' :
          commits < maxCommits * 0.7 ? 'medium' : 'high',
    }));
  }

  private calculateMonthlyDistribution(repositories: GitHubRepo[]): Array<{
    month: string;
    commits: number;
    repositories: number;
    newProjects: number;
  }> {
    // Simulation de distribution mensuelle
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];

    return months.map((month, index) => ({
      month,
      commits: Math.floor(Math.random() * 50) + 10, // Simulation
      repositories: Math.floor(repositories.length / 12),
      newProjects: Math.floor(Math.random() * 3),
    }));
  }

  private analyzeSeasonality(commits: Record<string, unknown>[]): {
    mostActiveQuarter: string;
    consistency: number;
    vacationPeriods: Array<{
      start: Date;
      end: Date;
      reason: 'detected_break' | 'holiday_pattern';
    }>;
  } {
    // Analyse simplifiée de saisonnalité
    const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
    const quarterCounts = [0, 0, 0, 0];

    commits.forEach(commit => {
      const month = new Date(commit.committedDate).getMonth();
      const quarter = Math.floor(month / 3);
      quarterCounts[quarter]++;
    });

    const maxQuarter = quarterCounts.indexOf(Math.max(...quarterCounts));
    const mostActiveQuarter = quarters[maxQuarter];

    // Calcul de la consistance
    const avg = quarterCounts.reduce((sum, count) => sum + count, 0) / 4;
    const variance = quarterCounts.reduce((sum, count) => sum + Math.pow(count - avg, 2), 0) / 4;
    const consistency = Math.max(0, 100 - Math.round(Math.sqrt(variance) / avg * 100));

    return {
      mostActiveQuarter,
      consistency,
      vacationPeriods: [], // Détection complexe non implémentée
    };
  }

  private calculateMentorshipScore(_userProfile: UserProfile, repositories: GitHubRepo[]): number {
    // Score basé sur l'aide apportée à la communauté
    const publicRepos = repositories.filter(repo => !repo.isPrivate).length;
    const docsRepos = repositories.filter(repo =>
      repo.community?.hasReadme ?? repo.community?.hasContributing,
    ).length;
    const starredRepos = repositories.filter(repo => repo.stargazerCount > 0).length;

    return Math.min(100, Math.round((publicRepos * 10 + docsRepos * 20 + starredRepos * 15) / 3));
  }

  private calculateLeadershipScore(_userProfile: UserProfile, repositories: GitHubRepo[]): number {
    // Score basé sur l'ownership et l'influence
    const ownedRepos = repositories.filter(repo => !repo.isFork).length;
    const popularRepos = repositories.filter(repo => repo.stargazerCount > 5).length;
    const teamRepos = repositories.filter(repo => repo.collaborators.totalCount > 1).length;

    return Math.min(100, Math.round((ownedRepos * 15 + popularRepos * 25 + teamRepos * 20) / 3));
  }
}

// Export de l'instance singleton
export const analyticsService = new AnalyticsService();
