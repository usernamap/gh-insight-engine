/**
 * Modèle User - Collection users
 * CRUD operations et validation pour les profils utilisateur GitHub
 */

import { Prisma, PrismaClient, User as PrismaUser } from '@prisma/client';
import { UserProfile } from '@/types/github';
import databaseConfig from '@/config/database';
import logger from '@/utils/logger';

export class UserModel {
  /**
   * Crée un nouvel utilisateur
   */
  static async create(userData: UserProfile): Promise<PrismaUser> {
    const prisma = databaseConfig.getPrismaClient();
    if (prisma == null) {
      throw new Error('Base de données non initialisée');
    }

    try {
      const user = await prisma.user.create({
        data: {
          // Champs de base existants dans le schéma actuel
          login: userData.login,
          name: userData.name ?? '',
          email: userData.email ?? '',
          avatarUrl: userData.avatar_url ?? '',
          bio: userData.bio,
          company: userData.company,
          location: userData.location,
          blog: userData.blog,
          twitterUsername: userData.twitter_username,
          followers: userData.followers ?? 0,
          following: userData.following ?? 0,
          publicRepos: userData.public_repos ?? 0,
          publicGists: userData.public_gists ?? 0,
          // privateRepos: userData.total_private_repos, // N'existe pas dans le schéma Prisma actuel
          ownedPrivateRepos: userData.owned_private_repos,
          totalPrivateRepos: userData.total_private_repos,
          collaborators: userData.collaborators,
          createdAt: userData.created_at ?? new Date(),
          updatedAt: userData.updated_at ?? new Date(),
          type: userData.type ?? 'User',
          siteAdmin: userData.site_admin ?? false,
          hireable: userData.hireable,
          organizations: userData.organizations as unknown as Prisma.InputJsonValue,

          // TODO: Champs à ajouter après migration complète du schéma DB :
          // githubId, nodeId, gravatarId, url, htmlUrl, followersUrl, followingUrl,
          // gistsUrl, starredUrl, subscriptionsUrl, organizationsUrl, reposUrl,
          // eventsUrl, receivedEventsUrl, privateGists, diskUsage, twoFactorAuth, plan
        },
      });

      logger.info('Utilisateur créé avec succès', {
        userId: user.id,
        login: user.login,
      });

      return user;
    } catch (_error: unknown) {
      logger.error("Erreur lors de la création de l'utilisateur", {
        login: userData.login,
        error: (_error as Error).message,
      });
      throw new Error(
        `Création utilisateur échouée: ${(_error as Error).message}`,
      );
    }
  }

  /**
   * Trouve un utilisateur par login
   */
  static async findByLogin(login: string): Promise<PrismaUser | null> {
    const prisma = databaseConfig.getPrismaClient();
    if (prisma == null) {
      throw new Error('Base de données non initialisée');
    }

    try {
      const user = await prisma.user.findUnique({
        where: { login },
        include: {
          repositories: {
            take: 10, // Limite pour éviter les réponses trop lourdes
            orderBy: { pushedAt: 'desc' },
          },
          datasets: {
            take: 5,
            orderBy: { updatedAt: 'desc' },
          },
        },
      });

      logger.debug('Recherche utilisateur par login', {
        login,
        found: user != null,
      });

      return user;
    } catch (_error: unknown) {
      logger.error('Erreur lors de la recherche utilisateur', {
        login,
        error: (_error as Error).message,
      });
      throw _error as Error;
    }
  }

