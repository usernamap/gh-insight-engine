export interface DeveloperSummary {
  profile: EnrichedProfile;
  portfolioOverview: PortfolioOverview;
  technologyExpertise: TechnologyExpertise;
  devOpsMaturity: DevOpsMaturity;
  communityImpact: CommunityImpact;
  growthInsights: GrowthInsights;
  recommendations: PersonalizedRecommendations;
  industryBenchmarks: IndustryBenchmarks;
  metadata: SummaryMetadata;
}

export interface EnrichedProfile {
  login: string;
  name: string;
  bio: string;
  location: string;
  company: string;
  blog: string;
  email: string;
  avatarUrl: string;
  reputationScore: number;
  influenceLevel: InfluenceLevel;
  expertiseAreas: string[];
  totalContributions: number;
  activeYears: number;
  consistencyScore: number;
  totalStars: number;
  totalForks: number;
  totalWatchers: number;
  careerLevel: CareerLevel;
  specializations: Specialization[];
}

export interface PortfolioOverview {
  totalRepositories: number;
  publicRepositories: number;
  privateRepositories: number;
  contributedRepositories: number;
  portfolioQualityScore: number;
  averageStarsPerRepo: number;
  projectDiversityScore: number;
  projectTypes: ProjectTypeDistribution;
  projectMaturity: ProjectMaturityDistribution;
  totalLanguages: number;
  primaryLanguages: LanguageUsage[];
  emergingLanguages: LanguageUsage[];
  recentActivity: RecentActivitySummary;
  productivityMetrics: ProductivityMetrics;
}

export interface TechnologyExpertise {
  overallExpertiseScore: number;
  frontendExpertise: TechnologyCategory;
  backendExpertise: TechnologyCategory;
  mobileExpertise: TechnologyCategory;
  devOpsExpertise: TechnologyCategory;
  dataExpertise: TechnologyCategory;
  aiMlExpertise: TechnologyCategory;
  expertLevel: TechnologyMastery[];
  advancedLevel: TechnologyMastery[];
  intermediateLevel: TechnologyMastery[];
  beginnerLevel: TechnologyMastery[];
  learningTrends: LearningTrend[];
  recommendedTechnologies: string[];
}

export interface DevOpsMaturity {
  devOpsScore: number;
  maturityLevel: DevOpsMaturityLevel;
  cicdAdoption: number;
  testingMaturity: number;
  securityMaturity: number;
  monitoringMaturity: number;
  automationScore: number;
  workflowEfficiency: number;
  codeQualityScore: number;
  documentationScore: number;
  bestPractices: BestPracticeAdoption[];
  improvementAreas: string[];
}

export interface CommunityImpact {
  impactScore: number;
  influenceRadius: number;
  openSourceContributions: number;
  maintainedProjects: number;
  issuesResolved: number;
  pullRequestsMerged: number;
  followersGrowth: GrowthMetric;
  starsMilestones: Milestone[];
  featuredProjects: FeaturedProject[];
  achievements: Achievement[];
  mentoringScore: number;
  leadershipIndicators: LeadershipIndicator[];
}

export interface GrowthInsights {
  growthTrajectory: GrowthTrajectory;
  careerProgression: CareerProgression;
  activityTrends: ActivityTrend[];
  productivityTrends: ProductivityTrend[];
  technologyEvolution: TechnologyEvolution[];
  skillProgression: SkillProgression[];
  futureGrowthPotential: number;
  recommendedFocusAreas: string[];
}

export interface PersonalizedRecommendations {
  careerRecommendations: CareerRecommendation[];
  technologyRecommendations: TechnologyRecommendation[];
  projectRecommendations: ProjectRecommendation[];
  learningRecommendations: LearningRecommendation[];
  communityRecommendations: CommunityRecommendation[];
}

export interface IndustryBenchmarks {
  overallPercentile: number;
  categoryPercentiles: CategoryPercentile[];
  industryComparisons: IndustryComparison[];
  marketPosition: MarketPosition;
  competitiveAdvantages: string[];
  industryTrends: IndustryTrend[];
}

export interface SummaryMetadata {
  generatedAt: Date;
  dataFreshness: DataFreshness;
  analysisVersion: string;
  computationTime: number;
  dataCompleteness: number;
  confidenceScore: number;
  dataSources: DataSource[];
  analysisParameters: AnalysisParameters;
}

export type InfluenceLevel = 'Emerging' | 'Growing' | 'Influential' | 'Leader' | 'Visionary';
export type CareerLevel =
  | 'Junior'
  | 'Mid-Level'
  | 'Senior'
  | 'Lead'
  | 'Principal'
  | 'Staff'
  | 'Distinguished';
export type DevOpsMaturityLevel = 'Initial' | 'Developing' | 'Defined' | 'Managed' | 'Optimizing';

export interface Specialization {
  area: string;
  level: number;
  yearsOfExperience: number;
  confidence: number;
}

export interface ProjectTypeDistribution {
  webApplications: number;
  mobileApplications: number;
  libraries: number;
  frameworks: number;
  tools: number;
  games: number;
  aiMl: number;
  iot: number;
  blockchain: number;
  other: number;
}

export interface ProjectMaturityDistribution {
  prototype: number;
  mvp: number;
  production: number;
  mature: number;
  legacy: number;
}

export interface LanguageUsage {
  name: string;
  proficiencyLevel: number;
  totalBytes: number;
  repositoryCount: number;
  recentUsage: boolean;
  trend: 'growing' | 'stable' | 'declining';
}

