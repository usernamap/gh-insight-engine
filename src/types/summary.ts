/**
 * Types pour l'endpoint Summary - Analytics ultra-complets
 * Optimisé pour intégrations portfolio, CV et présentations
 */

// Summary principal ultra-complet
export interface DeveloperSummary {
  // Informations de base enrichies
  profile: EnrichedProfile;

  // Analytics portfolio complet
  portfolioOverview: PortfolioOverview;

  // Expertise technologique détaillée
  technologyExpertise: TechnologyExpertise;

  // Maturité DevOps et méthodologies
  devOpsMaturity: DevOpsMaturity;

  // Impact et influence communautaire
  communityImpact: CommunityImpact;

  // Insights de croissance et tendances
  growthInsights: GrowthInsights;

  // Recommandations personnalisées
  recommendations: PersonalizedRecommendations;

  // Benchmarks industrie et percentiles
  industryBenchmarks: IndustryBenchmarks;

  // Métadonnées et fraîcheur des données
  metadata: SummaryMetadata;
}

// Profil enrichi avec métriques calculées
export interface EnrichedProfile {
  // Données de base
  login: string;
  name: string;
  bio: string;
  location: string;
  company: string;
  blog: string;
  email: string;
  avatarUrl: string;

  // Métriques de réputation
  reputationScore: number; // 0-100
  influenceLevel: InfluenceLevel;
  expertiseAreas: string[];

  // Activité et engagement
  totalContributions: number;
  activeYears: number;
  consistencyScore: number; // 0-100

  // Reconnaissance communautaire
  totalStars: number;
  totalForks: number;
  totalWatchers: number;

  // Profil professionnel
  careerLevel: CareerLevel;
  specializations: Specialization[];
}

// Vue d'ensemble du portfolio
export interface PortfolioOverview {
  // Statistiques globales
  totalRepositories: number;
  publicRepositories: number;
  privateRepositories: number;
  contributedRepositories: number;

  // Métriques de qualité
  portfolioQualityScore: number; // 0-100
  averageStarsPerRepo: number;
  projectDiversityScore: number; // 0-100

  // Distribution des projets
  projectTypes: ProjectTypeDistribution;
  projectMaturity: ProjectMaturityDistribution;

  // Langages et technologies
  totalLanguages: number;
  primaryLanguages: LanguageUsage[];
  emergingLanguages: LanguageUsage[];

  // Activité récente
  recentActivity: RecentActivitySummary;
  productivityMetrics: ProductivityMetrics;
}

// Expertise technologique détaillée
export interface TechnologyExpertise {
  // Score global d'expertise
  overallExpertiseScore: number; // 0-100

  // Maîtrise par catégorie
  frontendExpertise: TechnologyCategory;
  backendExpertise: TechnologyCategory;
  mobileExpertise: TechnologyCategory;
  devOpsExpertise: TechnologyCategory;
  dataExpertise: TechnologyCategory;
  aiMlExpertise: TechnologyCategory;

  // Technologies par niveau
  expertLevel: TechnologyMastery[]; // 90-100%
  advancedLevel: TechnologyMastery[]; // 70-89%
  intermediateLevel: TechnologyMastery[]; // 50-69%
  beginnerLevel: TechnologyMastery[]; // 0-49%

  // Tendances d'apprentissage
  learningTrends: LearningTrend[];
  recommendedTechnologies: string[];
}

// Maturité DevOps et méthodologies
export interface DevOpsMaturity {
  // Score global DevOps
  devOpsScore: number; // 0-100
  maturityLevel: DevOpsMaturityLevel;

  // Pratiques DevOps
  cicdAdoption: number; // 0-100%
  testingMaturity: number; // 0-100%
  securityMaturity: number; // 0-100%
  monitoringMaturity: number; // 0-100%

  // Automatisation
  automationScore: number; // 0-100
  workflowEfficiency: number; // 0-100

  // Qualité du code
  codeQualityScore: number; // 0-100
  documentationScore: number; // 0-100

  // Bonnes pratiques
  bestPractices: BestPracticeAdoption[];
  improvementAreas: string[];
}

// Impact et influence communautaire
export interface CommunityImpact {
  // Score d'impact global
  impactScore: number; // 0-100
  influenceRadius: number; // Nombre de personnes impactées

  // Contributions open source
  openSourceContributions: number;
  maintainedProjects: number;
  issuesResolved: number;
  pullRequestsMerged: number;

  // Engagement communautaire
  followersGrowth: GrowthMetric;
  starsMilestones: Milestone[];

  // Reconnaissance
  featuredProjects: FeaturedProject[];
  achievements: Achievement[];

  // Mentoring et leadership
  mentoringScore: number; // 0-100
  leadershipIndicators: LeadershipIndicator[];
}

// Insights de croissance et tendances
export interface GrowthInsights {
  // Trajectoire de croissance
  growthTrajectory: GrowthTrajectory;
  careerProgression: CareerProgression;

  // Tendances d'activité
  activityTrends: ActivityTrend[];
  productivityTrends: ProductivityTrend[];

  // Évolution technologique
  technologyEvolution: TechnologyEvolution[];
  skillProgression: SkillProgression[];

  // Projections
  futureGrowthPotential: number; // 0-100
  recommendedFocusAreas: string[];
}

// Recommandations personnalisées
export interface PersonalizedRecommendations {
  // Recommandations de carrière
  careerRecommendations: CareerRecommendation[];

