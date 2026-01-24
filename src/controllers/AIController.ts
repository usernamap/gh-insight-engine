import { Request, Response } from 'express';
import { asyncHandler, createError } from '@/middleware/errorHandler';
import { logWithContext } from '@/utils/logger';
import { AuthenticatedUser } from '@/types/github';
import AIAnalysisService, { AIAnalysisResult } from '@/services/AIAnalysisService';
import {
  AI_MESSAGES,
  AI_TIME_CONSTANTS,
  AI_LIMITS,
  AI_LOG_EVENTS,
  AI_SERVICE_NAMES,
  AI_DATA_SOURCES,
  AI_ACCESS_LEVELS,
  AI_SERVICE_STATUS,
  AI_SERVICE_INFO,
  AI_HTTP_STATUS,
  AI_ERROR_PATTERNS,
} from '@/constants';

export class AIController {
  static async performAIAnalysisInternal(username: string): Promise<AIAnalysisResult> {
    return await AIAnalysisService.analyzeUser(String(username));
  }

  /**
   * Launches a new AI analysis for a user
   * POST /api/ai/:username
   */
  static performAIAnalysis = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { username } = req.params;
    const authenticatedUser = req.user as AuthenticatedUser;
    const startTime = Date.now();

    if (authenticatedUser == null) {
      throw createError.authentication(AI_MESSAGES.AUTHENTICATION_REQUIRED);
    }

    if (authenticatedUser.username !== username) {
      throw createError.authorization(AI_MESSAGES.AUTHORIZATION_DENIED);
    }

    logWithContext.api(AI_LOG_EVENTS.PERFORM_ANALYSIS, req.path, true, {
      targetUsername: username,
      requesterId: authenticatedUser.id,
    });

