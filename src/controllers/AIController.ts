import { Request, Response } from 'express';
import { asyncHandler, createError } from '@/middleware/errorHandler';
import { logWithContext } from '@/utils/logger';
import { AuthenticatedUser } from '@/types/github';
import AIAnalysisService, {
  AIAnalysisResult,
} from '@/services/AIAnalysisService';

/**
 * Contrôleur AI - Analyses avancées avec Intelligence Artificielle
 * Fournit les métriques IA: qualité, vulnérabilités, bugs, performances
 */
export class AIController {
  /**
   * Lance une nouvelle analyse IA d'un utilisateur
   * POST /api/ai/:username
   */
  static performAIAnalysis = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { username } = req.params;
      const authenticatedUser = req.user as AuthenticatedUser;
      const startTime = Date.now();

      if (authenticatedUser == null) {
        throw createError.authentication(
          'Authentification requise pour lancer une analyse IA',
        );
      }

      if (authenticatedUser.username !== username) {
        throw createError.authorization(
          'Vous ne pouvez analyser que votre propre profil',
        );
      }

      logWithContext.api('perform_ai_analysis', req.path, true, {
        targetUsername: username,
        requesterId: authenticatedUser.id,
      });

      try {
        // Lancer l'analyse IA complète
        const analysisResult = await AIAnalysisService.analyzeUser(username);

        const processingTime = Date.now() - startTime;

        logWithContext.api('perform_ai_analysis_success', req.path, true, {
          targetUsername: username,
          processingTime: `${processingTime}ms`,
          qualityScore: analysisResult.qualityScore,
          vulnerabilities: analysisResult.estimatedVulnerabilities,
          bugs: analysisResult.estimatedBugs,
        });

        res.status(201).json({
          message: 'Analyse IA terminée avec succès',
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
        logWithContext.api('perform_ai_analysis_error', req.path, false, {
          targetUsername: username,
          error: String(error),
        });

        if (
          error instanceof Error &&
          error.message.includes('Service OpenAI non disponible')
        ) {
          throw createError.externalService('OpenAI', error);
        }

        if (error instanceof Error && error.message.includes('non trouvé')) {
          throw createError.notFound(error.message);
        }

        throw createError.externalService('AI Analysis', error as Error);
      }
    },
  );

  /**
   * Récupère l'analyse IA existante d'un utilisateur
   * GET /api/ai/:username
   */
  static getAIAnalysis = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { username } = req.params;
      const authenticatedUser = req.user as AuthenticatedUser;

      logWithContext.api('get_ai_analysis', req.path, true, {
        targetUsername: username,
        requesterId: authenticatedUser?.id,
        isAuthenticated: authenticatedUser != null,
      });

