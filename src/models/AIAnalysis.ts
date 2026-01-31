import { AIAnalysis, Prisma } from '@prisma/client';
import databaseConfig from '@/config/database';
import logger from '@/utils/logger';
import { AIAnalysisResult } from '@/services/AIAnalysisService';
import { AI_MESSAGES, AI_ANALYSIS_PAGINATION, AI_TIME_CONSTANTS, AI_LIMITS } from '@/constants';

export type PrismaAIAnalysis = AIAnalysis;

export class AIAnalysisModel {
  static async create(
    username: string,
    userId: string,
    analysisResult: AIAnalysisResult
  ): Promise<PrismaAIAnalysis> {
    const prisma = databaseConfig.getPrismaClient();
    if (prisma == null) {
      throw new Error(AI_MESSAGES.DATABASE_NOT_INITIALIZED);
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
          qualityByOrganization:
            analysisResult.qualityByOrganization as unknown as Prisma.InputJsonValue,
          repositoryScores: analysisResult.repositoryScores as unknown as Prisma.InputJsonValue,
          insights: analysisResult.insights as unknown as Prisma.InputJsonValue,
          metadata: analysisResult.metadata as unknown as Prisma.InputJsonValue,
          technologies: analysisResult.technologies as unknown as Prisma.InputJsonValue,
        },
      });

      logger.info(AI_MESSAGES.AI_ANALYSIS_CREATED_SUCCESS, {
        aiAnalysisId: aiAnalysis.id,
        username,
        userId,
        qualityScore: analysisResult.qualityScore,
        securityScore: analysisResult.securityScore,
      });

      return aiAnalysis;
    } catch (error: unknown) {
      logger.error(AI_MESSAGES.ERROR_CREATING_AI_ANALYSIS, {
        username,
        userId,
        error: (error as Error).message,
      });
      throw new Error(`${AI_MESSAGES.AI_ANALYSIS_CREATION_FAILED}${(error as Error).message}`);
    }
  }

  static async findLatestByUsername(username: string): Promise<PrismaAIAnalysis | null> {
    const prisma = databaseConfig.getPrismaClient();
    if (prisma == null) {
      throw new Error(AI_MESSAGES.DATABASE_NOT_INITIALIZED);
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

      logger.debug(AI_MESSAGES.SEARCH_AI_ANALYSIS_BY_USERNAME, {
        username,
        found: aiAnalysis != null,
        aiAnalysisId: aiAnalysis?.id,
      });

      return aiAnalysis;
    } catch (error: unknown) {
      logger.error(AI_MESSAGES.ERROR_SEARCHING_AI_ANALYSIS_BY_USERNAME, {
        username,
        error: (error as Error).message,
      });
      throw error as Error;
    }
  }

  static async update(id: string, analysisResult: AIAnalysisResult): Promise<PrismaAIAnalysis> {
    const prisma = databaseConfig.getPrismaClient();
    if (prisma == null) {
      throw new Error(AI_MESSAGES.DATABASE_NOT_INITIALIZED);
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
          qualityByOrganization:
            analysisResult.qualityByOrganization as unknown as Prisma.InputJsonValue,
          repositoryScores: analysisResult.repositoryScores as unknown as Prisma.InputJsonValue,
          insights: analysisResult.insights as unknown as Prisma.InputJsonValue,
          metadata: analysisResult.metadata as unknown as Prisma.InputJsonValue,
          technologies: analysisResult.technologies as unknown as Prisma.InputJsonValue,
          updatedAt: new Date(),
        },
      });

      logger.info(AI_MESSAGES.AI_ANALYSIS_UPDATED_SUCCESS, {
        aiAnalysisId: aiAnalysis.id,
        qualityScore: analysisResult.qualityScore,
      });

      return aiAnalysis;
    } catch (error: unknown) {
      logger.error(AI_MESSAGES.ERROR_UPDATING_AI_ANALYSIS, {
        id,
        error: (error as Error).message,
      });
      throw new Error(`${AI_MESSAGES.AI_ANALYSIS_UPDATE_FAILED}${(error as Error).message}`);
    }
  }

  static async upsert(
    username: string,
    userId: string,
    analysisResult: AIAnalysisResult
  ): Promise<PrismaAIAnalysis> {
    const existing = await this.findLatestByUsername(username);

    if (existing != null) {
      return this.update(existing.id, analysisResult);
    } else {
      return this.create(username, userId, analysisResult);
    }
  }

  static async delete(id: string): Promise<void> {
    const prisma = databaseConfig.getPrismaClient();
    if (prisma == null) {
      throw new Error(AI_MESSAGES.DATABASE_NOT_INITIALIZED);
    }

    try {
      await prisma.aIAnalysis.delete({
        where: { id },
      });

      logger.info(AI_MESSAGES.AI_ANALYSIS_DELETED_SUCCESS, { aiAnalysisId: id });
    } catch (error: unknown) {
      logger.error(AI_MESSAGES.ERROR_DELETING_AI_ANALYSIS, {
        id,
        error: (error as Error).message,
      });
      throw new Error(`${AI_MESSAGES.AI_ANALYSIS_DELETION_FAILED}${(error as Error).message}`);
    }
  }

  static async deleteByUsername(username: string): Promise<number> {
    const prisma = databaseConfig.getPrismaClient();
    if (prisma == null) {
      throw new Error(AI_MESSAGES.DATABASE_NOT_INITIALIZED);
    }
    try {
      const result = await prisma.aIAnalysis.deleteMany({ where: { username } });
      logger.info(AI_MESSAGES.AI_ANALYSIS_DELETED_SUCCESS, {
        username,
        deletedCount: result.count,
      });
      return result.count;
    } catch (error: unknown) {
      logger.error(AI_MESSAGES.ERROR_DELETING_AI_ANALYSIS, {
        username,
        error: (error as Error).message,
      });
      throw new Error(`${AI_MESSAGES.AI_ANALYSIS_DELETION_FAILED}${(error as Error).message}`);
    }
  }

  static async findAllByUsername(
    username: string,
    options: {
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ analyses: PrismaAIAnalysis[]; total: number }> {
    const prisma = databaseConfig.getPrismaClient();
    if (prisma == null) {
      throw new Error(AI_MESSAGES.DATABASE_NOT_INITIALIZED);
    }

    try {
      const {
        limit = AI_ANALYSIS_PAGINATION.DEFAULT_LIMIT,
        offset = AI_ANALYSIS_PAGINATION.DEFAULT_OFFSET,
      } = options;

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

      logger.debug(AI_MESSAGES.SEARCH_ALL_AI_ANALYSES_BY_USERNAME, {
        username,
        count: analyses.length,
        total,
      });

      return { analyses, total };
    } catch (error: unknown) {
      logger.error(AI_MESSAGES.ERROR_SEARCHING_AI_ANALYSES_BY_USERNAME, {
        username,
        error: (error as Error).message,
      });
      throw error as Error;
    }
  }

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
      throw new Error(AI_MESSAGES.DATABASE_NOT_INITIALIZED);
    }

    try {
      const now = new Date();
      const last24h = new Date(now.getTime() - AI_TIME_CONSTANTS.DAY_MS);
      const lastWeek = new Date(now.getTime() - AI_TIME_CONSTANTS.WEEK_MS);
      const lastMonth = new Date(now.getTime() - AI_TIME_CONSTANTS.MONTH_MS);

      const [totalAnalyses, allAnalyses, activity24h, activityWeek, activityMonth] =
        await Promise.all([
          prisma.aIAnalysis.count(),
          prisma.aIAnalysis.findMany({
            select: { qualityScore: true, securityScore: true },
          }),
          prisma.aIAnalysis.count({ where: { createdAt: { gte: last24h } } }),
          prisma.aIAnalysis.count({ where: { createdAt: { gte: lastWeek } } }),
          prisma.aIAnalysis.count({ where: { createdAt: { gte: lastMonth } } }),
        ]);

      const averageQualityScore =
        totalAnalyses > 0
          ? allAnalyses.reduce((sum, a) => sum + a.qualityScore, 0) / totalAnalyses
          : 0;

      const averageSecurityScore =
        totalAnalyses > 0
          ? allAnalyses.reduce((sum, a) => sum + a.securityScore, 0) / totalAnalyses
          : 0;

      return {
        totalAnalyses,
        averageQualityScore:
          Math.round(averageQualityScore * AI_LIMITS.SCORE_ROUNDING_PRECISION) /
          AI_LIMITS.SCORE_ROUNDING_PRECISION,
        averageSecurityScore:
          Math.round(averageSecurityScore * AI_LIMITS.SCORE_ROUNDING_PRECISION) /
          AI_LIMITS.SCORE_ROUNDING_PRECISION,
        recentActivity: {
          last24h: activity24h,
          lastWeek: activityWeek,
          lastMonth: activityMonth,
        },
      };
    } catch (error: unknown) {
      logger.error(AI_MESSAGES.ERROR_CALCULATING_AI_ANALYSIS_STATISTICS, {
        error: (error as Error).message,
      });
      throw error as Error;
    }
  }

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
      technologies: (prismaAnalysis.technologies as unknown as {
        categories: Record<string, string[]>;
        raw_sources: Record<string, string[]>;
        ignored_items: string[];
      } | null) ?? undefined,
      metadata: prismaAnalysis.metadata as unknown as {
        analysisDate: Date;
        model: string;
        confidenceScore: number;
        analysisVersion: string;
      },
    };
  }
}
