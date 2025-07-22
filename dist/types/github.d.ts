export interface GitHubLanguage {
  name: string;
  size: number;
  percentage: number;
}
export interface GitHubCommit {
  oid: string;
  message: string;
  committedDate: Date;
  author: {
    name: string;
    email: string;
    login: string | null;
  };
  additions: number;
  deletions: number;
  changedFiles: number;
}
export interface GitHubLicense {
  name: string;
  spdxId: string;
  url: string;
}
export interface GitHubOwner {
  login: string;
  type: string;
  avatarUrl: string;
}
export interface GitHubOrganization {
  login: string;
  name: string;
  description: string;
  avatarUrl: string;
}
export interface GitHubWorkflow {
  name: string;
  path: string;
  state: string;
  createdAt: Date;
  updatedAt: Date;
  lastRunStatus: string;
  lastRunDate: Date;
}
export interface GitHubActions {
  workflowsCount: number;
  lastRunStatus: string;
  workflows: GitHubWorkflow[];
  runs: {
    totalCount: number;
    successful: number;
    failed: number;
    successRate: number;
  };
}
export interface GitHubSecurity {
  dependabotAlerts: {
    totalCount: number;
    open: number;
    fixed: number;
    dismissed: number;
  };
  secretScanning: {
    totalCount: number;
    resolved: number;
  };
  codeScanning: {
    totalCount: number;
    open: number;
    fixed: number;
  };
  hasSecurityPolicy: boolean;
  hasVulnerabilityAlertsEnabled: boolean;
}
export interface GitHubPackages {
  totalCount: number;
  types: string[];
}
export interface GitHubBranchProtectionRule {
  pattern: string;
  requiresStatusChecks: boolean;
  requiresCodeOwnerReviews: boolean;
  dismissStaleReviews: boolean;
  restrictsPushes: boolean;
  requiredStatusChecks: string[];
}
export interface GitHubBranchProtection {
  rules: GitHubBranchProtectionRule[];
}
export interface GitHubCommunity {
  healthPercentage: number;
  hasReadme: boolean;
  hasLicense: boolean;
  hasContributing: boolean;
  hasCodeOfConduct: boolean;
  hasIssueTemplate: boolean;
  hasPullRequestTemplate: boolean;
}
export interface GitHubPopularPath {
  path: string;
  title: string;
  count: number;
  uniques: number;
}
export interface GitHubTraffic {
  views: {
    count: number;
    uniques: number;
  };
  clones: {
    count: number;
    uniques: number;
  };
  popularPaths: GitHubPopularPath[];
}
export interface GitHubRepo {
  _id?: string;
  nameWithOwner: string;
  name: string;
  description: string;
  isPrivate: boolean;
  isArchived: boolean;
  isFork: boolean;
  isTemplate: boolean;
  stargazerCount: number;
  forkCount: number;
  watchersCount: number;
  subscriberCount: number;
  networkCount: number;
  openIssuesCount: number;
  primaryLanguage: string;
  languages: {
    totalSize: number;
    nodes: GitHubLanguage[];
  };
  topics: string[];
  pushedAt: Date;
  updatedAt: Date;
  createdAt: Date;
  homepageUrl: string;
  size: number;
  defaultBranchRef: string;
  license: GitHubLicense | null;
  hasIssuesEnabled: boolean;
  hasProjectsEnabled: boolean;
  hasWikiEnabled: boolean;
  hasPages: boolean;
  hasDownloads: boolean;
  hasDiscussions: boolean;
  vulnerabilityAlertsEnabled: boolean;
  securityPolicyEnabled: boolean;
  codeOfConductEnabled: boolean;
  contributingGuidelinesEnabled: boolean;
  readmeEnabled: boolean;
  deployments: {
    totalCount: number;
  };
  environments: {
    totalCount: number;
  };
  commits: {
    totalCount: number;
    recent: GitHubCommit[];
  };
  releases: {
    totalCount: number;
    latestRelease: {
      name: string;
      tagName: string;
      publishedAt: Date;
      isLatest: boolean;
    } | null;
  };
  issues: {
    totalCount: number;
    openCount: number;
    closedCount: number;
  };
  pullRequests: {
    totalCount: number;
    openCount: number;
    closedCount: number;
    mergedCount: number;
  };
  branchProtectionRules: {
    totalCount: number;
  };
  collaborators: {
    totalCount: number;
  };
  githubActions?: GitHubActions;
  security?: GitHubSecurity;
  packages?: GitHubPackages;
  branchProtection?: GitHubBranchProtection;
  community?: GitHubCommunity;
  traffic?: GitHubTraffic;
  diskUsage: number;
  owner: GitHubOwner;
  userId?: string;
}
export interface UserProfile {
  _id?: string;
  login: string;
  name: string;
  email: string;
  avatarUrl: string;
  bio: string;
  company: string;
  location: string;
  blog: string;
  twitterUsername: string;
  followers: number;
  following: number;
  publicRepos: number;
  publicGists: number;
  privateRepos: number;
  ownedPrivateRepos: number;
  totalPrivateRepos: number;
  collaborators: number;
  createdAt: Date;
  updatedAt: Date;
  type: string;
  siteAdmin: boolean;
  hireable: boolean;
  organizations: {
    totalCount: number;
    nodes: GitHubOrganization[];
  };
}
export interface DatasetMetadata {
  generatedAt: Date;
  totalRepositories: number;
  organizations: string[];
  dataCollectionScope: string[];
  breakdown: {
    userRepositories: number;
    organizationRepositories: Record<string, number>;
    privateRepositories: number;
    publicRepositories: number;
    forkedRepositories: number;
    archivedRepositories: number;
    templateRepositories: number;
  };
  statistics: {
    totalStars: number;
    totalForks: number;
    totalWatchers: number;
    totalIssues: number;
    totalPullRequests: number;
    totalReleases: number;
    totalCommits: number;
    totalDeployments: number;
    totalEnvironments: number;
    totalLanguages: number;
    averageRepoSize: number;
    mostUsedLanguages: Array<{
      language: string;
      count: number;
      totalSize: number;
    }>;
    topTopics: Array<{
      topic: string;
      count: number;
    }>;
    repositoriesWithWebsite: number;
    repositoriesWithDeployments: number;
    repositoriesWithActions: number;
    repositoriesWithSecurityAlerts: number;
    repositoriesWithPackages: number;
    repositoriesWithBranchProtection: number;
    averageCommunityHealth: number;
  };
}
export interface Dataset {
  _id?: string;
  userProfile: string;
  metadata: DatasetMetadata;
  repositories: string[];
  createdAt: Date;
  updatedAt: Date;
  aiInsights?: string;
}
export interface GitHubTokenValidationResult {
  valid: boolean;
  username?: string;
  scopes?: string[];
  error?: string;
}
export interface DatasetGenerationRequest {
  username: string;
  fullName: string;
  githubToken: string;
}
export interface DatasetGenerationResponse {
  message: string;
  datasetId: string;
  status: "generated" | "error";
  file?: string;
  error?: string;
}
export interface GraphQLResponse<T = any> {
  data?: T;
  errors?: Array<{
    message: string;
    locations?: Array<{
      line: number;
      column: number;
    }>;
    path?: string[];
  }>;
}
export interface GitHubRestApiError {
  message: string;
  documentation_url: string;
  status: number;
}
export interface UserAnalysisRequest {
  username: string;
  includeOrganizations?: boolean;
  enrichWithDevOps?: boolean;
}
export interface GitHubAuthPayload {
  username: string;
  fullName: string;
  githubToken: string;
}
export interface JWTPayload {
  userId: string;
  username: string;
  iat: number;
  exp: number;
}
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  used: number;
}
export interface APIError {
  code: string;
  message: string;
  details?: Record<string, any>;
  stack?: string;
}
//# sourceMappingURL=github.d.ts.map
