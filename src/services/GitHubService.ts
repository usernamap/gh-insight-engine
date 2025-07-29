import {
  GitHubRepo,
  GitHubRestCodeScanningAlert,
  GitHubRestCommunityProfile,
  GitHubRestDependabotAlert,
  GitHubRestPackage,
  GitHubRestTrafficPaths,
  GitHubRestWorkflow,
  GitHubRestWorkflowRun,
  GitHubGraphQLRepositoriesResponse,
  GitHubGraphQLRepositoryNode,
  GitHubGraphQLOrganizationRepositoriesResponse,
  GraphQLResponse,
  UserProfile,
} from '@/types';

import { GitHubConfig } from '@/config/github';
import logger from '@/utils/logger';
import {
  GITHUB_CONSTANTS,
  GITHUB_NETWORK_ERRORS,
  GITHUB_SERVICE_ERROR_MESSAGES,
  GITHUB_SERVICE_LOG_ERROR_MESSAGES,
  GITHUB_MESSAGES,
  GITHUB_SERVICE_CONSTANTS,
} from '@/constants';

interface GitHubUserResponse {
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
  created_at: string;
  updated_at: string;
  private_gists?: number;
  total_private_repos?: number;
  owned_private_repos?: number;
  disk_usage?: number;
  collaborators?: number;
  two_factor_authentication?: boolean;
  plan?: unknown;
}

interface GitHubOrgResponse {
  login: string;
  name?: string;
  description?: string;
  avatar_url: string;
}

function toGitHubRepo(node: GitHubGraphQLRepositoryNode): GitHubRepo {
  return {
    nameWithOwner: node.nameWithOwner,
    name: node.name,
    description: node.description ?? GITHUB_CONSTANTS.DEFAULT_EMPTY_STRING,
    isPrivate: node.isPrivate,
    isArchived: node.isArchived,
    isFork: node.isFork,
    isTemplate: node.isTemplate,
    stargazerCount: node.stargazerCount,
    forkCount: node.forkCount,
    watchersCount: node.watchers?.totalCount ?? GITHUB_CONSTANTS.DEFAULT_COUNT,
    subscriberCount: node.subscriberCount ?? GITHUB_CONSTANTS.DEFAULT_COUNT,
    networkCount: node.networkCount ?? GITHUB_CONSTANTS.DEFAULT_COUNT,
    openIssuesCount: node.openIssuesCount ?? GITHUB_CONSTANTS.DEFAULT_COUNT,
    primaryLanguage: node.primaryLanguage?.name ?? GITHUB_CONSTANTS.DEFAULT_EMPTY_STRING,
    languages: {
      totalSize: node.languages?.totalSize ?? GITHUB_CONSTANTS.DEFAULT_COUNT,
      nodes:
        node.languages?.edges?.map(edge => ({
          name: edge.node.name,
          size: edge.size,
          percentage: GITHUB_CONSTANTS.DEFAULT_PERCENTAGE,
        })) ?? [],
    },
    topics: node.repositoryTopics?.nodes?.map(t => t.topic.name) ?? [],
    pushedAt: new Date(node.pushedAt),
    updatedAt: new Date(node.updatedAt),
    createdAt: new Date(node.createdAt),
    homepageUrl: node.homepageUrl ?? GITHUB_CONSTANTS.DEFAULT_EMPTY_STRING,
    size: node.diskUsage ?? GITHUB_CONSTANTS.DEFAULT_COUNT,
    defaultBranchRef: node.defaultBranchRef?.name ?? GITHUB_CONSTANTS.DEFAULT_EMPTY_STRING,
    license: node.licenseInfo
      ? {
        name: node.licenseInfo.name,
        spdxId: node.licenseInfo.spdxId,
        url: node.licenseInfo.url,
      }
      : null,
    hasIssuesEnabled: node.hasIssuesEnabled ?? GITHUB_CONSTANTS.DEFAULT_FALSE,
    hasProjectsEnabled: node.hasProjectsEnabled ?? GITHUB_CONSTANTS.DEFAULT_FALSE,
    hasWikiEnabled: node.hasWikiEnabled ?? GITHUB_CONSTANTS.DEFAULT_FALSE,
    hasPages: node.hasPages ?? GITHUB_CONSTANTS.DEFAULT_FALSE,
    hasDownloads: node.hasDownloads ?? GITHUB_CONSTANTS.DEFAULT_FALSE,
    hasDiscussions: node.hasDiscussions ?? GITHUB_CONSTANTS.DEFAULT_FALSE,
    vulnerabilityAlertsEnabled: node.vulnerabilityAlertsEnabled ?? GITHUB_CONSTANTS.DEFAULT_FALSE,
    securityPolicyEnabled: node.securityPolicyEnabled ?? GITHUB_CONSTANTS.DEFAULT_FALSE,
    codeOfConductEnabled: node.codeOfConductEnabled ?? GITHUB_CONSTANTS.DEFAULT_FALSE,
    contributingGuidelinesEnabled:
      node.contributingGuidelinesEnabled ?? GITHUB_CONSTANTS.DEFAULT_FALSE,
    readmeEnabled: node.readmeEnabled ?? GITHUB_CONSTANTS.DEFAULT_FALSE,
    deployments: node.deployments ?? { totalCount: GITHUB_CONSTANTS.DEFAULT_COUNT },
    environments: node.environments ?? { totalCount: GITHUB_CONSTANTS.DEFAULT_COUNT },
    commits:
      node.commits?.target?.history?.totalCount !== undefined &&
        typeof node.commits.target.history.totalCount === 'number'
        ? {
          totalCount: node.commits.target.history.totalCount,
          recent: Array.isArray(node.commits.target.history.nodes)
            ? node.commits.target.history.nodes.map(commit => ({
              oid: commit.oid,
              message: commit.message,
              committedDate: new Date(commit.committedDate),
              author: {
                name: commit.author.name,
                email: commit.author.email,
                login: commit.author.user?.login ?? null,
              },
              additions: commit.additions,
              deletions: commit.deletions,
              changedFiles: commit.changedFiles,
            }))
            : [],
        }
        : { totalCount: GITHUB_CONSTANTS.DEFAULT_COUNT, recent: [] },

    releases:
      typeof node.releases?.totalCount === 'number' && Array.isArray(node.releases?.nodes)
        ? {
          totalCount: node.releases.totalCount,
          latestRelease:
            node.releases.nodes.length > GITHUB_CONSTANTS.DEFAULT_COUNT
              ? {
                name: node.releases.nodes[0].name,
                tagName: node.releases.nodes[0].tagName,
                publishedAt: new Date(node.releases.nodes[0].publishedAt),
                isLatest: node.releases.nodes[0].isLatest,
              }
              : null,
        }
        : { totalCount: GITHUB_CONSTANTS.DEFAULT_COUNT, latestRelease: null },

    issues:
      typeof node.issues?.totalCount === 'number'
        ? {
          totalCount: node.issues.totalCount,
          openCount: node.issues.openCount ?? GITHUB_CONSTANTS.DEFAULT_COUNT,
          closedCount: node.issues.closedCount ?? GITHUB_CONSTANTS.DEFAULT_COUNT,
        }
        : {
          totalCount: GITHUB_CONSTANTS.DEFAULT_COUNT,
          openCount: GITHUB_CONSTANTS.DEFAULT_COUNT,
          closedCount: GITHUB_CONSTANTS.DEFAULT_COUNT,
        },

    pullRequests:
      typeof node.pullRequests?.totalCount === 'number'
        ? {
          totalCount: node.pullRequests.totalCount,
          openCount: node.pullRequests.openCount ?? GITHUB_CONSTANTS.DEFAULT_COUNT,
          closedCount: node.pullRequests.closedCount ?? GITHUB_CONSTANTS.DEFAULT_COUNT,
          mergedCount: node.pullRequests.mergedCount ?? GITHUB_CONSTANTS.DEFAULT_COUNT,
        }
        : {
          totalCount: GITHUB_CONSTANTS.DEFAULT_COUNT,
          openCount: GITHUB_CONSTANTS.DEFAULT_COUNT,
          closedCount: GITHUB_CONSTANTS.DEFAULT_COUNT,
          mergedCount: GITHUB_CONSTANTS.DEFAULT_COUNT,
        },
    branchProtectionRules: node.branchProtectionRules ?? {
      totalCount: GITHUB_CONSTANTS.DEFAULT_COUNT,
    },
    collaborators: node.collaborators ?? { totalCount: GITHUB_CONSTANTS.DEFAULT_COUNT },
    githubActions: undefined,
    security: undefined,
    packages: undefined,
    branchProtection: undefined,
    community: undefined,
    traffic: undefined,
    diskUsage: node.diskUsage ?? GITHUB_CONSTANTS.DEFAULT_COUNT,
    owner: node.owner,
    userId: undefined,
  };
}

