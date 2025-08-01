import { Request, Response } from 'express';
import { asyncHandler, createError } from '@/middleware';
import { logWithContext } from '@/utils/logger';
import { AuthenticatedUser, GitHubRepo } from '@/types';
import { UserModel, RepositoryModel } from '@/models';
import { GitHubService } from '@/services';
import { UserController } from '@/controllers';
import {
  REPO_MESSAGES,
  REPO_LOG_MESSAGES,
  REPO_RESPONSE_FIELDS,
  REPO_STATUS_VALUES,
  REPO_STATUS_CODES,
  REPO_CONSTANTS,
} from '@/constants';

const collectionStatusMap = new Map<
  string,
  {
    status: string;
    progressPercentage: number;
    startedAt: Date;
    completedAt?: Date;
    estimatedCompletion?: Date;
    currentStep: number;
    totalSteps: number;
    error?: string;
  }
>();

export class RepoController {
  static collectRepositoriesData = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { username } = req.params;
      const authenticatedUser = req.user as AuthenticatedUser;

      if (authenticatedUser == null) {
        throw createError.authentication(REPO_MESSAGES.AUTHENTICATION_REQUIRED);
      }

      if (authenticatedUser.username !== username) {
        throw createError.authorization(REPO_MESSAGES.AUTHORIZATION_DENIED);
      }

      logWithContext.api(REPO_LOG_MESSAGES.COLLECT_REPOSITORIES_DATA, req.path, true, {
        [REPO_RESPONSE_FIELDS.TARGET_USERNAME]: username,
        [REPO_RESPONSE_FIELDS.REQUESTER_ID]: authenticatedUser.id,
      });

      this.updateCollectionStatus(username, {
        status: REPO_STATUS_VALUES.IN_PROGRESS,
        progressPercentage: 0,
        startedAt: new Date(),
        currentStep: 1,
        totalSteps: 3,
        estimatedCompletion: new Date(Date.now() + 5 * 60 * 1000),
      });

      res.status(REPO_STATUS_CODES.ACCEPTED).json({
        [REPO_RESPONSE_FIELDS.MESSAGE]: 'Repository collection started',
        [REPO_RESPONSE_FIELDS.STATUS]: REPO_STATUS_VALUES.IN_PROGRESS,
        [REPO_RESPONSE_FIELDS.SUMMARY]: {
          [REPO_RESPONSE_FIELDS.USERNAME]: username,
          [REPO_RESPONSE_FIELDS.MESSAGE]:
            'Collection in progress. Use GET /repositories/{username}/status to check progress.',
        },
        [REPO_RESPONSE_FIELDS.METADATA]: {
          [REPO_RESPONSE_FIELDS.STARTED_AT]: new Date().toISOString(),
          [REPO_RESPONSE_FIELDS.ESTIMATED_COMPLETION]: new Date(
            Date.now() + 5 * 60 * 1000
          ).toISOString(),
          [REPO_RESPONSE_FIELDS.CURRENT_STEP]: 1,
          [REPO_RESPONSE_FIELDS.TOTAL_STEPS]: 3,
        },
        [REPO_RESPONSE_FIELDS.TIMESTAMP]: new Date().toISOString(),
      });

