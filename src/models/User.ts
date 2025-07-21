/**
 * Modèle User - Collection users
 * CRUD operations et validation pour les profils utilisateur GitHub
 */

import { User as PrismaUser } from '@/generated/prisma';
import { UserProfile, GitHubOrganization } from '@/types/github';
import databaseConfig from '@/config/database';
import logger from '@/utils/logger';

export class UserModel {
  /**
   * Crée un nouvel utilisateur
   */
  static async create(userData: UserProfile): Promise<PrismaUser> {
    const prisma = databaseConfig.getPrismaClient();
    if (!prisma) {
      throw new Error('Base de données non initialisée');
    }

    try {
      const user = await prisma.user.create({
        data: {
          login: userData.login,
          name: userData.name || '',
          email: userData.email || '',
          avatarUrl: userData.avatarUrl || '',
          bio: userData.bio || null,
          company: userData.company || null,
          location: userData.location || null,
          blog: userData.blog || null,
          twitterUsername: userData.twitterUsername || null,
          followers: userData.followers || 0,
          following: userData.following || 0,
          publicRepos: userData.publicRepos || 0,
          publicGists: userData.publicGists || 0,
          privateRepos: userData.privateRepos || null,
          ownedPrivateRepos: userData.ownedPrivateRepos || null,
          totalPrivateRepos: userData.totalPrivateRepos || null,
          collaborators: userData.collaborators || null,
          createdAt: userData.createdAt,
          updatedAt: userData.updatedAt,
          type: userData.type,
          siteAdmin: userData.siteAdmin || false,
          hireable: userData.hireable || null,
          organizations: userData.organizations || { totalCount: 0, nodes: [] },
        },
      });

      logger.info('Utilisateur créé avec succès', {
        userId: user.id,
        login: user.login,
      });

      return user;
    } catch (error: any) {
      logger.error('Erreur lors de la création de l\'utilisateur', {
        login: userData.login,
        error: error.message,
      });
      throw new Error(`Création utilisateur échouée: ${error.message}`);
    }
  }

  /**
   * Trouve un utilisateur par login
   */
  static async findByLogin(login: string): Promise<PrismaUser | null> {
    const prisma = databaseConfig.getPrismaClient();
    if (!prisma) {
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
        found: !!user,
      });