export class GitHubService {
  public githubConfig: GitHubConfig;

  public constructor(_token?: string) {
    this.githubConfig = new GitHubConfig();
    if (_token != null && _token !== GITHUB_CONSTANTS.DEFAULT_EMPTY_STRING) {
      void this.githubConfig.initialize(_token);
    }
  }

  static async create(token: string): Promise<GitHubService> {
    const service = new GitHubService(token);
    await service.githubConfig.initialize(token);
    return service;
  }

  public async getUserOrganizations(): Promise<string[]> {
    const query = `
      query {
        viewer {
          organizations(first: ${GITHUB_CONSTANTS.ORGANIZATIONS_LIMIT}) {
            nodes {
              login
            }
          }
        }
      }
    `;

    try {
      const response: GraphQLResponse = await this.githubConfig.executeGraphQLQuery(query);

      const organizations =
        (
          response as {
            viewer?: { organizations?: { nodes?: { login: string }[] } };
          }
        )?.viewer?.organizations?.nodes ?? [];
      const orgNames = organizations.map((org: { login: string }) => org.login);

      logger.info(GITHUB_MESSAGES.ORGANIZATIONS_RETRIEVED, { count: orgNames.length });

      return orgNames;
    } catch (_error: unknown) {
      logger.error(GITHUB_SERVICE_LOG_ERROR_MESSAGES.ERROR_RETRIEVING_ORGANIZATIONS, {
        error: (_error as Error).message,
      });
      throw new Error(
        `${GITHUB_SERVICE_ERROR_MESSAGES.ORGANIZATION_RETRIEVAL_FAILED}${(_error as Error).message}`
      );
    }
  }

