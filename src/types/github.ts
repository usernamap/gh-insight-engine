/**
 * Types GitHub basés sur les spécifications api_data_github.md
 * Typage strict pour toutes les requêtes GraphQL et REST API
 */

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

// GitHub Actions Types
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

// Security Types
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

// Package Types
export interface GitHubPackages {
  totalCount: number;
  types: string[];
}

// Branch Protection Types
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

// Community Health Types
export interface GitHubCommunity {
  healthPercentage: number;
  hasReadme: boolean;
  hasLicense: boolean;
  hasContributing: boolean;
  hasCodeOfConduct: boolean;
  hasIssueTemplate: boolean;
  hasPullRequestTemplate: boolean;
}

// Traffic Types
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

// Main Repository Interface
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
  // Champs optionnels - DevOps enrichment
  githubActions?: GitHubActions;
  security?: GitHubSecurity;
  packages?: GitHubPackages;
  branchProtection?: GitHubBranchProtection;
  community?: GitHubCommunity;
  traffic?: GitHubTraffic;
  diskUsage: number;
  owner: GitHubOwner;
  userId?: string; // Reference to users collection
}

// User Profile Interface
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

// Dataset Metadata Interface
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

// Main Dataset Interface
export interface Dataset {
  _id?: string;
  userProfile: string; // ObjectId reference
  metadata: DatasetMetadata;
  repositories: string[]; // ObjectId references
  createdAt: Date;
  updatedAt: Date;
  aiInsights?: string; // Extension pour analyses IA
}

// API Request/Response Types
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
  status: 'generated' | 'error';
  file?: string;
  error?: string;
}

// GraphQL Query Types
export interface GraphQLResponse<T = Record<string, unknown>> {
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

// REST API Response Types
export interface GitHubRestApiError {
  message: string;
  documentation_url: string;
  status: number;
}

// User Repository Analysis Request
export interface UserAnalysisRequest {
  username: string;
  includeOrganizations?: boolean;
  enrichWithDevOps?: boolean;
}

// Authentication Types
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

// Interface pour l'utilisateur authentifié dans les requêtes Express
export interface AuthenticatedUser {
  id: string;
  username: string;
  githubToken: string;
}

// Rate Limiting Types
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  used: number;
}

// Error Types
export interface APIError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  stack?: string;
}

// ============================================
// GitHub GraphQL Response Interfaces
// ============================================

// Common GraphQL edge/node structure
export interface GitHubGraphQLEdge<T> {
  node: T;
  size?: number;
}

export interface GitHubGraphQLConnection<T> {
  totalCount: number;
  nodes?: T[];
  edges?: GitHubGraphQLEdge<T>[];
  pageInfo?: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor: string;
    endCursor: string;
  };
}

// Language response structures
export interface GitHubGraphQLLanguageNode {
  name: string;
  color: string;
}

export interface GitHubGraphQLLanguageEdge {
  node: GitHubGraphQLLanguageNode;
  size: number;
}

export interface GitHubGraphQLLanguages {
  totalSize: number;
  edges: GitHubGraphQLLanguageEdge[];
}

// Topic response structures
export interface GitHubGraphQLTopicNode {
  name: string;
}

export interface GitHubGraphQLRepositoryTopic {
  topic: GitHubGraphQLTopicNode;
}

export interface GitHubGraphQLRepositoryTopics {
  nodes: GitHubGraphQLRepositoryTopic[];
}

// Commit response structures
export interface GitHubGraphQLCommitNode {
  oid: string;
  message: string;
  committedDate: string;
  author: {
    name: string;
    email: string;
    user?: {
      login: string;
    };
  };
  additions: number;
  deletions: number;
  changedFiles: number;
}

export interface GitHubGraphQLCommitHistory {
  totalCount: number;
  nodes: GitHubGraphQLCommitNode[];
}

export interface GitHubGraphQLCommits {
  target: {
    history: GitHubGraphQLCommitHistory;
  };
}

// Organization response structures
export interface GitHubGraphQLOrganizationNode {
  login: string;
  name: string;
  description: string;
  avatarUrl: string;
}

// License response structures
export interface GitHubGraphQLLicense {
  name: string;
  spdxId: string;
  url: string;
}

// User profile response structures
export interface GitHubGraphQLUserBasic {
  login: string;
  name: string;
  email: string;
  avatarUrl: string;
  bio: string;
  company: string;
  location: string;
  websiteUrl: string;
  twitterUsername: string;
  createdAt: string;
  updatedAt: string;
  __typename: string;
  isSiteAdmin: boolean;
  isHireable: boolean;
}

export interface GitHubGraphQLUserCounters {
  followers: { totalCount: number };
  following: { totalCount: number };
  repositories: { totalCount: number };
  gists: { totalCount: number };
}

export interface GitHubGraphQLUserOrganizations {
  organizations: GitHubGraphQLConnection<GitHubGraphQLOrganizationNode>;
}

