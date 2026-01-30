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

/**
 * Monthly commit count for time-series visualization
 */
export interface CommitHistoryEntry {
  date: string;   // "YYYY-MM" format
  count: number;
}

export interface GitHubPullRequest {
  author: {
    login: string;
  };
  title: string;
  createdAt: Date;
  updatedAt: Date;
  state: string;
  merged: boolean;
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
    history: CommitHistoryEntry[];
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
  recentPullRequests: GitHubPullRequest[];
}

export interface UserProfile {
  _id?: string;

  login: string;
  id: number;
  node_id: string;
  avatar_url: string;
  gravatar_id: string;
  url: string;
  html_url: string;
  followers_url: string;
  following_url: string;
  gists_url: string;
  starred_url: string;
  subscriptions_url: string;
  organizations_url: string;
  repos_url: string;
  events_url: string;
  received_events_url: string;
  type: string;
  site_admin: boolean;
  name: string | null;
  company: string | null;
  blog: string | null;
  location: string | null;
  email: string | null;
  hireable: boolean | null;
  bio: string | null;
  twitter_username: string | null;
  public_repos: number;
  public_gists: number;
  followers: number;
  following: number;
  created_at: Date;
  updated_at: Date;
  private_gists?: number;
  total_private_repos?: number;
  owned_private_repos?: number;
  disk_usage?: number;
  collaborators?: number;
  two_factor_authentication?: boolean;
  plan?: {
    name: string;
    space: number;
    private_repos: number;
    collaborators: number;
  };
  organizations?: {
    totalCount: number;
    nodes: GitHubOrganization[];
  };
}

export interface GitHubTokenValidationResult {
  valid: boolean;
  username?: string;
  scopes?: string[];
  error?: string;
  isNetworkError?: boolean;
  isRateLimitError?: boolean;
}

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
  githubToken: string;
  iat: number;
  exp: number;
}

export interface AuthenticatedUser {
  id: string;
  username: string;
  githubToken: string;
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
  details?: Record<string, unknown>;
  stack?: string;
}

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

export interface GitHubGraphQLTopicNode {
  name: string;
}

export interface GitHubGraphQLRepositoryTopic {
  topic: GitHubGraphQLTopicNode;
}

export interface GitHubGraphQLRepositoryTopics {
  nodes: GitHubGraphQLRepositoryTopic[];
}

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



export interface GitHubGraphQLOrganizationNode {
  login: string;
  name: string;
  description: string;
  avatarUrl: string;
}

export interface GitHubGraphQLLicense {
  name: string;
  spdxId: string;
  url: string;
}

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
  defaultBranchRef: {
    name: string;
    target?: {
      history?: GitHubGraphQLCommitHistory;
    };
  } | null;
  licenseInfo: GitHubGraphQLLicense | null;
  hasIssuesEnabled: boolean;
  hasProjectsEnabled: boolean;
  hasWikiEnabled: boolean;
  hasDiscussionsEnabled?: boolean; // Valid GraphQL field (hasDiscussions is NOT valid)
  deployments: { totalCount: number };
  environments: { totalCount: number };
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
  recentPullRequests: {
    nodes: Array<{
      author: {
        login: string;
      };
      title: string;
      createdAt: string;
      updatedAt: string;
      state: string;
      merged: boolean;
    }>;
  };
}

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

export interface GitHubRestPackage {
  id: number;
  name: string;
  package_type: string;
  repository?: {
    id: number;
    name: string;
  };
}

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

/**
 * Custom error class for GitHub API rate limit errors
 */
export class GitHubRateLimitError extends Error {
  public readonly isRateLimitError = true;
  public readonly waitTime: string;
  public readonly resetTime?: number;

  constructor(message?: string, resetTime?: number) {
    const errorMessage = message != null && message !== ''
      ? message
      : 'GitHub API rate limit exceeded. Please wait 10-30 minutes and try again.';
    super(errorMessage);
    this.name = 'GitHubRateLimitError';
    this.waitTime = '10-30 minutes';
    this.resetTime = resetTime;

    // Maintains proper stack trace for where our error was thrown
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, GitHubRateLimitError);
    }
  }
}