  public async getUserProfile(): Promise<UserProfile> {
    try {
      const githubUser = (await this.githubConfig.executeRestRequest(
        'GET /user'
      )) as GitHubUserResponse;

      const orgsData = (await this.githubConfig.executeRestRequest('GET /user/orgs', {
        per_page: GITHUB_CONSTANTS.ORGANIZATIONS_PER_PAGE,
      })) as GitHubOrgResponse[];

      const userProfile: UserProfile = {
        login: githubUser.login,
        id: githubUser.id,
        node_id: githubUser.node_id,
        avatar_url: githubUser.avatar_url,
        gravatar_id: githubUser.gravatar_id ?? GITHUB_CONSTANTS.DEFAULT_EMPTY_STRING,
        url: githubUser.url,
        html_url: githubUser.html_url,
        followers_url: githubUser.followers_url,
        following_url: githubUser.following_url,
        gists_url: githubUser.gists_url,
        starred_url: githubUser.starred_url,
        subscriptions_url: githubUser.subscriptions_url,
        organizations_url: githubUser.organizations_url,
        repos_url: githubUser.repos_url,
        events_url: githubUser.events_url,
        received_events_url: githubUser.received_events_url,
        type: githubUser.type,
        site_admin: githubUser.site_admin,
        name: githubUser.name,
        company: githubUser.company,
        blog: githubUser.blog,
        location: githubUser.location,
        email: githubUser.email,
        hireable: githubUser.hireable,
        bio: githubUser.bio,
        twitter_username: githubUser.twitter_username,
        public_repos: githubUser.public_repos,
        public_gists: githubUser.public_gists,
        followers: githubUser.followers,
        following: githubUser.following,
        created_at: new Date(githubUser.created_at),
        updated_at: new Date(githubUser.updated_at),
        private_gists: githubUser.private_gists,
        total_private_repos: githubUser.total_private_repos,
        owned_private_repos: githubUser.owned_private_repos,
        disk_usage: githubUser.disk_usage,
        collaborators: githubUser.collaborators,
        two_factor_authentication: githubUser.two_factor_authentication,
        plan: githubUser.plan as UserProfile['plan'],
        organizations: {
          totalCount: orgsData.length,
          nodes: orgsData.map((org: GitHubOrgResponse) => ({
            login: org.login,
            name: org.name ?? org.login,
            description: org.description ?? GITHUB_CONSTANTS.DEFAULT_EMPTY_STRING,
            avatarUrl: org.avatar_url,
          })),
        },
      };

      logger.info(GITHUB_MESSAGES.USER_PROFILE_RETRIEVED_REST_API, {
        login: userProfile.login,
        followers: userProfile.followers,
        public_repos: userProfile.public_repos,
        id: userProfile.id,
      });

      return userProfile;
    } catch (_error: unknown) {
      logger.error(GITHUB_SERVICE_LOG_ERROR_MESSAGES.ERROR_RETRIEVING_USER_PROFILE_REST_API, {
        error: (_error as Error).message,
      });
      throw new Error(
        `${GITHUB_SERVICE_ERROR_MESSAGES.PROFILE_RETRIEVAL_FAILED}${(_error as Error).message}`
      );
    }
  }

  public async getUserRepos(cursor?: string): Promise<GitHubRepo[]> {
    const query = `
      query($cursor: String) {
        viewer {
          repositories(first: ${GITHUB_CONSTANTS.USER_REPOSITORIES_LIMIT}, after: $cursor, orderBy: {field: PUSHED_AT, direction: DESC}) {
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              nameWithOwner
              name
              description
              isPrivate
              isArchived
              isFork
              isTemplate
              stargazerCount
              forkCount
              watchers { totalCount }
              primaryLanguage { name }
              languages(first: 10) {
                totalSize
                edges {
                  size
                  node {
                    name
                  }
                }
              }
              repositoryTopics(first: 5) {
                nodes {
                  topic {
                    name
                  }
                }
              }
              pushedAt
              updatedAt
              createdAt
              homepageUrl
              diskUsage
              defaultBranchRef { name }
              licenseInfo {
                name
                spdxId
                url
              }
              hasIssuesEnabled
              hasProjectsEnabled
              hasWikiEnabled
              issues { totalCount }
              pullRequests { totalCount }
              releases { totalCount }
              deployments { totalCount }
              environments { totalCount }
              commits: defaultBranchRef {
                target {
                  ... on Commit {
                    history(first: 10) {
                      totalCount
                      nodes {
                        oid
                        message
                        committedDate
                        author {
                          name
                          email
                          user { login }
                        }
                        additions
                        deletions
                        changedFiles
                      }
                    }
                  }
                }
              }
              owner {
                login
                avatarUrl
              }
            }
          }
        }
      }
    `;

    try {
      const variables =
        cursor != null && cursor !== GITHUB_CONSTANTS.DEFAULT_EMPTY_STRING ? { cursor } : {};
      const response: GraphQLResponse = await this.githubConfig.executeGraphQLQuery(
        query,
        variables
      );

      const repositories =
        (response as GitHubGraphQLRepositoriesResponse)?.viewer?.repositories?.nodes ?? [];
      const pageInfo = (response as GitHubGraphQLRepositoriesResponse)?.viewer?.repositories
        ?.pageInfo;

      const repos: GitHubRepo[] = repositories.map((node: GitHubGraphQLRepositoryNode) =>
        toGitHubRepo(node)
      );

      if (pageInfo?.hasNextPage === true) {
        const nextRepos = await this.getUserRepos(pageInfo.endCursor);
        repos.push(...nextRepos);
      }

      logger.info(GITHUB_MESSAGES.USER_REPOSITORIES_RETRIEVED, {
        count: repos.length,
        hasMore: pageInfo?.hasNextPage,
      });

      return repos;
    } catch (_error: unknown) {
      const error = _error as Error;

      // Check if this is an infrastructure error with fallback message
      if (error.message.includes(GITHUB_MESSAGES.INFRASTRUCTURE_ERROR_FALLBACK)) {
        logger.warn('GitHub API infrastructure issues detected, returning empty repository list', {
          error: error.message,
          fallbackMode: true,
        });

        // Return empty array instead of throwing for degraded mode operation
        return [];
      }

      logger.error(GITHUB_SERVICE_LOG_ERROR_MESSAGES.ERROR_RETRIEVING_USER_REPOSITORIES, {
        error: error.message,
      });

      throw new Error(
        `${GITHUB_SERVICE_ERROR_MESSAGES.REPOSITORY_RETRIEVAL_FAILED}${error.message}`
      );
    }
  }

