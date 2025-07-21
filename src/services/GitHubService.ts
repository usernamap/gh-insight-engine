/**
 * Service GitHub API - Récupération des données GitHub
 * Basé sur les spécifications exactes du fichier api_data_github.md
 * Toutes les requêtes GraphQL et REST API avec gestion d'erreurs
 */

import { GitHubRepo, UserProfile, GitHubOrganization, GraphQLResponse } from '@/types/github';
import githubConfig from '@/config/github';
import logger from '@/utils/logger';

export class GitHubService {
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
      const response: GraphQLResponse = await githubConfig.executeGraphQLQuery(query);
      
      if (response.errors) {
        throw new Error(`GraphQL errors: ${response.errors.map(e => e.message).join(', ')}`);
      }

      const organizations = response.data?.viewer?.organizations?.nodes || [];
      const orgNames = organizations.map((org: any) => org.login);

      logger.info('Organisations récupérées', { count: orgNames.length });
      
      return orgNames;
    } catch (error: any) {
      logger.error('Erreur récupération organisations', { error: error.message });
      throw new Error(`Récupération organisations échouée: ${error.message}`);
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
        githubConfig.executeGraphQLQuery(basicQuery),
        githubConfig.executeGraphQLQuery(countersQuery),
        githubConfig.executeGraphQLQuery(orgsQuery),
      ]);

      // Vérification des erreurs
      const responses = [basicResponse, countersResponse, orgsResponse];
      for (const response of responses) {
        if (response.errors) {
          throw new Error(`GraphQL errors: ${response.errors.map(e => e.message).join(', ')}`);
        }
      }

      const basic = basicResponse.data?.viewer || {};
      const counters = countersResponse.data?.viewer || {};
      const orgs = orgsResponse.data?.viewer || {};

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
        followers: counters.followers?.totalCount || 0,
        following: counters.following?.totalCount || 0,
        publicRepos: counters.repositories?.totalCount || 0,
        publicGists: counters.gists?.totalCount || 0,
        privateRepos: null,
        ownedPrivateRepos: null,
        totalPrivateRepos: null,
        collaborators: null,
        createdAt: new Date(basic.createdAt),
        updatedAt: new Date(basic.updatedAt),
        type: basic.__typename,
        siteAdmin: basic.isSiteAdmin,
        hireable: basic.isHireable,
        organizations: {
          totalCount: orgs.organizations?.totalCount || 0,
          nodes: orgs.organizations?.nodes?.map((org: any) => ({
            login: org.login,
            name: org.name,
            description: org.description,
            avatarUrl: org.avatarUrl,
          })) || []
        }
      };

      logger.info('Profil utilisateur récupéré', {
        login: userProfile.login,
        followers: userProfile.followers,
        repositories: userProfile.publicRepos,
      });

      return userProfile;
    } catch (error: any) {
      logger.error('Erreur récupération profil utilisateur', { error: error.message });
      throw new Error(`Récupération profil échouée: ${error.message}`);
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
      const variables = cursor ? { cursor } : {};
      const response: GraphQLResponse = await githubConfig.executeGraphQLQuery(query, variables);

      if (response.errors) {
        throw new Error(`GraphQL errors: ${response.errors.map(e => e.message).join(', ')}`);
      }

      const repositories = response.data?.viewer?.repositories?.nodes || [];
      const pageInfo = response.data?.viewer?.repositories?.pageInfo;

      const repos: GitHubRepo[] = repositories.map((repo: any) => {
        // Transformation des langages
        const languageNodes = repo.languages?.edges?.map((edge: any) => ({
          name: edge.node.name,
          size: edge.size,
          percentage: Math.round((edge.size / repo.languages.totalSize) * 100)
        })) || [];

        // Transformation des topics
        const topics = repo.repositoryTopics?.nodes?.map((node: any) => node.topic.name) || [];

        // Transformation des commits
        const commitHistory = repo.commits?.target?.history;
        const commits = {
          totalCount: commitHistory?.totalCount || 0,
          recent: commitHistory?.nodes?.map((commit: any) => ({
            oid: commit.oid,
            message: commit.message,
            committedDate: new Date(commit.committedDate),
            author: {
              name: commit.author.name,
              email: commit.author.email,
              login: commit.author.user?.login || null,
            },
            additions: commit.additions,
            deletions: commit.deletions,
            changedFiles: commit.changedFiles,
          })) || []
        };

        return {
          nameWithOwner: repo.nameWithOwner,
          name: repo.name,
          description: repo.description,
          isPrivate: repo.isPrivate,
          isArchived: repo.isArchived,
          isFork: repo.isFork,
          isTemplate: repo.isTemplate,
          stargazerCount: repo.stargazerCount,
          forkCount: repo.forkCount,
          watchersCount: repo.watchers?.totalCount || 0,
          subscriberCount: null,
          networkCount: null,
          openIssuesCount: repo.issues?.totalCount || 0,
          primaryLanguage: repo.primaryLanguage?.name || null,
          languages: {
            totalSize: repo.languages?.totalSize || 0,
            nodes: languageNodes,
          },
          topics,
          pushedAt: repo.pushedAt ? new Date(repo.pushedAt) : null,
          updatedAt: new Date(repo.updatedAt),
          createdAt: new Date(repo.createdAt),
          homepageUrl: repo.homepageUrl,
          size: repo.diskUsage || 0,
          defaultBranchRef: repo.defaultBranchRef?.name || null,
          license: repo.licenseInfo ? {
            name: repo.licenseInfo.name,
            spdxId: repo.licenseInfo.spdxId,
            url: repo.licenseInfo.url,
          } : null,
          hasIssuesEnabled: repo.hasIssuesEnabled,
          hasProjectsEnabled: repo.hasProjectsEnabled,
          hasWikiEnabled: repo.hasWikiEnabled,
          hasPages: null,
          hasDownloads: null,
          hasDiscussions: null,
          vulnerabilityAlertsEnabled: null,
          securityPolicyEnabled: null,
          codeOfConductEnabled: null,
          contributingGuidelinesEnabled: null,
          readmeEnabled: null,
          deployments: {
            totalCount: repo.deployments?.totalCount || 0,
          },
          environments: {
            totalCount: repo.environments?.totalCount || 0,
          },
          commits,
          releases: {
            totalCount: repo.releases?.totalCount || 0,
            latestRelease: null, // Sera enrichi plus tard si nécessaire
          },
          issues: {
            totalCount: repo.issues?.totalCount || 0,
            openCount: 0, // À calculer
            closedCount: 0, // À calculer
          },
          pullRequests: {
            totalCount: repo.pullRequests?.totalCount || 0,
            openCount: 0, // À calculer
            closedCount: 0, // À calculer
            mergedCount: 0, // À calculer
          },
          branchProtectionRules: {
            totalCount: 0, // À enrichir via REST API
          },
          collaborators: {
            totalCount: 0, // À enrichir via REST API
          },
          diskUsage: repo.diskUsage || 0,
          owner: {
            login: repo.owner.login,
            type: 'User', // Assumé pour l'utilisateur authentifié
            avatarUrl: repo.owner.avatarUrl,
          },
        };
      });

      // Récupération récursive si il y a plus de pages
      if (pageInfo?.hasNextPage) {
        const nextRepos = await this.getUserRepos(pageInfo.endCursor);
        repos.push(...nextRepos);
      }

      logger.info('Repositories utilisateur récupérés', {
        count: repos.length,
        hasMore: pageInfo?.hasNextPage,
      });

      return repos;
    } catch (error: any) {
      logger.error('Erreur récupération repositories utilisateur', { error: error.message });
      throw new Error(`Récupération repositories échouée: ${error.message}`);
    }
  }

  /**
   * Récupère les repositories d'une organisation
   * GraphQL: organization(login).repositories(first: 50, orderBy: PUSHED_AT DESC)
   */
  public async getOrgRepos(orgName: string, cursor?: string): Promise<GitHubRepo[]> {
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
      const variables = { orgName, ...(cursor ? { cursor } : {}) };
      const response: GraphQLResponse = await githubConfig.executeGraphQLQuery(query, variables);

      if (response.errors) {
        throw new Error(`GraphQL errors: ${response.errors.map(e => e.message).join(', ')}`);
      }

      const repositories = response.data?.organization?.repositories?.nodes || [];
      const pageInfo = response.data?.organization?.repositories?.pageInfo;

      const repos: GitHubRepo[] = repositories.map((repo: any) => {
        // Même transformation que getUserRepos (factorisation possible)
        const languageNodes = repo.languages?.edges?.map((edge: any) => ({
          name: edge.node.name,
          size: edge.size,
          percentage: Math.round((edge.size / repo.languages.totalSize) * 100)
        })) || [];

        const topics = repo.repositoryTopics?.nodes?.map((node: any) => node.topic.name) || [];

        const commitHistory = repo.commits?.target?.history;
        const commits = {
          totalCount: commitHistory?.totalCount || 0,
          recent: commitHistory?.nodes?.map((commit: any) => ({
            oid: commit.oid,
            message: commit.message,
            committedDate: new Date(commit.committedDate),
            author: {
              name: commit.author.name,
              email: commit.author.email,
              login: commit.author.user?.login || null,
            },
            additions: commit.additions,
            deletions: commit.deletions,
            changedFiles: commit.changedFiles,
          })) || []
        };

        return {
          nameWithOwner: repo.nameWithOwner,
          name: repo.name,
          description: repo.description,
          isPrivate: repo.isPrivate,
          isArchived: repo.isArchived,
          isFork: repo.isFork,
          isTemplate: repo.isTemplate,
          stargazerCount: repo.stargazerCount,
          forkCount: repo.forkCount,
          watchersCount: repo.watchers?.totalCount || 0,
          subscriberCount: null,
          networkCount: null,
          openIssuesCount: repo.issues?.totalCount || 0,
          primaryLanguage: repo.primaryLanguage?.name || null,
          languages: {
            totalSize: repo.languages?.totalSize || 0,
            nodes: languageNodes,
          },
          topics,
          pushedAt: repo.pushedAt ? new Date(repo.pushedAt) : null,
          updatedAt: new Date(repo.updatedAt),
          createdAt: new Date(repo.createdAt),
          homepageUrl: repo.homepageUrl,
          size: repo.diskUsage || 0,
          defaultBranchRef: repo.defaultBranchRef?.name || null,
          license: repo.licenseInfo ? {
            name: repo.licenseInfo.name,
            spdxId: repo.licenseInfo.spdxId,
            url: repo.licenseInfo.url,
          } : null,
          hasIssuesEnabled: repo.hasIssuesEnabled,
          hasProjectsEnabled: repo.hasProjectsEnabled,
          hasWikiEnabled: repo.hasWikiEnabled,
          hasPages: null,
          hasDownloads: null,
          hasDiscussions: null,
          vulnerabilityAlertsEnabled: null,
          securityPolicyEnabled: null,
          codeOfConductEnabled: null,
          contributingGuidelinesEnabled: null,
          readmeEnabled: null,
          deployments: {
            totalCount: repo.deployments?.totalCount || 0,
          },
          environments: {
            totalCount: repo.environments?.totalCount || 0,
          },
          commits,
          releases: {
            totalCount: repo.releases?.totalCount || 0,
            latestRelease: null,
          },
          issues: {
            totalCount: repo.issues?.totalCount || 0,
            openCount: 0,
            closedCount: 0,
          },
          pullRequests: {
            totalCount: repo.pullRequests?.totalCount || 0,
            openCount: 0,
            closedCount: 0,
            mergedCount: 0,
          },
          branchProtectionRules: {
            totalCount: 0,
          },
          collaborators: {
            totalCount: 0,
          },
          diskUsage: repo.diskUsage || 0,
          owner: {
            login: repo.owner.login,
            type: 'Organization',
            avatarUrl: repo.owner.avatarUrl,
          },
        };
      });

      // Récupération récursive
      if (pageInfo?.hasNextPage) {
        const nextRepos = await this.getOrgRepos(orgName, pageInfo.endCursor);
        repos.push(...nextRepos);
      }

      logger.info('Repositories organisation récupérés', {
        orgName,
        count: repos.length,
        hasMore: pageInfo?.hasNextPage,
      });

      return repos;
    } catch (error: any) {
      logger.error('Erreur récupération repositories organisation', {
        orgName,
        error: error.message,
      });
      throw new Error(`Récupération repositories organisation échouée: ${error.message}`);
    }
  }

  /**
   * Récupère les données GitHub Actions d'un repository
   * REST: GET /repos/{owner}/{repo}/actions/workflows, /actions/runs
   */
  public async getGitHubActionsData(owner: string, repo: string): Promise<any> {
    try {
      const [workflowsResponse, runsResponse] = await Promise.all([
        githubConfig.executeRestRequest(`GET /repos/${owner}/${repo}/actions/workflows`),
        githubConfig.executeRestRequest(`GET /repos/${owner}/${repo}/actions/runs`, {
          per_page: 20,
        }),
      ]);

      const workflows = workflowsResponse.workflows || [];
      const runs = runsResponse.workflow_runs || [];

      // Calcul des statistiques
      const successfulRuns = runs.filter((run: any) => run.conclusion === 'success').length;
      const failedRuns = runs.filter((run: any) => run.conclusion === 'failure').length;
      const totalRuns = runs.length;
      const successRate = totalRuns > 0 ? Math.round((successfulRuns / totalRuns) * 100) : 0;

      const actionsData = {
        workflowsCount: workflows.length,
        lastRunStatus: runs[0]?.conclusion || 'unknown',
        workflows: workflows.map((workflow: any) => ({
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
    } catch (error: any) {
      // Les erreurs 404 sont courantes pour les repos sans Actions
      if (error.status === 404) {
        return {
          workflowsCount: 0,
          lastRunStatus: 'none',
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
      throw new Error(`Récupération GitHub Actions échouée: ${error.message}`);
    }
  }

  /**
   * Récupère les données de sécurité d'un repository
   * REST: GET /repos/{owner}/{repo}/dependabot/alerts, /secret-scanning/alerts, /code-scanning/alerts
   */
  public async getSecurityData(owner: string, repo: string): Promise<any> {
    try {
      const endpoints = [
        `GET /repos/${owner}/${repo}/dependabot/alerts`,
        `GET /repos/${owner}/${repo}/secret-scanning/alerts`,
        `GET /repos/${owner}/${repo}/code-scanning/alerts`,
      ];

      const responses = await Promise.allSettled(
        endpoints.map(endpoint => githubConfig.executeRestRequest(endpoint))
      );

      const dependabotAlerts = responses[0].status === 'fulfilled' ? responses[0].value : [];
      const secretAlerts = responses[1].status === 'fulfilled' ? responses[1].value : [];
      const codeAlerts = responses[2].status === 'fulfilled' ? responses[2].value : [];

      const securityData = {
        dependabotAlerts: {
          totalCount: dependabotAlerts.length || 0,
          open: dependabotAlerts.filter((alert: any) => alert.state === 'open').length || 0,
          fixed: dependabotAlerts.filter((alert: any) => alert.state === 'fixed').length || 0,
          dismissed: dependabotAlerts.filter((alert: any) => alert.state === 'dismissed').length || 0,
        },
        secretScanning: {
          totalCount: secretAlerts.length || 0,
          resolved: secretAlerts.filter((alert: any) => alert.state === 'resolved').length || 0,
        },
        codeScanning: {
          totalCount: codeAlerts.length || 0,
          open: codeAlerts.filter((alert: any) => alert.state === 'open').length || 0,
          fixed: codeAlerts.filter((alert: any) => alert.state === 'fixed').length || 0,
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
    } catch (error: any) {
      // Les erreurs 403/404 sont courantes pour les repos sans accès sécurité
      if (error.status === 403 || error.status === 404) {
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
        error: error.message,
      });
      throw new Error(`Récupération sécurité échouée: ${error.message}`);
    }
  }

  /**
   * Récupère les packages d'un repository
   * REST: GET /users/{owner}/packages
   */
  public async getPackagesData(owner: string, repo: string): Promise<any> {
    try {
      const response = await githubConfig.executeRestRequest(`GET /users/${owner}/packages`);
      const packages = response || [];

      // Filtrer les packages liés au repo (approximation par nom)
      const repoPackages = packages.filter((pkg: any) => 
        pkg.repository?.name === repo || pkg.name.includes(repo)
      );

      const packageTypes = [...new Set(repoPackages.map((pkg: any) => pkg.package_type))];

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
    } catch (error: any) {
      if (error.status === 404) {
        return { totalCount: 0, types: [] };
      }

      logger.error('Erreur récupération packages', {
        owner,
        repo,
        error: error.message,
      });
      throw new Error(`Récupération packages échouée: ${error.message}`);
    }
  }

  /**
   * Récupère les données de protection de branche
   * REST: GET /repos/{owner}/{repo}/branches/{branch}/protection
   */
  public async getBranchProtectionData(owner: string, repo: string, defaultBranch: string): Promise<any> {
    try {
      const branch = defaultBranch || 'main';
      const response = await githubConfig.executeRestRequest(
        `GET /repos/${owner}/${repo}/branches/${branch}/protection`
      );

      const branchProtectionData = {
        rules: [{
          pattern: branch,
          requiresStatusChecks: !!response.required_status_checks,
          requiresCodeOwnerReviews: !!response.required_pull_request_reviews?.require_code_owner_reviews,
          dismissStaleReviews: !!response.required_pull_request_reviews?.dismiss_stale_reviews,
          restrictsPushes: !!response.restrictions,
          requiredStatusChecks: response.required_status_checks?.contexts || [],
        }],
      };

      logger.debug('Données protection de branche récupérées', {
        owner,
        repo,
        branch,
        protected: true,
      });

      return branchProtectionData;
    } catch (error: any) {
      if (error.status === 404) {
        return { rules: [] };
      }

      logger.error('Erreur récupération protection branche', {
        owner,
        repo,
        error: error.message,
      });
      throw new Error(`Récupération protection branche échouée: ${error.message}`);
    }
  }

  /**
   * Récupère les données de santé communautaire
   * REST: GET /repos/{owner}/{repo}/community/profile
   */
  public async getCommunityHealthData(owner: string, repo: string): Promise<any> {
    try {
      const response = await githubConfig.executeRestRequest(
        `GET /repos/${owner}/${repo}/community/profile`
      );

      const files = response.files || {};
      
      const communityData = {
        healthPercentage: response.health_percentage || 0,
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
    } catch (error: any) {
      if (error.status === 404) {
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
        error: error.message,
      });
      throw new Error(`Récupération santé communautaire échouée: ${error.message}`);
    }
  }

  /**
   * Récupère les données de trafic
   * REST: GET /repos/{owner}/{repo}/traffic/views, /clones, /popular/paths
   */
  public async getTrafficData(owner: string, repo: string): Promise<any> {
    try {
      const [viewsResponse, clonesResponse, pathsResponse] = await Promise.allSettled([
        githubConfig.executeRestRequest(`GET /repos/${owner}/${repo}/traffic/views`),
        githubConfig.executeRestRequest(`GET /repos/${owner}/${repo}/traffic/clones`),
        githubConfig.executeRestRequest(`GET /repos/${owner}/${repo}/traffic/popular/paths`),
      ]);

      const views = viewsResponse.status === 'fulfilled' ? viewsResponse.value : { count: 0, uniques: 0 };
      const clones = clonesResponse.status === 'fulfilled' ? clonesResponse.value : { count: 0, uniques: 0 };
      const paths = pathsResponse.status === 'fulfilled' ? pathsResponse.value : [];

      const trafficData = {
        views: {
          count: views.count || 0,
          uniques: views.uniques || 0,
        },
        clones: {
          count: clones.count || 0,
          uniques: clones.uniques || 0,
        },
        popularPaths: paths.map((path: any) => ({
          path: path.path,
          title: path.title,
          count: path.count,
          uniques: path.uniques,
        })),
      };

      logger.debug('Données trafic récupérées', {
        owner,
        repo,
        views: trafficData.views.count,
        clones: trafficData.clones.count,
      });

      return trafficData;
    } catch (error: any) {
      logger.error('Erreur récupération trafic', {
        owner,
        repo,
        error: error.message,
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
        traffic
      ] = await Promise.allSettled([
        this.getGitHubActionsData(owner, repoName),
        this.getSecurityData(owner, repoName),
        this.getPackagesData(owner, repoName),
        this.getBranchProtectionData(owner, repoName, repo.defaultBranchRef || 'main'),
        this.getCommunityHealthData(owner, repoName),
        this.getTrafficData(owner, repoName),
      ]);

      const enrichedRepo: GitHubRepo = {
        ...repo,
        githubActions: githubActions.status === 'fulfilled' ? githubActions.value : undefined,
        security: security.status === 'fulfilled' ? security.value : undefined,
        packages: packages.status === 'fulfilled' ? packages.value : undefined,
        branchProtection: branchProtection.status === 'fulfilled' ? branchProtection.value : undefined,
        community: community.status === 'fulfilled' ? community.value : undefined,
        traffic: traffic.status === 'fulfilled' ? traffic.value : undefined,
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
        }).filter(key => enrichedRepo[key as keyof GitHubRepo]),
      });

      return enrichedRepo;
    } catch (error: any) {
      logger.error('Erreur enrichissement DevOps', {
        nameWithOwner: repo.nameWithOwner,
        error: error.message,
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