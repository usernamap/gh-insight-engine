import { Request, Response } from 'express';
import { asyncHandler } from '@/middleware/errorHandler';
import { createError } from '@/middleware/errorHandler';
import { logWithContext } from '@/utils/logger';
import { AuthenticatedUser, GitHubRepo } from '@/types/github';
import { UserModel } from '@/models/User';
import { RepositoryModel } from '@/models/Repository';
import { GitHubService } from '@/services/GitHubService';

/**
 * Contrôleur des repositories
 */
export class RepoController {

  /**
   * Collecte et stockage des repositories d'un utilisateur depuis l'API GitHub
   * POST /api/repositories/:username
   */
  static collectRepositoriesData = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { username } = req.params;
      const authenticatedUser = req.user as AuthenticatedUser;

      if (authenticatedUser == null) {
        throw createError.authentication('Authentification requise pour collecter les repositories');
      }

      if (authenticatedUser.username !== username) {
        throw createError.authorization('Vous ne pouvez collecter que vos propres repositories');
      }

      logWithContext.api('collect_repositories_data', req.path, true, {
        targetUsername: username,
        requesterId: authenticatedUser.id,
      });

      try {
        const githubService = await GitHubService.create(authenticatedUser.githubToken);

        // Récupération des repositories utilisateur
        let allRepositories = await githubService.getUserRepos();

        // Récupération des organisations et de leurs repositories
        const organizations = await githubService.getUserOrganizations();

        for (const orgName of organizations) {
          try {
            const orgRepos = await githubService.getOrgRepos(orgName);
            // Filtrer pour ne garder que les repos où l'utilisateur est contributeur
            const userOrgRepos = orgRepos.filter(repo => {
              // Vérifier si l'utilisateur a des commits dans le repository
              const hasCommits = repo.commits.recent.some(commit =>
                commit.author.login === username,
              );
              return hasCommits || repo.owner.login === username;
            });
            allRepositories = [...allRepositories, ...userOrgRepos];
          } catch (error: unknown) {
            logWithContext.api('get_org_repos_error', req.path, false, {
              orgName,
              error: String(error),
            });
            // Continuer même si une organisation échoue
          }
        }

        // Enrichir tous les repositories avec des données DevOps complètes
        const enrichedRepositories = await Promise.all(
          allRepositories.map(async (repo) => {
            try {
              return await githubService.enrichWithDevOpsData(repo);
            } catch (error: unknown) {
              logWithContext.api('enrich_repo_error', req.path, false, {
                repo: repo.nameWithOwner,
                error: String(error),
              });
              return repo;
            }
          }),
        );

        // Calcul des statistiques globales
        const totalStats = {
          totalRepositories: enrichedRepositories.length,
          totalStars: enrichedRepositories.reduce((sum, r) => sum + r.stargazerCount, 0),
          totalForks: enrichedRepositories.reduce((sum, r) => sum + r.forkCount, 0),
          totalWatchers: enrichedRepositories.reduce((sum, r) => sum + r.watchersCount, 0),
          totalIssues: enrichedRepositories.reduce((sum, r) => sum + r.issues.totalCount, 0),
          totalPullRequests: enrichedRepositories.reduce((sum, r) => sum + r.pullRequests.totalCount, 0),
          totalCommits: enrichedRepositories.reduce((sum, r) => sum + r.commits.totalCount, 0),
          totalReleases: enrichedRepositories.reduce((sum, r) => sum + r.releases.totalCount, 0),
          totalDeployments: enrichedRepositories.reduce((sum, r) => sum + r.deployments.totalCount, 0),
          repositoriesWithActions: enrichedRepositories.filter(r => (r.githubActions?.workflowsCount ?? 0) > 0).length,
          repositoriesWithSecurity: enrichedRepositories.filter(r => (r.security?.dependabotAlerts.totalCount ?? 0) > 0).length,
          repositoriesWithPackages: enrichedRepositories.filter(r => (r.packages?.totalCount ?? 0) > 0).length,
          repositoriesWithProtection: enrichedRepositories.filter(r => (r.branchProtection?.rules.length ?? 0) > 0).length,
          averageCommunityHealth: Math.round(enrichedRepositories.reduce((sum, r) => sum + (r.community?.healthPercentage ?? 0), 0) / enrichedRepositories.length) || 0,
        };

        // Analyse des langages
        const languageStats = this.calculateLanguageAnalytics(enrichedRepositories);

        // Analyse des topics
        const topicStats = this.calculateTopicsAnalytics(enrichedRepositories);

        // Calcul DevOps maturity
        const devOpsMaturity = {
          cicdAdoption: totalStats.repositoriesWithActions / totalStats.totalRepositories * 100,
          securityMaturity: totalStats.repositoriesWithSecurity / totalStats.totalRepositories * 100,
          branchProtectionRate: totalStats.repositoriesWithProtection / totalStats.totalRepositories * 100,
          averageCommunityHealth: totalStats.averageCommunityHealth,
        };

        const analytics = {
          totalStats,
          languageAnalytics: languageStats,
          topicsAnalytics: topicStats,
          devOpsMaturity,
        };

        // Stocker les données enrichies avec l'architecture correcte
        // Note: RepoController enrichit seulement les repositories existants,
        // il ne crée pas de nouveau dataset complet

        // Sauvegarder/mettre à jour les repositories enrichis individuellement
        for (const repo of enrichedRepositories) {
          await RepositoryModel.upsert(repo, authenticatedUser.id);
        }

        logWithContext.api('repositories_enriched_success', req.path, true, {
          repositoriesCount: enrichedRepositories.length,
          username,
        });

        logWithContext.api('collect_repositories_success', req.path, true, {
          targetUsername: username,
          repositoriesCount: enrichedRepositories.length,
          organizationsCount: organizations.length,
        });

        res.status(201).json({
          message: 'Collecte des repositories réussie',
          status: 'completed',
          summary: {
            username,
            repositoriesCollected: enrichedRepositories.length,
            organizationsScanned: organizations.length,
            dataFreshness: 'live',
          },
          analytics,
          metadata: {
            collectedAt: new Date().toISOString(),
            nextCollectionRecommended: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h plus tard
          },
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        logWithContext.api('collect_repositories_error', req.path, false, {
          targetUsername: username,
          error: String(error),
        });

        throw createError.externalService('GitHub API', error as Error);
      }
    },
  );