  public async getOrgRepos(orgName: string, cursor?: string): Promise<GitHubRepo[]> {
    const query = `
      query($orgName: String!, $cursor: String) {
        organization(login: $orgName) {
          repositories(first: ${GITHUB_CONSTANTS.ORG_REPOSITORIES_LIMIT}, after: $cursor, orderBy: {field: PUSHED_AT, direction: DESC}) {
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              nameWithOwner
              name
              description
              isPrivate
              isArchived
              isFork
              isTemplate
              stargazerCount
              forkCount
              watchers { totalCount }
              primaryLanguage { name }
              languages(first: 10) {
                totalSize
                edges {
                  size
                  node {
                    name
                  }
                }
              }
              repositoryTopics(first: 5) {
                nodes {
                  topic {
                    name
                  }
                }
              }
              pushedAt
              updatedAt
              createdAt
              homepageUrl
              diskUsage
              defaultBranchRef { name }
              licenseInfo {
                name
                spdxId
                url
              }
              hasIssuesEnabled
              hasProjectsEnabled
              hasWikiEnabled
              issues { totalCount }
              pullRequests { totalCount }
              releases { totalCount }
              deployments { totalCount }
              environments { totalCount }
              commits: defaultBranchRef {
                target {
                  ... on Commit {
                    history(first: 10) {
                      totalCount
                      nodes {
                        oid
                        message
                        committedDate
                        author {
                          name
                          email
                          user { login }
                        }
                        additions
                        deletions
                        changedFiles
                      }
                    }
                  }
                }
              }
              owner {
                login
                avatarUrl
              }
            }
          }
        }
      }
    `;

    try {
      const variables =
        orgName && cursor != null && cursor !== GITHUB_CONSTANTS.DEFAULT_EMPTY_STRING
          ? { orgName, cursor }
          : { orgName };
      const response: GraphQLResponse = await this.githubConfig.executeGraphQLQuery(
        query,
        variables
      );

      const repositories =
        (response as GitHubGraphQLOrganizationRepositoriesResponse)?.organization?.repositories
          ?.nodes ?? [];
      const pageInfo = (response as GitHubGraphQLOrganizationRepositoriesResponse)?.organization
        ?.repositories?.pageInfo;

      const repos: GitHubRepo[] = repositories.map((node: GitHubGraphQLRepositoryNode) =>
        toGitHubRepo(node)
      );

      if (pageInfo?.hasNextPage === true) {
        const nextRepos = await this.getOrgRepos(orgName, pageInfo.endCursor);
        repos.push(...nextRepos);
      }

      logger.info(GITHUB_MESSAGES.ORG_REPOSITORIES_RETRIEVED, {
        orgName,
        count: repos.length,
        hasMore: pageInfo?.hasNextPage,
      });

      return repos;
    } catch (_error: unknown) {
      const error = _error as Error;

      // Check if this is an infrastructure error with fallback message
      if (error.message.includes(GITHUB_MESSAGES.INFRASTRUCTURE_ERROR_FALLBACK)) {
        logger.warn('GitHub API infrastructure issues detected, returning empty organization repository list', {
          orgName,
          error: error.message,
          fallbackMode: true,
        });

        // Return empty array instead of throwing for degraded mode operation
        return [];
      }

      logger.error(GITHUB_SERVICE_LOG_ERROR_MESSAGES.ERROR_RETRIEVING_ORG_REPOSITORIES, {
        orgName,
        error: error.message,
      });

      throw new Error(
        `${GITHUB_SERVICE_ERROR_MESSAGES.ORG_REPOSITORY_RETRIEVAL_FAILED}${error.message}`
      );
    }
  }