  // Recommandations techniques
  technologyRecommendations: TechnologyRecommendation[];

  // Recommandations de projets
  projectRecommendations: ProjectRecommendation[];

  // Recommandations d'apprentissage
  learningRecommendations: LearningRecommendation[];

  // Recommandations communautaires
  communityRecommendations: CommunityRecommendation[];
}

// Benchmarks industrie et percentiles
export interface IndustryBenchmarks {
  // Position dans l'industrie
  overallPercentile: number; // 0-100
  categoryPercentiles: CategoryPercentile[];

  // Comparaisons sectorielles
  industryComparisons: IndustryComparison[];

  // Métriques de marché
  marketPosition: MarketPosition;
  competitiveAdvantages: string[];

  // Trends industrie
  industryTrends: IndustryTrend[];
}

// Métadonnées du summary
export interface SummaryMetadata {
  generatedAt: Date;
  dataFreshness: DataFreshness;
  analysisVersion: string;
  computationTime: number; // en ms
  dataCompleteness: number; // 0-100%
  confidenceScore: number; // 0-100%

  // Sources de données
  dataSources: DataSource[];

  // Paramètres d'analyse
  analysisParameters: AnalysisParameters;
}

// Types de support
export type InfluenceLevel = 'Emerging' | 'Growing' | 'Influential' | 'Leader' | 'Visionary';
export type CareerLevel = 'Junior' | 'Mid-Level' | 'Senior' | 'Lead' | 'Principal' | 'Staff' | 'Distinguished';
export type DevOpsMaturityLevel = 'Initial' | 'Developing' | 'Defined' | 'Managed' | 'Optimizing';

export interface Specialization {
  area: string;
  level: number; // 0-100
  yearsOfExperience: number;
  confidence: number; // 0-100
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
  proficiencyLevel: number; // 0-100
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
  score: number; // 0-100
  dominantTechnologies: string[];
  emergingInterests: string[];
  marketabilityScore: number; // 0-100
}

export interface TechnologyMastery {
  technology: string;
  masteryLevel: number; // 0-100
  yearsOfExperience: number;
  projectCount: number;
  marketDemand: 'Low' | 'Medium' | 'High' | 'Very High';
}

export interface LearningTrend {
  technology: string;
  progressRate: number; // commits/time
  learningVelocity: 'Slow' | 'Moderate' | 'Fast' | 'Accelerating';
  futureRelevance: number; // 0-100
}

export interface BestPracticeAdoption {
  practice: string;
  adoptionLevel: number; // 0-100%
  implementationQuality: number; // 0-100
  industryStandard: boolean;
}

export interface GrowthMetric {
  current: number;
  sixMonthsAgo: number;
  oneYearAgo: number;
  growthRate: number; // %
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
  strength: number; // 0-100
}

export interface GrowthTrajectory {
  direction: 'Upward' | 'Stable' | 'Variable' | 'Declining';
  velocity: number; // rate of change
  momentum: number; // 0-100
  sustainability: number; // 0-100
}

export interface CareerProgression {
  currentLevel: CareerLevel;
  yearsToNext: number;
  progressToNext: number; // 0-100%
  keyMilestones: string[];
}

export interface ActivityTrend {
  metric: string;
  trend: 'Increasing' | 'Stable' | 'Decreasing';
  changeRate: number; // %
  seasonality: boolean;
}

export interface ProductivityTrend {
  period: string;
  efficiency: number; // 0-100
  quality: number; // 0-100
  innovation: number; // 0-100
}

export interface TechnologyEvolution {
  technology: string;
  adoptionDate: Date;
  proficiencyGrowth: number[]; // timeline of growth
  currentMastery: number; // 0-100
}

export interface SkillProgression {
  skill: string;
  initialLevel: number;
  currentLevel: number;
  targetLevel: number;
  timeToTarget: number; // months
}

export interface CareerRecommendation {
  type: 'Role' | 'Industry' | 'Skill' | 'Experience';
  title: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  effort: 'Low' | 'Medium' | 'High';
  timeline: string;
  potentialImpact: number; // 0-100
}

export interface TechnologyRecommendation {
  technology: string;
  rationale: string;
  currentRelevance: number; // 0-100
  futureRelevance: number; // 0-100
  learningDifficulty: 'Easy' | 'Medium' | 'Hard' | 'Expert';
  marketDemand: 'Low' | 'Medium' | 'High' | 'Very High';
}

export interface ProjectRecommendation {
  type: string;
  title: string;
  description: string;
  technologies: string[];
  estimatedImpact: number; // 0-100
  complexity: 'Simple' | 'Medium' | 'Complex' | 'Expert';
}

export interface LearningRecommendation {
  topic: string;
  resources: string[];
  priority: number; // 0-100
  estimatedTime: string;
  prerequisites: string[];
}

export interface CommunityRecommendation {
  type: 'Contribution' | 'Event' | 'Network' | 'Platform';
  title: string;
  description: string;
  potentialImpact: number; // 0-100
}

export interface CategoryPercentile {
  category: string;
  percentile: number; // 0-100
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
  adoptionRate: number; // %
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
  completeness: number; // 0-100%
  reliability: number; // 0-100%
}

export interface AnalysisParameters {
  includePrimaryLanguagesOnly: boolean;
  minimumStarsThreshold: number;
  timeRangeMonths: number;
  includeForkedRepos: boolean;
  weightingStrategy: 'Equal' | 'Stars' | 'Recent' | 'Complexity';
}
