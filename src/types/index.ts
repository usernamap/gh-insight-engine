// Export centralisé de tous les types
export * from './analytics';
export * from './github';
export * from './insights';
// Export summary types avec aliases pour éviter les conflits
export type {
  DeveloperSummary,
  EnrichedProfile,
  PortfolioOverview,
  TechnologyExpertise,
  CommunityImpact,
  GrowthInsights,
  PersonalizedRecommendations,
  IndustryBenchmarks,
  SummaryMetadata,
  LanguageUsage,
  CareerLevel,
  InfluenceLevel,
  DevOpsMaturity as SummaryDevOpsMaturity,
} from './summary';