  public async getGitHubActionsData(owner: string, repo: string): Promise<Record<string, unknown>> {
    try {
      const [workflowsResponse, runsResponse] = await Promise.all([
        this.githubConfig.executeRestRequest(`GET /repos/${owner}/${repo}/actions/workflows`),
        this.githubConfig.executeRestRequest(`GET /repos/${owner}/${repo}/actions/runs`, {
          per_page: GITHUB_CONSTANTS.WORKFLOW_RUNS_LIMIT,
        }),
      ]);

      const workflows = (workflowsResponse.workflows as GitHubRestWorkflow[]) ?? [];
      const runs = (runsResponse.workflow_runs as GitHubRestWorkflowRun[]) ?? [];
      const successfulRuns = runs.filter(
        (run: GitHubRestWorkflowRun) => run.conclusion === GITHUB_CONSTANTS.SUCCESS_STATUS
      ).length;
      const failedRuns = runs.filter(
        (run: GitHubRestWorkflowRun) => run.conclusion === GITHUB_CONSTANTS.FAILURE_STATUS
      ).length;
      const totalRuns = runs.length;
      const successRate =
        totalRuns > GITHUB_CONSTANTS.DEFAULT_COUNT
          ? Math.round((successfulRuns / totalRuns) * 100)
          : GITHUB_CONSTANTS.DEFAULT_PERCENTAGE;

      const actionsData = {
        workflowsCount: workflows.length,
        lastRunStatus: runs[0]?.conclusion ?? GITHUB_CONSTANTS.UNKNOWN_STATUS,
        workflows: workflows.map((workflow: GitHubRestWorkflow) => ({
          name: workflow.name,
          path: workflow.path,
          state: workflow.state,
          createdAt: new Date(workflow.created_at),
          updatedAt: new Date(workflow.updated_at),
          lastRunStatus: GITHUB_CONSTANTS.UNKNOWN_STATUS,
          lastRunDate: new Date(),
        })),
        runs: {
          totalCount: totalRuns,
          successful: successfulRuns,
          failed: failedRuns,
          successRate,
        },
      };

      logger.debug(GITHUB_MESSAGES.GITHUB_ACTIONS_DATA_RETRIEVED, {
        owner,
        repo,
        workflowsCount: workflows.length,
        runsCount: totalRuns,
      });

      return actionsData;
    } catch (_error: unknown) {
      const error = _error as Error;

      if (
        error.message.includes(GITHUB_NETWORK_ERRORS.TIMEOUT) ||
        error.message.includes(GITHUB_NETWORK_ERRORS.CONNECT_TIMEOUT_ERROR) ||
        error.message.includes(GITHUB_NETWORK_ERRORS.ECONNRESET) ||
        error.message.includes(GITHUB_NETWORK_ERRORS.ENOTFOUND)
      ) {
        logger.warn('Timeout during GitHub Actions retrieval, returning default data', {
          owner,
          repo,
          error: error.message,
        });

        return {
          workflowsCount: GITHUB_CONSTANTS.DEFAULT_COUNT,
          lastRunStatus: GITHUB_CONSTANTS.UNKNOWN_STATUS,
          workflows: [],
          runs: {
            totalCount: GITHUB_CONSTANTS.DEFAULT_COUNT,
            successful: GITHUB_CONSTANTS.DEFAULT_COUNT,
            failed: GITHUB_CONSTANTS.DEFAULT_COUNT,
            successRate: GITHUB_CONSTANTS.DEFAULT_PERCENTAGE,
          },
        };
      }

      logger.error(GITHUB_SERVICE_LOG_ERROR_MESSAGES.ERROR_RETRIEVING_GITHUB_ACTIONS, {
        owner,
        repo,
        error: error.message,
      });

      throw error;
    }
  }

  public async getSecurityData(owner: string, repo: string): Promise<Record<string, unknown>> {
    try {
      const endpoints = [
        `GET /repos/${owner}/${repo}/dependabot/alerts`,
        `GET /repos/${owner}/${repo}/secret-scanning/alerts`,
        `GET /repos/${owner}/${repo}/code-scanning/alerts`,
      ];

      const responses = await Promise.allSettled(
        endpoints.map(endpoint => this.githubConfig.executeRestRequest(endpoint))
      );

      const dependabotAlerts = responses[0].status === 'fulfilled' ? responses[0].value : [];
      const secretAlerts = responses[1].status === 'fulfilled' ? responses[1].value : [];
      const codeAlerts = responses[2].status === 'fulfilled' ? responses[2].value : [];

      const securityData = {
        dependabotAlerts: {
          totalCount: dependabotAlerts.length ?? GITHUB_CONSTANTS.DEFAULT_COUNT,
          open: Array.isArray(dependabotAlerts)
            ? dependabotAlerts.filter(
              (alert: GitHubRestDependabotAlert) => alert.state === GITHUB_CONSTANTS.OPEN_STATE
            ).length
            : GITHUB_CONSTANTS.DEFAULT_COUNT,
          fixed: Array.isArray(dependabotAlerts)
            ? dependabotAlerts.filter(
              (alert: GitHubRestDependabotAlert) => alert.state === GITHUB_CONSTANTS.FIXED_STATE
            ).length
            : GITHUB_CONSTANTS.DEFAULT_COUNT,
          dismissed: Array.isArray(dependabotAlerts)
            ? dependabotAlerts.filter(
              (alert: GitHubRestDependabotAlert) =>
                alert.state === GITHUB_CONSTANTS.DISMISSED_STATE
            ).length
            : GITHUB_CONSTANTS.DEFAULT_COUNT,
        },
        secretScanning: {
          totalCount: secretAlerts.length ?? GITHUB_CONSTANTS.DEFAULT_COUNT,
          resolved: Array.isArray(secretAlerts)
            ? secretAlerts.filter(
              (alert: GitHubRestCodeScanningAlert) =>
                alert.state === GITHUB_CONSTANTS.RESOLVED_STATE
            ).length
            : GITHUB_CONSTANTS.DEFAULT_COUNT,
        },
        codeScanning: {
          totalCount: codeAlerts.length ?? GITHUB_CONSTANTS.DEFAULT_COUNT,
          open: Array.isArray(codeAlerts)
            ? codeAlerts.filter(
              (alert: GitHubRestCodeScanningAlert) => alert.state === GITHUB_CONSTANTS.OPEN_STATE
            ).length
            : GITHUB_CONSTANTS.DEFAULT_COUNT,
          fixed: Array.isArray(codeAlerts)
            ? codeAlerts.filter(
              (alert: GitHubRestCodeScanningAlert) => alert.state === GITHUB_CONSTANTS.FIXED_STATE
            ).length
            : GITHUB_CONSTANTS.DEFAULT_COUNT,
        },
        hasSecurityPolicy: GITHUB_CONSTANTS.DEFAULT_FALSE,
        hasVulnerabilityAlertsEnabled: GITHUB_CONSTANTS.DEFAULT_TRUE,
      };

      logger.debug(GITHUB_MESSAGES.SECURITY_DATA_RETRIEVED, {
        owner,
        repo,
        dependabotCount: securityData.dependabotAlerts.totalCount,
        secretCount: securityData.secretScanning.totalCount,
        codeCount: securityData.codeScanning.totalCount,
      });

      return securityData;
    } catch (_error: unknown) {
      if (
        typeof _error === 'object' &&
        _error &&
        'status' in _error &&
        ((_error as { status: number }).status === GITHUB_CONSTANTS.FORBIDDEN_STATUS ||
          (_error as { status: number }).status === GITHUB_CONSTANTS.NOT_FOUND_STATUS)
      ) {
        return {
          dependabotAlerts: {
            totalCount: GITHUB_CONSTANTS.DEFAULT_COUNT,
            open: GITHUB_CONSTANTS.DEFAULT_COUNT,
            fixed: GITHUB_CONSTANTS.DEFAULT_COUNT,
            dismissed: GITHUB_CONSTANTS.DEFAULT_COUNT,
          },
          secretScanning: {
            totalCount: GITHUB_CONSTANTS.DEFAULT_COUNT,
            resolved: GITHUB_CONSTANTS.DEFAULT_COUNT,
          },
          codeScanning: {
            totalCount: GITHUB_CONSTANTS.DEFAULT_COUNT,
            open: GITHUB_CONSTANTS.DEFAULT_COUNT,
            fixed: GITHUB_CONSTANTS.DEFAULT_COUNT,
          },
          hasSecurityPolicy: GITHUB_CONSTANTS.DEFAULT_FALSE,
          hasVulnerabilityAlertsEnabled: GITHUB_CONSTANTS.DEFAULT_FALSE,
        };
      }

      logger.error(GITHUB_SERVICE_LOG_ERROR_MESSAGES.ERROR_RETRIEVING_SECURITY_DATA, {
        owner,
        repo,
        error: (_error as Error).message,
      });
      throw new Error(
        `${GITHUB_SERVICE_ERROR_MESSAGES.SECURITY_RETRIEVAL_FAILED}${(_error as Error).message}`
      );
    }
  }

