export interface PerformanceMetrics {
  commitFrequency: {
    daily: number;
    weekly: number;
    monthly: number;
    yearly: number;
  };
  codeQuality: {
    averageCommitSize: number;
    commitMessageQuality: number;
    branchingStrategy: 'gitflow' | 'feature' | 'trunk' | 'mixed';
  };
  collaboration: {
    pullRequestRatio: number;
    codeReviewParticipation: number;
    issueResolutionTime: number;
  };
}

export interface ProductivityScore {
  overall: number;
  breakdown: {
    consistency: number;
    volume: number;
    impact: number;
    maintenance: number;
  };
  trend: 'increasing' | 'stable' | 'decreasing';
  benchmarkPercentile: number;
}

export interface LanguageAnalytics {
  primary: string;
  distribution: Array<{
    language: string;
    percentage: number;
    linesOfCode: number;
    repositoriesCount: number;
    proficiencyScore: number;
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
    consistency: number;
    vacationPeriods: Array<{
      start: Date;
      end: Date;
      reason: 'detected_break' | 'holiday_pattern';
    }>;
  };
}

export interface ProjectComplexity {
  simple: number;
  moderate: number;
  complex: number;
  enterprise: number;
  averageComplexity: number;
  maintainedProjects: number;
}

export interface DevOpsMaturity {
  cicdAdoption: number;
  testingCulture: number;
  securityPractices: number;
  documentationQuality: number;
  communityEngagement: number;
  overallMaturity: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}

export interface CollaborationMetrics {
  teamProjects: number;
  soloProjects: number;
  contributionsToOthers: number;
  pullRequestsReceived: number;
  pullRequestsMade: number;
  codeReviewsGiven: number;
  mentorshipActivity: number;
  leadershipScore: number;
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

export interface TrendAnalysis {
  metric: string;
  timeframe: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  data: Array<{
    period: string;
    value: number;
    change: number;
  }>;
  trend: 'increasing' | 'decreasing' | 'stable' | 'volatile';
  seasonality: boolean;
  forecast?: Array<{
    period: string;
    predicted: number;
    confidence: number;
  }>;
}

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
  priority: number;
  timeframe: 'immediate' | 'short_term' | 'long_term';
  resources?: Array<{
    title: string;
    url: string;
    type: 'article' | 'course' | 'tool' | 'documentation';
  }>;
  metrics: string[];
}

export interface AnalyticsExtension {
  analytics: AnalyticsOverview;
  benchmarks: ComparisonMetrics;
  trends: TrendAnalysis[];
  alerts: AnalyticsAlert[];
  recommendations: AnalyticsRecommendation[];
  updatedAt: Date;
}
