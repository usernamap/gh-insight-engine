/**
 * Modèle AIAnalysis - Collection ai_analyses
 * CRUD operations pour les analyses IA spécialisées
 */
import { AIAnalysis, Prisma } from '@prisma/client';
import databaseConfig from '@/config/database';
import logger from '@/utils/logger';
import { AIAnalysisResult } from '@/services/AIAnalysisService';

export type PrismaAIAnalysis = AIAnalysis;

export class AIAnalysisModel {
  /**
   * Crée une nouvelle analyse IA
   */
  static async create(
    username: string,
    userId: string,
    analysisResult: AIAnalysisResult,
  ): Promise<PrismaAIAnalysis> {
    const prisma = databaseConfig.getPrismaClient();
    if (prisma == null) {
      throw new Error('Base de données non initialisée');
    }

    try {
      const aiAnalysis = await prisma.aIAnalysis.create({
        data: {
          username,
          userId,
          qualityScore: analysisResult.qualityScore,
          maintenabilityScore: analysisResult.maintenabilityScore,
          securityScore: analysisResult.securityScore,
          innovationScore: analysisResult.innovationScore,
          overallHealthScore: analysisResult.overallHealthScore,
          estimatedVulnerabilities: analysisResult.estimatedVulnerabilities,
          estimatedBugs: analysisResult.estimatedBugs,
          estimatedBuildTime: analysisResult.estimatedBuildTime,
          estimatedTestCoverage: analysisResult.estimatedTestCoverage,
          qualityByOrganization: analysisResult.qualityByOrganization as unknown as Prisma.InputJsonValue,
          repositoryScores: analysisResult.repositoryScores as unknown as Prisma.InputJsonValue,
          insights: analysisResult.insights as unknown as Prisma.InputJsonValue,
          metadata: analysisResult.metadata as unknown as Prisma.InputJsonValue,
        },
      });

      logger.info('Analyse IA créée avec succès', {
        aiAnalysisId: aiAnalysis.id,
        username,
        userId,
        qualityScore: analysisResult.qualityScore,
        securityScore: analysisResult.securityScore,
      });

      return aiAnalysis;
    } catch (error: unknown) {
      logger.error('Erreur lors de la création de l\'analyse IA', {
        username,
        userId,
        error: (error as Error).message,
      });
      throw new Error(`Création analyse IA échouée: ${(error as Error).message}`);
    }
  }

  /**
   * Trouve l'analyse IA la plus récente d'un utilisateur par username
   */
  static async findLatestByUsername(username: string): Promise<PrismaAIAnalysis | null> {
    const prisma = databaseConfig.getPrismaClient();
    if (prisma == null) {
      throw new Error('Base de données non initialisée');
    }

    try {
      const aiAnalysis = await prisma.aIAnalysis.findFirst({
        where: { username },
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { login: true, name: true, avatarUrl: true },
          },
        },
      });

      logger.debug('Recherche analyse IA par username', {
        username,
        found: aiAnalysis != null,
        aiAnalysisId: aiAnalysis?.id,
      });