  public async getPackagesData(owner: string, repo: string): Promise<Record<string, unknown>> {
    try {
      const response = await this.githubConfig.executeRestRequest(`GET /users/${owner}/packages`);
      const packages = (response as unknown as GitHubRestPackage[]) ?? [];

      const repoPackages = packages.filter(
        (pkg: GitHubRestPackage) => pkg.repository?.name === repo || pkg.name.includes(repo)
      );

      const packageTypes = [
        ...new Set(repoPackages.map((pkg: GitHubRestPackage) => pkg.package_type)),
      ];

      const packagesData = {
        totalCount: repoPackages.length,
        types: packageTypes,
      };

      logger.debug(GITHUB_MESSAGES.PACKAGES_DATA_RETRIEVED, {
        owner,
        repo,
        count: packagesData.totalCount,
        types: packageTypes,
      });

      return packagesData;
    } catch (_error: unknown) {
      if (
        typeof _error === 'object' &&
        _error &&
        'status' in _error &&
        (_error as { status: number }).status === GITHUB_CONSTANTS.NOT_FOUND_STATUS
      ) {
        return { totalCount: GITHUB_CONSTANTS.DEFAULT_COUNT, types: [] };
      }

      logger.error(GITHUB_SERVICE_LOG_ERROR_MESSAGES.ERROR_RETRIEVING_PACKAGES, {
        owner,
        repo,
        error: (_error as Error).message,
      });
      throw new Error(
        `${GITHUB_SERVICE_ERROR_MESSAGES.PACKAGE_RETRIEVAL_FAILED}${(_error as Error).message}`
      );
    }
  }

  public async getBranchProtectionData(
    owner: string,
    repo: string,
    defaultBranch: string
  ): Promise<Record<string, unknown>> {
    try {
      const branch = defaultBranch ?? GITHUB_CONSTANTS.DEFAULT_BRANCH;
      const response = await this.githubConfig.executeRestRequest(
        `GET /repos/${owner}/${repo}/branches/${branch}/protection`
      );

      const branchProtectionData = {
        rules: [
          {
            pattern: branch,
            requiresStatusChecks:
              typeof response.required_status_checks === 'object' &&
              response.required_status_checks !== null,
            requiresCodeOwnerReviews:
              typeof response.required_pull_request_reviews === 'object' &&
              response.required_pull_request_reviews !== null &&
              (response.required_pull_request_reviews as { require_code_owner_reviews?: boolean })
                .require_code_owner_reviews === true,
            dismissStaleReviews:
              typeof response.required_pull_request_reviews === 'object' &&
              response.required_pull_request_reviews !== null &&
              (response.required_pull_request_reviews as { dismiss_stale_reviews?: boolean })
                .dismiss_stale_reviews === true,
            restrictsPushes:
              typeof response.restrictions === 'object' && response.restrictions !== null,
            requiredStatusChecks:
              (response.required_status_checks as { contexts?: string[] })?.contexts ?? [],
          },
        ],
      };

      logger.debug(GITHUB_MESSAGES.BRANCH_PROTECTION_DATA_RETRIEVED, {
        owner,
        repo,
        branch,
        protected: true,
      });

      return branchProtectionData;
    } catch (_error: unknown) {
      if (
        typeof _error === 'object' &&
        _error &&
        'status' in _error &&
        (_error as { status: number }).status === GITHUB_CONSTANTS.NOT_FOUND_STATUS
      ) {
        return { rules: [] };
      }

      logger.error(GITHUB_SERVICE_LOG_ERROR_MESSAGES.ERROR_RETRIEVING_BRANCH_PROTECTION, {
        owner,
        repo,
        error: (_error as Error).message,
      });
      throw new Error(
        `${GITHUB_SERVICE_ERROR_MESSAGES.BRANCH_PROTECTION_RETRIEVAL_FAILED}${(_error as Error).message}`
      );
    }
  }

