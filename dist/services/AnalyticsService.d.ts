import { GitHubRepo, UserProfile } from "@/types/github";
import { AnalyticsOverview } from "@/types/analytics";
export declare class AnalyticsService {
  generateAnalyticsOverview(
    userProfile: UserProfile,
    repositories: GitHubRepo[],
    timeframe?: {
      start: Date;
      end: Date;
    },
  ): Promise<AnalyticsOverview>;
  private calculatePerformanceMetrics;
  private calculateProductivityScore;
  private analyzeLanguages;
  private analyzeActivityPatterns;
  private analyzeProjectComplexity;
  private analyzeDevOpsMaturity;
  private analyzeCollaborationMetrics;
  private calculateCommitFrequency;
  private analyzeCommitMessageQuality;
  private detectBranchingStrategy;
  private calculatePullRequestRatio;
  private calculateCodeReviewParticipation;
  private calculateAverageIssueResolutionTime;
  private calculateConsistencyScore;
  private detectProductivityTrend;
  private calculateBenchmarkPercentile;
  private calculateLanguageProficiency;
  private analyzeLanguageTrends;
  private classifyLanguageExpertise;
  private calculateHourlyDistribution;
  private calculateDailyDistribution;
  private calculateMonthlyDistribution;
  private analyzeSeasonality;
  private calculateMentorshipScore;
  private calculateLeadershipScore;
}
export declare const analyticsService: AnalyticsService;
//# sourceMappingURL=AnalyticsService.d.ts.map