      this.collectRepositoriesBackground(authenticatedUser.githubToken, username);
    }
  );

  private static async collectRepositoriesBackground(
    githubToken: string,
    username: string
  ): Promise<void> {
    try {
      this.updateCollectionStatus(username, {
        status: REPO_STATUS_VALUES.IN_PROGRESS,
        progressPercentage: 33,
        startedAt: new Date(),
        currentStep: 2,
        totalSteps: 3,
        estimatedCompletion: new Date(Date.now() + 3 * 60 * 1000),
      });

      // Get user data to obtain proper user ID - with non-blocking error handling
      let savedUser;
      try {
        const result = await UserController.collectUserDataInternal(githubToken);
        savedUser = result.savedUser;
      } catch (error) {
        logWithContext.api('user_data_collection_failed_continue', 'background', false, {
          [REPO_RESPONSE_FIELDS.TARGET_USERNAME]: username,
          [REPO_RESPONSE_FIELDS.ERROR]: String(error),
          nonBlocking: true,
          message: 'User data collection failed but repository collection continues',
        });

        // Try to find existing user in database or create minimal user entry
        try {
          const existingUser = await UserModel.findByLogin(username);
          if (existingUser) {
            savedUser = existingUser;
            logWithContext.api('existing_user_found_fallback', 'background', true, {
              [REPO_RESPONSE_FIELDS.TARGET_USERNAME]: username,
              userId: existingUser.id,
              nonBlocking: true,
            });
          } else {
            // Create minimal user entry to continue with repository collection
            const githubService = await GitHubService.create(githubToken);
            const basicProfile = await githubService.getUserProfile();
            savedUser = await UserModel.upsert(basicProfile);

            logWithContext.api('minimal_user_created_fallback', 'background', true, {
              [REPO_RESPONSE_FIELDS.TARGET_USERNAME]: username,
              userId: savedUser.id,
              nonBlocking: true,
            });
          }
        } catch (fallbackError) {
          logWithContext.api('user_fallback_failed', 'background', false, {
            [REPO_RESPONSE_FIELDS.TARGET_USERNAME]: username,
            [REPO_RESPONSE_FIELDS.ERROR]: String(fallbackError),
            originalError: String(error),
            nonBlocking: true,
            message: 'All user data collection attempts failed, aborting repository collection',
          });

          // If we can't get any user data, we can't proceed with repository collection
          throw new Error(`Cannot proceed with repository collection: ${String(fallbackError)}`);
        }
      }

      const { enrichedRepositories, organizations } = await this.collectRepositoriesInternal(
        githubToken,
        username
      );

      this.updateCollectionStatus(username, {
        status: REPO_STATUS_VALUES.IN_PROGRESS,
        progressPercentage: 66,
        startedAt: new Date(),
        currentStep: 3,
        totalSteps: 3,
        estimatedCompletion: new Date(Date.now() + 1 * 60 * 1000),
      });

      for (const repo of enrichedRepositories) {
        await RepositoryModel.upsert(repo, savedUser.id);
      }

      this.updateCollectionStatus(username, {
        status: REPO_STATUS_VALUES.COMPLETED,
        progressPercentage: 100,
        startedAt: new Date(),
        completedAt: new Date(),
        currentStep: 3,
        totalSteps: 3,
      });

      logWithContext.api(REPO_LOG_MESSAGES.REPOSITORIES_ENRICHED_SUCCESS, 'background', true, {
        [REPO_RESPONSE_FIELDS.REPOSITORIES_COUNT]: enrichedRepositories.length,
        [REPO_RESPONSE_FIELDS.USERNAME]: username,
      });

      logWithContext.api(REPO_LOG_MESSAGES.COLLECT_REPOSITORIES_SUCCESS, 'background', true, {
        [REPO_RESPONSE_FIELDS.TARGET_USERNAME]: username,
        [REPO_RESPONSE_FIELDS.REPOSITORIES_COUNT]: enrichedRepositories.length,
        [REPO_RESPONSE_FIELDS.ORGANIZATIONS_COUNT]: organizations.length,
      });
    } catch (error) {
      this.updateCollectionStatus(username, {
        status: REPO_STATUS_VALUES.FAILED,
        progressPercentage: 0,
        startedAt: new Date(),
        error: (error as Error).message,
        completedAt: new Date(),
        currentStep: 1,
        totalSteps: 3,
      });

      logWithContext.api(REPO_LOG_MESSAGES.COLLECT_REPOSITORIES_ERROR, 'background', false, {
        [REPO_RESPONSE_FIELDS.TARGET_USERNAME]: username,
        [REPO_RESPONSE_FIELDS.ERROR]: String(error),
      });
    }
  }

  static async collectRepositoriesInternal(
    githubToken: string,
    username: string
  ): Promise<{ enrichedRepositories: GitHubRepo[]; organizations: string[] }> {
    const githubService = await GitHubService.create(githubToken);

    // STEP 1: Get user profile context first for detailed requests
    let userProfile: import('@/types').UserProfile | undefined;
    try {
      userProfile = await githubService.getUserProfile();

      logWithContext.api('user_profile_context_retrieved', 'internal', true, {
        [REPO_RESPONSE_FIELDS.USERNAME]: username,
        login: userProfile.login,
        publicRepos: userProfile.public_repos,
        organizationsCount: userProfile.organizations?.totalCount ?? 0,
      });
    } catch (error) {
      logWithContext.api('user_profile_context_failed', 'internal', false, {
        [REPO_RESPONSE_FIELDS.USERNAME]: username,
        [REPO_RESPONSE_FIELDS.ERROR]: String(error),
        nonBlocking: true,
      });
    }

    // STEP 2: Get ALL organizations with verification (GraphQL + REST fallback)
    const organizations = await githubService.getUserOrganizations();

    logWithContext.api('organizations_discovery_completed', 'internal', true, {
      [REPO_RESPONSE_FIELDS.USERNAME]: username,
      organizationsCount: organizations.length,
      organizations,
      source: 'verified_complete',
    });

    // STEP 3: Get user repositories with context-aware requests
    const allRepositories = await githubService.getUserRepos();

    logWithContext.api('user_repositories_discovery_completed', 'internal', true, {
      [REPO_RESPONSE_FIELDS.USERNAME]: username,
      userRepositoriesCount: allRepositories.length,
      source: allRepositories.length > 0 ? 'api_successful' : 'fallback_or_empty',
    });

    // STEP 4: Process organization repositories with user context
    const userFullName = userProfile?.name ?? process.env.GITHUB_FULL_NAME ?? '';
    let totalOrgReposProcessed = 0;
    let totalOrgReposFiltered = 0;

    for (const orgName of organizations) {
      logWithContext.api('organization_processing_started', 'internal', true, {
        [REPO_RESPONSE_FIELDS.ORG_NAME]: orgName,
        [REPO_RESPONSE_FIELDS.USERNAME]: username,
        organizationIndex: organizations.indexOf(orgName) + 1,
        totalOrganizations: organizations.length,
      });

      const orgRepos = await githubService.getOrgRepos(orgName);
      totalOrgReposProcessed += orgRepos.length;

      // STRICT filtering with enhanced context from user profile
      const userOrgRepos = orgRepos.filter(repo => {
        // 1. Check if user is the owner of the repository
        const isOwner = repo.owner.login === username;

        // 2. Check if user has recent commits in this repository
        const hasCommits = repo.commits.recent.some(commit => {
          const commitAuthorLogin = commit.author.login;
          const commitAuthorName = commit.author.name;

          return Boolean(
            commitAuthorLogin === username ||
            (userFullName !== '' && commitAuthorName === userFullName) ||
            (userProfile?.name != null && userProfile.name !== '' && commitAuthorName === userProfile.name)
          );
        });

        // 3. Check if user has recent Pull Requests in this repository
        const hasPullRequests = repo.recentPullRequests.some(pr => {
          return pr.author.login === username;
        });

        // 4. Check if repository name mentions the user (username/fullname in repository name)
        const repoName = repo.name.toLowerCase();
        const repoNameWithOwner = repo.nameWithOwner.toLowerCase();
        const usernameLower = username.toLowerCase();
        const fullNameLower = userFullName.toLowerCase();
        const profileNameLower = (userProfile?.name ?? '').toLowerCase();

        const hasMentionInName =
          repoName.includes(usernameLower) ||
          repoNameWithOwner.includes(usernameLower) ||
          (userFullName !== '' && repoName.includes(fullNameLower)) ||
          (userFullName !== '' && repoNameWithOwner.includes(fullNameLower)) ||
          (profileNameLower !== '' && repoName.includes(profileNameLower)) ||
          (profileNameLower !== '' && repoNameWithOwner.includes(profileNameLower));

        // STRICT: Only include if user has actually contributed or is mentioned
        // Include repositories where user: owns, has commits, has PRs, or is mentioned in name
        const hasActualContribution = isOwner || hasCommits || hasPullRequests || hasMentionInName;

        return hasActualContribution;
      });

      totalOrgReposFiltered += userOrgRepos.length;

      logWithContext.api('organization_repositories_filtered', 'internal', true, {
        [REPO_RESPONSE_FIELDS.ORG_NAME]: orgName,
        totalOrgRepos: orgRepos.length,
        filteredUserRepos: userOrgRepos.length,
        filterRatio: orgRepos.length > 0 ? Math.round((userOrgRepos.length / orgRepos.length) * 100) : 0,
        [REPO_RESPONSE_FIELDS.USERNAME]: username,
        filterCriteria: 'strict_contribution_with_context',
        userContext: {
          hasProfileName: Boolean(userProfile?.name != null && userProfile.name !== ''),
          hasFullName: Boolean(userFullName !== ''),
        },
      });

      allRepositories.push(...userOrgRepos);
    }

    // STEP 5: Log comprehensive discovery summary
    logWithContext.api('repository_discovery_summary', 'internal', true, {
      [REPO_RESPONSE_FIELDS.USERNAME]: username,
      userRepositories: allRepositories.length - totalOrgReposFiltered,
      organizationRepositories: totalOrgReposFiltered,
      totalRepositories: allRepositories.length,
      organizationsProcessed: organizations.length,
      totalOrgReposProcessed,
      totalOrgReposFiltered,
      discoveryComplete: true,
    });

    // STEP 6: Enrich repositories with DevOps data using Promise.allSettled to prevent blocking
    const enrichmentResults = await Promise.allSettled(
      allRepositories.map(async repo => {
        try {
          return await githubService.enrichWithDevOpsData(repo);
        } catch (error) {
          logWithContext.api(REPO_LOG_MESSAGES.ENRICH_REPO_ERROR, 'internal', false, {
            [REPO_RESPONSE_FIELDS.REPO]: repo.nameWithOwner,
            [REPO_RESPONSE_FIELDS.ERROR]: String(error),
            nonBlocking: true,
          });

          // Return non-enriched repo on error - continue processing
          return repo;
        }
      })
    );

    // Extract successful results and log any failures
    const enrichedRepositories: GitHubRepo[] = [];
    let failedEnrichments = 0;

    enrichmentResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        enrichedRepositories.push(result.value);
      } else {
        failedEnrichments++;
        logWithContext.api(REPO_LOG_MESSAGES.ENRICH_REPO_ERROR, 'internal', false, {
          [REPO_RESPONSE_FIELDS.REPO]: allRepositories[index]?.nameWithOwner ?? 'unknown',
          [REPO_RESPONSE_FIELDS.ERROR]: String(result.reason),
          nonBlocking: true,
        });

        // Still include the non-enriched repository
        enrichedRepositories.push(allRepositories[index]);
      }
    });

    if (failedEnrichments > 0) {
      logWithContext.api('repository_enrichment_partial_failure', 'internal', true, {
        [REPO_RESPONSE_FIELDS.TARGET_USERNAME]: username,
        successfulEnrichments: enrichedRepositories.length - failedEnrichments,
        failedEnrichments,
        totalRepositories: allRepositories.length,
        nonBlocking: true,
      });
    }

    logWithContext.api(REPO_LOG_MESSAGES.REPOSITORIES_ENRICHED_SUCCESS, 'internal', true, {
      [REPO_RESPONSE_FIELDS.TARGET_USERNAME]: username,
      [REPO_RESPONSE_FIELDS.REPOSITORIES_COUNT]: enrichedRepositories.length,
      successfulEnrichments: enrichedRepositories.length - failedEnrichments,
      failedEnrichments,
    });

    return { enrichedRepositories, organizations };
  }

  static getUserRepositories = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { username } = req.params;
    const authenticatedUser = req.user as AuthenticatedUser;

    logWithContext.api(REPO_LOG_MESSAGES.GET_USER_REPOSITORIES, req.path, true, {
      [REPO_RESPONSE_FIELDS.TARGET_USERNAME]: username,
      [REPO_RESPONSE_FIELDS.REQUESTER_ID]: authenticatedUser?.id,
      [REPO_RESPONSE_FIELDS.IS_AUTHENTICATED]: authenticatedUser != null,
    });

    try {
      const userData = await UserModel.findByLogin(username);

      if (userData == null) {
        throw createError.notFound(REPO_MESSAGES.NO_DATA_FOUND);
      }

      const repositoriesResult = await RepositoryModel.findByUserId(userData.id, {
        // No limit - return ALL repositories for this user
        limit: undefined,
        includePrivate: true,
        sortBy: REPO_STATUS_VALUES.UPDATED,
        sortOrder: REPO_STATUS_VALUES.DESC,
      });

      const repositories = repositoriesResult.repositories;

      if (repositories.length === 0) {
        const responseData = {
          [REPO_RESPONSE_FIELDS.REPOSITORIES]: [],
          [REPO_RESPONSE_FIELDS.METADATA]: {
            [REPO_RESPONSE_FIELDS.USERNAME]: username,
            [REPO_RESPONSE_FIELDS.DATA_SOURCE]: REPO_STATUS_VALUES.DATABASE,
            [REPO_RESPONSE_FIELDS.IS_EMPTY]: true,
            [REPO_RESPONSE_FIELDS.MESSAGE]: REPO_MESSAGES.NO_REPOSITORY_FOUND,
          },
          [REPO_RESPONSE_FIELDS.TIMESTAMP]: new Date().toISOString(),
        };

        res.status(REPO_STATUS_CODES.OK).json(responseData);
        return;
      }

      let filteredRepositories = repositories;

      if (authenticatedUser?.username !== username) {
        filteredRepositories = repositories.filter(repo => !repo.isPrivate);
      }

      const analytics = this.calculateAnalyticsFromStoredData(
        filteredRepositories as unknown as GitHubRepo[]
      );

      const responseData = {
        [REPO_RESPONSE_FIELDS.REPOSITORIES]: filteredRepositories,
        [REPO_RESPONSE_FIELDS.ANALYTICS]: analytics,
        [REPO_RESPONSE_FIELDS.METADATA]: {
          [REPO_RESPONSE_FIELDS.USERNAME]: username,
          [REPO_RESPONSE_FIELDS.DATA_SOURCE]: REPO_STATUS_VALUES.DATABASE,
          [REPO_RESPONSE_FIELDS.ACCESS_LEVEL]:
            authenticatedUser?.username === username
              ? REPO_STATUS_VALUES.FULL
              : REPO_STATUS_VALUES.PUBLIC,
          [REPO_RESPONSE_FIELDS.REPOSITORIES_COUNT]: filteredRepositories.length,
        },
        [REPO_RESPONSE_FIELDS.TIMESTAMP]: new Date().toISOString(),
      };

      logWithContext.api(REPO_LOG_MESSAGES.GET_USER_REPOSITORIES_SUCCESS, req.path, true, {
        [REPO_RESPONSE_FIELDS.TARGET_USERNAME]: username,
        [REPO_RESPONSE_FIELDS.HAS_FULL_ACCESS]: authenticatedUser?.username === username,
        [REPO_RESPONSE_FIELDS.REPOSITORIES_COUNT]: filteredRepositories.length,
      });

      res.status(REPO_STATUS_CODES.OK).json(responseData);
    } catch (error) {
      if (error instanceof Error && error.message.includes(REPO_MESSAGES.NO_DATA_FOUND_PATTERN)) {
        throw error;
      }

      logWithContext.api(REPO_LOG_MESSAGES.GET_USER_REPOSITORIES_ERROR, req.path, false, {
        [REPO_RESPONSE_FIELDS.TARGET_USERNAME]: username,
        [REPO_RESPONSE_FIELDS.ERROR]: String(error),
      });

      throw createError.externalService(REPO_MESSAGES.DATABASE_SERVICE, error as Error);
    }
  });

  private static calculateLanguageAnalytics(repositories: GitHubRepo[]): Record<string, unknown> {
    const languageStats: Record<
      string,
      { totalSize: number; repoCount: number; percentage: number }
    > = {};
    let totalSize = 0;

    repositories.forEach(repo => {
      repo.languages.nodes.forEach(lang => {
        languageStats[lang.name] ??= { totalSize: 0, repoCount: 0, percentage: 0 };
        languageStats[lang.name].totalSize += lang.size;
        languageStats[lang.name].repoCount += 1;
        totalSize += lang.size;
      });
    });

    Object.keys(languageStats).forEach(lang => {
      languageStats[lang].percentage =
        Math.round(
          (languageStats[lang].totalSize / totalSize) *
          REPO_CONSTANTS.PERCENTAGE_MULTIPLIER *
          REPO_CONSTANTS.PERCENTAGE_MULTIPLIER
        ) / REPO_CONSTANTS.PERCENTAGE_MULTIPLIER;
    });

    const sortedLanguages = Object.entries(languageStats)
      .sort(([, a], [, b]) => b.totalSize - a.totalSize)
      .slice(0, REPO_CONSTANTS.TOP_LANGUAGES_LIMIT);

    return {
      totalLanguages: Object.keys(languageStats).length,
      totalSize,
      languages: Object.fromEntries(sortedLanguages),
      topLanguages: sortedLanguages
        .slice(0, REPO_CONSTANTS.TOP_LANGUAGES_DISPLAY)
        .map(([name, stats]) => ({ name, ...stats })),
    };
  }

  private static calculateTopicsAnalytics(repositories: GitHubRepo[]): Record<string, unknown> {
    const topicStats: Record<string, number> = {};

    repositories.forEach(repo => {
      repo.topics.forEach(topic => {
        topicStats[topic] = (topicStats[topic] || 0) + 1;
      });
    });

    const sortedTopics = Object.entries(topicStats)
      .sort(([, a], [, b]) => b - a)
      .slice(0, REPO_CONSTANTS.TOP_TOPICS_LIMIT);

    return {
      totalTopics: Object.keys(topicStats).length,
      repositoriesWithTopics: repositories.filter(r => r.topics.length > 0).length,
      topics: Object.fromEntries(sortedTopics),
      topTopics: sortedTopics
        .slice(0, REPO_CONSTANTS.TOP_TOPICS_DISPLAY)
        .map(([name, count]) => ({ name, count })),
    };
  }

  private static calculateAnalyticsFromStoredData(
    repositories: GitHubRepo[]
  ): Record<string, unknown> {
    const validRepositories = repositories.filter(
      (repo): repo is GitHubRepo =>
        Boolean(repo) &&
        typeof repo === 'object' &&
        'nameWithOwner' in repo &&
        typeof repo.nameWithOwner === 'string' &&
        'stargazerCount' in repo &&
        typeof repo.stargazerCount === 'number'
    );

    if (validRepositories.length === 0) {
      return {
        totalStats: {
          totalRepositories: 0,
          totalStars: 0,
          totalForks: 0,
          totalWatchers: 0,
          totalIssues: 0,
          totalPullRequests: 0,
          totalCommits: 0,
          totalReleases: 0,
          totalDeployments: 0,
          repositoriesWithActions: 0,
          repositoriesWithSecurity: 0,
          repositoriesWithPackages: 0,
          repositoriesWithProtection: 0,
          averageCommunityHealth: 0,
        },
        languageAnalytics: {},
        topicsAnalytics: {},
        devOpsMaturity: {
          cicdAdoption: 0,
          securityMaturity: 0,
          branchProtectionRate: 0,
          averageCommunityHealth: 0,
        },
      };
    }

    const totalStats = {
      totalRepositories: validRepositories.length,
      totalStars: validRepositories.reduce((sum, r) => sum + (r.stargazerCount || 0), 0),
      totalForks: validRepositories.reduce((sum, r) => sum + (r.forkCount || 0), 0),
      totalWatchers: validRepositories.reduce((sum, r) => sum + (r.watchersCount || 0), 0),
      totalIssues: validRepositories.reduce((sum, r) => sum + (r.issues?.totalCount || 0), 0),
      totalPullRequests: validRepositories.reduce(
        (sum, r) => sum + (r.pullRequests?.totalCount || 0),
        0
      ),
      totalCommits: validRepositories.reduce((sum, r) => sum + (r.commits?.totalCount || 0), 0),
      totalReleases: validRepositories.reduce((sum, r) => sum + (r.releases?.totalCount || 0), 0),
      totalDeployments: validRepositories.reduce(
        (sum, r) => sum + (r.deployments?.totalCount || 0),
        0
      ),
      repositoriesWithActions: validRepositories.filter(
        r => (r.githubActions?.workflowsCount ?? 0) > 0
      ).length,
      repositoriesWithSecurity: validRepositories.filter(
        r => (r.security?.dependabotAlerts?.totalCount ?? 0) > 0
      ).length,
      repositoriesWithPackages: validRepositories.filter(r => (r.packages?.totalCount ?? 0) > 0)
        .length,
      repositoriesWithProtection: validRepositories.filter(
        r => (r.branchProtection?.rules?.length ?? 0) > 0
      ).length,
      averageCommunityHealth:
        Math.round(
          validRepositories.reduce((sum, r) => sum + (r.community?.healthPercentage ?? 0), 0) /
          validRepositories.length
        ) || 0,
    };

    const languageStats = this.calculateLanguageAnalytics(validRepositories);

    const topicStats = this.calculateTopicsAnalytics(validRepositories);

    const devOpsMaturity = {
      cicdAdoption:
        totalStats.totalRepositories > 0
          ? (totalStats.repositoriesWithActions / totalStats.totalRepositories) *
          REPO_CONSTANTS.PERCENTAGE_MULTIPLIER
          : 0,
      securityMaturity:
        totalStats.totalRepositories > 0
          ? (totalStats.repositoriesWithSecurity / totalStats.totalRepositories) *
          REPO_CONSTANTS.PERCENTAGE_MULTIPLIER
          : 0,
      branchProtectionRate:
        totalStats.totalRepositories > 0
          ? (totalStats.repositoriesWithProtection / totalStats.totalRepositories) *
          REPO_CONSTANTS.PERCENTAGE_MULTIPLIER
          : 0,
      averageCommunityHealth: totalStats.averageCommunityHealth,
    };

    return {
      totalStats,
      languageAnalytics: languageStats,
      topicsAnalytics: topicStats,
      devOpsMaturity,
    };
  }

  static deleteUserRepositories = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { username } = req.params;
      const authenticatedUser = req.user as AuthenticatedUser;

      if (authenticatedUser == null) {
        throw createError.authentication(REPO_MESSAGES.AUTHENTICATION_REQUIRED);
      }

      if (authenticatedUser.username !== username) {
        throw createError.authorization(REPO_MESSAGES.AUTHORIZATION_DENIED);
      }

      logWithContext.api(REPO_LOG_MESSAGES.DELETE_USER_REPOSITORIES, req.path, true, {
        [REPO_RESPONSE_FIELDS.TARGET_USERNAME]: username,
        [REPO_RESPONSE_FIELDS.REQUESTER_ID]: authenticatedUser.id,
      });

      try {
        const userData = await UserModel.findByLogin(username);

        if (userData == null) {
          throw createError.notFound(REPO_MESSAGES.NO_DATA_FOUND);
        }

        const repositoriesResult = await RepositoryModel.findByUserId(userData.id, {
          // No limit - get ALL repositories for deletion count
          limit: undefined,
          includePrivate: true,
          sortBy: REPO_STATUS_VALUES.UPDATED,
          sortOrder: REPO_STATUS_VALUES.DESC,
        });

        const repositories = repositoriesResult.repositories;

        if (repositories.length === 0) {
          const responseData = {
            [REPO_RESPONSE_FIELDS.MESSAGE]: REPO_MESSAGES.NO_REPOSITORY_FOUND,
            [REPO_RESPONSE_FIELDS.STATUS]: REPO_STATUS_VALUES.COMPLETED,
            [REPO_RESPONSE_FIELDS.SUMMARY]: {
              [REPO_RESPONSE_FIELDS.USERNAME]: username,
              [REPO_RESPONSE_FIELDS.REPOSITORIES_COUNT]: 0,
              [REPO_RESPONSE_FIELDS.DATA_FRESHNESS]: REPO_STATUS_VALUES.DATABASE,
            },
            [REPO_RESPONSE_FIELDS.METADATA]: {
              [REPO_RESPONSE_FIELDS.COLLECTED_AT]: new Date().toISOString(),
            },
            [REPO_RESPONSE_FIELDS.TIMESTAMP]: new Date().toISOString(),
          };

          res.status(REPO_STATUS_CODES.OK).json(responseData);
          return;
        }

        await RepositoryModel.deleteByUserId(userData.id);

        logWithContext.api(REPO_LOG_MESSAGES.DELETE_USER_REPOSITORIES_SUCCESS, req.path, true, {
          [REPO_RESPONSE_FIELDS.TARGET_USERNAME]: username,
          [REPO_RESPONSE_FIELDS.REPOSITORIES_COUNT]: repositories.length,
        });

        res.status(REPO_STATUS_CODES.OK).json({
          [REPO_RESPONSE_FIELDS.MESSAGE]: REPO_MESSAGES.DELETION_SUCCESSFUL,
          [REPO_RESPONSE_FIELDS.STATUS]: REPO_STATUS_VALUES.COMPLETED,
          [REPO_RESPONSE_FIELDS.SUMMARY]: {
            [REPO_RESPONSE_FIELDS.USERNAME]: username,
            [REPO_RESPONSE_FIELDS.REPOSITORIES_COUNT]: repositories.length,
            [REPO_RESPONSE_FIELDS.DATA_FRESHNESS]: REPO_STATUS_VALUES.DATABASE,
          },
          [REPO_RESPONSE_FIELDS.METADATA]: {
            [REPO_RESPONSE_FIELDS.COLLECTED_AT]: new Date().toISOString(),
          },
          [REPO_RESPONSE_FIELDS.TIMESTAMP]: new Date().toISOString(),
        });
      } catch (error) {
        if (error instanceof Error && error.message.includes(REPO_MESSAGES.NO_DATA_FOUND_PATTERN)) {
          throw error;
        }

        logWithContext.api(REPO_LOG_MESSAGES.DELETE_USER_REPOSITORIES_ERROR, req.path, false, {
          [REPO_RESPONSE_FIELDS.TARGET_USERNAME]: username,
          [REPO_RESPONSE_FIELDS.ERROR]: String(error),
        });

        throw createError.externalService(REPO_MESSAGES.DATABASE_SERVICE, error as Error);
      }
    }
  );

  /**
   * Updates the collection status for a specific username.
   * @param username The username for whom to update the status.
   * @param status The new status object.
   */
  private static updateCollectionStatus(
    username: string,
    status: {
      status: string;
      progressPercentage: number;
      startedAt: Date;
      completedAt?: Date;
      estimatedCompletion?: Date;
      currentStep: number;
      totalSteps: number;
      error?: string;
    }
  ): void {
    collectionStatusMap.set(username, status);
  }

  /**
   * Retrieves the current collection status for a specific username.
   * @param username The username to retrieve the status for.
   * @returns The current status object, or undefined if not found.
   */
  static getCollectionStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { username } = req.params;
    const authenticatedUser = req.user as AuthenticatedUser;

    if (authenticatedUser == null) {
      throw createError.authentication(REPO_MESSAGES.AUTHENTICATION_REQUIRED);
    }

    if (authenticatedUser.username !== username) {
      throw createError.authorization(REPO_MESSAGES.AUTHORIZATION_DENIED);
    }

    logWithContext.api(REPO_LOG_MESSAGES.GET_COLLECTION_STATUS, req.path, true, {
      [REPO_RESPONSE_FIELDS.TARGET_USERNAME]: username,
      [REPO_RESPONSE_FIELDS.REQUESTER_ID]: authenticatedUser.id,
    });

    try {
      const status = collectionStatusMap.get(username);

      if (status == null) {
        throw createError.notFound(REPO_MESSAGES.STATUS_NOT_FOUND);
      }

      logWithContext.api(REPO_LOG_MESSAGES.GET_COLLECTION_STATUS_SUCCESS, req.path, true, {
        [REPO_RESPONSE_FIELDS.TARGET_USERNAME]: username,
        [REPO_RESPONSE_FIELDS.COLLECTION_STATUS]: status.status,
      });

      res.status(REPO_STATUS_CODES.OK).json({
        [REPO_RESPONSE_FIELDS.MESSAGE]: ((): string => {
          const statusKey = `STATUS_${status.status.toUpperCase()}` as keyof typeof REPO_MESSAGES;
          return REPO_MESSAGES[statusKey] ?? REPO_MESSAGES.STATUS_NOT_FOUND;
        })(),
        [REPO_RESPONSE_FIELDS.COLLECTION_STATUS]: status.status,
        [REPO_RESPONSE_FIELDS.PROGRESS_PERCENTAGE]: status.progressPercentage,
        [REPO_RESPONSE_FIELDS.STARTED_AT]: status.startedAt.toISOString(),
        [REPO_RESPONSE_FIELDS.COMPLETED_AT]: status.completedAt?.toISOString(),
        [REPO_RESPONSE_FIELDS.ESTIMATED_COMPLETION]: status.estimatedCompletion?.toISOString(),
        [REPO_RESPONSE_FIELDS.CURRENT_STEP]: status.currentStep,
        [REPO_RESPONSE_FIELDS.TOTAL_STEPS]: status.totalSteps,
        ...(status.error != null && { [REPO_RESPONSE_FIELDS.ERROR]: status.error }),
        [REPO_RESPONSE_FIELDS.TIMESTAMP]: new Date().toISOString(),
      });
    } catch (error) {
      logWithContext.api(REPO_LOG_MESSAGES.GET_COLLECTION_STATUS_ERROR, req.path, false, {
        [REPO_RESPONSE_FIELDS.TARGET_USERNAME]: username,
        [REPO_RESPONSE_FIELDS.ERROR]: String(error),
      });

      throw error;
    }
  });
}

export default RepoController;