  public async getCommunityHealthData(
    owner: string,
    repo: string
  ): Promise<Record<string, unknown>> {
    try {
      const response = await this.githubConfig.executeRestRequest(
        `GET /repos/${owner}/${repo}/community/profile`
      );

      const files = (response.files as unknown as GitHubRestCommunityProfile)?.files ?? {};

      const communityData = {
        healthPercentage:
          (response.health_percentage as number) ?? GITHUB_CONSTANTS.DEFAULT_PERCENTAGE,
        hasReadme: !!files.readme,
        hasLicense: !!files.license,
        hasContributing: !!files.contributing,
        hasCodeOfConduct: !!files.code_of_conduct,
        hasIssueTemplate: !!files.issue_template,
        hasPullRequestTemplate: !!files.pull_request_template,
      };

      logger.debug(GITHUB_MESSAGES.COMMUNITY_HEALTH_DATA_RETRIEVED, {
        owner,
        repo,
        healthPercentage: communityData.healthPercentage,
      });

      return communityData;
    } catch (_error: unknown) {
      if (
        typeof _error === 'object' &&
        _error &&
        'status' in _error &&
        (_error as { status: number }).status === GITHUB_CONSTANTS.NOT_FOUND_STATUS
      ) {
        return {
          healthPercentage: GITHUB_CONSTANTS.DEFAULT_PERCENTAGE,
          hasReadme: GITHUB_CONSTANTS.DEFAULT_FALSE,
          hasLicense: GITHUB_CONSTANTS.DEFAULT_FALSE,
          hasContributing: GITHUB_CONSTANTS.DEFAULT_FALSE,
          hasCodeOfConduct: GITHUB_CONSTANTS.DEFAULT_FALSE,
          hasIssueTemplate: GITHUB_CONSTANTS.DEFAULT_FALSE,
          hasPullRequestTemplate: GITHUB_CONSTANTS.DEFAULT_FALSE,
        };
      }

      logger.error(GITHUB_SERVICE_LOG_ERROR_MESSAGES.ERROR_RETRIEVING_COMMUNITY_HEALTH, {
        owner,
        repo,
        error: (_error as Error).message,
      });
      throw new Error(
        `${GITHUB_SERVICE_ERROR_MESSAGES.COMMUNITY_HEALTH_RETRIEVAL_FAILED}${(_error as Error).message}`
      );
    }
  }

  public async getTrafficData(owner: string, repo: string): Promise<Record<string, unknown>> {
    try {
      const [viewsResponse, clonesResponse, pathsResponse] = await Promise.allSettled([
        this.githubConfig.executeRestRequest(`GET /repos/${owner}/${repo}/traffic/views`),
        this.githubConfig.executeRestRequest(`GET /repos/${owner}/${repo}/traffic/clones`),
        this.githubConfig.executeRestRequest(`GET /repos/${owner}/${repo}/traffic/popular/paths`),
      ]);

      const views =
        viewsResponse.status === 'fulfilled'
          ? viewsResponse.value
          : { count: GITHUB_CONSTANTS.DEFAULT_COUNT, uniques: GITHUB_CONSTANTS.DEFAULT_COUNT };
      const clones =
        clonesResponse.status === 'fulfilled'
          ? clonesResponse.value
          : { count: GITHUB_CONSTANTS.DEFAULT_COUNT, uniques: GITHUB_CONSTANTS.DEFAULT_COUNT };
      const paths = pathsResponse.status === 'fulfilled' ? pathsResponse.value : [];

      let popularPaths: { path: string; title: string; count: number; uniques: number }[] = [];
      if (
        paths != null &&
        typeof paths === 'object' &&
        Object.prototype.hasOwnProperty.call(paths, 'paths') &&
        Array.isArray((paths as unknown as GitHubRestTrafficPaths).paths)
      ) {
        popularPaths = (paths as unknown as GitHubRestTrafficPaths).paths.map(
          ({ path, title, count, uniques }) => ({ path, title, count, uniques })
        );
      }

      const trafficData = {
        views: {
          count: views.count ?? GITHUB_CONSTANTS.DEFAULT_COUNT,
          uniques: views.uniques ?? GITHUB_CONSTANTS.DEFAULT_COUNT,
        },
        clones: {
          count: clones.count ?? GITHUB_CONSTANTS.DEFAULT_COUNT,
          uniques: clones.uniques ?? GITHUB_CONSTANTS.DEFAULT_COUNT,
        },
        popularPaths,
      };

      logger.debug(GITHUB_MESSAGES.TRAFFIC_DATA_RETRIEVED, {
        owner,
        repo,
        views: trafficData.views.count,
        clones: trafficData.clones.count,
      });

      return trafficData;
    } catch (_error: unknown) {
      logger.error(GITHUB_SERVICE_LOG_ERROR_MESSAGES.ERROR_RETRIEVING_TRAFFIC, {
        owner,
        repo,
        error: (_error as Error).message,
      });

      return {
        views: { count: GITHUB_CONSTANTS.DEFAULT_COUNT, uniques: GITHUB_CONSTANTS.DEFAULT_COUNT },
        clones: { count: GITHUB_CONSTANTS.DEFAULT_COUNT, uniques: GITHUB_CONSTANTS.DEFAULT_COUNT },
        popularPaths: [],
      };
    }
  }

