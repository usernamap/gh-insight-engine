import { Request, Response } from 'express';
import { User as PrismaUser, Prisma } from '@prisma/client';
import { asyncHandler, createError } from '@/middleware';
import { logWithContext } from '@/utils';
import logger from '@/utils/logger';
import { AuthenticatedUser } from '@/types';
import dbConfig from '@/config/database';
import { RepositoryModel } from '@/models';
import { RepoController, UserController, AIController } from '@/controllers';
import { getLanguageMetadataService } from '@/services/LanguageMetadataService';
import { technologyExtractionService, AIClassificationService } from '@/services';
import {
  REFRESH_LEASE_RENEWAL_MS,
  RefreshProgressService,
  type RefreshRun,
} from '@/services/RefreshProgressService';
import {
  REFRESH_MESSAGES,
  REFRESH_STATUS_CODES,
  REFRESH_STEPS,
  REFRESH_LOG_IDS,
  REFRESH_DEFAULTS,
  REFRESH_RESPONSE_FIELDS,
} from '@/constants';

const refreshProgress = new RefreshProgressService(() => dbConfig.getMongooseConnection()?.db);

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

    const startedAt = new Date();
    const estimatedCompletion = new Date(startedAt.getTime() + 10 * 60 * 1000);
    const run = await refreshProgress.begin(username, {
      status: 'in_progress',
      progressPercentage: 0,
      startedAt,
      currentStep: 1,
      totalSteps: 3,
      estimatedCompletion,
      steps: [],
    });

    res.status(REFRESH_STATUS_CODES.ACCEPTED).json({
      [REFRESH_RESPONSE_FIELDS.MESSAGE]: 'Data refresh started',
      [REFRESH_RESPONSE_FIELDS.SUCCESS]: true,
      [REFRESH_RESPONSE_FIELDS.USERNAME]: username,
      [REFRESH_RESPONSE_FIELDS.REFRESH_STATUS]: 'in_progress',
      [REFRESH_RESPONSE_FIELDS.METADATA]: {
        [REFRESH_RESPONSE_FIELDS.STARTED_AT]: startedAt.toISOString(),
        [REFRESH_RESPONSE_FIELDS.ESTIMATED_COMPLETION]: estimatedCompletion.toISOString(),
        [REFRESH_RESPONSE_FIELDS.CURRENT_STEP]: 1,
        [REFRESH_RESPONSE_FIELDS.TOTAL_STEPS]: 3,
      },
      [REFRESH_RESPONSE_FIELDS.TIMESTAMP]: new Date().toISOString(),
    });

    let renewing = false;
    const renewal = setInterval(() => {
      if (renewing) return;
      renewing = true;
      void refreshProgress.renew(username, run)
        .then(current => { if (!current) clearInterval(renewal); })
        .catch(() => { logger.warn('Refresh status lease renewal failed', { username }); })
        .finally(() => { renewing = false; });
    }, REFRESH_LEASE_RENEWAL_MS).unref();

    void this.refreshUserDataBackground(authenticatedUser.githubToken, username, run)
      .catch(async (error: unknown) => {
        logger.error('Critical error in background refresh process', {
          username,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString(),
        });
        try {
          await refreshProgress.update(username, run, {
            status: 'failed',
            progressPercentage: 0,
            startedAt,
            error: error instanceof Error ? error.message : 'Data refresh failed',
            completedAt: new Date(),
            currentStep: 1,
            totalSteps: 3,
            steps: [],
          });
        } catch {
          logger.error('Could not persist terminal refresh status', { username });
        }
      })
      .finally(() => { clearInterval(renewal); });
  });

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
      const status = await refreshProgress.read(username);

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
    username: string,
    run: RefreshRun
  ): Promise<void> {
    const startTime = Date.now();
    const steps: RefreshStepResult[] = [];
    let completedSteps = REFRESH_DEFAULTS.COMPLETED_STEPS;
    let failedAt: string | undefined;

    let savedUser: PrismaUser;
    try {
      await refreshProgress.update(username, run, {
        status: 'in_progress',
        progressPercentage: 33,
        startedAt: run.startedAt,
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

      await refreshProgress.update(username, run, {
        status: 'in_progress',
        progressPercentage: 66,
        startedAt: run.startedAt,
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

        // 3. New Phase: Advanced Technology Discovery (Tech Stack)
        try {
          const rawArtifacts = await technologyExtractionService.collectRawArtifacts(
            savedUser.id,
            githubToken
          );
          if (rawArtifacts.length > 0) {
            const refinedStack = await AIClassificationService.refineTechnologyStack(rawArtifacts);

            // Persist to AIAnalysis record
            // We need to find the analysis record first or assume performAIAnalysisInternal returned it or updated it
            // Assuming performAIAnalysisInternal returns the analysis result or we need to update it
            // Let's verify AIController logic next. For now, let's assume we can update the latest analysis
            const dbConfig = (await import('@/config/database')).default;
            const prisma = dbConfig.getPrismaClient();
            if (prisma) {
              await prisma.aIAnalysis.updateMany({
                where: { userId: savedUser.id },
                data: { technologies: refinedStack as unknown as Prisma.InputJsonValue }
              });
            }

            logger.info('Tech Stack Analysis saved', { username, stackSize: Object.keys(refinedStack.categories).length });
          }
        } catch (techError) {
          logger.error('Technology Analysis failed (non-fatal)', { username, error: String(techError) });
        }

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

      await refreshProgress.update(username, run, {
        status: 'completed',
        progressPercentage: 100,
        startedAt: run.startedAt,
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

      await refreshProgress.update(username, run, {
        status: 'failed',
        progressPercentage: 0,
        startedAt: run.startedAt,
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
