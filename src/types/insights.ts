import type { GitHubRepo, UserProfile, AnalyticsOverview } from '@/types';

export interface DeveloperPersonality {
  archetype: 'innovator' | 'builder' | 'optimizer' | 'maintainer' | 'explorer' | 'teacher';
  description: string;
  strengths: string[];
  workingStyle: {
    preferredProjectSize: 'small' | 'medium' | 'large' | 'mixed';
    collaborationStyle: 'solo' | 'pair' | 'team_lead' | 'contributor';
    learningApproach: 'experimenter' | 'methodical' | 'research_driven' | 'hands_on';
    problemSolving: 'analytical' | 'creative' | 'systematic' | 'intuitive';
  };
  motivations: string[];
  potentialChallenges: string[];
}

export interface SkillAssessment {
  technical: Array<{
    skill: string;
    proficiency: 'novice' | 'advanced_beginner' | 'competent' | 'proficient' | 'expert';
    confidence: number;
    evidenceStrength: 'weak' | 'moderate' | 'strong' | 'very_strong';
    evidence: string[];
    growthPotential: 'limited' | 'moderate' | 'high' | 'exceptional';
    marketDemand: 'low' | 'moderate' | 'high' | 'very_high';
  }>;
  soft: Array<{
    skill: string;
    level: 'developing' | 'competent' | 'strong' | 'exceptional';
    indicators: string[];
    impactOnCareer: 'minor' | 'moderate' | 'significant' | 'critical';
  }>;
  leadership: {
    current: 'individual_contributor' | 'informal_leader' | 'team_lead' | 'senior_leader';
    potential: 'limited' | 'emerging' | 'strong' | 'exceptional';
    indicators: string[];
  };
}

export interface CareerInsights {
  currentLevel: 'junior' | 'mid_level' | 'senior' | 'staff' | 'principal' | 'distinguished';
  experienceIndicators: string[];
  trajectory: {
    direction: 'ascending' | 'stable' | 'transitioning' | 'exploring';
    velocity: 'slow' | 'steady' | 'rapid' | 'exponential';
    confidence: number;
  };
  suitableRoles: Array<{
    role: string;
    fit: number;
    reasoning: string;
    requirements: string[];
    growthPath: string;
  }>;
  marketPosition: {
    competitiveness: 'below_average' | 'average' | 'above_average' | 'exceptional';
    uniqueValueProposition: string;
    differentiators: string[];
    gaps: string[];
  };
}

export interface ProductivityAnalysis {
  patterns: {
    peakPerformance: {
      timeOfDay: string;
      dayOfWeek: string;
      seasonality: string;
      reasoning: string;
    };
    consistency: {
      level: 'irregular' | 'somewhat_consistent' | 'consistent' | 'highly_consistent';
      factors: string[];
      recommendations: string[];
    };
  };
  efficiency: {
    codeToImpactRatio: 'low' | 'moderate' | 'high' | 'exceptional';
    problemSolvingSpeed: 'deliberate' | 'steady' | 'quick' | 'rapid';
    qualityConsistency: 'variable' | 'improving' | 'consistent' | 'exceptional';
    analysis: string;
  };
  workLifeBalance: {
    sustainabilityScore: number;
    riskFactors: string[];
    positiveIndicators: string[];
    recommendations: string[];
  };
}

export interface TechnicalRecommendations {
  immediate: Array<{
    category: 'skill' | 'tool' | 'practice' | 'project';
    recommendation: string;
    reasoning: string;
    expectedImpact: 'minor' | 'moderate' | 'significant' | 'transformative';
    effort: 'low' | 'medium' | 'high';
    resources: Array<{
      title: string;
      type: 'course' | 'book' | 'project' | 'certification' | 'community';
      url?: string;
      priority: number;
    }>;
  }>;
  shortTerm: Array<{
    goal: string;
    timeframe: string;
    steps: string[];
    metrics: string[];
  }>;
  longTerm: Array<{
    vision: string;
    milestones: string[];
    skills: string[];
    experience: string[];
  }>;
}