  /**
   * Trouve un utilisateur par ID
   */
  static async findById(id: string): Promise<PrismaUser | null> {
    const prisma = databaseConfig.getPrismaClient();
    if (prisma == null) {
      throw new Error('Base de données non initialisée');
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id },
      });

      logger.debug('Recherche utilisateur par ID', {
        id,
        found: user != null,
      });

      return user;
    } catch (_error: unknown) {
      logger.error('Erreur lors de la recherche utilisateur par ID', {
        id,
        error: (_error as Error).message,
      });
      throw _error as Error;
    }
  }

  /**
   * Met à jour un utilisateur
   */
  static async update(
    id: string,
    updateData: Partial<UserProfile>,
  ): Promise<PrismaUser> {
    const prisma = databaseConfig.getPrismaClient();
    if (prisma == null) {
      throw new Error('Base de données non initialisée');
    }

    try {
      const user = await prisma.user.update({
        where: { id },
        data: {
          ...(updateData.name != null && { name: updateData.name }),
          ...(updateData.email != null && { email: updateData.email }),
          ...(updateData.avatar_url != null && { avatarUrl: updateData.avatar_url }),
          ...(updateData.bio !== undefined && { bio: updateData.bio }),
          ...(updateData.company !== undefined && {
            company: updateData.company,
          }),
          ...(updateData.location !== undefined && {
            location: updateData.location,
          }),
          ...(updateData.blog !== undefined && { blog: updateData.blog }),
          ...(updateData.twitter_username !== undefined && {
            twitterUsername: updateData.twitter_username,
          }),
          ...(updateData.followers !== undefined && {
            followers: updateData.followers,
          }),
          ...(updateData.following !== undefined && {
            following: updateData.following,
          }),
          ...(updateData.public_repos !== undefined && {
            publicRepos: updateData.public_repos,
          }),
          ...(updateData.public_gists !== undefined && {
            publicGists: updateData.public_gists,
          }),
          // privateRepos n'existe plus dans UserProfile
          ...(updateData.hireable !== undefined && {
            hireable: updateData.hireable,
          }),
          ...(updateData.organizations && {
            organizations: updateData.organizations as unknown as Prisma.InputJsonValue,
          }),
          updatedAt: new Date(),
        },
      });

      logger.info('Utilisateur mis à jour', {
        userId: user.id,
        login: user.login,
      });

      return user;
    } catch (_error: unknown) {
      logger.error('Erreur lors de la mise à jour utilisateur', {
        id,
        error: (_error as Error).message,
      });
      throw new Error(
        `Mise à jour utilisateur échouée: ${(_error as Error).message}`,
      );
    }
  }

  /**
   * Supprime un utilisateur et ses données associées
   */
  static async delete(id: string): Promise<void> {
    const prisma = databaseConfig.getPrismaClient();
    if (prisma == null) {
      throw new Error('Base de données non initialisée');
    }

    try {
      await databaseConfig.transaction(async (tx: PrismaClient) => {
        // Supprimer les datasets associés
        await tx.dataset.deleteMany({
          where: { userProfileId: id },
        });

        // Supprimer les repositories associés
        await tx.repository.deleteMany({
          where: { userId: id },
        });

        // Supprimer l'utilisateur
        await tx.user.delete({
          where: { id },
        });
      });

      logger.info('Utilisateur supprimé avec succès', { userId: id });
    } catch (_error: unknown) {
      logger.error('Erreur lors de la suppression utilisateur', {
        id,
        error: (_error as Error).message,
      });
      throw new Error(
        `Suppression utilisateur échouée: ${(_error as Error).message}`,
      );
    }
  }

  /**
   * Recherche d'utilisateurs avec filtres
   */
  static async search(filters: {
    search?: string;
    location?: string;
    company?: string;
    minFollowers?: number;
    maxFollowers?: number;
    limit?: number;
    offset?: number;
  }): Promise<{ users: PrismaUser[]; total: number }> {
    const prisma = databaseConfig.getPrismaClient();
    if (prisma == null) {
      throw new Error('Base de données non initialisée');
    }

    try {
      const where: Record<string, unknown> = {};

      if (filters.search != null) {
        where.OR = [
          { login: { contains: filters.search, mode: 'insensitive' } },
          { name: { contains: filters.search, mode: 'insensitive' } },
          { bio: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      if (filters.location != null) {
        where.location = { contains: filters.location, mode: 'insensitive' };
      }

      if (filters.company != null) {
        where.company = { contains: filters.company, mode: 'insensitive' };
      }

      if (
        filters.minFollowers !== undefined ||
        filters.maxFollowers !== undefined
      ) {
        where.followers = {};
        if (filters.minFollowers !== undefined) {
          (where.followers as { gte?: number }).gte = filters.minFollowers;
        }
        if (filters.maxFollowers !== undefined) {
          (where.followers as { lte?: number }).lte = filters.maxFollowers;
        }
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          take: filters.limit ?? 10,
          skip: filters.offset ?? 0,
          orderBy: { followers: 'desc' },
        }),
        prisma.user.count({ where }),
      ]);

      logger.debug("Recherche d'utilisateurs", {
        filtersCount: Object.keys(filters).length,
        resultsCount: users.length,
        total,
      });

      return { users, total };
    } catch (_error: unknown) {
      logger.error("Erreur lors de la recherche d'utilisateurs", {
        filters,
        error: (_error as Error).message,
      });
      throw _error as Error;
    }
  }

  /**
   * Statistiques globales des utilisateurs
   */
  static async getStats(): Promise<{
    totalUsers: number;
    totalRepositories: number;
    averageFollowers: number;
    topLanguages: Array<{ language: string; count: number }>;
  }> {
    const prisma = databaseConfig.getPrismaClient();
    if (prisma == null) {
      throw new Error('Base de données non initialisée');
    }

    try {
      const [totalUsers, totalRepositories, avgFollowers] = await Promise.all([
        prisma.user.count(),
        prisma.repository.count(),
        prisma.user.aggregate({
          _avg: { followers: true },
        }),
      ]);

      // Calcul des langages les plus populaires
      const repositories = await prisma.repository.findMany({
        where: { primaryLanguage: { not: null } },
        select: { primaryLanguage: true },
      });

      const languageCount = repositories.reduce(
        (
          acc: Record<string, number>,
          repo: { primaryLanguage: string | null },
        ) => {
          if (repo.primaryLanguage != null) {
            acc[repo.primaryLanguage] = (acc[repo.primaryLanguage] ?? 0) + 1;
          }
          return acc;
        },
        {},
      );

      const topLanguages = Object.entries(languageCount)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 10)
        .map(([language, count]) => ({ language, count: count as number }));

      return {
        totalUsers,
        totalRepositories,
        averageFollowers: Math.round(avgFollowers._avg.followers ?? 0),
        topLanguages,
      };
    } catch (_error: unknown) {
      logger.error('Erreur lors du calcul des statistiques', {
        error: (_error as Error).message,
      });
      throw _error as Error;
    }
  }

  /**
   * Vérifie si un utilisateur existe
   */
  static async exists(login: string): Promise<boolean> {
    const prisma = databaseConfig.getPrismaClient();
    if (prisma == null) {
      throw new Error('Base de données non initialisée');
    }

    try {
      const user = await prisma.user.findUnique({
        where: { login },
        select: { id: true },
      });

      return user != null;
    } catch (_error: unknown) {
      logger.error("Erreur lors de la vérification d'existence utilisateur", {
        login,
        error: (_error as Error).message,
      });
      return false;
    }
  }

  /**
   * Crée ou met à jour un utilisateur (upsert)
   */
  static async upsert(userData: UserProfile): Promise<PrismaUser> {
    const prisma = databaseConfig.getPrismaClient();
    if (prisma == null) {
      throw new Error('Base de données non initialisée');
    }

    try {
      const user = await prisma.user.upsert({
        where: { login: userData.login },
        update: {
          githubId: userData.id,
          nodeId: userData.node_id,
          avatarUrl: userData.avatar_url ?? '',
          gravatarId: userData.gravatar_id,
          url: userData.url,
          htmlUrl: userData.html_url,
          followersUrl: userData.followers_url,
          followingUrl: userData.following_url,
          gistsUrl: userData.gists_url,
          starredUrl: userData.starred_url,
          subscriptionsUrl: userData.subscriptions_url,
          organizationsUrl: userData.organizations_url,
          reposUrl: userData.repos_url,
          eventsUrl: userData.events_url,
          receivedEventsUrl: userData.received_events_url,
          type: userData.type,
          siteAdmin: userData.site_admin,
          name: userData.name ?? '',
          email: userData.email ?? '',
          bio: userData.bio,
          company: userData.company,
          location: userData.location,
          blog: userData.blog,
          twitterUsername: userData.twitter_username,
          followers: userData.followers ?? 0,
          following: userData.following ?? 0,
          publicRepos: userData.public_repos ?? 0,
          publicGists: userData.public_gists ?? 0,
          hireable: userData.hireable,
          organizations: userData.organizations as unknown as Prisma.InputJsonValue,
        },
        create: {
          // Structure complète avec tous les champs disponibles
          login: userData.login,
          githubId: userData.id,
          nodeId: userData.node_id,
          avatarUrl: userData.avatar_url ?? '',
          gravatarId: userData.gravatar_id,
          url: userData.url,
          htmlUrl: userData.html_url,
          followersUrl: userData.followers_url,
          followingUrl: userData.following_url,
          gistsUrl: userData.gists_url,
          starredUrl: userData.starred_url,
          subscriptionsUrl: userData.subscriptions_url,
          organizationsUrl: userData.organizations_url,
          reposUrl: userData.repos_url,
          eventsUrl: userData.events_url,
          receivedEventsUrl: userData.received_events_url,
          type: userData.type,
          siteAdmin: userData.site_admin ?? false,
          name: userData.name ?? '',
          email: userData.email ?? '',
          bio: userData.bio,
          company: userData.company,
          location: userData.location,
          blog: userData.blog,
          twitterUsername: userData.twitter_username,
          followers: userData.followers ?? 0,
          following: userData.following ?? 0,
          publicRepos: userData.public_repos ?? 0,
          publicGists: userData.public_gists ?? 0,
          hireable: userData.hireable,
          ownedPrivateRepos: userData.owned_private_repos,
          totalPrivateRepos: userData.total_private_repos,
          collaborators: userData.collaborators,
          createdAt: userData.created_at ?? new Date(),
          updatedAt: userData.updated_at ?? new Date(),
          privateGists: userData.private_gists,
          diskUsage: userData.disk_usage,
          twoFactorAuth: userData.two_factor_authentication,
          plan: userData.plan as unknown as Prisma.InputJsonValue,
          organizations: userData.organizations as unknown as Prisma.InputJsonValue,
        },
      });

      logger.info('Utilisateur upsert réussi', {
        userId: user.id,
        login: user.login,
      });

      return user;
    } catch (_error: unknown) {
      logger.error("Erreur lors de l'upsert utilisateur", {
        login: userData.login,
        error: (_error as Error).message,
      });
      throw new Error(
        `Upsert utilisateur échoué: ${(_error as Error).message}`,
      );
    }
  }
}
