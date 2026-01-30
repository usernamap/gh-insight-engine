import { Request, Response } from 'express';
import { User as PrismaUser } from '@prisma/client';
import { asyncHandler, createError } from '@/middleware';
import { logWithContext } from '@/utils';
import logger from '@/utils/logger';
import { AuthenticatedUser } from '@/types';
import { RepositoryModel } from '@/models';
import { RepoController, UserController, AIController } from '@/controllers';
import { getLanguageMetadataService } from '@/services/LanguageMetadataService';
import {
  REFRESH_MESSAGES,
  REFRESH_STATUS_CODES,
  REFRESH_STEPS,
  REFRESH_LOG_IDS,
  REFRESH_DEFAULTS,
  REFRESH_RESPONSE_FIELDS,
} from '@/constants';

const refreshStatusMap = new Map<
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
    steps?: Array<{
      step: string;
      success: boolean;
      duration: number;
      error?: string;
    }>;
  }
>();

interface RefreshStepResult {
  step: (typeof REFRESH_STEPS)[keyof typeof REFRESH_STEPS];
  success: boolean;
  duration: number;
  error?: string;
  data?: unknown;
}

export class RefreshController {
  static refreshUserData = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { username } = req.params;
    const authenticatedUser = req.user as AuthenticatedUser;

    if (authenticatedUser == null) {
      throw createError.authentication(REFRESH_MESSAGES.AUTHENTICATION_REQUIRED);
    }

    if (authenticatedUser.username !== username) {
      throw createError.authorization(REFRESH_MESSAGES.AUTHORIZATION_DENIED);
    }

    logWithContext.api(REFRESH_LOG_IDS.USER_DATA_START, req.path, true, {
      targetUsername: username,
      requesterId: authenticatedUser.id,
      timestamp: new Date().toISOString(),
    });

    this.updateRefreshStatus(username, {
      status: 'in_progress',
      progressPercentage: 0,
      startedAt: new Date(),
      currentStep: 1,
      totalSteps: 3,
      estimatedCompletion: new Date(Date.now() + 10 * 60 * 1000),
      steps: [],
    });

    res.status(REFRESH_STATUS_CODES.ACCEPTED).json({
      [REFRESH_RESPONSE_FIELDS.MESSAGE]: 'Data refresh started',
      [REFRESH_RESPONSE_FIELDS.SUCCESS]: true,
      [REFRESH_RESPONSE_FIELDS.USERNAME]: username,
      [REFRESH_RESPONSE_FIELDS.REFRESH_STATUS]: 'in_progress',
      [REFRESH_RESPONSE_FIELDS.METADATA]: {
        [REFRESH_RESPONSE_FIELDS.STARTED_AT]: new Date().toISOString(),
        [REFRESH_RESPONSE_FIELDS.ESTIMATED_COMPLETION]: new Date(
          Date.now() + 10 * 60 * 1000
        ).toISOString(),
        [REFRESH_RESPONSE_FIELDS.CURRENT_STEP]: 1,
        [REFRESH_RESPONSE_FIELDS.TOTAL_STEPS]: 3,
      },
      [REFRESH_RESPONSE_FIELDS.TIMESTAMP]: new Date().toISOString(),
    });