      return user;
    } catch (error: any) {
      logger.error('Erreur lors de la recherche utilisateur', {
        login,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Trouve un utilisateur par ID
   */
  static async findById(id: string): Promise<PrismaUser | null> {
    const prisma = databaseConfig.getPrismaClient();
    if (!prisma) {
      throw new Error('Base de données non initialisée');
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id },
      });

      logger.debug('Recherche utilisateur par ID', {
        id,
        found: !!user,
      });

      return user;
    } catch (error: any) {
      logger.error('Erreur lors de la recherche utilisateur par ID', {
        id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Met à jour un utilisateur
   */
  static async update(id: string, updateData: Partial<UserProfile>): Promise<PrismaUser> {
    const prisma = databaseConfig.getPrismaClient();
    if (!prisma) {
      throw new Error('Base de données non initialisée');
    }

    try {
      const user = await prisma.user.update({
        where: { id },
        data: {
          ...(updateData.name && { name: updateData.name }),
          ...(updateData.email && { email: updateData.email }),
          ...(updateData.avatarUrl && { avatarUrl: updateData.avatarUrl }),
          ...(updateData.bio !== undefined && { bio: updateData.bio }),
          ...(updateData.company !== undefined && { company: updateData.company }),
          ...(updateData.location !== undefined && { location: updateData.location }),
          ...(updateData.blog !== undefined && { blog: updateData.blog }),
          ...(updateData.twitterUsername !== undefined && { twitterUsername: updateData.twitterUsername }),
          ...(updateData.followers !== undefined && { followers: updateData.followers }),
          ...(updateData.following !== undefined && { following: updateData.following }),
          ...(updateData.publicRepos !== undefined && { publicRepos: updateData.publicRepos }),
          ...(updateData.publicGists !== undefined && { publicGists: updateData.publicGists }),
          ...(updateData.privateRepos !== undefined && { privateRepos: updateData.privateRepos }),
          ...(updateData.hireable !== undefined && { hireable: updateData.hireable }),
          ...(updateData.organizations && { organizations: updateData.organizations }),
          updatedAt: new Date(),
        },
      });

      logger.info('Utilisateur mis à jour', {
        userId: user.id,
        login: user.login,
      });

      return user;
    } catch (error: any) {
      logger.error('Erreur lors de la mise à jour utilisateur', {
        id,
        error: error.message,
      });
      throw new Error(`Mise à jour utilisateur échouée: ${error.message}`);
    }
  }

  /**
   * Supprime un utilisateur et ses données associées
   */
  static async delete(id: string): Promise<void> {
    const prisma = databaseConfig.getPrismaClient();
    if (!prisma) {
      throw new Error('Base de données non initialisée');
    }

    try {
      await databaseConfig.transaction(async (tx) => {
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
    } catch (error: any) {
      logger.error('Erreur lors de la suppression utilisateur', {
        id,
        error: error.message,
      });
      throw new Error(`Suppression utilisateur échouée: ${error.message}`);
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
    if (!prisma) {
      throw new Error('Base de données non initialisée');
    }

    try {
      const where: any = {};

      if (filters.search) {
        where.OR = [
          { login: { contains: filters.search, mode: 'insensitive' } },
          { name: { contains: filters.search, mode: 'insensitive' } },
          { bio: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      if (filters.location) {
        where.location = { contains: filters.location, mode: 'insensitive' };
      }

      if (filters.company) {
        where.company = { contains: filters.company, mode: 'insensitive' };
      }

      if (filters.minFollowers !== undefined || filters.maxFollowers !== undefined) {
        where.followers = {};
        if (filters.minFollowers !== undefined) {
          where.followers.gte = filters.minFollowers;
        }
        if (filters.maxFollowers !== undefined) {
          where.followers.lte = filters.maxFollowers;
        }
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          take: filters.limit || 10,
          skip: filters.offset || 0,
          orderBy: { followers: 'desc' },
        }),
        prisma.user.count({ where }),
      ]);

      logger.debug('Recherche d\'utilisateurs', {
        filtersCount: Object.keys(filters).length,
        resultsCount: users.length,
        total,
      });

      return { users, total };
    } catch (error: any) {
      logger.error('Erreur lors de la recherche d\'utilisateurs', {
        filters,
        error: error.message,
      });
      throw error;
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
    if (!prisma) {
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

      const languageCount = repositories.reduce((acc: Record<string, number>, repo) => {
        if (repo.primaryLanguage) {
          acc[repo.primaryLanguage] = (acc[repo.primaryLanguage] || 0) + 1;
        }
        return acc;
      }, {});

      const topLanguages = Object.entries(languageCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([language, count]) => ({ language, count }));

      return {
        totalUsers,
        totalRepositories,
        averageFollowers: Math.round(avgFollowers._avg.followers || 0),
        topLanguages,
      };
    } catch (error: any) {
      logger.error('Erreur lors du calcul des statistiques', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Vérifie si un utilisateur existe
   */
  static async exists(login: string): Promise<boolean> {
    const prisma = databaseConfig.getPrismaClient();
    if (!prisma) {
      throw new Error('Base de données non initialisée');
    }

    try {
      const user = await prisma.user.findUnique({
        where: { login },
        select: { id: true },
      });

      return !!user;
    } catch (error: any) {
      logger.error('Erreur lors de la vérification d\'existence utilisateur', {
        login,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Crée ou met à jour un utilisateur (upsert)
   */
  static async upsert(userData: UserProfile): Promise<PrismaUser> {
    const prisma = databaseConfig.getPrismaClient();
    if (!prisma) {
      throw new Error('Base de données non initialisée');
    }

    try {
      const user = await prisma.user.upsert({
        where: { login: userData.login },
        update: {
          name: userData.name || '',
          email: userData.email || '',
          avatarUrl: userData.avatarUrl || '',
          bio: userData.bio || null,
          company: userData.company || null,
          location: userData.location || null,
          blog: userData.blog || null,
          twitterUsername: userData.twitterUsername || null,
          followers: userData.followers || 0,
          following: userData.following || 0,
          publicRepos: userData.publicRepos || 0,
          publicGists: userData.publicGists || 0,
          privateRepos: userData.privateRepos || null,
          hireable: userData.hireable || null,
          organizations: userData.organizations || { totalCount: 0, nodes: [] },
          updatedAt: new Date(),
        },
        create: {
          login: userData.login,
          name: userData.name || '',
          email: userData.email || '',
          avatarUrl: userData.avatarUrl || '',
          bio: userData.bio || null,
          company: userData.company || null,
          location: userData.location || null,
          blog: userData.blog || null,
          twitterUsername: userData.twitterUsername || null,
          followers: userData.followers || 0,
          following: userData.following || 0,
          publicRepos: userData.publicRepos || 0,
          publicGists: userData.publicGists || 0,
          privateRepos: userData.privateRepos || null,
          ownedPrivateRepos: userData.ownedPrivateRepos || null,
          totalPrivateRepos: userData.totalPrivateRepos || null,
          collaborators: userData.collaborators || null,
          createdAt: userData.createdAt,
          updatedAt: userData.updatedAt,
          type: userData.type,
          siteAdmin: userData.siteAdmin || false,
          hireable: userData.hireable || null,
          organizations: userData.organizations || { totalCount: 0, nodes: [] },
        },
      });

      logger.info('Utilisateur upsert réussi', {
        userId: user.id,
        login: user.login,
      });

      return user;
    } catch (error: any) {
      logger.error('Erreur lors de l\'upsert utilisateur', {
        login: userData.login,
        error: error.message,
      });
      throw new Error(`Upsert utilisateur échoué: ${error.message}`);
    }
  }
} 