  public async enrichWithDevOpsData(repo: GitHubRepo): Promise<GitHubRepo> {
    const [owner, repoName] = repo.nameWithOwner.split('/');

    try {
      logger.info(GITHUB_MESSAGES.STARTING_DEVOPS_ENRICHMENT, {
        nameWithOwner: repo.nameWithOwner,
      });

      const [githubActions, security, packages, branchProtection, community, traffic] =
        await Promise.allSettled([
          this.getGitHubActionsData(owner, repoName),
          this.getSecurityData(owner, repoName),
          this.getPackagesData(owner, repoName),
          this.getBranchProtectionData(
            owner,
            repoName,
            repo.defaultBranchRef ?? GITHUB_CONSTANTS.DEFAULT_BRANCH
          ),
          this.getCommunityHealthData(owner, repoName),
          this.getTrafficData(owner, repoName),
        ]);

      const enrichedRepo: GitHubRepo = {
        ...repo,
        githubActions:
          githubActions.status === 'fulfilled' && isValidGitHubActions(githubActions.value)
            ? githubActions.value
            : undefined,
        security:
          security.status === 'fulfilled' && isValidGitHubSecurity(security.value)
            ? security.value
            : undefined,
        packages:
          packages.status === 'fulfilled' && isValidGitHubPackages(packages.value)
            ? packages.value
            : undefined,
        branchProtection:
          branchProtection.status === 'fulfilled' &&
            isValidGitHubBranchProtection(branchProtection.value)
            ? branchProtection.value
            : undefined,
        community:
          community.status === 'fulfilled' && isValidGitHubCommunity(community.value)
            ? community.value
            : undefined,
        traffic:
          traffic.status === 'fulfilled' && isValidGitHubTraffic(traffic.value)
            ? traffic.value
            : undefined,
      };

      logger.info(GITHUB_MESSAGES.DEVOPS_ENRICHMENT_COMPLETED, {
        nameWithOwner: repo.nameWithOwner,
        enrichedFields: Object.keys({
          githubActions: enrichedRepo.githubActions,
          security: enrichedRepo.security,
          packages: enrichedRepo.packages,
          branchProtection: enrichedRepo.branchProtection,
          community: enrichedRepo.community,
          traffic: enrichedRepo.traffic,
        }).filter(key => Boolean(enrichedRepo[key as keyof GitHubRepo])),
      });

      return enrichedRepo;
    } catch (_error: unknown) {
      logger.error(GITHUB_SERVICE_LOG_ERROR_MESSAGES.ERROR_DURING_DEVOPS_ENRICHMENT, {
        nameWithOwner: repo.nameWithOwner,
        error: (_error as Error).message,
      });
      return repo;
    }
  }

  public sanitizeDescription(description: string): string {
    if (!description) return GITHUB_CONSTANTS.DEFAULT_EMPTY_STRING;

    return description
      .replace(
        GITHUB_SERVICE_CONSTANTS.DESCRIPTION_TRIM_REGEX,
        GITHUB_SERVICE_CONSTANTS.DESCRIPTION_REPLACEMENT_CHAR
      )
      .trim()
      .substring(0, GITHUB_SERVICE_CONSTANTS.DESCRIPTION_MAX_LENGTH);
  }
}

function isValidGitHubActions(obj: unknown): obj is import('@/types/github').GitHubActions {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    Object.prototype.hasOwnProperty.call(obj, 'workflowsCount') &&
    Object.prototype.hasOwnProperty.call(obj, 'workflows') &&
    Object.prototype.hasOwnProperty.call(obj, 'runs')
  );
}
function isValidGitHubSecurity(obj: unknown): obj is import('@/types/github').GitHubSecurity {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    Object.prototype.hasOwnProperty.call(obj, 'dependabotAlerts') &&
    Object.prototype.hasOwnProperty.call(obj, 'secretScanning') &&
    Object.prototype.hasOwnProperty.call(obj, 'codeScanning')
  );
}
function isValidGitHubPackages(obj: unknown): obj is import('@/types/github').GitHubPackages {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    Object.prototype.hasOwnProperty.call(obj, 'totalCount') &&
    Object.prototype.hasOwnProperty.call(obj, 'types')
  );
}
function isValidGitHubBranchProtection(
  obj: unknown
): obj is import('@/types/github').GitHubBranchProtection {
  return (
    obj !== null && typeof obj === 'object' && Object.prototype.hasOwnProperty.call(obj, 'rules')
  );
}
function isValidGitHubCommunity(obj: unknown): obj is import('@/types/github').GitHubCommunity {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    Object.prototype.hasOwnProperty.call(obj, 'healthPercentage') &&
    Object.prototype.hasOwnProperty.call(obj, 'hasReadme')
  );
}
function isValidGitHubTraffic(obj: unknown): obj is import('@/types/github').GitHubTraffic {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    Object.prototype.hasOwnProperty.call(obj, 'views') &&
    Object.prototype.hasOwnProperty.call(obj, 'clones') &&
    Object.prototype.hasOwnProperty.call(obj, 'popularPaths')
  );
}

export const githubService = new GitHubService();
