/**
 * Types pour les analyses quantitatives et métriques calculées
 * Extension du schéma Dataset avec analyses avancées
 */

export interface PerformanceMetrics {
  commitFrequency: {
    daily: number;
    weekly: number;
    monthly: number;
    yearly: number;
  };
  codeQuality: {
    averageCommitSize: number;
    commitMessageQuality: number; // Score 0-100
    branchingStrategy: 'gitflow' | 'feature' | 'trunk' | 'mixed';
  };
  collaboration: {
    pullRequestRatio: number; // PRs per commit
    codeReviewParticipation: number; // Score 0-100
    issueResolutionTime: number; // Average in days
  };
}

export interface ProductivityScore {
  overall: number; // Score 0-100
  breakdown: {
    consistency: number; // Régularité des contributions
    volume: number; // Quantité de code
    impact: number; // Stars, forks, usage
    maintenance: number; // Issues résolues, PRs mergées
  };
  trend: 'increasing' | 'stable' | 'decreasing';
  benchmarkPercentile: number; // Comparaison avec autres développeurs
}

export interface LanguageAnalytics {
  primary: string;
  distribution: Array<{
    language: string;
    percentage: number;
    linesOfCode: number;
    repositoriesCount: number;
    proficiencyScore: number; // Score 0-100 basé sur usage et projets
  }>;
  trends: Array<{
    language: string;
    trend: 'rising' | 'stable' | 'declining';
    monthlyGrowth: number;
  }>;
  expertise: {
    beginner: string[];
    intermediate: string[];
    advanced: string[];
    expert: string[];
  };
}

export interface ActivityPattern {
  hourlyDistribution: Array<{
    hour: number;
    commits: number;
    intensity: 'low' | 'medium' | 'high';
  }>;
  dailyDistribution: Array<{
    day: string;
    commits: number;
    intensity: 'low' | 'medium' | 'high';
  }>;
  monthlyDistribution: Array<{
    month: string;
    commits: number;
    repositories: number;
    newProjects: number;
  }>;
  seasonality: {
    mostActiveQuarter: string;
    consistency: number; // Régularité 0-100
    vacationPeriods: Array<{
      start: Date;
      end: Date;
      reason: 'detected_break' | 'holiday_pattern';
    }>;
  };
}

export interface ProjectComplexity {
  simple: number; // Projets avec < 10 commits, 1 langage
  moderate: number; // Projets avec 10-100 commits, 2-3 langages
  complex: number; // Projets avec 100-1000 commits, 3+ langages
  enterprise: number; // Projets avec 1000+ commits, CI/CD, équipe
  averageComplexity: number; // Score moyen 0-100
  maintainedProjects: number; // Projets actifs derniers 6 mois
}

export interface DevOpsMaturity {
  cicdAdoption: number; // Pourcentage repos avec GitHub Actions
  testingCulture: number; // Score basé sur présence tests
  securityPractices: number; // Score basé sur alertes, policies
  documentationQuality: number; // Score basé sur README, wikis
  communityEngagement: number; // Score basé sur issues, PRs externes
  overallMaturity: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}

export interface CollaborationMetrics {
  teamProjects: number;
  soloProjects: number;
  contributionsToOthers: number;
  pullRequestsReceived: number;
  pullRequestsMade: number;
  codeReviewsGiven: number;
  mentorshipActivity: number; // Score basé sur aide aux autres
  leadershipScore: number; // Score basé sur ownership et guidage
}

export interface AnalyticsOverview {
  userId: string;
  generatedAt: Date;
  timeframe: {
    start: Date;
    end: Date;
    totalDays: number;
  };
  performance: PerformanceMetrics;
  productivity: ProductivityScore;
  languages: LanguageAnalytics;
  activity: ActivityPattern;
  complexity: ProjectComplexity;
  devops: DevOpsMaturity;
  collaboration: CollaborationMetrics;
}

// Types pour les endpoints API
export interface AnalyticsRequest {
  username: string;
  timeframe?: {
    start?: Date;
    end?: Date;
  };
  includePrivate?: boolean;
}

export interface AnalyticsResponse {
  success: boolean;
  data?: AnalyticsOverview;
  error?: string;
  cacheInfo?: {
    cached: boolean;
    generatedAt: Date;
    expiresAt: Date;
  };
}

// Interface spécifique pour la réponse d'analyse utilisateur complète
export interface UserAnalysisResponse {
  message: string;
  analysis: {
    completed: boolean;
    duration: number;
    fresh: boolean;
  };
  dataset: {
    id: string;
    createdAt: Date;
    repositoriesCount: number;
    hasAnalytics: boolean;
    hasAiInsights: boolean;
  };
  _analytics: AnalyticsOverview;
  timestamp: string;
}

// Interface pour les réponses de récupération d'analytics existantes
export interface AnalyticsRetrievalResponse {
  success: boolean;
  data: AnalyticsOverview;
  metadata: {
    datasetId: string;
    generatedAt: string;
    fresh: boolean;
    lastUpdated: string;
  };
  timestamp: string;
}

// Types pour comparaisons et benchmarking
export interface BenchmarkData {
  percentile: number;
  category: 'beginner' | 'junior' | 'mid' | 'senior' | 'expert';
  comparisonGroup: 'same_languages' | 'same_experience' | 'all_developers';
  strengths: string[];
  improvementAreas: string[];
}

export interface ComparisonMetrics {
  commits: BenchmarkData;
  repositories: BenchmarkData;
  languages: BenchmarkData;
  stars: BenchmarkData;
  collaboration: BenchmarkData;
  consistency: BenchmarkData;
}

// Types pour les tendances temporelles
export interface TrendAnalysis {
  metric: string;
  timeframe: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  data: Array<{
    period: string;
    value: number;
    change: number; // Pourcentage de changement
  }>;
  trend: 'increasing' | 'decreasing' | 'stable' | 'volatile';
  seasonality: boolean;
  forecast?: Array<{
    period: string;
    predicted: number;
    confidence: number;
  }>;
}

// Types pour les alertes et recommandations
export interface AnalyticsAlert {
  id: string;
  type: 'warning' | 'info' | 'success' | 'error';
  category: 'performance' | 'activity' | 'security' | 'best_practice';
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  actionable: boolean;
  suggestedActions?: string[];
  dismissible: boolean;
  createdAt: Date;
}

export interface AnalyticsRecommendation {
  id: string;
  category: 'productivity' | 'learning' | 'collaboration' | 'technical';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  priority: number; // 1-10
  timeframe: 'immediate' | 'short_term' | 'long_term';
  resources?: Array<{
    title: string;
    url: string;
    type: 'article' | 'course' | 'tool' | 'documentation';
  }>;
  metrics: string[]; // Métriques qui seront impactées
}

// Export du type principal pour l'extension du Dataset
export interface AnalyticsExtension {
  analytics: AnalyticsOverview;
  benchmarks: ComparisonMetrics;
  trends: TrendAnalysis[];
  alerts: AnalyticsAlert[];
  recommendations: AnalyticsRecommendation[];
  updatedAt: Date;
}