    // Start background refresh with comprehensive error handling
    this.refreshUserDataBackground(authenticatedUser.githubToken, username).catch((error) => {
      // This catch block ensures no unhandled rejections occur
      logger.error('Critical error in background refresh process', {
        username,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      });

      // Update status to failed with appropriate error message
      const isRateLimitError = error instanceof Error &&
        (error.name === 'GitHubRateLimitError' ||
          error.message.includes('rate limit') ||
          error.message.includes('API rate limit exceeded'));

      const errorMessage = isRateLimitError
        ? 'GitHub API rate limit exceeded. Please wait 10-30 minutes and try again.'
        : (error instanceof Error ? error.message : 'An unexpected error occurred during data refresh');

      this.updateRefreshStatus(username, {
        status: 'failed',
        progressPercentage: 0,
        startedAt: new Date(),
        error: errorMessage,
        completedAt: new Date(),
        currentStep: 1,
        totalSteps: 3,
        steps: [],
      });
    });
  });

  private static updateRefreshStatus(
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
      steps?: Array<{
        step: string;
        success: boolean;
        duration: number;
        error?: string;
      }>;
    }
  ): void {
    refreshStatusMap.set(username, status);

    if (status.status === 'completed' || status.status === 'failed') {
      setTimeout(
        () => {
          refreshStatusMap.delete(username);
        },
        60 * 60 * 1000
      );
    }
  }

  static getRefreshStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { username } = req.params;
    const authenticatedUser = req.user as AuthenticatedUser;

    if (authenticatedUser == null) {
      throw createError.authentication(REFRESH_MESSAGES.AUTHENTICATION_REQUIRED);
    }

    if (authenticatedUser.username !== username) {
      throw createError.authorization(REFRESH_MESSAGES.AUTHORIZATION_DENIED);
    }

    logWithContext.api('get_refresh_status', req.path, true, {
      [REFRESH_RESPONSE_FIELDS.TARGET_USERNAME]: username,
      [REFRESH_RESPONSE_FIELDS.REQUESTER_ID]: authenticatedUser.id,
    });

    try {
      const status = refreshStatusMap.get(username);

      if (status == null) {
        throw createError.notFound(REFRESH_MESSAGES.STATUS_NOT_FOUND);
      }

      logWithContext.api('get_refresh_status_success', req.path, true, {
        [REFRESH_RESPONSE_FIELDS.TARGET_USERNAME]: username,
        [REFRESH_RESPONSE_FIELDS.REFRESH_STATUS]: status.status,
      });

      // Check for rate limit errors in the status
      const isRateLimitError = status.error != null &&
        (status.error.includes('rate limit') || status.error.includes('API rate limit exceeded'));

      const responseData = {
        [REFRESH_RESPONSE_FIELDS.MESSAGE]: ((): string => {
          if (isRateLimitError) {
            return 'GitHub API rate limit exceeded. Please wait 10-30 minutes and try again.';
          }
          if (status.status === 'in_progress') return REFRESH_MESSAGES.STATUS_IN_PROGRESS;
          if (status.status === 'completed') return REFRESH_MESSAGES.STATUS_COMPLETED;
          if (status.status === 'failed') return REFRESH_MESSAGES.STATUS_FAILED;
          return REFRESH_MESSAGES.STATUS_NOT_FOUND;
        })(),
        [REFRESH_RESPONSE_FIELDS.REFRESH_STATUS]: status.status,
        [REFRESH_RESPONSE_FIELDS.PROGRESS_PERCENTAGE]: status.progressPercentage,
        [REFRESH_RESPONSE_FIELDS.STARTED_AT]: status.startedAt.toISOString(),
        [REFRESH_RESPONSE_FIELDS.COMPLETED_AT]: status.completedAt?.toISOString(),
        [REFRESH_RESPONSE_FIELDS.ESTIMATED_COMPLETION]: status.estimatedCompletion?.toISOString(),
        [REFRESH_RESPONSE_FIELDS.CURRENT_STEP]: status.currentStep,
        [REFRESH_RESPONSE_FIELDS.TOTAL_STEPS]: status.totalSteps,
        ...(status.error != null && { [REFRESH_RESPONSE_FIELDS.ERROR]: status.error }),
        ...(status.steps != null && { [REFRESH_RESPONSE_FIELDS.STEPS]: status.steps }),
        ...(isRateLimitError && {
          rateLimitError: true,
          waitTime: '10-30 minutes',
          documentation: 'This error occurs when GitHub API rate limits are exceeded. Wait 10-30 minutes before retrying.'
        }),
        [REFRESH_RESPONSE_FIELDS.TIMESTAMP]: new Date().toISOString(),
      };

      res.status(REFRESH_STATUS_CODES.SUCCESS).json(responseData);
    } catch (error) {
      logWithContext.api('get_refresh_status_error', req.path, false, {
        [REFRESH_RESPONSE_FIELDS.TARGET_USERNAME]: username,
        [REFRESH_RESPONSE_FIELDS.ERROR]: String(error),
      });

      throw error;
    }
  });

  private static async refreshUserDataBackground(
    githubToken: string,
    username: string
  ): Promise<void> {
    const startTime = Date.now();
    const steps: RefreshStepResult[] = [];
    let completedSteps = REFRESH_DEFAULTS.COMPLETED_STEPS;
    let failedAt: string | undefined;

    let savedUser: PrismaUser;
    try {
      this.updateRefreshStatus(username, {
        status: 'in_progress',
        progressPercentage: 33,
        startedAt: new Date(),
        currentStep: 2,
        totalSteps: 3,
        estimatedCompletion: new Date(Date.now() + 7 * 60 * 1000),
        steps: [],
      });

      const userStepStart = Date.now();
      try {
        logWithContext.api(REFRESH_LOG_IDS.STEP_USERS_START, 'background', true, { username });

        const { userProfile, savedUser: userSaved } =
          await UserController.collectUserDataInternal(githubToken);

        savedUser = userSaved;

        const userStepDuration = Date.now() - userStepStart;
        steps.push({
          step: REFRESH_STEPS.USERS,
          success: true,
          duration: userStepDuration,
        });
        completedSteps++;

        logWithContext.api(REFRESH_LOG_IDS.STEP_USERS_SUCCESS, 'background', true, {
          username,
          duration: userStepDuration,
          userProfileId: userProfile.id,
        });
      } catch (error: unknown) {
        const userStepDuration = Date.now() - userStepStart;
        const errorMessage = error instanceof Error ? error.message : String(error);

        // Check if this is a rate limit error
        const isRateLimitError = error instanceof Error &&
          (error.name === 'GitHubRateLimitError' ||
            errorMessage.includes('rate limit') ||
            errorMessage.includes('API rate limit exceeded'));

        const stepError = isRateLimitError
          ? 'GitHub API rate limit exceeded. Please wait 10-30 minutes and try again.'
          : errorMessage;

        steps.push({
          step: REFRESH_STEPS.USERS,
          success: false,
          duration: userStepDuration,
          error: stepError,
        });
        failedAt = REFRESH_STEPS.USERS;
        throw error;
      }

      this.updateRefreshStatus(username, {
        status: 'in_progress',
        progressPercentage: 66,
        startedAt: new Date(),
        currentStep: 3,
        totalSteps: 3,
        estimatedCompletion: new Date(Date.now() + 3 * 60 * 1000),
        steps,
      });

      const repoStepStart = Date.now();
      try {
        logWithContext.api(REFRESH_LOG_IDS.STEP_REPOSITORIES_START, 'background', true, {
          username,
        });

        const { enrichedRepositories } = await RepoController.collectRepositoriesInternal(
          githubToken,
          username
        );

        for (const repo of enrichedRepositories) {
          await RepositoryModel.upsert(repo, savedUser.id);
        }

        const repoStepDuration = Date.now() - repoStepStart;
        steps.push({
          step: REFRESH_STEPS.REPOSITORIES,
          success: true,
          duration: repoStepDuration,
        });
        completedSteps++;

        logWithContext.api(REFRESH_LOG_IDS.STEP_REPOSITORIES_SUCCESS, 'background', true, {
          username,
          duration: repoStepDuration,
        });
      } catch (error: unknown) {
        const repoStepDuration = Date.now() - repoStepStart;
        const errorMessage = error instanceof Error ? error.message : String(error);

        // Check if this is a rate limit error
        const isRateLimitError = error instanceof Error &&
          (error.name === 'GitHubRateLimitError' ||
            errorMessage.includes('rate limit') ||
            errorMessage.includes('API rate limit exceeded'));

        const stepError = isRateLimitError
          ? 'GitHub API rate limit exceeded. Please wait 10-30 minutes and try again.'
          : errorMessage;

        steps.push({
          step: REFRESH_STEPS.REPOSITORIES,
          success: false,
          duration: repoStepDuration,
          error: stepError,
        });
        failedAt = REFRESH_STEPS.REPOSITORIES;
        throw error;
      }

      const aiStepStart = Date.now();
      try {
        logWithContext.api(REFRESH_LOG_IDS.STEP_AI_START, 'background', true, { username });

        // 1. Classify languages first (used by downstream analysis potentially)
        try {
          await getLanguageMetadataService().collectAndClassifyLanguages(username);
          logger.info('Language classification completed during refresh', { username });
        } catch (langError) {
          // Non-fatal, log and continue
          logger.error('Language classification failed during refresh (continuing)', {
            username,
            error: String(langError)
          });
        }

        // 2. Perform Developer Analysis
        await AIController.performAIAnalysisInternal(username);

        const aiStepDuration = Date.now() - aiStepStart;
        steps.push({
          step: REFRESH_STEPS.AI,
          success: true,
          duration: aiStepDuration,
        });
        completedSteps++;

        logWithContext.api(REFRESH_LOG_IDS.STEP_AI_SUCCESS, 'background', true, {
          username,
          duration: aiStepDuration,
        });
      } catch (error: unknown) {
        const aiStepDuration = Date.now() - aiStepStart;
        const errorMessage = error instanceof Error ? error.message : String(error);

        // Check if this is a rate limit error
        const isRateLimitError = error instanceof Error &&
          (error.name === 'GitHubRateLimitError' ||
            errorMessage.includes('rate limit') ||
            errorMessage.includes('API rate limit exceeded'));

        const stepError = isRateLimitError
          ? 'GitHub API rate limit exceeded. Please wait 10-30 minutes and try again.'
          : errorMessage;

        steps.push({
          step: REFRESH_STEPS.AI,
          success: false,
          duration: aiStepDuration,
          error: stepError,
        });
        failedAt = REFRESH_STEPS.AI;
        throw error;
      }

      const totalDuration = Date.now() - startTime;

      this.updateRefreshStatus(username, {
        status: 'completed',
        progressPercentage: 100,
        startedAt: new Date(),
        completedAt: new Date(),
        currentStep: 3,
        totalSteps: 3,
        steps,
      });

      logWithContext.api(REFRESH_LOG_IDS.USER_DATA_SUCCESS, 'background', true, {
        username,
        totalDuration,
        completedSteps,
      });
    } catch (error: unknown) {
      const totalDuration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Check if this is a rate limit error for the overall status
      const isRateLimitError = error instanceof Error &&
        (error.name === 'GitHubRateLimitError' ||
          errorMessage.includes('rate limit') ||
          errorMessage.includes('API rate limit exceeded'));

      const finalError = isRateLimitError
        ? 'GitHub API rate limit exceeded. Please wait 10-30 minutes and try again.'
        : errorMessage;

      this.updateRefreshStatus(username, {
        status: 'failed',
        progressPercentage: 0,
        startedAt: new Date(),
        error: finalError,
        completedAt: new Date(),
        currentStep: 1,
        totalSteps: 3,
        steps,
      });

      logWithContext.api(REFRESH_LOG_IDS.USER_DATA_FAILURE, 'background', false, {
        username,
        totalDuration,
        completedSteps,
        failedAt,
        error: errorMessage,
      });
    }
  }
}
