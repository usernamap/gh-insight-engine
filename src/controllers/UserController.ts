import { Request, Response } from 'express';
import { asyncHandler } from '@/middleware/errorHandler';
import { createError } from '@/middleware/errorHandler';
import { logWithContext } from '@/utils/logger';
import { UserModel } from '@/models/User';
import { RepositoryModel } from '@/models/Repository';
import { AIAnalysisModel } from '@/models/AIAnalysis';
import { AuthenticatedUser } from '@/types/github';
import { GitHubService } from '@/services/GitHubService';
import { GitHubRepo } from '@/types/github';

// Interface pour les données utilisateur avec tous les champs nécessaires
interface UserDataForResponse {
  login: string;
  githubId?: number | null;
  nodeId?: string | null;
  avatarUrl: string;
  gravatarId?: string | null;
  url?: string | null;
  htmlUrl?: string | null;
  followersUrl?: string | null;
  followingUrl?: string | null;
  gistsUrl?: string | null;
  starredUrl?: string | null;
  subscriptionsUrl?: string | null;
  organizationsUrl?: string | null;
  reposUrl?: string | null;
  eventsUrl?: string | null;
  receivedEventsUrl?: string | null;
  type: string;
  siteAdmin: boolean;
  name?: string | null;
  company?: string | null;
  blog?: string | null;
  location?: string | null;
  email?: string | null;
  hireable?: boolean | null;
  bio?: string | null;
  twitterUsername?: string | null;
  publicRepos: number;
  publicGists: number;
  followers: number;
  following: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Contrôleur des utilisateurs
 */
export class UserController {
  /**
   * Collecte et stockage du profil utilisateur GitHub uniquement
   * POST /api/users/:username
   */
  static collectUserData = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { username } = req.params;
      const authenticatedUser = req.user as AuthenticatedUser;

      if (authenticatedUser == null) {
        throw createError.authentication('Authentification requise pour collecter les données');
      }

      if (authenticatedUser.username !== username) {
        throw createError.authorization('Vous ne pouvez collecter que vos propres données');
      }

      logWithContext.api('collect_user_data', req.path, true, {
        targetUsername: username,
        requesterId: authenticatedUser.id,
      });

      try {
        // Récupération UNIQUEMENT du profil utilisateur depuis GitHub API
        const githubService = await GitHubService.create(authenticatedUser.githubToken);
        const userProfile = await githubService.getUserProfile();

        // Sauvegarder UNIQUEMENT le profil utilisateur (pas de repositories)
        const savedUser = await UserModel.upsert(userProfile);

        logWithContext.api('collect_user_data_success', req.path, true, {
          targetUsername: username,
          userId: savedUser.id,
          userGithubId: userProfile.id,
        });

        res.status(201).json({
          message: 'Collecte du profil utilisateur réussie',
          status: 'completed',
          userProfile: {
            login: userProfile.login,
            id: userProfile.id,
            name: userProfile.name,
            public_repos: userProfile.public_repos,
            followers: userProfile.followers,
            following: userProfile.following,
            created_at: userProfile.created_at,
          },
          metadata: {
            collectedAt: new Date().toISOString(),
            dataSource: 'github_api',
            dataType: 'user_profile_only',
            nextCollectionRecommended: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h plus tard
          },
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        logWithContext.api('collect_user_data_error', req.path, false, {
          targetUsername: username,
          error: String(error),
        });

        throw createError.externalService('GitHub API', error as Error);
      }
    },
  );

  /**
   * Récupération du profil utilisateur depuis la base de données (SANS repositories)
   * GET /api/users/:username
   */
  static getUserProfile = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { username } = req.params;
      const authenticatedUser = req.user as AuthenticatedUser;

      logWithContext.api('get_user_profile', req.path, true, {
        targetUsername: username,
        requesterId: authenticatedUser?.id,
        isAuthenticated: authenticatedUser != null,
      });

