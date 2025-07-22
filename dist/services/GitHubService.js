"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.githubService = exports.GitHubService = void 0;
const github_1 = __importDefault(require("@/config/github"));
const logger_1 = __importDefault(require("@/utils/logger"));
function toGitHubRepo(node) {
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
            nodes: node.languages?.edges?.map((edge) => ({
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
class GitHubService {
    async getUserOrganizations() {
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
            const response = await github_1.default.executeGraphQLQuery(query);
            if (Array.isArray(response.errors) && response.errors.length > 0) {
                throw new Error(`GraphQL errors: ${(response.errors ?? []).map((e) => e.message).join(', ')}`);
            }
            const organizations = response.data?.viewer?.organizations?.nodes ?? [];
            const orgNames = organizations.map((org) => org.login);
            logger_1.default.info('Organisations récupérées', { count: orgNames.length });
            return orgNames;
        }
        catch (_error) {
            logger_1.default.error('Erreur récupération organisations', {
                error: _error.message,
            });
            throw new Error(`Récupération organisations échouée: ${_error.message}`);
        }
    }
    async getUserProfile() {
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
                github_1.default.executeGraphQLQuery(basicQuery),
                github_1.default.executeGraphQLQuery(countersQuery),
                github_1.default.executeGraphQLQuery(orgsQuery),
            ]);
            const responses = [basicResponse, countersResponse, orgsResponse];
            for (const response of responses) {
                if (Array.isArray(response.errors) && response.errors.length > 0) {
                    throw new Error(`GraphQL errors: ${(response.errors ?? []).map((e) => e.message).join(', ')}`);
                }
            }
            const basic = basicResponse.data?.viewer ?? {};
            const counters = countersResponse.data?.viewer ?? {};
            const orgs = orgsResponse.data?.viewer ?? {};
            const userProfile = {
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
                    nodes: orgs.organizations?.nodes?.map((org) => ({
                        login: org.login,
                        name: org.name,
                        description: org.description,
                        avatarUrl: org.avatarUrl,
                    })) ?? [],
                },
            };
            logger_1.default.info('Profil utilisateur récupéré', {
                login: userProfile.login,
                followers: userProfile.followers,
                repositories: userProfile.publicRepos,
            });
            return userProfile;
        }
        catch (_error) {
            logger_1.default.error('Erreur récupération profil utilisateur', {
                error: _error.message,
            });
            throw new Error(`Récupération profil échouée: ${_error.message}`);
        }
    }
    async getUserRepos(cursor) {
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
            const response = await github_1.default.executeGraphQLQuery(query, variables);
            if (Array.isArray(response.errors) && response.errors.length > 0) {
                throw new Error(`GraphQL errors: ${(response.errors ?? []).map((e) => e.message).join(', ')}`);
            }
            const repositories = response.data?.viewer?.repositories?.nodes ?? [];
            const pageInfo = response.data?.viewer?.repositories?.pageInfo;
            const repos = repositories.map((node) => toGitHubRepo(node));
            if (pageInfo?.hasNextPage === true) {
                const nextRepos = await this.getUserRepos(pageInfo.endCursor);
                repos.push(...nextRepos);
            }
            logger_1.default.info('Repositories utilisateur récupérés', {
                count: repos.length,
                hasMore: pageInfo?.hasNextPage,
            });
            return repos;
        }
        catch (_error) {
            logger_1.default.error('Erreur récupération repositories utilisateur', {
                error: _error.message,
            });
            throw new Error(`Récupération repositories échouée: ${_error.message}`);
        }
    }
    async getOrgRepos(orgName, cursor) {
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
            const response = await github_1.default.executeGraphQLQuery(query, variables);
            if (Array.isArray(response.errors) && response.errors.length > 0) {
                throw new Error(`GraphQL errors: ${(response.errors ?? []).map((e) => e.message).join(', ')}`);
            }
            const repositories = response.data?.organization?.repositories?.nodes ?? [];
            const pageInfo = response.data?.organization?.repositories
                ?.pageInfo;
            const repos = repositories.map((node) => toGitHubRepo(node));
            if (pageInfo?.hasNextPage === true) {
                const nextRepos = await this.getOrgRepos(orgName, pageInfo.endCursor);
                repos.push(...nextRepos);
            }
            logger_1.default.info('Repositories organisation récupérés', {
                orgName,
                count: repos.length,
                hasMore: pageInfo?.hasNextPage,
            });
            return repos;
        }
        catch (_error) {
            logger_1.default.error('Erreur récupération repositories organisation', {
                orgName,
                error: _error.message,
            });
            throw new Error(`Récupération repositories organisation échouée: ${_error.message}`);
        }
    }
    async getGitHubActionsData(owner, repo) {
        try {
            const [workflowsResponse, runsResponse] = await Promise.all([
                github_1.default.executeRestRequest(`GET /repos/${owner}/${repo}/actions/workflows`),
                github_1.default.executeRestRequest(`GET /repos/${owner}/${repo}/actions/runs`, {
                    per_page: 20,
                }),
            ]);
            const workflows = workflowsResponse.workflows ?? [];
            const runs = runsResponse.workflow_runs ?? [];
            const successfulRuns = runs.filter((run) => run.conclusion === 'success').length;
            const failedRuns = runs.filter((run) => run.conclusion === 'failure').length;
            const totalRuns = runs.length;
            const successRate = totalRuns > 0 ? Math.round((successfulRuns / totalRuns) * 100) : 0;
            const actionsData = {
                workflowsCount: workflows.length,
                lastRunStatus: runs[0]?.conclusion ?? 'unknown',
                workflows: workflows.map((workflow) => ({
                    name: workflow.name,
                    path: workflow.path,
                    state: workflow.state,
                    createdAt: new Date(workflow.created_at),
                    updatedAt: new Date(workflow.updated_at),
                    lastRunStatus: 'unknown',
                    lastRunDate: new Date(),
                })),
                runs: {
                    totalCount: totalRuns,
                    successful: successfulRuns,
                    failed: failedRuns,
                    successRate,
                },
            };
            logger_1.default.debug('Données GitHub Actions récupérées', {
                owner,
                repo,
                workflowsCount: workflows.length,
                runsCount: totalRuns,
            });
            return actionsData;
        }
        catch (_error) {
            if (typeof _error === 'object' && _error && 'status' in _error && _error.status === 404) {
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
            logger_1.default.error('Erreur récupération GitHub Actions', {
                owner,
                repo,
                error: _error.message,
            });
            throw new Error(`Récupération GitHub Actions échouée: ${_error.message}`);
        }
    }
    async getSecurityData(owner, repo) {
        try {
            const endpoints = [
                `GET /repos/${owner}/${repo}/dependabot/alerts`,
                `GET /repos/${owner}/${repo}/secret-scanning/alerts`,
                `GET /repos/${owner}/${repo}/code-scanning/alerts`,
            ];
            const responses = await Promise.allSettled(endpoints.map((endpoint) => github_1.default.executeRestRequest(endpoint)));
            const dependabotAlerts = responses[0].status === 'fulfilled' ? responses[0].value : [];
            const secretAlerts = responses[1].status === 'fulfilled' ? responses[1].value : [];
            const codeAlerts = responses[2].status === 'fulfilled' ? responses[2].value : [];
            const securityData = {
                dependabotAlerts: {
                    totalCount: dependabotAlerts.length ?? 0,
                    open: Array.isArray(dependabotAlerts)
                        ? dependabotAlerts.filter((alert) => alert.state === 'open')
                            .length
                        : 0,
                    fixed: Array.isArray(dependabotAlerts)
                        ? dependabotAlerts.filter((alert) => alert.state === 'fixed')
                            .length
                        : 0,
                    dismissed: Array.isArray(dependabotAlerts)
                        ? dependabotAlerts.filter((alert) => alert.state === 'dismissed').length
                        : 0,
                },
                secretScanning: {
                    totalCount: secretAlerts.length ?? 0,
                    resolved: Array.isArray(secretAlerts)
                        ? secretAlerts.filter((alert) => alert.state === 'resolved')
                            .length
                        : 0,
                },
                codeScanning: {
                    totalCount: codeAlerts.length ?? 0,
                    open: Array.isArray(codeAlerts)
                        ? codeAlerts.filter((alert) => alert.state === 'open').length
                        : 0,
                    fixed: Array.isArray(codeAlerts)
                        ? codeAlerts.filter((alert) => alert.state === 'fixed').length
                        : 0,
                },
                hasSecurityPolicy: false,
                hasVulnerabilityAlertsEnabled: true,
            };
            logger_1.default.debug('Données sécurité récupérées', {
                owner,
                repo,
                dependabotCount: securityData.dependabotAlerts.totalCount,
                secretCount: securityData.secretScanning.totalCount,
                codeCount: securityData.codeScanning.totalCount,
            });
            return securityData;
        }
        catch (_error) {
            if (typeof _error === 'object' && _error && 'status' in _error && (_error.status === 403 || _error.status === 404)) {
                return {
                    dependabotAlerts: { totalCount: 0, open: 0, fixed: 0, dismissed: 0 },
                    secretScanning: { totalCount: 0, resolved: 0 },
                    codeScanning: { totalCount: 0, open: 0, fixed: 0 },
                    hasSecurityPolicy: false,
                    hasVulnerabilityAlertsEnabled: false,
                };
            }
            logger_1.default.error('Erreur récupération données sécurité', {
                owner,
                repo,
                error: _error.message,
            });
            throw new Error(`Récupération sécurité échouée: ${_error.message}`);
        }
    }
    async getPackagesData(owner, repo) {
        try {
            const response = await github_1.default.executeRestRequest(`GET /users/${owner}/packages`);
            const packages = response ?? [];
            const repoPackages = packages.filter((pkg) => pkg.repository?.name === repo || pkg.name.includes(repo));
            const packageTypes = [
                ...new Set(repoPackages.map((pkg) => pkg.package_type)),
            ];
            const packagesData = {
                totalCount: repoPackages.length,
                types: packageTypes,
            };
            logger_1.default.debug('Données packages récupérées', {
                owner,
                repo,
                count: packagesData.totalCount,
                types: packageTypes,
            });
            return packagesData;
        }
        catch (_error) {
            if (typeof _error === 'object' && _error && 'status' in _error && _error.status === 404) {
                return { totalCount: 0, types: [] };
            }
            logger_1.default.error('Erreur récupération packages', {
                owner,
                repo,
                error: _error.message,
            });
            throw new Error(`Récupération packages échouée: ${_error.message}`);
        }
    }
    async getBranchProtectionData(owner, repo, defaultBranch) {
        try {
            const branch = defaultBranch ?? 'main';
            const response = await github_1.default.executeRestRequest(`GET /repos/${owner}/${repo}/branches/${branch}/protection`);
            const branchProtectionData = {
                rules: [
                    {
                        pattern: branch,
                        requiresStatusChecks: typeof response.required_status_checks === 'object' && response.required_status_checks !== null,
                        requiresCodeOwnerReviews: typeof response.required_pull_request_reviews === 'object' && response.required_pull_request_reviews !== null && response.required_pull_request_reviews.require_code_owner_reviews === true,
                        dismissStaleReviews: typeof response.required_pull_request_reviews === 'object' && response.required_pull_request_reviews !== null && response.required_pull_request_reviews.dismiss_stale_reviews === true,
                        restrictsPushes: typeof response.restrictions === 'object' && response.restrictions !== null,
                        requiredStatusChecks: response.required_status_checks?.contexts ?? [],
                    },
                ],
            };
            logger_1.default.debug('Données protection de branche récupérées', {
                owner,
                repo,
                branch,
                protected: true,
            });
            return branchProtectionData;
        }
        catch (_error) {
            if (typeof _error === 'object' && _error && 'status' in _error && _error.status === 404) {
                return { rules: [] };
            }
            logger_1.default.error('Erreur récupération protection branche', {
                owner,
                repo,
                error: _error.message,
            });
            throw new Error(`Récupération protection branche échouée: ${_error.message}`);
        }
    }
    async getCommunityHealthData(owner, repo) {
        try {
            const response = await github_1.default.executeRestRequest(`GET /repos/${owner}/${repo}/community/profile`);
            const files = response.files?.files ?? {};
            const communityData = {
                healthPercentage: response.health_percentage ?? 0,
                hasReadme: !!files.readme,
                hasLicense: !!files.license,
                hasContributing: !!files.contributing,
                hasCodeOfConduct: !!files.code_of_conduct,
                hasIssueTemplate: !!files.issue_template,
                hasPullRequestTemplate: !!files.pull_request_template,
            };
            logger_1.default.debug('Données santé communautaire récupérées', {
                owner,
                repo,
                healthPercentage: communityData.healthPercentage,
            });
            return communityData;
        }
        catch (_error) {
            if (typeof _error === 'object' && _error && 'status' in _error && _error.status === 404) {
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
            logger_1.default.error('Erreur récupération santé communautaire', {
                owner,
                repo,
                error: _error.message,
            });
            throw new Error(`Récupération santé communautaire échouée: ${_error.message}`);
        }
    }
    async getTrafficData(owner, repo) {
        try {
            const [viewsResponse, clonesResponse, pathsResponse] = await Promise.allSettled([
                github_1.default.executeRestRequest(`GET /repos/${owner}/${repo}/traffic/views`),
                github_1.default.executeRestRequest(`GET /repos/${owner}/${repo}/traffic/clones`),
                github_1.default.executeRestRequest(`GET /repos/${owner}/${repo}/traffic/popular/paths`),
            ]);
            const views = viewsResponse.status === 'fulfilled'
                ? viewsResponse.value
                : { count: 0, uniques: 0 };
            const clones = clonesResponse.status === 'fulfilled'
                ? clonesResponse.value
                : { count: 0, uniques: 0 };
            const paths = pathsResponse.status === 'fulfilled' ? pathsResponse.value : [];
            let popularPaths = [];
            if (paths != null &&
                typeof paths === 'object' &&
                Object.prototype.hasOwnProperty.call(paths, 'paths') &&
                Array.isArray(paths.paths)) {
                popularPaths = paths.paths.map(({ path, title, count, uniques }) => ({ path, title, count, uniques }));
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
            logger_1.default.debug('Données trafic récupérées', {
                owner,
                repo,
                views: trafficData.views.count,
                clones: trafficData.clones.count,
            });
            return trafficData;
        }
        catch (_error) {
            logger_1.default.error('Erreur récupération trafic', {
                owner,
                repo,
                error: _error.message,
            });
            return {
                views: { count: 0, uniques: 0 },
                clones: { count: 0, uniques: 0 },
                popularPaths: [],
            };
        }
    }
    async enrichWithDevOpsData(repo) {
        const [owner, repoName] = repo.nameWithOwner.split('/');
        try {
            logger_1.default.info('Début enrichissement DevOps', {
                nameWithOwner: repo.nameWithOwner,
            });
            const [githubActions, security, packages, branchProtection, community, traffic,] = await Promise.allSettled([
                this.getGitHubActionsData(owner, repoName),
                this.getSecurityData(owner, repoName),
                this.getPackagesData(owner, repoName),
                this.getBranchProtectionData(owner, repoName, repo.defaultBranchRef ?? 'main'),
                this.getCommunityHealthData(owner, repoName),
                this.getTrafficData(owner, repoName),
            ]);
            const enrichedRepo = {
                ...repo,
                githubActions: githubActions.status === 'fulfilled' &&
                    isValidGitHubActions(githubActions.value)
                    ? githubActions.value
                    : undefined,
                security: security.status === 'fulfilled' &&
                    isValidGitHubSecurity(security.value)
                    ? security.value
                    : undefined,
                packages: packages.status === 'fulfilled' &&
                    isValidGitHubPackages(packages.value)
                    ? packages.value
                    : undefined,
                branchProtection: branchProtection.status === 'fulfilled' &&
                    isValidGitHubBranchProtection(branchProtection.value)
                    ? branchProtection.value
                    : undefined,
                community: community.status === 'fulfilled' &&
                    isValidGitHubCommunity(community.value)
                    ? community.value
                    : undefined,
                traffic: traffic.status === 'fulfilled' && isValidGitHubTraffic(traffic.value)
                    ? traffic.value
                    : undefined,
            };
            logger_1.default.info('Enrichissement DevOps terminé', {
                nameWithOwner: repo.nameWithOwner,
                enrichedFields: Object.keys({
                    githubActions: enrichedRepo.githubActions,
                    security: enrichedRepo.security,
                    packages: enrichedRepo.packages,
                    branchProtection: enrichedRepo.branchProtection,
                    community: enrichedRepo.community,
                    traffic: enrichedRepo.traffic,
                }).filter((key) => Boolean(enrichedRepo[key])),
            });
            return enrichedRepo;
        }
        catch (_error) {
            logger_1.default.error('Erreur enrichissement DevOps', {
                nameWithOwner: repo.nameWithOwner,
                error: _error.message,
            });
            return repo;
        }
    }
    sanitizeDescription(description) {
        if (!description)
            return '';
        return description
            .replace(/[\r\n\t]/g, ' ')
            .trim()
            .substring(0, 500);
    }
}
exports.GitHubService = GitHubService;
function isValidGitHubActions(obj) {
    return (obj !== null &&
        typeof obj === 'object' &&
        Object.prototype.hasOwnProperty.call(obj, 'workflowsCount') &&
        Object.prototype.hasOwnProperty.call(obj, 'workflows') &&
        Object.prototype.hasOwnProperty.call(obj, 'runs'));
}
function isValidGitHubSecurity(obj) {
    return (obj !== null &&
        typeof obj === 'object' &&
        Object.prototype.hasOwnProperty.call(obj, 'dependabotAlerts') &&
        Object.prototype.hasOwnProperty.call(obj, 'secretScanning') &&
        Object.prototype.hasOwnProperty.call(obj, 'codeScanning'));
}
function isValidGitHubPackages(obj) {
    return (obj !== null &&
        typeof obj === 'object' &&
        Object.prototype.hasOwnProperty.call(obj, 'totalCount') &&
        Object.prototype.hasOwnProperty.call(obj, 'types'));
}
function isValidGitHubBranchProtection(obj) {
    return (obj !== null &&
        typeof obj === 'object' &&
        Object.prototype.hasOwnProperty.call(obj, 'rules'));
}
function isValidGitHubCommunity(obj) {
    return (obj !== null &&
        typeof obj === 'object' &&
        Object.prototype.hasOwnProperty.call(obj, 'healthPercentage') &&
        Object.prototype.hasOwnProperty.call(obj, 'hasReadme'));
}
function isValidGitHubTraffic(obj) {
    return (obj !== null &&
        typeof obj === 'object' &&
        Object.prototype.hasOwnProperty.call(obj, 'views') &&
        Object.prototype.hasOwnProperty.call(obj, 'clones') &&
        Object.prototype.hasOwnProperty.call(obj, 'popularPaths'));
}
exports.githubService = new GitHubService();
//# sourceMappingURL=GitHubService.js.map