  /**
   * Récupération des repositories depuis la base de données
   * GET /api/repositories/:username
   */
  static getUserRepositories = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { username } = req.params;
      const authenticatedUser = req.user as AuthenticatedUser;

      logWithContext.api('get_user_repositories', req.path, true, {
        targetUsername: username,
        requesterId: authenticatedUser?.id,
        isAuthenticated: authenticatedUser != null,
      });

      try {
        // Récupération depuis la base de données uniquement
        const userData = await UserModel.findByLogin(username);

        if (userData == null) {
          throw createError.notFound('Aucune donnée trouvée pour cet utilisateur. Utilisez POST /repositories/{username} pour collecter les repositories.');
        }

        // ✅ CORRECTION: Récupérer les repositories directement depuis RepositoryModel
        // au lieu de les prendre depuis le dataset qui contient des ObjectIds
        const repositoriesResult = await RepositoryModel.findByUserId(userData.id, {
          limit: 200, // Récupérer plus de repositories
          includePrivate: true,
          sortBy: 'updated',
          sortOrder: 'desc',
        });

        const repositories = repositoriesResult.repositories;

        if (repositories.length === 0) {
          const responseData = {
            repositories: [],
            metadata: {
              username,
              dataSource: 'database',
              isEmpty: true,
              message: 'Aucun repository trouvé. Utilisez POST /repositories/{username} pour collecter les repositories.',
            },
            timestamp: new Date().toISOString(),
          };

          res.status(200).json(responseData);
          return;
        }

        let filteredRepositories = repositories;

        // Si l'utilisateur demande ses propres données et est authentifié, retourner tous les repositories
        // Sinon, filtrer les repositories privés
        if (authenticatedUser?.username !== username) {
          // Filtrer les repositories privés pour les autres utilisateurs
          filteredRepositories = repositories.filter((repo) => !repo.isPrivate);
        }

        // Calculer les analytics depuis les données stockées
        const analytics = this.calculateAnalyticsFromStoredData(filteredRepositories as unknown as GitHubRepo[]);

        const responseData = {
          repositories: filteredRepositories,
          analytics,
          metadata: {
            username,
            dataSource: 'database',
            accessLevel: authenticatedUser?.username === username ? 'full' : 'public',
            repositoriesCount: filteredRepositories.length,
          },
          timestamp: new Date().toISOString(),
        };

        logWithContext.api('get_user_repositories_success', req.path, true, {
          targetUsername: username,
          hasFullAccess: authenticatedUser?.username === username,
          repositoriesCount: filteredRepositories.length,
        });

        res.status(200).json(responseData);
      } catch (error) {
        if (error instanceof Error && error.message.includes('Aucune donnée trouvée')) {
          throw error; // Re-throw les erreurs 404 explicites
        }

        logWithContext.api('get_user_repositories_error', req.path, false, {
          targetUsername: username,
          error: String(error),
        });

        throw createError.externalService('Database', error as Error);
      }
    },
  );

  /**
   * Calcul des statistiques de langages
   */
  private static calculateLanguageAnalytics(repositories: GitHubRepo[]): Record<string, unknown> {
    const languageStats: Record<string, { totalSize: number; repoCount: number; percentage: number }> = {};
    let totalSize = 0;

    repositories.forEach(repo => {
      repo.languages.nodes.forEach(lang => {
        languageStats[lang.name] ??= { totalSize: 0, repoCount: 0, percentage: 0 };
        languageStats[lang.name].totalSize += lang.size;
        languageStats[lang.name].repoCount += 1;
        totalSize += lang.size;
      });
    });

    // Calculer les pourcentages
    Object.keys(languageStats).forEach(lang => {
      languageStats[lang].percentage = Math.round((languageStats[lang].totalSize / totalSize) * 100 * 100) / 100;
    });

    // Trier par taille
    const sortedLanguages = Object.entries(languageStats)
      .sort(([, a], [, b]) => b.totalSize - a.totalSize)
      .slice(0, 10); // Top 10

    return {
      totalLanguages: Object.keys(languageStats).length,
      totalSize,
      languages: Object.fromEntries(sortedLanguages),
      topLanguages: sortedLanguages.slice(0, 5).map(([name, stats]) => ({ name, ...stats })),
    };
  }

  /**
   * Calcul des statistiques de topics
   */
  private static calculateTopicsAnalytics(repositories: GitHubRepo[]): Record<string, unknown> {
    const topicStats: Record<string, number> = {};

    repositories.forEach(repo => {
      repo.topics.forEach(topic => {
        topicStats[topic] = (topicStats[topic] || 0) + 1;
      });
    });

    const sortedTopics = Object.entries(topicStats)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 15); // Top 15

    return {
      totalTopics: Object.keys(topicStats).length,
      repositoriesWithTopics: repositories.filter(r => r.topics.length > 0).length,
      topics: Object.fromEntries(sortedTopics),
      topTopics: sortedTopics.slice(0, 10).map(([name, count]) => ({ name, count })),
    };
  }

  /**
   * Calcul des statistiques globales à partir des données stockées
   */
  private static calculateAnalyticsFromStoredData(repositories: GitHubRepo[]): Record<string, unknown> {
    // Filtrer les repositories valides (pas des objets vides du parsing raté)
    const validRepositories = repositories.filter((repo): repo is GitHubRepo =>
      Boolean(repo) &&
      typeof repo === 'object' &&
      'nameWithOwner' in repo &&
      typeof repo.nameWithOwner === 'string' &&
      'stargazerCount' in repo &&
      typeof repo.stargazerCount === 'number',
    );

    if (validRepositories.length === 0) {
      // Retourner des statistiques par défaut si aucun repository valide
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
      totalPullRequests: validRepositories.reduce((sum, r) => sum + (r.pullRequests?.totalCount || 0), 0),
      totalCommits: validRepositories.reduce((sum, r) => sum + (r.commits?.totalCount || 0), 0),
      totalReleases: validRepositories.reduce((sum, r) => sum + (r.releases?.totalCount || 0), 0),
      totalDeployments: validRepositories.reduce((sum, r) => sum + (r.deployments?.totalCount || 0), 0),
      repositoriesWithActions: validRepositories.filter(r => (r.githubActions?.workflowsCount ?? 0) > 0).length,
      repositoriesWithSecurity: validRepositories.filter(r => (r.security?.dependabotAlerts?.totalCount ?? 0) > 0).length,
      repositoriesWithPackages: validRepositories.filter(r => (r.packages?.totalCount ?? 0) > 0).length,
      repositoriesWithProtection: validRepositories.filter(r => (r.branchProtection?.rules?.length ?? 0) > 0).length,
      averageCommunityHealth: Math.round(validRepositories.reduce((sum, r) => sum + (r.community?.healthPercentage ?? 0), 0) / validRepositories.length) || 0,
    };

    // Analyse des langages
    const languageStats = this.calculateLanguageAnalytics(validRepositories);

    // Analyse des topics
    const topicStats = this.calculateTopicsAnalytics(validRepositories);

    // Calcul DevOps maturity
    const devOpsMaturity = {
      cicdAdoption: totalStats.totalRepositories > 0 ? (totalStats.repositoriesWithActions / totalStats.totalRepositories * 100) : 0,
      securityMaturity: totalStats.totalRepositories > 0 ? (totalStats.repositoriesWithSecurity / totalStats.totalRepositories * 100) : 0,
      branchProtectionRate: totalStats.totalRepositories > 0 ? (totalStats.repositoriesWithProtection / totalStats.totalRepositories * 100) : 0,
      averageCommunityHealth: totalStats.averageCommunityHealth,
    };

    return {
      totalStats,
      languageAnalytics: languageStats,
      topicsAnalytics: topicStats,
      devOpsMaturity,
    };
  }
}

export default RepoController;