      try {
        // Récupérer l'analyse IA existante
        const existingAnalysis =
          await AIAnalysisService.getExistingAnalysis(username);

        if (existingAnalysis == null) {
          throw createError.notFound(
            'Aucune analyse IA trouvée pour cet utilisateur. Utilisez POST /ai/{username} pour lancer une analyse.',
          );
        }

        // Vérifier l'âge de l'analyse
        const analysisAge =
          Date.now() -
          new Date(existingAnalysis.metadata.analysisDate).getTime();
        const isStale = analysisAge > 7 * 24 * 60 * 60 * 1000; // Plus de 7 jours

        // Niveau d'accès selon l'authentification
        const accessLevel =
          authenticatedUser?.username === username ? 'complete' : 'public';

        // Filtrage des données selon le niveau d'accès
        let filteredAnalysis: Partial<AIAnalysisResult> = existingAnalysis;

        if (accessLevel === 'public') {
          // Pour les utilisateurs non authentifiés, limiter certaines données
          filteredAnalysis = {
            qualityScore: existingAnalysis.qualityScore,
            overallHealthScore: existingAnalysis.overallHealthScore,
            qualityByOrganization: existingAnalysis.qualityByOrganization,
            repositoryScores: existingAnalysis.repositoryScores.slice(0, 5), // Limiter à 5 repos
            insights: {
              summary: existingAnalysis.insights.summary,
              strengths: existingAnalysis.insights.strengths.slice(0, 3),
              recommendations: existingAnalysis.insights.recommendations.slice(
                0,
                3,
              ),
              weaknesses: [], // Masquer les faiblesses
              careerAdvice: [], // Masquer les conseils de carrière
            },
            metadata: existingAnalysis.metadata,
            // Masquer les données sensibles
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
            dataSource: 'ai_analysis',
            analysisAge: Math.round(analysisAge / (60 * 60 * 1000)), // Age en heures
            isStale,
            accessLevel,
            lastAnalyzed: existingAnalysis.metadata.analysisDate,
            model: existingAnalysis.metadata.model,
            recommendation: isStale
              ? 'Analyse ancienne. Considérez une nouvelle analyse avec POST /ai/{username}.'
              : 'Analyse récente',
          },
          // Métriques pour l'interface utilisateur
          interfaceMetrics: {
            // Données disponibles pour l'interface
            qualityAverage: `${existingAnalysis.qualityScore.toFixed(1)}%`,
            vulnerabilities:
              accessLevel === 'complete'
                ? existingAnalysis.estimatedVulnerabilities
                : null,
            bugsDetected:
              accessLevel === 'complete'
                ? existingAnalysis.estimatedBugs
                : null,
            buildTime:
              accessLevel === 'complete'
                ? `${existingAnalysis.estimatedBuildTime}s`
                : null,
            testCoverage:
              accessLevel === 'complete'
                ? `${existingAnalysis.estimatedTestCoverage.toFixed(1)}%`
                : null,
            healthScore: existingAnalysis.overallHealthScore.toFixed(1),

            // Scores par organisation (données publiques)
            organizationQualityScores: {
              personal: `${existingAnalysis.qualityByOrganization.personal.toFixed(1)}%`,
              organization: `${existingAnalysis.qualityByOrganization.organization.toFixed(1)}%`,
              school: `${existingAnalysis.qualityByOrganization.school.toFixed(1)}%`,
            },

            // Scores par repository (top 5 publics)
            topRepositoryScores: existingAnalysis.repositoryScores
              .slice(0, 5)
              .map((repo) => ({
                name: repo.name,
                qualityScore: `${repo.qualityScore.toFixed(1)}%`,
                recommendation: repo.recommendation,
              })),
          },
          timestamp: new Date().toISOString(),
        };

        logWithContext.api('get_ai_analysis_success', req.path, true, {
          targetUsername: username,
          accessLevel,
          analysisAge: Math.round(analysisAge / (60 * 60 * 1000)),
          qualityScore: existingAnalysis.qualityScore,
        });

        res.status(200).json(responseData);
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes('Aucune analyse IA trouvée')
        ) {
          throw error; // Re-throw les erreurs 404 explicites
        }

        logWithContext.api('get_ai_analysis_error', req.path, false, {
          targetUsername: username,
          error: String(error),
        });

        throw createError.externalService('AI Analysis', error as Error);
      }
    },
  );

  /**
   * Récupère le statut du service IA
   * GET /api/ai/status
   */
  static getAIServiceStatus = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const authenticatedUser = req.user as AuthenticatedUser;

      logWithContext.api('get_ai_service_status', req.path, true, {
        requesterId: authenticatedUser?.id,
      });

      try {
        // Import dynamique pour éviter les erreurs si OpenAI n'est pas configuré
        const openaiConfig = (await import('@/config/openai')).default;

        const isAvailable = openaiConfig.isAvailable();
        const config = openaiConfig.getDefaultConfig();

        // Test de connectivité si disponible
        let connectivity = false;
        if (isAvailable === true) {
          try {
            connectivity = await openaiConfig.testConnection();
          } catch {
            // Ignore les erreurs de connectivité pour le statut
          }
        }

        const responseData = {
          service: 'AI Analysis Service',
          status: isAvailable === true && connectivity === true ? 'available' : 'unavailable',
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
          limitations: isAvailable === true ? [] : [
            'OPENAI_API_KEY non configurée',
            'Service IA temporairement indisponible',
          ],
          fallbackMode: {
            enabled: true,
            description:
              'Scores basiques calculés sans IA si OpenAI indisponible',
          },
          timestamp: new Date().toISOString(),
        };

        logWithContext.api('get_ai_service_status_success', req.path, true, {
          isAvailable,
          connectivity,
          model: config.model,
        });

        res.status(200).json(responseData);
      } catch (error) {
        logWithContext.api('get_ai_service_status_error', req.path, false, {
          error: String(error),
        });

        throw createError.externalService('AI Service Status', error as Error);
      }
    },
  );
}

export default AIController;