      return aiAnalysis;
    } catch (error: unknown) {
      logger.error('Erreur lors de la recherche analyse IA par username', {
        username,
        error: (error as Error).message,
      });
      throw error as Error;
    }
  }

  /**
   * Met à jour une analyse IA existante
   */
  static async update(
    id: string,
    analysisResult: AIAnalysisResult,
  ): Promise<PrismaAIAnalysis> {
    const prisma = databaseConfig.getPrismaClient();
    if (prisma == null) {
      throw new Error('Base de données non initialisée');
    }

    try {
      const aiAnalysis = await prisma.aIAnalysis.update({
        where: { id },
        data: {
          qualityScore: analysisResult.qualityScore,
          maintenabilityScore: analysisResult.maintenabilityScore,
          securityScore: analysisResult.securityScore,
          innovationScore: analysisResult.innovationScore,
          overallHealthScore: analysisResult.overallHealthScore,
          estimatedVulnerabilities: analysisResult.estimatedVulnerabilities,
          estimatedBugs: analysisResult.estimatedBugs,
          estimatedBuildTime: analysisResult.estimatedBuildTime,
          estimatedTestCoverage: analysisResult.estimatedTestCoverage,
          qualityByOrganization: analysisResult.qualityByOrganization as unknown as Prisma.InputJsonValue,
          repositoryScores: analysisResult.repositoryScores as unknown as Prisma.InputJsonValue,
          insights: analysisResult.insights as unknown as Prisma.InputJsonValue,
          metadata: analysisResult.metadata as unknown as Prisma.InputJsonValue,
          updatedAt: new Date(),
        },
      });

      logger.info('Analyse IA mise à jour avec succès', {
        aiAnalysisId: aiAnalysis.id,
        qualityScore: analysisResult.qualityScore,
      });

      return aiAnalysis;
    } catch (error: unknown) {
      logger.error('Erreur lors de la mise à jour analyse IA', {
        id,
        error: (error as Error).message,
      });
      throw new Error(`Mise à jour analyse IA échouée: ${(error as Error).message}`);
    }
  }

  /**
   * Upsert - Crée ou met à jour une analyse IA
   */
  static async upsert(
    username: string,
    userId: string,
    analysisResult: AIAnalysisResult,
  ): Promise<PrismaAIAnalysis> {
    const existing = await this.findLatestByUsername(username);

    if (existing != null) {
      return this.update(existing.id, analysisResult);
    } else {
      return this.create(username, userId, analysisResult);
    }
  }

  /**
   * Supprime une analyse IA
   */
  static async delete(id: string): Promise<void> {
    const prisma = databaseConfig.getPrismaClient();
    if (prisma == null) {
      throw new Error('Base de données non initialisée');
    }

    try {
      await prisma.aIAnalysis.delete({
        where: { id },
      });

      logger.info('Analyse IA supprimée avec succès', { aiAnalysisId: id });
    } catch (error: unknown) {
      logger.error('Erreur lors de la suppression analyse IA', {
        id,
        error: (error as Error).message,
      });
      throw new Error(`Suppression analyse IA échouée: ${(error as Error).message}`);
    }
  }

  /**
   * Trouve toutes les analyses d'un utilisateur
   */
  static async findAllByUsername(
    username: string,
    options: {
      limit?: number;
      offset?: number;
    } = {},
  ): Promise<{ analyses: PrismaAIAnalysis[]; total: number }> {
    const prisma = databaseConfig.getPrismaClient();
    if (prisma == null) {
      throw new Error('Base de données non initialisée');
    }

    try {
      const { limit = 10, offset = 0 } = options;

      const [analyses, total] = await Promise.all([
        prisma.aIAnalysis.findMany({
          where: { username },
          take: limit,
          skip: offset,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: { login: true, name: true, avatarUrl: true },
            },
          },
        }),
        prisma.aIAnalysis.count({ where: { username } }),
      ]);

      logger.debug('Recherche toutes analyses IA par username', {
        username,
        count: analyses.length,
        total,
      });

      return { analyses, total };
    } catch (error: unknown) {
      logger.error('Erreur lors de la recherche analyses IA par username', {
        username,
        error: (error as Error).message,
      });
      throw error as Error;
    }
  }

  /**
   * Statistiques des analyses IA
   */
  static async getStats(): Promise<{
    totalAnalyses: number;
    averageQualityScore: number;
    averageSecurityScore: number;
    recentActivity: {
      last24h: number;
      lastWeek: number;
      lastMonth: number;
    };
  }> {
    const prisma = databaseConfig.getPrismaClient();
    if (prisma == null) {
      throw new Error('Base de données non initialisée');
    }

    try {
      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const [
        totalAnalyses,
        allAnalyses,
        activity24h,
        activityWeek,
        activityMonth,
      ] = await Promise.all([
        prisma.aIAnalysis.count(),
        prisma.aIAnalysis.findMany({
          select: { qualityScore: true, securityScore: true },
        }),
        prisma.aIAnalysis.count({ where: { createdAt: { gte: last24h } } }),
        prisma.aIAnalysis.count({ where: { createdAt: { gte: lastWeek } } }),
        prisma.aIAnalysis.count({ where: { createdAt: { gte: lastMonth } } }),
      ]);

      const averageQualityScore = totalAnalyses > 0
        ? allAnalyses.reduce((sum, a) => sum + a.qualityScore, 0) / totalAnalyses
        : 0;

      const averageSecurityScore = totalAnalyses > 0
        ? allAnalyses.reduce((sum, a) => sum + a.securityScore, 0) / totalAnalyses
        : 0;

      return {
        totalAnalyses,
        averageQualityScore: Math.round(averageQualityScore * 100) / 100,
        averageSecurityScore: Math.round(averageSecurityScore * 100) / 100,
        recentActivity: {
          last24h: activity24h,
          lastWeek: activityWeek,
          lastMonth: activityMonth,
        },
      };
    } catch (error: unknown) {
      logger.error('Erreur lors du calcul des statistiques analyses IA', {
        error: (error as Error).message,
      });
      throw error as Error;
    }
  }

  /**
   * Convertit une PrismaAIAnalysis vers AIAnalysisResult
   */
  static toAIAnalysisResult(prismaAnalysis: PrismaAIAnalysis): AIAnalysisResult {
    return {
      qualityScore: prismaAnalysis.qualityScore,
      maintenabilityScore: prismaAnalysis.maintenabilityScore,
      securityScore: prismaAnalysis.securityScore,
      innovationScore: prismaAnalysis.innovationScore,
      overallHealthScore: prismaAnalysis.overallHealthScore,
      estimatedVulnerabilities: prismaAnalysis.estimatedVulnerabilities,
      estimatedBugs: prismaAnalysis.estimatedBugs,
      estimatedBuildTime: prismaAnalysis.estimatedBuildTime,
      estimatedTestCoverage: prismaAnalysis.estimatedTestCoverage,
      qualityByOrganization: prismaAnalysis.qualityByOrganization as unknown as {
        personal: number;
        organization: number;
        school: number;
      },
      repositoryScores: prismaAnalysis.repositoryScores as unknown as Array<{
        name: string;
        qualityScore: number;
        recommendation: string;
        strengths: string[];
        improvementAreas: string[];
      }>,
      insights: prismaAnalysis.insights as unknown as {
        summary: string;
        strengths: string[];
        weaknesses: string[];
        recommendations: string[];
        careerAdvice: string[];
      },
      metadata: prismaAnalysis.metadata as unknown as {
        analysisDate: Date;
        model: string;
        confidenceScore: number;
        analysisVersion: string;
      },
    };
  }
}