    try {
      const analysisResult = await AIController.performAIAnalysisInternal(username);

      const processingTime = Date.now() - startTime;

      logWithContext.api(AI_LOG_EVENTS.PERFORM_ANALYSIS_SUCCESS, req.path, true, {
        targetUsername: username,
        processingTime: `${processingTime}ms`,
        qualityScore: analysisResult.qualityScore,
        vulnerabilities: analysisResult.estimatedVulnerabilities,
        bugs: analysisResult.estimatedBugs,
      });

      res.status(AI_HTTP_STATUS.CREATED).json({
        message: AI_MESSAGES.ANALYSIS_COMPLETED,
        status: 'completed',
        analysis: analysisResult,
        performance: {
          processingTime: `${processingTime}ms`,
          model: analysisResult.metadata.model,
          confidenceScore: analysisResult.metadata.confidenceScore,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logWithContext.api(AI_LOG_EVENTS.PERFORM_ANALYSIS_ERROR, req.path, false, {
        targetUsername: username,
        error: String(error),
      });

      if (
        error instanceof Error &&
        error.message.includes(AI_ERROR_PATTERNS.OPENAI_SERVICE_UNAVAILABLE)
      ) {
        throw createError.externalService(AI_SERVICE_NAMES.OPENAI, error);
      }

      if (error instanceof Error && error.message.includes(AI_ERROR_PATTERNS.NOT_FOUND)) {
        throw createError.notFound(error.message);
      }

      throw createError.externalService(AI_SERVICE_NAMES.AI_ANALYSIS, error as Error);
    }
  });

  /**
   * Retrieves the existing AI analysis for a user
   * GET /api/ai/:username
   */
  static getAIAnalysis = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { username } = req.params;
    const authenticatedUser = req.user as AuthenticatedUser;

    logWithContext.api(AI_LOG_EVENTS.GET_ANALYSIS, req.path, true, {
      targetUsername: username,
      requesterId: authenticatedUser?.id,
      isAuthenticated: authenticatedUser != null,
    });

    try {
      const existingAnalysis = await AIAnalysisService.getExistingAnalysis(String(username));

      if (existingAnalysis == null) {
        throw createError.notFound(AI_MESSAGES.NO_ANALYSIS_FOUND);
      }

      const analysisAge = Date.now() - new Date(existingAnalysis.metadata.analysisDate).getTime();
      const isStale = analysisAge > AI_TIME_CONSTANTS.STALE_THRESHOLD_MS;

      const accessLevel =
        authenticatedUser?.username === username
          ? AI_ACCESS_LEVELS.COMPLETE
          : AI_ACCESS_LEVELS.PUBLIC;

      let filteredAnalysis: Partial<AIAnalysisResult> = existingAnalysis;

      if (accessLevel === AI_ACCESS_LEVELS.PUBLIC) {
        filteredAnalysis = {
          qualityScore: existingAnalysis.qualityScore,
          overallHealthScore: existingAnalysis.overallHealthScore,
          qualityByOrganization: existingAnalysis.qualityByOrganization,
          repositoryScores: existingAnalysis.repositoryScores.slice(
            0,
            AI_LIMITS.MAX_REPOSITORIES_DISPLAY
          ), // Limit to 5 repos
          insights: {
            summary: existingAnalysis.insights.summary,
            strengths: existingAnalysis.insights.strengths.slice(0, AI_LIMITS.MAX_INSIGHTS_DISPLAY),
            recommendations: existingAnalysis.insights.recommendations.slice(
              0,
              AI_LIMITS.MAX_INSIGHTS_DISPLAY
            ),
            weaknesses: [],
            careerAdvice: [],
          },
          metadata: existingAnalysis.metadata,
          estimatedVulnerabilities: undefined,
          estimatedBugs: undefined,
          estimatedBuildTime: undefined,
          estimatedTestCoverage: undefined,
          maintenabilityScore: undefined,
          securityScore: undefined,
          innovationScore: undefined,
        };
      }

      const responseData = {
        analysis: filteredAnalysis,
        metadata: {
          dataSource: AI_DATA_SOURCES.AI_ANALYSIS,
          analysisAge: Math.round(analysisAge / AI_TIME_CONSTANTS.HOUR_MS),
          isStale,
          accessLevel,
          lastAnalyzed: existingAnalysis.metadata.analysisDate,
          model: existingAnalysis.metadata.model,
          recommendation: isStale ? AI_MESSAGES.ANALYSIS_STALE : AI_MESSAGES.RECENT_ANALYSIS,
        },
        interfaceMetrics: {
          qualityAverage: `${existingAnalysis.qualityScore.toFixed(1)}%`,
          vulnerabilities:
            accessLevel === AI_ACCESS_LEVELS.COMPLETE
              ? existingAnalysis.estimatedVulnerabilities
              : null,
          bugsDetected:
            accessLevel === AI_ACCESS_LEVELS.COMPLETE ? existingAnalysis.estimatedBugs : null,
          buildTime:
            accessLevel === AI_ACCESS_LEVELS.COMPLETE
              ? `${existingAnalysis.estimatedBuildTime}s`
              : null,
          testCoverage:
            accessLevel === AI_ACCESS_LEVELS.COMPLETE
              ? `${existingAnalysis.estimatedTestCoverage.toFixed(1)}%`
              : null,
          healthScore: existingAnalysis.overallHealthScore.toFixed(1),

          organizationQualityScores: {
            personal: `${existingAnalysis.qualityByOrganization.personal.toFixed(1)}%`,
            organization: `${existingAnalysis.qualityByOrganization.organization.toFixed(1)}%`,
            school: `${existingAnalysis.qualityByOrganization.school.toFixed(1)}%`,
          },

          topRepositoryScores: existingAnalysis.repositoryScores
            .slice(0, AI_LIMITS.MAX_REPOSITORIES_DISPLAY)
            .map(repo => ({
              name: repo.name,
              qualityScore: `${repo.qualityScore.toFixed(1)}%`,
              recommendation: repo.recommendation,
            })),
        },
        timestamp: new Date().toISOString(),
      };

      logWithContext.api(AI_LOG_EVENTS.GET_ANALYSIS_SUCCESS, req.path, true, {
        targetUsername: username,
        accessLevel,
        analysisAge: Math.round(analysisAge / AI_TIME_CONSTANTS.HOUR_MS),
        qualityScore: existingAnalysis.qualityScore,
      });

      res.status(AI_HTTP_STATUS.OK).json(responseData);
    } catch (error) {
      if (error instanceof Error && error.message.includes(AI_ERROR_PATTERNS.NO_ANALYSIS_FOUND)) {
        throw error;
      }

      logWithContext.api(AI_LOG_EVENTS.GET_ANALYSIS_ERROR, req.path, false, {
        targetUsername: username,
        error: String(error),
      });

      throw createError.externalService(AI_SERVICE_NAMES.AI_ANALYSIS, error as Error);
    }
  });

  /**
   * Supprime toutes les analyses IA d'un utilisateur
   * DELETE /api/ai/:username
   */
  static deleteAIAnalysis = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { username } = req.params;
    const authenticatedUser = req.user as AuthenticatedUser;

    if (authenticatedUser == null) {
      throw createError.authentication(AI_MESSAGES.AUTHENTICATION_REQUIRED);
    }
    if (authenticatedUser.username !== username) {
      throw createError.authorization(AI_MESSAGES.AUTHORIZATION_DENIED);
    }

    logWithContext.api(AI_LOG_EVENTS.DELETE_ANALYSIS, req.path, true, {
      targetUsername: username,
      requesterId: authenticatedUser.id,
    });

    try {
      const deletedCount = await AIAnalysisService.deleteAllUserAnalyses(String(username));
      if (deletedCount === 0) {
        throw createError.notFound(AI_MESSAGES.NO_ANALYSIS_FOUND);
      }
      logWithContext.api(AI_LOG_EVENTS.DELETE_ANALYSIS_SUCCESS, req.path, true, {
        targetUsername: username,
        deletedCount,
      });
      res.status(AI_HTTP_STATUS.OK).json({
        message: AI_MESSAGES.AI_ANALYSIS_DELETED_SUCCESS,
        status: 'completed',
        summary: {
          username,
          deletedCount,
          dataFreshness: 'database',
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logWithContext.api(AI_LOG_EVENTS.DELETE_ANALYSIS_ERROR, req.path, false, {
        targetUsername: username,
        error: String(error),
      });
      throw createError.externalService(AI_SERVICE_NAMES.AI_ANALYSIS, error as Error);
    }
  });

  /**
   * Retrieves the AI service status
   * GET /api/ai/status
   */
  static getAIServiceStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const authenticatedUser = req.user as AuthenticatedUser;

    logWithContext.api(AI_LOG_EVENTS.GET_SERVICE_STATUS, req.path, true, {
      requesterId: authenticatedUser?.id,
    });

    try {
      const openaiConfig = (await import('@/config/openai')).default;

      const isAvailable = openaiConfig.isAvailable();
      const config = openaiConfig.getDefaultConfig();

      let connectivity = false;
      if (isAvailable === true) {
        try {
          connectivity = await openaiConfig.testConnection();
        } catch {
          logWithContext.api(AI_LOG_EVENTS.GET_SERVICE_STATUS_ERROR, req.path, false, {
            error: AI_MESSAGES.OPENAI_CONNECTION_FAILED,
          });
        }
      }

      const responseData = {
        service: AI_SERVICE_INFO.SERVICE_NAME,
        status:
          isAvailable === true && connectivity === true
            ? AI_SERVICE_STATUS.AVAILABLE
            : AI_SERVICE_STATUS.UNAVAILABLE,
        configuration: {
          model: config.model,
          maxTokens: config.max_tokens,
          temperature: config.temperature,
        },
        capabilities: {
          qualityAnalysis: isAvailable === true,
          securityAnalysis: isAvailable === true,
          performanceAnalysis: isAvailable === true,
          repositoryScoring: isAvailable === true,
          careerInsights: isAvailable === true,
        },
        limitations:
          isAvailable === true
            ? []
            : [AI_MESSAGES.OPENAI_NOT_CONFIGURED, AI_MESSAGES.AI_SERVICE_UNAVAILABLE],
        fallbackMode: {
          enabled: true,
          description: AI_MESSAGES.FALLBACK_MODE_DESCRIPTION,
        },
        timestamp: new Date().toISOString(),
      };

      logWithContext.api(AI_LOG_EVENTS.GET_SERVICE_STATUS_SUCCESS, req.path, true, {
        isAvailable,
        connectivity,
        model: config.model,
      });

      res.status(AI_HTTP_STATUS.OK).json(responseData);
    } catch (error) {
      logWithContext.api(AI_LOG_EVENTS.GET_SERVICE_STATUS_ERROR, req.path, false, {
        error: String(error),
      });

      throw createError.externalService(AI_SERVICE_NAMES.AI_SERVICE_STATUS, error as Error);
    }
  });
}

export default AIController;