export interface RecentActivitySummary {
  last30Days: {
    commits: number;
    pullRequests: number;
    issues: number;
    repositories: number;
  };
  last90Days: {
    commits: number;
    pullRequests: number;
    issues: number;
    repositories: number;
  };
  lastYear: {
    commits: number;
    pullRequests: number;
    issues: number;
    repositories: number;
  };
}

export interface ProductivityMetrics {
  commitsPerDay: number;
  averageCommitSize: number;
  codeChurnRate: number;
  featureDeliveryRate: number;
  bugFixRate: number;
}

export interface TechnologyCategory {
  score: number;
  dominantTechnologies: string[];
  emergingInterests: string[];
  marketabilityScore: number;
}

export interface TechnologyMastery {
  technology: string;
  masteryLevel: number;
  yearsOfExperience: number;
  projectCount: number;
  marketDemand: 'Low' | 'Medium' | 'High' | 'Very High';
}

export interface LearningTrend {
  technology: string;
  progressRate: number;
  learningVelocity: 'Slow' | 'Moderate' | 'Fast' | 'Accelerating';
  futureRelevance: number;
}

export interface BestPracticeAdoption {
  practice: string;
  adoptionLevel: number;
  implementationQuality: number;
  industryStandard: boolean;
}

export interface GrowthMetric {
  current: number;
  sixMonthsAgo: number;
  oneYearAgo: number;
  growthRate: number;
  trajectory: 'Accelerating' | 'Steady' | 'Slowing' | 'Declining';
}

export interface Milestone {
  type: string;
  value: number;
  achievedAt: Date;
  significance: 'Minor' | 'Major' | 'Exceptional';
}

export interface FeaturedProject {
  name: string;
  description: string;
  stars: number;
  significance: string;
  technologies: string[];
  impactScore: number;
}

export interface Achievement {
  title: string;
  description: string;
  category: string;
  rarity: 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary';
  unlockedAt: Date;
}

export interface LeadershipIndicator {
  type: string;
  evidence: string;
  strength: number;
}

export interface GrowthTrajectory {
  direction: 'Upward' | 'Stable' | 'Variable' | 'Declining';
  velocity: number;
  momentum: number;
  sustainability: number;
}

export interface CareerProgression {
  currentLevel: CareerLevel;
  yearsToNext: number;
  progressToNext: number;
  keyMilestones: string[];
}

export interface ActivityTrend {
  metric: string;
  trend: 'Increasing' | 'Stable' | 'Decreasing';
  changeRate: number;
  seasonality: boolean;
}

export interface ProductivityTrend {
  period: string;
  efficiency: number;
  quality: number;
  innovation: number;
}

export interface TechnologyEvolution {
  technology: string;
  adoptionDate: Date;
  proficiencyGrowth: number[];
  currentMastery: number;
}

export interface SkillProgression {
  skill: string;
  initialLevel: number;
  currentLevel: number;
  targetLevel: number;
  timeToTarget: number;
}

export interface CareerRecommendation {
  type: 'Role' | 'Industry' | 'Skill' | 'Experience';
  title: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  effort: 'Low' | 'Medium' | 'High';
  timeline: string;
  potentialImpact: number;
}

export interface TechnologyRecommendation {
  technology: string;
  rationale: string;
  currentRelevance: number;
  futureRelevance: number;
  learningDifficulty: 'Easy' | 'Medium' | 'Hard' | 'Expert';
  marketDemand: 'Low' | 'Medium' | 'High' | 'Very High';
}

export interface ProjectRecommendation {
  type: string;
  title: string;
  description: string;
  technologies: string[];
  estimatedImpact: number;
  complexity: 'Simple' | 'Medium' | 'Complex' | 'Expert';
}

export interface LearningRecommendation {
  topic: string;
  resources: string[];
  priority: number;
  estimatedTime: string;
  prerequisites: string[];
}

export interface CommunityRecommendation {
  type: 'Contribution' | 'Event' | 'Network' | 'Platform';
  title: string;
  description: string;
  potentialImpact: number;
}

export interface CategoryPercentile {
  category: string;
  percentile: number;
  rank: string;
}

export interface IndustryComparison {
  industry: string;
  position: 'Below Average' | 'Average' | 'Above Average' | 'Top Tier' | 'Elite';
  metrics: Record<string, number>;
}

export interface MarketPosition {
  overallRank: string;
  strengths: string[];
  differentiators: string[];
  marketValue: 'Entry' | 'Junior' | 'Mid' | 'Senior' | 'Lead' | 'Principal' | 'Staff';
}

export interface IndustryTrend {
  technology: string;
  trend: 'Emerging' | 'Growing' | 'Mainstream' | 'Declining' | 'Legacy';
  adoptionRate: number;
  futureOutlook: 'Promising' | 'Stable' | 'Uncertain' | 'Declining';
}

export interface DataFreshness {
  userProfile: Date;
  repositories: Date;
  overallFreshness: 'Fresh' | 'Recent' | 'Stale' | 'Outdated';
  recommendedUpdate: boolean;
}

export interface DataSource {
  name: string;
  lastUpdated: Date;
  completeness: number;
  reliability: number;
}

export interface AnalysisParameters {
  includePrimaryLanguagesOnly: boolean;
  minimumStarsThreshold: number;
  timeRangeMonths: number;
  includeForkedRepos: boolean;
  weightingStrategy: 'Equal' | 'Stars' | 'Recent' | 'Complexity';
}