export interface StrengthsAnalysis {
  core: Array<{
    strength: string;
    manifestation: string[];
    evidence: string[];
    leverageOpportunities: string[];
  }>;
  emerging: Array<{
    strength: string;
    currentLevel: string;
    potential: string;
    developmentPath: string[];
  }>;
  unique: Array<{
    differentiator: string;
    rarity: 'common' | 'uncommon' | 'rare' | 'exceptional';
    marketValue: 'low' | 'moderate' | 'high' | 'premium';
    applications: string[];
  }>;
}

export interface GrowthOpportunities {
  skills: Array<{
    skill: string;
    currentGap: 'minor' | 'moderate' | 'significant' | 'critical';
    importance: 'nice_to_have' | 'beneficial' | 'important' | 'essential';
    learningPath: string[];
    timeToCompetency: string;
    careerImpact: string;
  }>;
  experiences: Array<{
    experience: string;
    type: 'project' | 'role' | 'responsibility' | 'challenge';
    benefit: string;
    acquiringStrategy: string[];
    prerequisites: string[];
  }>;
  relationships: Array<{
    type: 'mentor' | 'peer' | 'mentee' | 'collaborator' | 'community';
    purpose: string;
    findingStrategy: string[];
    value: string;
  }>;
}

export interface AIAnalysisPrompt {
  systemPrompt: string;
  userPrompt: string;
  dataContext: {
    userProfile: UserProfile;
    repositories: GitHubRepo[];
    analytics: AnalyticsOverview;
  };
  analysisType:
    | 'personality'
    | 'skills'
    | 'career'
    | 'productivity'
    | 'recommendations'
    | 'strengths'
    | 'growth';
}

export interface AIInsightsSummary {
  userId: string;
  generatedAt: Date;
  model: string;
  confidence: number;
  personality: DeveloperPersonality;
  skills: SkillAssessment;
  career: CareerInsights;
  productivity: ProductivityAnalysis;
  recommendations: TechnicalRecommendations;
  strengths: StrengthsAnalysis;
  growth: GrowthOpportunities;
  executiveSummary: {
    keyHighlights: string[];
    majorStrengths: string[];
    primaryRecommendations: string[];
    careerOutlook: string;
  };
  metadata: {
    analysisVersion: string;
    dataPoints: number;
    processingTime: number;
    tokens: {
      input: number;
      output: number;
      total: number;
    };
  };
}

export interface InsightsRequest {
  username: string;
  analysisTypes?: (
    | 'personality'
    | 'skills'
    | 'career'
    | 'productivity'
    | 'recommendations'
    | 'strengths'
    | 'growth'
  )[];
  refreshCache?: boolean;
}

export interface InsightsResponse {
  success: boolean;
  data?: AIInsightsSummary;
  error?: string;
  partial?: boolean;
  cacheInfo?: {
    cached: boolean;
    generatedAt: Date;
    expiresAt: Date;
  };
}

export interface InsightsGenerationResponse {
  message: string;
  insights: {
    summary: AIInsightsSummary;
    overallAssessment: string;
  };
  metadata: {
    datasetId: string;
    generatedAt: string;
    repositoriesAnalyzed: number;
  };
  timestamp: string;
}

export interface InsightsDetailResponse {
  success: boolean;
  type: 'summary' | 'recommendations' | 'strengths' | 'growth';
  data: AIInsightsSummary[keyof AIInsightsSummary];
  metadata: {
    datasetId: string;
    generatedAt: string;
    cached: boolean;
  };
  timestamp: string;
}

export interface PromptTemplate {
  name: string;
  version: string;
  systemPrompt: string;
  userPromptTemplate: string;
  variables: string[];
  outputFormat: 'json' | 'markdown' | 'structured';
  maxTokens: number;
  temperature: number;
}

export interface InsightValidation {
  insightId: string;
  userId: string;
  accuracy: number;
  usefulness: number;
  feedback: string;
  categories: string[];
  timestamp: Date;
}

export interface InsightsExtension {
  aiInsights: AIInsightsSummary;
  validation?: InsightValidation[];
  feedback?: {
    averageAccuracy: number;
    averageUsefulness: number;
    commonThemes: string[];
  };
  updatedAt: Date;
}
