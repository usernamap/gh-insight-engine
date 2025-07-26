import { Request, Response } from 'express';
import { asyncHandler, createError } from '@/middleware/errorHandler';
import { logWithContext } from '@/utils/logger';
import { AuthenticatedUser } from '@/types/github';
import { GitHubService } from '@/services/GitHubService';
import { UserModel } from '@/models/User';
import { RepositoryModel } from '@/models/Repository';
import AIAnalysisService from '@/services/AIAnalysisService';

/**
 * Résultat détaillé de chaque étape du refresh
 */
interface RefreshStepResult {
  step: 'users' | 'repositories' | 'ai';
  success: boolean;
  duration: number;
  error?: string;
  data?: unknown;
}

/**
 * Réponse complète du refresh
 */
interface RefreshResponse {
  success: boolean;
  message: string;
  username: string;
  totalDuration: number;
  steps: RefreshStepResult[];
  completedSteps: number;
  failedAt?: string;
}

/**
 * Contrôleur de refresh - Mise à jour complète d'un utilisateur
 * Enchaîne les appels : users → repositories → ai
 */
export class RefreshController {
  /**
   * Rafraîchit toutes les données d'un utilisateur
   * POST /api/refresh/:username
   */
  static refreshUserData = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { username } = req.params;
      const authenticatedUser = req.user as AuthenticatedUser;
      const startTime = Date.now();

      if (authenticatedUser == null) {
        throw createError.authentication('Authentification requise pour rafraîchir les données');
      }

      if (authenticatedUser.username !== username) {
        throw createError.authorization('Vous ne pouvez rafraîchir que vos propres données');
      }

      logWithContext.api('refresh_user_data_start', req.path, true, {
        targetUsername: username,
        requesterId: authenticatedUser.id,
        timestamp: new Date().toISOString(),
      });

      const steps: RefreshStepResult[] = [];
      let completedSteps = 0;
      let failedAt: string | undefined;

      // Initialiser le service GitHub une seule fois
      const githubService = await GitHubService.create(authenticatedUser.githubToken);

      try {
        // Étape 1 : Collecte des données utilisateur
        const userStepStart = Date.now();
        try {
          logWithContext.api('refresh_step_users_start', req.path, true, { username });

          // Récupération du profil utilisateur depuis GitHub API
          const userProfile = await githubService.getUserProfile();

          // Sauvegarde du profil utilisateur
          await UserModel.upsert(userProfile);

          const userStepDuration = Date.now() - userStepStart;
          steps.push({
            step: 'users',
            success: true,
            duration: userStepDuration,
          });
          completedSteps++;

          logWithContext.api('refresh_step_users_success', req.path, true, {
            username,
            duration: userStepDuration,
          });
        } catch (error: unknown) {
          const userStepDuration = Date.now() - userStepStart;
          const errorMessage = error instanceof Error ? error.message : String(error);
          steps.push({
            step: 'users',
            success: false,
            duration: userStepDuration,
            error: errorMessage,
          });
          failedAt = 'users';
          throw error;
        }

        // Étape 2 : Collecte des repositories
        const repoStepStart = Date.now();
        try {
          logWithContext.api('refresh_step_repositories_start', req.path, true, { username });

          // Récupération des repositories utilisateur
          const allRepositories = await githubService.getUserRepos();

          // Sauvegarde des repositories
          for (const repo of allRepositories) {
            await RepositoryModel.upsert(repo, username);
          }

          const repoStepDuration = Date.now() - repoStepStart;
          steps.push({
            step: 'repositories',
            success: true,
            duration: repoStepDuration,
          });
          completedSteps++;

          logWithContext.api('refresh_step_repositories_success', req.path, true, {
            username,
            duration: repoStepDuration,
          });
        } catch (error: unknown) {
          const repoStepDuration = Date.now() - repoStepStart;
          const errorMessage = error instanceof Error ? error.message : String(error);
          steps.push({
            step: 'repositories',
            success: false,
            duration: repoStepDuration,
            error: errorMessage,
          });
          failedAt = 'repositories';
          throw error;
        }

        // Étape 3 : Analyse IA
        const aiStepStart = Date.now();
        try {
          logWithContext.api('refresh_step_ai_start', req.path, true, { username });

          // Lancer l'analyse IA complète
          await AIAnalysisService.analyzeUser(username);

          const aiStepDuration = Date.now() - aiStepStart;
          steps.push({
            step: 'ai',
            success: true,
            duration: aiStepDuration,
          });
          completedSteps++;

          logWithContext.api('refresh_step_ai_success', req.path, true, {
            username,
            duration: aiStepDuration,
          });
        } catch (error: unknown) {
          const aiStepDuration = Date.now() - aiStepStart;
          const errorMessage = error instanceof Error ? error.message : String(error);
          steps.push({
            step: 'ai',
            success: false,
            duration: aiStepDuration,
            error: errorMessage,
          });
          failedAt = 'ai';
          throw error;
        }

        // Succès complet
        const totalDuration = Date.now() - startTime;
        const response: RefreshResponse = {
          success: true,
          message: 'Toutes les données ont été rafraîchies avec succès',
          username,
          totalDuration,
          steps,
          completedSteps,
        };

        logWithContext.api('refresh_user_data_success', req.path, true, {
          username,
          totalDuration,
          completedSteps,
        });

        res.status(200).json(response);
      } catch (error: unknown) {
        // Échec partiel ou total
        const totalDuration = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : String(error);
        const response: RefreshResponse = {
          success: false,
          message: `Échec lors de l'étape '${failedAt}': ${errorMessage}`,
          username,
          totalDuration,
          steps,
          completedSteps,
          failedAt,
        };

        logWithContext.api('refresh_user_data_failure', req.path, false, {
          username,
          totalDuration,
          completedSteps,
          failedAt,
          error: errorMessage,
        });

        // Statut 207 (Multi-Status) pour indiquer un succès partiel
        const statusCode = completedSteps > 0 ? 207 : 500;
        res.status(statusCode).json(response);
      }
    },
  );
}