// Repository response structures
export interface GitHubGraphQLRepositoryNode {
  nameWithOwner: string;
  name: string;
  description: string;
  isPrivate: boolean;
  isArchived: boolean;
  isFork: boolean;
  isTemplate: boolean;
  stargazerCount: number;
  forkCount: number;
  watchers: { totalCount: number };
  subscriberCount: number;
  networkCount: number;
  openIssuesCount: number;
  primaryLanguage: GitHubGraphQLLanguageNode | null;
  languages: GitHubGraphQLLanguages;
  repositoryTopics: GitHubGraphQLRepositoryTopics;
  pushedAt: string;
  updatedAt: string;
  createdAt: string;
  homepageUrl: string;
  diskUsage: number;
  defaultBranchRef: { name: string } | null;
  licenseInfo: GitHubGraphQLLicense | null;
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
  deployments: { totalCount: number };
  environments: { totalCount: number };
  commits: GitHubGraphQLCommits;
  releases: {
    totalCount: number;
    nodes: Array<{
      name: string;
      tagName: string;
      publishedAt: string;
      isLatest: boolean;
    }>;
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
  branchProtectionRules: { totalCount: number };
  collaborators: { totalCount: number };
  owner: {
    login: string;
    type: string;
    avatarUrl: string;
  };
}

// Main GraphQL response wrappers
export interface GitHubGraphQLUserResponse {
  viewer: GitHubGraphQLUserBasic & GitHubGraphQLUserCounters & GitHubGraphQLUserOrganizations;
}

export interface GitHubGraphQLUserBasicResponse {
  viewer: GitHubGraphQLUserBasic;
}

export interface GitHubGraphQLUserCountersResponse {
  viewer: GitHubGraphQLUserCounters;
}

export interface GitHubGraphQLUserOrganizationsResponse {
  viewer: GitHubGraphQLUserOrganizations;
}

export interface GitHubGraphQLRepositoriesResponse {
  viewer: {
    repositories: GitHubGraphQLConnection<GitHubGraphQLRepositoryNode>;
  };
}

export interface GitHubGraphQLOrganizationRepositoriesResponse {
  organization: {
    repositories: GitHubGraphQLConnection<GitHubGraphQLRepositoryNode>;
  };
}

// ============================================
// GitHub REST API Response Interfaces
// ============================================

// Workflow response structures
export interface GitHubRestWorkflow {
  id: number;
  name: string;
  path: string;
  state: string;
  created_at: string;
  updated_at: string;
}

export interface GitHubRestWorkflowRun {
  id: number;
  conclusion: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface GitHubRestWorkflowsResponse {
  total_count: number;
  workflows: GitHubRestWorkflow[];
}

export interface GitHubRestWorkflowRunsResponse {
  total_count: number;
  workflow_runs: GitHubRestWorkflowRun[];
}

// Security alert structures
export interface GitHubRestSecurityAlert {
  state: 'open' | 'fixed' | 'dismissed' | 'resolved';
  created_at: string;
  updated_at: string;
}

export interface GitHubRestDependabotAlert extends GitHubRestSecurityAlert {
  security_advisory: {
    ghsa_id: string;
    severity: string;
  };
}

export interface GitHubRestCodeScanningAlert extends GitHubRestSecurityAlert {
  rule: {
    id: string;
    severity: string;
  };
}

// Package structures
export interface GitHubRestPackage {
  id: number;
  name: string;
  package_type: string;
  repository?: {
    id: number;
    name: string;
  };
}

// Branch protection structures
export interface GitHubRestBranchProtection {
  url: string;
  required_status_checks: {
    strict: boolean;
    contexts: string[];
  } | null;
  required_pull_request_reviews: {
    dismiss_stale_reviews: boolean;
    require_code_owner_reviews: boolean;
  } | null;
  restrictions: {
    users: Array<{ login: string }>;
    teams: Array<{ slug: string }>;
  } | null;
}

// Community health structures
export interface GitHubRestCommunityProfile {
  health_percentage: number;
  files: {
    readme: { url: string; html_url: string } | null;
    license: { url: string; html_url: string } | null;
    contributing: { url: string; html_url: string } | null;
    code_of_conduct: { url: string; html_url: string } | null;
    issue_template: { url: string; html_url: string } | null;
    pull_request_template: { url: string; html_url: string } | null;
  };
}

// Traffic structures
export interface GitHubRestTrafficViews {
  count: number;
  uniques: number;
  views: Array<{
    timestamp: string;
    count: number;
    uniques: number;
  }>;
}

export interface GitHubRestTrafficClones {
  count: number;
  uniques: number;
  clones: Array<{
    timestamp: string;
    count: number;
    uniques: number;
  }>;
}

export interface GitHubRestPopularPath {
  path: string;
  title: string;
  count: number;
  uniques: number;
}

export interface GitHubRestTrafficPaths {
  paths: GitHubRestPopularPath[];
}