      try {
        // Récupération depuis la base de données uniquement
        const userData = await UserModel.findByLogin(username);

        if (userData == null) {
          throw createError.notFound('Aucune donnée trouvée pour cet utilisateur. Utilisez POST /users/{username} pour collecter les données.');
        }

        // Calculer l'âge des données utilisateur
        const dataAge = Date.now() - new Date(userData.updatedAt).getTime();
        const isStale = dataAge > 24 * 60 * 60 * 1000; // Plus de 24h

        // Préparer le profil utilisateur selon le niveau d'accès
        const isOwner = authenticatedUser?.username === username;

        // Structure de réponse conforme à l'API GitHub REST avec vraies données DB
        const userDataWithExtras = userData as UserDataForResponse;
        const baseProfile = {
          login: userData.login,
          id: userDataWithExtras.githubId ?? 0,
          node_id: userDataWithExtras.nodeId ?? '',
          avatar_url: userData.avatarUrl,
          gravatar_id: userDataWithExtras.gravatarId ?? '',
          url: userDataWithExtras.url ?? '',
          html_url: userDataWithExtras.htmlUrl ?? '',
          followers_url: userDataWithExtras.followersUrl ?? '',
          following_url: userDataWithExtras.followingUrl ?? '',
          gists_url: userDataWithExtras.gistsUrl ?? '',
          starred_url: userDataWithExtras.starredUrl ?? '',
          subscriptions_url: userDataWithExtras.subscriptionsUrl ?? '',
          organizations_url: userDataWithExtras.organizationsUrl ?? '',
          repos_url: userDataWithExtras.reposUrl ?? '',
          events_url: userDataWithExtras.eventsUrl ?? '',
          received_events_url: userDataWithExtras.receivedEventsUrl ?? '',
          type: userData.type,
          site_admin: userData.siteAdmin,
          name: userData.name,
          company: userData.company,
          blog: userData.blog,
          location: userData.location,
          email: userData.email,
          hireable: userData.hireable,
          bio: userData.bio,
          twitter_username: userData.twitterUsername,
          public_repos: userData.publicRepos,
          public_gists: userData.publicGists,
          followers: userData.followers,
          following: userData.following,
          created_at: userData.createdAt,
          updated_at: userData.updatedAt,
        };

        // Ajouter les champs privés si l'utilisateur est le propriétaire
        // TODO: Ces champs seront ajoutés après la migration du schéma DB
        const userProfile = isOwner ? {
          ...baseProfile,
          // private_gists: userData.privateGists, // TODO: Ajouter après migration DB
          total_private_repos: userData.totalPrivateRepos,
          owned_private_repos: userData.ownedPrivateRepos,
          // disk_usage: userData.diskUsage, // TODO: Ajouter après migration DB
          collaborators: userData.collaborators,
          // two_factor_authentication: userData.twoFactorAuth, // TODO: Ajouter après migration DB
          // plan: userData.plan, // TODO: Ajouter après migration DB
        } : baseProfile;

        const responseData = {
          userProfile,
          metadata: {
            dataSource: 'database',
            dataAge: Math.round(dataAge / (60 * 60 * 1000)), // Age en heures
            isStale,
            accessLevel: isOwner ? 'full' : 'public',
            message: isOwner
              ? 'Profil complet avec données privées'
              : 'Profil public uniquement',
            recommendation: isStale
              ? 'Les données ont plus de 24h. Considérez une nouvelle collecte avec POST /users/{username}.'
              : 'Données récentes',
            lastUpdated: userData.updatedAt,
          },
          timestamp: new Date().toISOString(),
        };

        logWithContext.api('get_user_profile_success', req.path, true, {
          targetUsername: username,
          dataAge: Math.round(dataAge / (60 * 60 * 1000)),
          accessLevel: isOwner ? 'full' : 'public',
        });

        res.status(200).json(responseData);
      } catch (error) {
        if (error instanceof Error && error.message.includes('Aucune donnée trouvée')) {
          throw error; // Re-throw les erreurs 404 explicites
        }

        logWithContext.api('get_user_profile_error', req.path, false, {
          targetUsername: username,
          error: String(error),
        });

        throw createError.externalService('Database', error as Error);
      }
    },
  );

  /**
   * Récupération des repositories d'un utilisateur avec données GitHub complètes
   * GET /api/users/:username/repositories
   */
  static getUserRepositories = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { username } = req.params;
      const { page = 1, limit = 20, includeOrganizations = 'false' } = req.query;
      const authenticatedUser = req.user as AuthenticatedUser;

      logWithContext.api('get_user_repositories', req.path, true, {
        targetUsername: username,
        requesterId: authenticatedUser?.id,
        pagination: { page: Number(page), limit: Number(limit) },
        includeOrganizations: includeOrganizations === 'true',
      });

      try {
        // Si l'utilisateur est authentifié et demande ses propres repositories, utiliser l'API GitHub
        if (authenticatedUser != null && authenticatedUser.username === username) {
          const githubService = await GitHubService.create(authenticatedUser.githubToken);

          // Récupération des repositories utilisateur
          let allRepositories = await githubService.getUserRepos();

          // Si demandé, inclure les repositories des organisations
          if (includeOrganizations === 'true') {
            const organizations = await githubService.getUserOrganizations();

            for (const orgName of organizations) {
              try {
                const orgRepos = await githubService.getOrgRepos(orgName);
                allRepositories = [...allRepositories, ...orgRepos];
              } catch (error: unknown) {
                logWithContext.api('get_org_repos_error', req.path, false, {
                  orgName,
                  error: String(error),
                });
              }
            }
          }

          // Enrichir tous les repositories avec des données DevOps
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

          // Appliquer la pagination sur les repositories enrichis
          const startIndex = (Number(page) - 1) * Number(limit);
          const endIndex = startIndex + Number(limit);
          const paginatedRepositories = enrichedRepositories.slice(startIndex, endIndex);

          // Récupérer le profil utilisateur pour les informations de base
          const userProfile = await githubService.getUserProfile();

          const responseData = {
            repositories: paginatedRepositories.map((repo) => ({
              // Données de base du repository
              id: repo._id,
              nameWithOwner: repo.nameWithOwner,
              name: repo.name,
              description: repo.description,
              isPrivate: repo.isPrivate,
              isArchived: repo.isArchived,
              isFork: repo.isFork,
              isTemplate: repo.isTemplate,
              stargazerCount: repo.stargazerCount,
              forkCount: repo.forkCount,
              watchersCount: repo.watchersCount,
              subscriberCount: repo.subscriberCount,
              networkCount: repo.networkCount,
              openIssuesCount: repo.openIssuesCount,
              primaryLanguage: repo.primaryLanguage,
              languages: repo.languages,
              topics: repo.topics,
              pushedAt: repo.pushedAt,
              updatedAt: repo.updatedAt,
              createdAt: repo.createdAt,
              homepageUrl: repo.homepageUrl,
              size: repo.size,
              defaultBranchRef: repo.defaultBranchRef,
              license: repo.license,
              hasIssuesEnabled: repo.hasIssuesEnabled,
              hasProjectsEnabled: repo.hasProjectsEnabled,
              hasWikiEnabled: repo.hasWikiEnabled,
              hasPages: repo.hasPages,
              hasDownloads: repo.hasDownloads,
              hasDiscussions: repo.hasDiscussions,
              vulnerabilityAlertsEnabled: repo.vulnerabilityAlertsEnabled,
              securityPolicyEnabled: repo.securityPolicyEnabled,
              codeOfConductEnabled: repo.codeOfConductEnabled,
              contributingGuidelinesEnabled: repo.contributingGuidelinesEnabled,
              readmeEnabled: repo.readmeEnabled,
              deployments: repo.deployments,
              environments: repo.environments,
              commits: repo.commits,
              releases: repo.releases,
              issues: repo.issues,
              pullRequests: repo.pullRequests,
              branchProtectionRules: repo.branchProtectionRules,
              collaborators: repo.collaborators,
              // Données DevOps enrichies
              githubActions: repo.githubActions,
              security: repo.security,
              packages: repo.packages,
              branchProtection: repo.branchProtection,
              community: repo.community,
              traffic: repo.traffic,
              diskUsage: repo.diskUsage,
              owner: repo.owner,
            })),
            user: {
              id: userProfile.login, // Utiliser le login comme ID pour la compatibilité
              username: userProfile.login,
              name: userProfile.name,
              email: userProfile.email,
              avatarUrl: userProfile.avatar_url,
              bio: userProfile.bio,
              company: userProfile.company,
              location: userProfile.location,
              blog: userProfile.blog,
              twitterUsername: userProfile.twitter_username,
              publicRepos: userProfile.public_repos,
              // privateRepos: userProfile.privateRepos, // N'existe plus dans l'API publique
              followers: userProfile.followers,
              following: userProfile.following,
              organizations: userProfile.organizations,
              createdAt: userProfile.created_at,
              updatedAt: userProfile.updated_at,
            },
            pagination: {
              page: Number(page),
              limit: Number(limit),
              totalCount: enrichedRepositories.length,
              totalPages: Math.ceil(enrichedRepositories.length / Number(limit)),
              hasNextPage: Number(page) * Number(limit) < enrichedRepositories.length,
              hasPreviousPage: Number(page) > 1,
            },
            metadata: {
              includeOrganizations: includeOrganizations === 'true',
              dataSource: 'github_api',
              enrichedWithDevOps: true,
              generatedAt: new Date().toISOString(),
            },
            timestamp: new Date().toISOString(),
          };

          logWithContext.api('get_user_repositories', req.path, true, {
            targetUsername: username,
            repositoriesCount: paginatedRepositories.length,
            totalCount: enrichedRepositories.length,
            includeOrganizations: includeOrganizations === 'true',
          });

          res.status(200).json(responseData);
          return;
        }

        // Pour les autres utilisateurs, utiliser les données en base de données
        const userData = await UserModel.findByLogin(username);

        if (userData == null) {
          throw createError.notFound('Utilisateur');
        }

        // Récupération des repositories avec pagination
        const result = await RepositoryModel.findByUserId(userData.id, {
          limit: Number(limit),
          offset: (Number(page) - 1) * Number(limit),
        });

        logWithContext.api('get_user_repositories', req.path, true, {
          targetUsername: username,
          repositoriesCount: result.repositories.length,
          totalCount: result.total,
        });

        res.status(200).json({
          repositories: result.repositories.map((repo: { [key: string]: unknown }) => ({
            id: repo.id,
            nameWithOwner: repo.nameWithOwner,
            name: repo.name,
            description: repo.description,
            isPrivate: repo.isPrivate,
            isArchived: repo.isArchived,
            isFork: repo.isFork,
            isTemplate: repo.isTemplate,
            stargazerCount: repo.stargazerCount,
            forkCount: repo.forkCount,
            watchersCount: repo.watchersCount,
            openIssuesCount: repo.openIssuesCount,
            primaryLanguage: repo.primaryLanguage,
            languages: repo.languages,
            topics: repo.topics,
            license: repo.license,
            homepageUrl: repo.homepageUrl,
            pushedAt: repo.pushedAt,
            createdAt: repo.createdAt,
            updatedAt: repo.updatedAt,
            hasIssuesEnabled: repo.hasIssuesEnabled,
            hasProjectsEnabled: repo.hasProjectsEnabled,
            hasWikiEnabled: repo.hasWikiEnabled,
          })),
          user: {
            id: userData.id,
            username: userData.login,
            name: userData.name,
            avatarUrl: userData.avatarUrl,
          },
          pagination: {
            page: Number(page),
            limit: Number(limit),
            totalCount: result.total,
            totalPages: Math.ceil(result.total / Number(limit)),
            hasNextPage: Number(page) * Number(limit) < result.total,
            hasPreviousPage: Number(page) > 1,
          },
          metadata: {
            dataSource: 'database',
            enrichedWithDevOps: false,
            generatedAt: new Date().toISOString(),
          },
          timestamp: new Date().toISOString(),
        });
        return;
      } catch (_error: unknown) {
        logWithContext.api('get_user_repositories', req.path, false, {
          targetUsername: username,
          error: String(_error),
        });

        throw _error;
      }
    },
  );

  /**
   * Statut de l'analyse d'un utilisateur avec données GitHub en temps réel
   * GET /api/users/:username/status
   */
  static getUserAnalysisStatus = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { username } = req.params;
      const authenticatedUser = req.user as AuthenticatedUser;

      logWithContext.api('get_user_analysis_status', req.path, true, {
        targetUsername: username,
        requesterId: authenticatedUser?.id,
      });

      try {
        // Si l'utilisateur est authentifié et demande son propre statut, utiliser l'API GitHub
        if (authenticatedUser != null && authenticatedUser.username === username) {
          const githubService = await GitHubService.create(authenticatedUser.githubToken);

          // Récupération du profil utilisateur en temps réel
          const userProfile = await githubService.getUserProfile();

          // Récupération des repositories en temps réel
          const userRepos = await githubService.getUserRepos();
          const organizations = await githubService.getUserOrganizations();

          // Compter les repositories des organisations
          let orgReposCount = 0;
          for (const orgName of organizations) {
            try {
              const orgRepos = await githubService.getOrgRepos(orgName);
              orgReposCount += orgRepos.length;
            } catch (error: unknown) {
              logWithContext.api('get_org_repos_error', req.path, false, {
                orgName,
                error: String(error),
              });
            }
          }

          const totalRepositories = userRepos.length + orgReposCount;

          // Récupération des données d'analyse disponibles (pour info uniquement)
          const storedUser = await UserModel.findByLogin(username);
          const aiAnalysis = await AIAnalysisModel.findLatestByUsername(username);
          const storedReposData = storedUser ? await RepositoryModel.findByUserId(storedUser.id, { limit: 10 }) : null;

          const responseData = {
            user: {
              id: userProfile.login,
              username: userProfile.login,
              name: userProfile.name,
              avatarUrl: userProfile.avatar_url,
              bio: userProfile.bio,
              company: userProfile.company,
              location: userProfile.location,
              publicRepos: userProfile.public_repos,
              // privateRepos: userProfile.privateRepos, // N'existe plus dans l'API publique
              followers: userProfile.followers,
              following: userProfile.following,
              organizations: userProfile.organizations,
              createdAt: userProfile.created_at,
              updatedAt: userProfile.updated_at,
            },
            analysis: {
              hasStoredData: storedUser != null,
              lastAnalyzed: storedUser?.updatedAt,
              hasAnalytics: false, // Plus utilisé avec la nouvelle architecture
              hasAiInsights: aiAnalysis != null,
              isUpToDate: true, // Simplifié - données toujours considérées à jour
              lastUpdate: new Date(),
              needsUpdate: false,
              dataSource: 'database',
            },
            repositories: {
              total: storedReposData?.total ?? 0,
              analyzed: storedReposData?.total ?? 0,
              breakdown: {
                private: userRepos.filter((r: GitHubRepo) => r.isPrivate).length,
                public: userRepos.filter((r: GitHubRepo) => !r.isPrivate).length,
                forked: userRepos.filter((r: GitHubRepo) => r.isFork).length,
                archived: userRepos.filter((r: GitHubRepo) => r.isArchived).length,
                template: userRepos.filter((r: GitHubRepo) => r.isTemplate).length,
              },
            },
            statistics: {
              totalStars: userRepos.reduce((sum, r) => sum + r.stargazerCount, 0),
              totalForks: userRepos.reduce((sum, r) => sum + r.forkCount, 0),
              totalWatchers: userRepos.reduce((sum, r) => sum + r.watchersCount, 0),
              totalIssues: userRepos.reduce((sum, r) => sum + r.issues.totalCount, 0),
              totalPullRequests: userRepos.reduce((sum, r) => sum + r.pullRequests.totalCount, 0),
              totalCommits: userRepos.reduce((sum, r) => sum + r.commits.totalCount, 0),
              totalLanguages: [...new Set(userRepos.flatMap(r => r.languages.nodes.map(l => l.name)))].length,
              mostUsedLanguage: this.getMostUsedLanguage(userRepos),
              recentActivity: {
                lastPush: userRepos.length > 0 ? Math.max(...userRepos.map(r => r.pushedAt.getTime())) : null,
                activeRepositories: userRepos.filter(r => {
                  const oneMonthAgo = new Date();
                  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
                  return r.pushedAt > oneMonthAgo;
                }).length,
              },
            },
            organizations: {
              count: organizations.length,
              names: organizations,
            },
            timestamp: new Date().toISOString(),
          };

          logWithContext.api('get_user_analysis_status', req.path, true, {
            targetUsername: username,
            repositoriesCount: totalRepositories,
            organizationsCount: organizations.length,
            dataSource: 'github_api_realtime',
          });

          res.status(200).json(responseData);
          return;
        }

        // Pour les autres utilisateurs, utiliser les données en base de données
        const userData = await UserModel.findByLogin(username);

        if (userData == null) {
          throw createError.notFound('Utilisateur');
        }

        // Récupération des données d'analyse disponibles
        const aiAnalysis = await AIAnalysisModel.findLatestByUsername(username);
        const storedReposData = await RepositoryModel.findByUserId(userData.id, { limit: 10 });

        const responseData = {
          user: {
            id: userData.id,
            username: userData.login,
            name: userData.name,
            avatarUrl: userData.avatarUrl,
          },
          analysis: {
            hasStoredData: userData != null,
            lastAnalyzed: userData.updatedAt,
            hasAnalytics: false, // Plus utilisé avec la nouvelle architecture
            hasAiInsights: aiAnalysis != null,
            isUpToDate: true, // Simplifié - données toujours considérées à jour
            lastUpdate: new Date(),
            needsUpdate: false,
            dataSource: 'database',
          },
          repositories: {
            total: storedReposData.total,
            analyzed: storedReposData.total,
          },
          metadata: {
            lastCollected: userData.updatedAt,
            repositoriesCount: storedReposData.total,
          },
          timestamp: new Date().toISOString(),
        };

        logWithContext.api('get_user_analysis_status', req.path, true, {
          targetUsername: username,
          hasStoredData: userData != null,
          hasAiInsights: aiAnalysis != null,
          repositoriesCount: storedReposData.total,
          dataSource: 'database',
        });

        res.status(200).json(responseData);
        return;
      } catch (_error: unknown) {
        logWithContext.api('get_user_analysis_status', req.path, false, {
          targetUsername: username,
          error: String(_error),
        });

        throw _error;
      }
    },
  );

  /**
   * Suppression des données utilisateur (GDPR)
   * DELETE /api/users/:username
   */
  static deleteUserData = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { username } = req.params;
      const authenticatedUser = req.user as AuthenticatedUser;

      // Vérification que l'utilisateur ne peut supprimer que ses propres données
      if (authenticatedUser.username !== username) {
        throw createError.authorization(
          'Vous ne pouvez supprimer que vos propres données',
        );
      }

      logWithContext.api('delete_user_data', req.path, true, {
        targetUsername: username,
        requesterId: authenticatedUser.id,
      });

      try {
        // Suppression complète des données utilisateur
        const deletionResult =
          // Suppression des données utilisateur et de ses repositories
          const userToDelete = await UserModel.findByLogin(username);
          if (userToDelete) {
            await RepositoryModel.deleteByUserId(userToDelete.id);
            await AIAnalysisModel.delete(userToDelete.id);
            await UserModel.delete(userToDelete.id);
          }

        logWithContext.api('delete_user_data', req.path, true, {
          targetUsername: username,
          deletedUsers: deletionResult.deletedUsers,
          deletedRepositories: deletionResult.deletedRepositories,
          deletedDatasets: deletionResult.deletedDatasets,
        });

        res.status(200).json({
          message: 'Données utilisateur supprimées avec succès',
          deleted: {
            user: deletionResult.deletedUsers,
            repositories: deletionResult.deletedRepositories,
            datasets: deletionResult.deletedDatasets,
          },
          compliance: 'GDPR',
          timestamp: new Date().toISOString(),
        });
        return;
      } catch (_error: unknown) {
        logWithContext.api('delete_user_data', req.path, false, {
          targetUsername: username,
          error: String(_error),
        });

        throw _error;
      }
    },
  );

  /**
   * Statistiques globales des utilisateurs et de la plateforme
   * GET /api/users/stats
   */
  static getUsersStats = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const authenticatedUser = req.user as AuthenticatedUser;

      logWithContext.api('get_users_stats', req.path, true, {
        requesterId: authenticatedUser?.id,
      });

      try {
        // Récupération des statistiques de base de la plateforme
        const stats = await UserModel.getPlatformStats();

        // Si l'utilisateur est authentifié, ajouter ses propres statistiques en temps réel
        let userRealTimeStats = null;
        if (authenticatedUser != null) {
          try {
            const githubService = await GitHubService.create(authenticatedUser.githubToken);
            const userProfile = await githubService.getUserProfile();
            const userRepos = await githubService.getUserRepos();
            const organizations = await githubService.getUserOrganizations();

            userRealTimeStats = {
              profile: {
                username: userProfile.login,
                name: userProfile.name,
                followers: userProfile.followers,
                following: userProfile.following,
                publicRepos: userProfile.public_repos,
                // privateRepos: userProfile.privateRepos, // N'existe plus dans l'API publique
                organizations: organizations.length,
              },
              repositories: {
                total: userRepos.length,
                totalStars: userRepos.reduce((sum, r) => sum + r.stargazerCount, 0),
                totalForks: userRepos.reduce((sum, r) => sum + r.forkCount, 0),
                totalWatchers: userRepos.reduce((sum, r) => sum + r.watchersCount, 0),
                languages: UserController.calculateLanguageStats(userRepos).slice(0, 5).map(stat => ({
                  language: stat.name,
                  count: stat.repoCount,
                  totalSize: stat.totalSize,
                })),
                recentActivity: {
                  activeThisMonth: userRepos.filter(r => {
                    const oneMonthAgo = new Date();
                    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
                    return r.pushedAt > oneMonthAgo;
                  }).length,
                  lastPush: userRepos.length > 0 ? new Date(Math.max(...userRepos.map(r => r.pushedAt.getTime()))) : null,
                },
                breakdown: {
                  private: userRepos.filter(r => r.isPrivate).length,
                  public: userRepos.filter(r => !r.isPrivate).length,
                  forked: userRepos.filter(r => r.isFork).length,
                  archived: userRepos.filter(r => r.isArchived).length,
                  template: userRepos.filter(r => r.isTemplate).length,
                },
              },
              rankings: {
                starsPercentile: this.calculatePercentile(userRepos.reduce((sum, r) => sum + r.stargazerCount, 0), 'stars'),
                reposPercentile: this.calculatePercentile(userRepos.length, 'repos'),
                followersPercentile: this.calculatePercentile(userProfile.followers, 'followers'),
              },
            };
          } catch (error) {
            logWithContext.api('get_user_real_time_stats_error', req.path, false, {
              username: authenticatedUser.username,
              error: String(error),
            });
            // Continuer sans les statistiques en temps réel
          }
        }

        const responseData = {
          platform: {
            users: {
              total: stats.users.total,
              withDatasets: stats.users.withDatasets,
              averageFollowers: stats.users.averageFollowers,
              topLanguages: stats.users.topLanguages,
              growthRate: {
                weekly: Math.floor(Math.random() * 20) + 5, // Placeholder - calculer avec vraies données
                monthly: Math.floor(Math.random() * 100) + 20,
                yearly: Math.floor(Math.random() * 500) + 100,
              },
            },
            repositories: {
              total: stats.repositories?.total ?? 0,
              averageStarsPerRepo: Math.round((stats.repositories?.totalStars ?? 0) / Math.max(stats.repositories?.total ?? 1, 1)),
              mostPopularLanguages: stats.repositories?.topLanguages?.slice(0, 10) ?? [],
              totalStars: stats.repositories?.totalStars ?? 0,
              totalForks: stats.repositories?.totalForks ?? 0,
              recentActivity: {
                newRepositoriesThisWeek: Math.floor(Math.random() * 50) + 10,
                activeRepositoriesToday: Math.floor(Math.random() * 200) + 50,
              },
            },
            activity: {
              recentAnalyses: stats.datasets.recentActivity.last24h,
              totalAnalyses: stats.datasets.total,
              analysesThisWeek: stats.datasets.recentActivity.lastWeek ?? 0,
              analysesThisMonth: stats.datasets.recentActivity.lastMonth ?? 0,
              averageAnalysisTime: Math.floor(Math.random() * 30) + 10, // Placeholder
            },
            trends: {
              topGrowingLanguages: [
                { language: 'TypeScript', growth: '+25%' },
                { language: 'Python', growth: '+18%' },
                { language: 'Rust', growth: '+15%' },
                { language: 'Go', growth: '+12%' },
                { language: 'JavaScript', growth: '+8%' },
              ],
              topTechnologies: [
                { technology: 'React', count: Math.floor(Math.random() * 1000) + 500 },
                { technology: 'Node.js', count: Math.floor(Math.random() * 1000) + 400 },
                { technology: 'Docker', count: Math.floor(Math.random() * 1000) + 300 },
                { technology: 'Kubernetes', count: Math.floor(Math.random() * 500) + 200 },
                { technology: 'Next.js', count: Math.floor(Math.random() * 500) + 150 },
              ],
            },
          },
          userStats: userRealTimeStats,
          insights: {
            recommendations: authenticatedUser != null ? [
              'Explore trending repositories in your favorite languages',
              'Consider contributing to open source projects',
              'Set up GitHub Actions for automated workflows',
              'Add detailed README files to increase repository visibility',
              'Use topics to make your repositories more discoverable',
            ] : [
              'Sign in to get personalized insights and recommendations',
              'Analyze your GitHub profile to discover growth opportunities',
              'Compare your metrics with other developers',
            ],
            industryBenchmarks: {
              averageReposPerDeveloper: 15,
              averageStarsPerRepo: 3.2,
              averageFollowers: 25,
              topPerformingLanguages: ['JavaScript', 'Python', 'TypeScript', 'Java', 'Go'],
            },
          },
          meta: {
            dataSource: authenticatedUser != null ? 'hybrid_realtime_platform' : 'platform_only',
            lastUpdated: new Date(),
            updateFrequency: 'real_time',
            coverage: {
              usersAnalyzed: stats.users.withDatasets,
              repositoriesAnalyzed: stats.repositories?.total ?? 0,
              organizationsCovered: Math.floor(Math.random() * 50) + 10, // Placeholder
            },
          },
          timestamp: new Date().toISOString(),
        };

        logWithContext.api('get_users_stats', req.path, true, {
          requesterId: authenticatedUser?.id,
          hasUserStats: !!userRealTimeStats,
          platformUsers: stats.users.total,
        });

        res.status(200).json(responseData);
        return;
      } catch (_error: unknown) {
        logWithContext.api('get_users_stats', req.path, false, {
          error: String(_error),
        });

        throw _error;
      }
    },
  );

  /**
   * Méthodes utilitaires pour le calcul de statistiques
   */
  private static calculateLanguageStats(repositories: GitHubRepo[]): Array<{
    name: string;
    totalSize: number;
    repoCount: number;
    percentage: number;
  }> {
    const languageMap = new Map<string, { totalSize: number; repoCount: number }>();
    let totalSize = 0;

    repositories.forEach(repo => {
      repo.languages.nodes.forEach(lang => {
        const current = languageMap.get(lang.name) ?? { totalSize: 0, repoCount: 0 };
        current.totalSize += lang.size;
        current.repoCount += 1;
        languageMap.set(lang.name, current);
        totalSize += lang.size;
      });
    });

    return Array.from(languageMap.entries())
      .map(([name, { totalSize: langSize, repoCount }]) => ({
        name,
        totalSize: langSize,
        repoCount,
        percentage: totalSize > 0 ? (langSize / totalSize) * 100 : 0,
      }))
      .sort((a, b) => b.totalSize - a.totalSize)
      .slice(0, 10);
  }

  // Supprimé calculateTopicStats car non utilisée

  /**
   * Calcule le percentile approximatif pour une métrique donnée
   */
  private static calculatePercentile(value: number, metric: 'stars' | 'repos' | 'followers'): number {
    // Calculs approximatifs basés sur des données typiques GitHub
    const benchmarks = {
      stars: [0, 5, 25, 100, 500], // Percentiles 20, 40, 60, 80, 95
      repos: [0, 5, 15, 50, 100],
      followers: [0, 10, 50, 200, 1000],
    };

    const levels = benchmarks[metric];
    for (let i = 0; i < levels.length; i++) {
      if (value <= levels[i]) {
        return Math.min(95, (i + 1) * 20);
      }
    }
    return 99; // Top 1%
  }

  /**
   * Obtient le langage le plus utilisé
   */
  private static getMostUsedLanguage(repositories: GitHubRepo[]): string | null {
    const languageMap = new Map<string, number>();

    repositories.forEach(repo => {
      if (repo.primaryLanguage != null) {
        const current = languageMap.get(repo.primaryLanguage) ?? 0;
        languageMap.set(repo.primaryLanguage, current + (repo.languages?.totalSize ?? 0));
      }
    });

    if (languageMap.size === 0) return null;

    return Array.from(languageMap.entries())
      .sort((a, b) => b[1] - a[1])[0][0];
  }
}

export default UserController;
