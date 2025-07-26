/**
 * Service GitHub API - Récupération des données GitHub
 * Basé sur les spécifications exactes du fichier api_data_github.md
 * Toutes les requêtes GraphQL et REST API avec gestion d'erreurs
 */

import {
  GitHubGraphQLOrganizationNode,
  GitHubGraphQLOrganizationRepositoriesResponse,
  GitHubGraphQLRepositoriesResponse,
  GitHubGraphQLRepositoryNode,
  GitHubGraphQLUserBasic,
  GitHubGraphQLUserBasicResponse,
  GitHubGraphQLUserCounters,
  GitHubGraphQLUserCountersResponse,
  GitHubGraphQLUserOrganizations,
  GitHubGraphQLUserOrganizationsResponse,
  GitHubRepo,
  GitHubRestCodeScanningAlert,
  GitHubRestCommunityProfile,
  GitHubRestDependabotAlert,
  GitHubRestPackage,
  GitHubRestTrafficPaths,
  GitHubRestWorkflow,
  GitHubRestWorkflowRun,
  GraphQLResponse,
  UserProfile,
} from '@/types/github';

import { GitHubConfig } from '@/config/github';
import logger from '@/utils/logger';

// Fonction utilitaire stricte pour transformer un node GraphQL en GitHubRepo
function toGitHubRepo(node: GitHubGraphQLRepositoryNode): GitHubRepo {
  return {
    nameWithOwner: node.nameWithOwner,
    name: node.name,
    description: node.description ?? '',
    isPrivate: node.isPrivate,
    isArchived: node.isArchived,
    isFork: node.isFork,
    isTemplate: node.isTemplate,
    stargazerCount: node.stargazerCount,
    forkCount: node.forkCount,
    watchersCount: node.watchers?.totalCount ?? 0,
    subscriberCount: node.subscriberCount ?? 0,
    networkCount: node.networkCount ?? 0,
    openIssuesCount: node.openIssuesCount ?? 0,
    primaryLanguage: node.primaryLanguage?.name ?? '',
    languages: {
      totalSize: node.languages?.totalSize ?? 0,
      nodes:
        node.languages?.edges?.map((edge) => ({
          name: edge.node.name,
          size: edge.size,
          percentage: 0,
        })) ?? [],
    },
    topics: node.repositoryTopics?.nodes?.map((t) => t.topic.name) ?? [],
    pushedAt: new Date(node.pushedAt),
    updatedAt: new Date(node.updatedAt),
    createdAt: new Date(node.createdAt),
    homepageUrl: node.homepageUrl ?? '',
    size: node.diskUsage ?? 0,
    defaultBranchRef: node.defaultBranchRef?.name ?? '',
    license: node.licenseInfo
      ? {
        name: node.licenseInfo.name,
        spdxId: node.licenseInfo.spdxId,
        url: node.licenseInfo.url,
      }
      : null,
    hasIssuesEnabled: node.hasIssuesEnabled ?? false,
    hasProjectsEnabled: node.hasProjectsEnabled ?? false,
    hasWikiEnabled: node.hasWikiEnabled ?? false,
    hasPages: node.hasPages ?? false,
    hasDownloads: node.hasDownloads ?? false,
    hasDiscussions: node.hasDiscussions ?? false,
    vulnerabilityAlertsEnabled: node.vulnerabilityAlertsEnabled ?? false,
    securityPolicyEnabled: node.securityPolicyEnabled ?? false,
    codeOfConductEnabled: node.codeOfConductEnabled ?? false,
    contributingGuidelinesEnabled: node.contributingGuidelinesEnabled ?? false,
    readmeEnabled: node.readmeEnabled ?? false,
    deployments: node.deployments ?? { totalCount: 0 },
    environments: node.environments ?? { totalCount: 0 },
    commits: node.commits?.target?.history?.totalCount !== undefined && typeof node.commits.target.history.totalCount === 'number'
      ? {
        totalCount: node.commits.target.history.totalCount,
        recent: Array.isArray(node.commits.target.history.nodes)
          ? node.commits.target.history.nodes.map((commit) => ({
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
      : { totalCount: 0, recent: [] },

    releases: typeof node.releases?.totalCount === 'number' && Array.isArray(node.releases?.nodes)
      ? {
        totalCount: node.releases.totalCount,
        latestRelease: node.releases.nodes.length > 0
          ? {
            name: node.releases.nodes[0].name,
            tagName: node.releases.nodes[0].tagName,
            publishedAt: new Date(node.releases.nodes[0].publishedAt),
            isLatest: node.releases.nodes[0].isLatest,
          }
          : null,
      }
      : { totalCount: 0, latestRelease: null },

    issues: typeof node.issues?.totalCount === 'number'
      ? {
        totalCount: node.issues.totalCount,
        openCount: node.issues.openCount ?? 0,
        closedCount: node.issues.closedCount ?? 0,
      }
      : { totalCount: 0, openCount: 0, closedCount: 0 },

    pullRequests: typeof node.pullRequests?.totalCount === 'number'
      ? {
        totalCount: node.pullRequests.totalCount,
        openCount: node.pullRequests.openCount ?? 0,
        closedCount: node.pullRequests.closedCount ?? 0,
        mergedCount: node.pullRequests.mergedCount ?? 0,
      }
      : { totalCount: 0, openCount: 0, closedCount: 0, mergedCount: 0 },
    branchProtectionRules: node.branchProtectionRules ?? { totalCount: 0 },
    collaborators: node.collaborators ?? { totalCount: 0 },
    githubActions: undefined,
    security: undefined,
    packages: undefined,
    branchProtection: undefined,
    community: undefined,
    traffic: undefined,
    diskUsage: node.diskUsage ?? 0,
    owner: node.owner,
    userId: undefined,
  };
}

export class GitHubService {
  public githubConfig: GitHubConfig;

  public constructor(_token?: string) {
    this.githubConfig = new GitHubConfig();
    if (_token != null && _token !== '') {
      void this.githubConfig.initialize(_token);
    }
  }

  static async create(token: string): Promise<GitHubService> {
    const service = new GitHubService(token);
    await service.githubConfig.initialize(token);
    return service;
  }

  /**
   * Récupère les organisations de l'utilisateur authentifié
   * GraphQL: viewer.organizations(first: 50)
   */
  public async getUserOrganizations(): Promise<string[]> {
    const query = `
      query {
        viewer {
          organizations(first: 50) {
            nodes {
              login
            }
          }
        }
      }
    `;

    try {
      const response: GraphQLResponse =
        await this.githubConfig.executeGraphQLQuery(query);

      // La méthode octokit.graphql lance automatiquement une erreur en cas de problème GraphQL

      const organizations =
        (response as {
          viewer?: { organizations?: { nodes?: { login: string }[] } };
        })?.viewer?.organizations?.nodes ?? [];
      const orgNames = organizations.map((org: { login: string }) => org.login);

      logger.info('Organisations récupérées', { count: orgNames.length });

      return orgNames;
    } catch (_error: unknown) {
      logger.error('Erreur récupération organisations', {
        error: (_error as Error).message,
      });
      throw new Error(
        `Récupération organisations échouée: ${(_error as Error).message}`,
      );
    }
  }

  /**
   * Récupère le profil utilisateur complet
   * GraphQL: viewer (basic, counters, organizations)
   */
  public async getUserProfile(): Promise<UserProfile> {
    // Requête 1: Profil de base
    const basicQuery = `
      query {
        viewer {
          login
          name
          email
          avatarUrl
          bio
          company
          location
          websiteUrl
          twitterUsername
          createdAt
          updatedAt
          __typename
          isSiteAdmin
          isHireable
        }
      }
    `;

    // Requête 2: Compteurs
    const countersQuery = `
      query {
        viewer {
          followers { totalCount }
          following { totalCount }
          repositories { totalCount }
          gists { totalCount }
          repositoriesContributedTo { totalCount }
        }
      }
    `;

    // Requête 3: Organisations
    const orgsQuery = `
      query {
        viewer {
          organizations(first: 10) {
            totalCount
            nodes {
              login
              name
              description
              avatarUrl
            }
          }
        }
      }
    `;

    try {
      const [basicResponse, countersResponse, orgsResponse] = await Promise.all([
        this.githubConfig.executeGraphQLQuery(basicQuery),
        this.githubConfig.executeGraphQLQuery(countersQuery),
        this.githubConfig.executeGraphQLQuery(orgsQuery),
      ]);

      // Vérification des erreurs - supprimée car octokit.graphql lance automatiquement les erreurs

      const basic = (basicResponse as unknown as GitHubGraphQLUserBasicResponse)?.viewer ?? {} as GitHubGraphQLUserBasic;
      const counters = (countersResponse as unknown as GitHubGraphQLUserCountersResponse)?.viewer ?? {} as GitHubGraphQLUserCounters;
      const orgs = (orgsResponse as unknown as GitHubGraphQLUserOrganizationsResponse)?.viewer ?? {} as GitHubGraphQLUserOrganizations;

      const userProfile: UserProfile = {
        login: basic.login,
        name: basic.name,
        email: basic.email,
        avatarUrl: basic.avatarUrl,
        bio: basic.bio,
        company: basic.company,
        location: basic.location,
        blog: basic.websiteUrl,
        twitterUsername: basic.twitterUsername,
        followers: counters.followers?.totalCount ?? 0,
        following: counters.following?.totalCount ?? 0,
        publicRepos: counters.repositories?.totalCount ?? 0,
        publicGists: counters.gists?.totalCount ?? 0,
        privateRepos: 0,
        ownedPrivateRepos: 0,
        totalPrivateRepos: 0,
        collaborators: 0,
        createdAt: new Date(basic.createdAt),
        updatedAt: new Date(basic.updatedAt),
        type: basic.__typename,
        siteAdmin: basic.isSiteAdmin,
        hireable: basic.isHireable,
        organizations: {
          totalCount: orgs.organizations?.totalCount ?? 0,
          nodes:
            orgs.organizations?.nodes?.map((org: GitHubGraphQLOrganizationNode) => ({
              login: org.login,
              name: org.name,
              description: org.description,
              avatarUrl: org.avatarUrl,
            })) ?? [],
        },
      };

      logger.info('Profil utilisateur récupéré', {
        login: userProfile.login,
        followers: userProfile.followers,
        repositories: userProfile.publicRepos,
      });

      return userProfile;
    } catch (_error: unknown) {
      logger.error('Erreur récupération profil utilisateur', {
        error: (_error as Error).message,
      });
      throw new Error(
        `Récupération profil échouée: ${(_error as Error).message}`,
      );
    }
  }

  /**
   * Récupère les repositories de l'utilisateur avec pagination
   * GraphQL: viewer.repositories(first: 20, orderBy: PUSHED_AT DESC)
   */
  public async getUserRepos(cursor?: string): Promise<GitHubRepo[]> {
    const query = `
      query($cursor: String) {
        viewer {
          repositories(first: 20, after: $cursor, orderBy: {field: PUSHED_AT, direction: DESC}) {
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
      const variables = cursor != null && cursor !== '' ? { cursor } : {};
      const response: GraphQLResponse = await this.githubConfig.executeGraphQLQuery(
        query,
        variables,
      );

      // La méthode octokit.graphql lance automatiquement une erreur en cas de problème GraphQL

      const repositories =
        (response as GitHubGraphQLRepositoriesResponse)?.viewer?.repositories?.nodes ?? [];
      const pageInfo = (response as GitHubGraphQLRepositoriesResponse)?.viewer?.repositories?.pageInfo;

      const repos: GitHubRepo[] = repositories.map((node: GitHubGraphQLRepositoryNode) => toGitHubRepo(node));

      // Récupération récursive si il y a plus de pages
      if (pageInfo?.hasNextPage === true) {
        const nextRepos = await this.getUserRepos(pageInfo.endCursor);
        repos.push(...nextRepos);
      }

      logger.info('Repositories utilisateur récupérés', {
        count: repos.length,
        hasMore: pageInfo?.hasNextPage,
      });

      return repos;
    } catch (_error: unknown) {
      logger.error('Erreur récupération repositories utilisateur', {
        error: (_error as Error).message,
      });
      throw new Error(
        `Récupération repositories échouée: ${(_error as Error).message}`,
      );
    }
  }

  /**
   * Récupère les repositories d'une organisation
   * GraphQL: organization(login).repositories(first: 50, orderBy: PUSHED_AT DESC)
   */
  public async getOrgRepos(
    orgName: string,
    cursor?: string,
  ): Promise<GitHubRepo[]> {
    const query = `
      query($orgName: String!, $cursor: String) {
        organization(login: $orgName) {
          repositories(first: 50, after: $cursor, orderBy: {field: PUSHED_AT, direction: DESC}) {
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
      const variables = orgName && cursor != null && cursor !== '' ? { orgName, cursor } : { orgName };
      const response: GraphQLResponse = await this.githubConfig.executeGraphQLQuery(
        query,
        variables,
      );

      // La méthode octokit.graphql lance automatiquement une erreur en cas de problème GraphQL

      const repositories =
        (response as GitHubGraphQLOrganizationRepositoriesResponse)?.organization?.repositories?.nodes ?? [];
      const pageInfo = (response as GitHubGraphQLOrganizationRepositoriesResponse)?.organization?.repositories
        ?.pageInfo;

      const repos: GitHubRepo[] = repositories.map((node: GitHubGraphQLRepositoryNode) => toGitHubRepo(node));

      // Récupération récursive
      if (pageInfo?.hasNextPage === true) {
        const nextRepos = await this.getOrgRepos(orgName, pageInfo.endCursor);
        repos.push(...nextRepos);
      }

      logger.info('Repositories organisation récupérés', {
        orgName,
        count: repos.length,
        hasMore: pageInfo?.hasNextPage,
      });

      return repos;
    } catch (_error: unknown) {
      logger.error('Erreur récupération repositories organisation', {
        orgName,
        error: (_error as Error).message,
      });
      throw new Error(
        `Récupération repositories organisation échouée: ${(_error as Error).message}`,
      );
    }
  }

  /**
   * Récupère les données GitHub Actions d'un repository
   * REST: GET /repos/{owner}/{repo}/actions/workflows, /actions/runs
   */
  public async getGitHubActionsData(
    owner: string,
    repo: string,
  ): Promise<Record<string, unknown>> {
    try {
      const [workflowsResponse, runsResponse] = await Promise.all([
        this.githubConfig.executeRestRequest(
          `GET /repos/${owner}/${repo}/actions/workflows`,
        ),
        this.githubConfig.executeRestRequest(
          `GET /repos/${owner}/${repo}/actions/runs`,
          {
            per_page: 20,
          },
        ),
      ]);

      const workflows = (workflowsResponse.workflows as GitHubRestWorkflow[]) ?? [];
      const runs = (runsResponse.workflow_runs as GitHubRestWorkflowRun[]) ?? [];

      // Calcul des statistiques
      const successfulRuns = runs.filter(
        (run: GitHubRestWorkflowRun) => run.conclusion === 'success',
      ).length;
      const failedRuns = runs.filter(
        (run: GitHubRestWorkflowRun) => run.conclusion === 'failure',
      ).length;
      const totalRuns = runs.length;
      const successRate =
        totalRuns > 0 ? Math.round((successfulRuns / totalRuns) * 100) : 0;

      const actionsData = {
        workflowsCount: workflows.length,
        lastRunStatus: runs[0]?.conclusion ?? 'unknown',
        workflows: workflows.map((workflow: GitHubRestWorkflow) => ({
          name: workflow.name,
          path: workflow.path,
          state: workflow.state,
          createdAt: new Date(workflow.created_at),
          updatedAt: new Date(workflow.updated_at),
          lastRunStatus: 'unknown', // Sera enrichi si nécessaire
          lastRunDate: new Date(), // Sera enrichi si nécessaire
        })),
        runs: {
          totalCount: totalRuns,
          successful: successfulRuns,
          failed: failedRuns,
          successRate,
        },
      };

      logger.debug('Données GitHub Actions récupérées', {
        owner,
        repo,
        workflowsCount: workflows.length,
        runsCount: totalRuns,
      });

      return actionsData;
    } catch (_error: unknown) {
      const error = _error as Error;

      // Gestion spécifique des erreurs de timeout/connectivité
      if (error.message.includes('timeout') ||
          error.message.includes('Connect Timeout Error') ||
          error.message.includes('ECONNRESET') ||
          error.message.includes('ENOTFOUND')) {
        logger.warn('Timeout lors de la récupération GitHub Actions, retour de données par défaut', {
          owner,
          repo,
          error: error.message,
        });

        // Retourner des données par défaut au lieu d'échouer
        return {
          workflowsCount: 0,
          lastRunStatus: 'unknown',
          workflows: [],
          runs: {
            totalCount: 0,
            successful: 0,
            failed: 0,
            successRate: 0,
          },
        };
      }

      logger.error('Erreur récupération GitHub Actions', {
        owner,
        repo,
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Récupère les données de sécurité d'un repository
   * REST: GET /repos/{owner}/{repo}/dependabot/alerts, /secret-scanning/alerts, /code-scanning/alerts
   */
  public async getSecurityData(
    owner: string,
    repo: string,
  ): Promise<Record<string, unknown>> {
    try {
      const endpoints = [
        `GET /repos/${owner}/${repo}/dependabot/alerts`,
        `GET /repos/${owner}/${repo}/secret-scanning/alerts`,
        `GET /repos/${owner}/${repo}/code-scanning/alerts`,
      ];

      const responses = await Promise.allSettled(
        endpoints.map((endpoint) => this.githubConfig.executeRestRequest(endpoint)),
      );

      const dependabotAlerts =
        responses[0].status === 'fulfilled' ? responses[0].value : [];
      const secretAlerts =
        responses[1].status === 'fulfilled' ? responses[1].value : [];
      const codeAlerts =
        responses[2].status === 'fulfilled' ? responses[2].value : [];

      const securityData = {
        dependabotAlerts: {
          totalCount: dependabotAlerts.length ?? 0,
          open: Array.isArray(dependabotAlerts)
            ? dependabotAlerts.filter((alert: GitHubRestDependabotAlert) => alert.state === 'open')
              .length
            : 0,
          fixed: Array.isArray(dependabotAlerts)
            ? dependabotAlerts.filter((alert: GitHubRestDependabotAlert) => alert.state === 'fixed')
              .length
            : 0,
          dismissed: Array.isArray(dependabotAlerts)
            ? dependabotAlerts.filter(
              (alert: GitHubRestDependabotAlert) => alert.state === 'dismissed',
            ).length
            : 0,
        },
        secretScanning: {
          totalCount: secretAlerts.length ?? 0,
          resolved: Array.isArray(secretAlerts)
            ? secretAlerts.filter((alert: GitHubRestCodeScanningAlert) => alert.state === 'resolved')
              .length
            : 0,
        },
        codeScanning: {
          totalCount: codeAlerts.length ?? 0,
          open: Array.isArray(codeAlerts)
            ? codeAlerts.filter((alert: GitHubRestCodeScanningAlert) => alert.state === 'open').length
            : 0,
          fixed: Array.isArray(codeAlerts)
            ? codeAlerts.filter((alert: GitHubRestCodeScanningAlert) => alert.state === 'fixed').length
            : 0,
        },
        hasSecurityPolicy: false, // À enrichir
        hasVulnerabilityAlertsEnabled: true, // Assumé si on a des alertes
      };

      logger.debug('Données sécurité récupérées', {
        owner,
        repo,
        dependabotCount: securityData.dependabotAlerts.totalCount,
        secretCount: securityData.secretScanning.totalCount,
        codeCount: securityData.codeScanning.totalCount,
      });

      return securityData;
    } catch (_error: unknown) {
      // Les erreurs 403/404 sont courantes pour les repos sans accès sécurité
      if (typeof _error === 'object' && _error && 'status' in _error && ((_error as { status: number }).status === 403 || (_error as { status: number }).status === 404)) {
        return {
          dependabotAlerts: { totalCount: 0, open: 0, fixed: 0, dismissed: 0 },
          secretScanning: { totalCount: 0, resolved: 0 },
          codeScanning: { totalCount: 0, open: 0, fixed: 0 },
          hasSecurityPolicy: false,
          hasVulnerabilityAlertsEnabled: false,
        };
      }

      logger.error('Erreur récupération données sécurité', {
        owner,
        repo,
        error: (_error as Error).message,
      });
      throw new Error(
        `Récupération sécurité échouée: ${(_error as Error).message}`,
      );
    }
  }

  /**
   * Récupère les packages d'un repository
   * REST: GET /users/{owner}/packages
   */
  public async getPackagesData(
    owner: string,
    repo: string,
  ): Promise<Record<string, unknown>> {
    try {
      const response = await this.githubConfig.executeRestRequest(
        `GET /users/${owner}/packages`,
      );
      const packages = ((response as unknown) as GitHubRestPackage[]) ?? [];

      // Filtrer les packages liés au repo (approximation par nom)
      const repoPackages = packages.filter(
        (pkg: GitHubRestPackage) => pkg.repository?.name === repo || pkg.name.includes(repo),
      );

      const packageTypes = [
        ...new Set(repoPackages.map((pkg: GitHubRestPackage) => pkg.package_type)),
      ];

      const packagesData = {
        totalCount: repoPackages.length,
        types: packageTypes,
      };

      logger.debug('Données packages récupérées', {
        owner,
        repo,
        count: packagesData.totalCount,
        types: packageTypes,
      });

      return packagesData;
    } catch (_error: unknown) {
      if (typeof _error === 'object' && _error && 'status' in _error && (_error as { status: number }).status === 404) {
        return { totalCount: 0, types: [] };
      }

      logger.error('Erreur récupération packages', {
        owner,
        repo,
        error: (_error as Error).message,
      });
      throw new Error(
        `Récupération packages échouée: ${(_error as Error).message}`,
      );
    }
  }

  /**
   * Récupère les données de protection de branche
   * REST: GET /repos/{owner}/{repo}/branches/{branch}/protection
   */
  public async getBranchProtectionData(
    owner: string,
    repo: string,
    defaultBranch: string,
  ): Promise<Record<string, unknown>> {
    try {
      const branch = defaultBranch ?? 'main';
      const response = await this.githubConfig.executeRestRequest(
        `GET /repos/${owner}/${repo}/branches/${branch}/protection`,
      );

      // Correction accès require_code_owner_reviews, dismiss_stale_reviews, contexts
      const branchProtectionData = {
        rules: [
          {
            pattern: branch,
            requiresStatusChecks: typeof response.required_status_checks === 'object' && response.required_status_checks !== null,
            requiresCodeOwnerReviews: typeof response.required_pull_request_reviews === 'object' && response.required_pull_request_reviews !== null && (response.required_pull_request_reviews as { require_code_owner_reviews?: boolean }).require_code_owner_reviews === true,
            dismissStaleReviews: typeof response.required_pull_request_reviews === 'object' && response.required_pull_request_reviews !== null && (response.required_pull_request_reviews as { dismiss_stale_reviews?: boolean }).dismiss_stale_reviews === true,
            restrictsPushes: typeof response.restrictions === 'object' && response.restrictions !== null,
            requiredStatusChecks: (response.required_status_checks as { contexts?: string[] })?.contexts ?? [],
          },
        ],
      };

      logger.debug('Données protection de branche récupérées', {
        owner,
        repo,
        branch,
        protected: true,
      });

      return branchProtectionData;
    } catch (_error: unknown) {
      if (typeof _error === 'object' && _error && 'status' in _error && (_error as { status: number }).status === 404) {
        return { rules: [] };
      }

      logger.error('Erreur récupération protection branche', {
        owner,
        repo,
        error: (_error as Error).message,
      });
      throw new Error(
        `Récupération protection branche échouée: ${(_error as Error).message}`,
      );
    }
  }

  /**
   * Récupère les données de santé communautaire
   * REST: GET /repos/{owner}/{repo}/community/profile
   */
  public async getCommunityHealthData(
    owner: string,
    repo: string,
  ): Promise<Record<string, unknown>> {
    try {
      const response = await this.githubConfig.executeRestRequest(
        `GET /repos/${owner}/${repo}/community/profile`,
      );

      const files = ((response.files as unknown) as GitHubRestCommunityProfile)?.files ?? {};

      const communityData = {
        healthPercentage: (response.health_percentage as number) ?? 0,
        hasReadme: !!files.readme,
        hasLicense: !!files.license,
        hasContributing: !!files.contributing,
        hasCodeOfConduct: !!files.code_of_conduct,
        hasIssueTemplate: !!files.issue_template,
        hasPullRequestTemplate: !!files.pull_request_template,
      };

      logger.debug('Données santé communautaire récupérées', {
        owner,
        repo,
        healthPercentage: communityData.healthPercentage,
      });

      return communityData;
    } catch (_error: unknown) {
      if (typeof _error === 'object' && _error && 'status' in _error && (_error as { status: number }).status === 404) {
        return {
          healthPercentage: 0,
          hasReadme: false,
          hasLicense: false,
          hasContributing: false,
          hasCodeOfConduct: false,
          hasIssueTemplate: false,
          hasPullRequestTemplate: false,
        };
      }

      logger.error('Erreur récupération santé communautaire', {
        owner,
        repo,
        error: (_error as Error).message,
      });
      throw new Error(
        `Récupération santé communautaire échouée: ${(_error as Error).message}`,
      );
    }
  }

  /**
   * Récupère les données de trafic
   * REST: GET /repos/{owner}/{repo}/traffic/views, /clones, /popular/paths
   */
  public async getTrafficData(
    owner: string,
    repo: string,
  ): Promise<Record<string, unknown>> {
    try {
      const [viewsResponse, clonesResponse, pathsResponse] =
        await Promise.allSettled([
          this.githubConfig.executeRestRequest(
            `GET /repos/${owner}/${repo}/traffic/views`,
          ),
          this.githubConfig.executeRestRequest(
            `GET /repos/${owner}/${repo}/traffic/clones`,
          ),
          this.githubConfig.executeRestRequest(
            `GET /repos/${owner}/${repo}/traffic/popular/paths`,
          ),
        ]);

      const views =
        viewsResponse.status === 'fulfilled'
          ? viewsResponse.value
          : { count: 0, uniques: 0 };
      const clones =
        clonesResponse.status === 'fulfilled'
          ? clonesResponse.value
          : { count: 0, uniques: 0 };
      const paths =
        pathsResponse.status === 'fulfilled' ? pathsResponse.value : [];

      // Correction mapping popularPaths
      let popularPaths: { path: string; title: string; count: number; uniques: number }[] = [];
      if (
        paths != null &&
        typeof paths === 'object' &&
        Object.prototype.hasOwnProperty.call(paths, 'paths') &&
        Array.isArray((paths as unknown as GitHubRestTrafficPaths).paths)
      ) {
        popularPaths = (paths as unknown as GitHubRestTrafficPaths).paths.map(({ path, title, count, uniques }) => ({ path, title, count, uniques }));
      }

      const trafficData = {
        views: {
          count: views.count ?? 0,
          uniques: views.uniques ?? 0,
        },
        clones: {
          count: clones.count ?? 0,
          uniques: clones.uniques ?? 0,
        },
        popularPaths,
      };

      logger.debug('Données trafic récupérées', {
        owner,
        repo,
        views: trafficData.views.count,
        clones: trafficData.clones.count,
      });

      return trafficData;
    } catch (_error: unknown) {
      logger.error('Erreur récupération trafic', {
        owner,
        repo,
        error: (_error as Error).message,
      });

      // Retourner des données vides plutôt que d'échouer
      return {
        views: { count: 0, uniques: 0 },
        clones: { count: 0, uniques: 0 },
        popularPaths: [],
      };
    }
  }

  /**
   * Enrichit un repository avec toutes les données DevOps
   * Combine: GitHub Actions, Security, Packages, Branch Protection, Community, Traffic
   */
  public async enrichWithDevOpsData(repo: GitHubRepo): Promise<GitHubRepo> {
    const [owner, repoName] = repo.nameWithOwner.split('/');

    try {
      logger.info('Début enrichissement DevOps', {
        nameWithOwner: repo.nameWithOwner,
      });

      const [
        githubActions,
        security,
        packages,
        branchProtection,
        community,
        traffic,
      ] = await Promise.allSettled([
        this.getGitHubActionsData(owner, repoName),
        this.getSecurityData(owner, repoName),
        this.getPackagesData(owner, repoName),
        this.getBranchProtectionData(
          owner,
          repoName,
          repo.defaultBranchRef ?? 'main',
        ),
        this.getCommunityHealthData(owner, repoName),
        this.getTrafficData(owner, repoName),
      ]);

      const enrichedRepo: GitHubRepo = {
        ...repo,
        githubActions:
          githubActions.status === 'fulfilled' &&
            isValidGitHubActions(githubActions.value)
            ? githubActions.value
            : undefined,
        security:
          security.status === 'fulfilled' &&
            isValidGitHubSecurity(security.value)
            ? security.value
            : undefined,
        packages:
          packages.status === 'fulfilled' &&
            isValidGitHubPackages(packages.value)
            ? packages.value
            : undefined,
        branchProtection:
          branchProtection.status === 'fulfilled' &&
            isValidGitHubBranchProtection(branchProtection.value)
            ? branchProtection.value
            : undefined,
        community:
          community.status === 'fulfilled' &&
            isValidGitHubCommunity(community.value)
            ? community.value
            : undefined,
        traffic:
          traffic.status === 'fulfilled' && isValidGitHubTraffic(traffic.value)
            ? traffic.value
            : undefined,
      };

      logger.info('Enrichissement DevOps terminé', {
        nameWithOwner: repo.nameWithOwner,
        enrichedFields: Object.keys({
          githubActions: enrichedRepo.githubActions,
          security: enrichedRepo.security,
          packages: enrichedRepo.packages,
          branchProtection: enrichedRepo.branchProtection,
          community: enrichedRepo.community,
          traffic: enrichedRepo.traffic,
        }).filter((key) => Boolean(enrichedRepo[key as keyof GitHubRepo])),
      });

      return enrichedRepo;
    } catch (_error: unknown) {
      logger.error('Erreur enrichissement DevOps', {
        nameWithOwner: repo.nameWithOwner,
        error: (_error as Error).message,
      });

      // Retourner le repo original si l'enrichissement échoue
      return repo;
    }
  }

  /**
   * Sanitise une description en supprimant les retours à la ligne
   */
  public sanitizeDescription(description: string): string {
    if (!description) return '';

    return description
      .replace(/[\r\n\t]/g, ' ')
      .trim()
      .substring(0, 500); // Limite de longueur
  }
}

// Ajouter les guards de type en bas du fichier :
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
function isValidGitHubBranchProtection(obj: unknown): obj is import('@/types/github').GitHubBranchProtection {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    Object.prototype.hasOwnProperty.call(obj, 'rules')
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

// Export de l'instance singleton
export const githubService = new GitHubService();
