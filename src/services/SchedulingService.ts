import * as cron from 'node-cron';
import axios, { AxiosError } from 'axios';
import logger from '@/utils/logger';

/**
 * Configuration du scheduling
 */
interface SchedulingConfig {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string; // Format HH:MM
    timezone: string;
    username: string;
    fullName: string;
    githubToken: string;
    baseUrl: string;
}

/**
 * Interface pour la réponse de l'endpoint /auth/login
 */
interface AuthLoginResponse {
    message: string;
    user: {
        id: string;
        username: string;
        hasValidToken: boolean;
    };
    tokens: {
        accessToken: string;
        tokenType: string;
        expiresIn: string;
    };
    permissions: {
        canAccessPrivateRepos: boolean;
        canReadOrgs: boolean;
        canReadUser: boolean;
    };
    timestamp: string;
}

/**
 * Service de scheduling automatique
 * Gère la mise à jour automatique des données utilisateur selon une fréquence configurable
 */
export class SchedulingService {
  private static instance: SchedulingService;
  private task: cron.ScheduledTask | null = null;
  private config: SchedulingConfig;
  private authToken: string | null = null;
  private tokenExpiry: Date | null = null;

  private constructor() {
    this.config = this.loadConfig();
  }

  /**
     * Singleton - obtient l'instance unique du service
     */
  static getInstance(): SchedulingService {
    SchedulingService.instance ??= new SchedulingService();
    return SchedulingService.instance;
  }

  /**
     * Charge la configuration depuis les variables d'environnement
     */
  private loadConfig(): SchedulingConfig {
    const enabled = process.env.SCHEDULE_ENABLED === 'true';
    const frequency = (process.env.SCHEDULE_FREQUENCY as 'daily' | 'weekly' | 'monthly') ?? 'weekly';
    const time = process.env.SCHEDULE_TIME ?? '02:00';
    const timezone = process.env.SCHEDULE_TIMEZONE ?? 'Europe/Paris';
    const username = process.env.GITHUB_USERNAME ?? '';
    const fullName = process.env.GITHUB_FULL_NAME ?? '';
    const githubToken = process.env.GH_TOKEN ?? '';
    const baseUrl = process.env.BASE_URL ?? `http://localhost:${process.env.PORT ?? '3000'}`;

    if (enabled && username.length === 0) {
      throw new Error('GITHUB_USERNAME est requis pour activer le scheduling');
    }

    if (enabled && githubToken.length === 0) {
      throw new Error('GH_TOKEN est requis pour activer le scheduling');
    }

    if (enabled && fullName.length === 0) {
      throw new Error('GITHUB_FULL_NAME est requis pour activer le scheduling');
    }

    return {
      enabled,
      frequency,
      time,
      timezone,
      username,
      fullName,
      githubToken,
      baseUrl,
    };
  }

  /**
     * Récupère automatiquement le token d'authentification via l'endpoint /auth/login
     */
  private async fetchAuthToken(): Promise<string> {
    try {
      logger.info('Récupération du token d\'authentification pour le scheduling', {
        username: this.config.username,
      });

      const response = await axios.post<AuthLoginResponse>(
        `${this.config.baseUrl}/api/auth/login`,
        {
          username: this.config.username,
          fullName: this.config.fullName,
          githubToken: this.config.githubToken,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000, // 30 secondes
        },
      );

      const { accessToken } = response.data.tokens;

      // Calculer l'expiration du token (24h par défaut)
      const expiryDate = new Date();
      expiryDate.setHours(expiryDate.getHours() + 24);

      this.authToken = accessToken;
      this.tokenExpiry = expiryDate;

      logger.info('Token d\'authentification récupéré avec succès', {
        username: this.config.username,
        expiresAt: expiryDate.toISOString(),
      });

      return accessToken;
    } catch (error: unknown) {
      logger.error('Échec de la récupération du token d\'authentification', {
        username: this.config.username,
        error: error instanceof Error ? error.message : String(error),
        statusCode: error instanceof AxiosError ? error.response?.status : undefined,
        responseData: error instanceof AxiosError ? error.response?.data : undefined,
      });
      throw error;
    }
  }

  /**
   * Vérifie si le token d'authentification est valide et le renouvelle si nécessaire
   */
  private async ensureValidAuthToken(): Promise<string> {
    // Si pas de token ou token expiré, en récupérer un nouveau
    if (this.authToken === null || this.authToken === '' || this.tokenExpiry === null || this.tokenExpiry <= new Date()) {
      return this.fetchAuthToken();
    }

    return this.authToken;
  }

  /**
       * Démarre le service de scheduling
       */
  start(): void {
    if (this.config.enabled === false) {
      logger.info('Scheduling désactivé via SCHEDULE_ENABLED=false');
      return;
    }

    if (this.task) {
      logger.warning('Service de scheduling déjà démarré');
      return;
    }

    const cronExpression = this.getCronExpression();

    try {
      this.task = cron.schedule(
        cronExpression,
        () => this.executeScheduledRefresh(),
        {
          timezone: this.config.timezone,
        },
      );

      logger.info('Service de scheduling démarré', {
        frequency: this.config.frequency,
        time: this.config.time,
        timezone: this.config.timezone,
        username: this.config.username,
        cronExpression,
        nextRun: this.getNextRunTime(),
      });
    } catch (error: unknown) {
      logger.error('Erreur lors du démarrage du scheduling', {
        error: error instanceof Error ? error.message : String(error),
        cronExpression,
      });
      throw error;
    }
  }

  /**
       * Arrête le service de scheduling
       */
  stop(): void {
    if (this.task) {
      this.task.stop();
      this.task = null;
      logger.info('Service de scheduling arrêté');
    }
  }

  /**
       * Redémarre le service de scheduling avec la nouvelle configuration
       */
  restart(): void {
    this.stop();
    this.config = this.loadConfig();
    this.authToken = null;
    this.tokenExpiry = null;
    this.start();
  }

  /**
       * Génère l'expression cron selon la fréquence configurée
       */
  private getCronExpression(): string {
    const [hours, minutes] = this.config.time.split(':');

    switch (this.config.frequency) {
    case 'daily':
      return `${minutes} ${hours} * * *`;
    case 'weekly':
      return `${minutes} ${hours} * * 0`; // Dimanche
    case 'monthly':
      return `${minutes} ${hours} 1 * *`; // 1er du mois
    default:
      throw new Error(`Fréquence non supportée : ${this.config.frequency}`);
    }
  }

  /**
       * Obtient le prochain temps d'exécution
       */
  private getNextRunTime(): string | null {
    if (!this.task) return null;

    // node-cron ne fournit pas directement la prochaine exécution
    // On peut l'approximer en se basant sur la configuration
    const now = new Date();
    const [hours, minutes] = this.config.time.split(':').map(Number);

    const nextRun = new Date();
    nextRun.setHours(hours, minutes, 0, 0);

    if (nextRun <= now) {
      switch (this.config.frequency) {
      case 'daily':
        nextRun.setDate(nextRun.getDate() + 1);
        break;
      case 'weekly':
        nextRun.setDate(nextRun.getDate() + (7 - nextRun.getDay()));
        break;
      case 'monthly':
        nextRun.setMonth(nextRun.getMonth() + 1, 1);
        break;
      }
    }

    return nextRun.toISOString();
  }

  /**
       * Exécute la mise à jour programmée
       */
  private async executeScheduledRefresh(): Promise<void> {
    const startTime = Date.now();

    logger.info('Démarrage de la mise à jour programmée', {
      username: this.config.username,
      timestamp: new Date().toISOString(),
    });

    try {
      // Récupérer un token d'authentification valide
      const authToken = await this.ensureValidAuthToken();

      const response = await axios.post(
        `${this.config.baseUrl}/api/refresh/${this.config.username}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 600000, // 10 minutes
        },
      );

      const duration = Date.now() - startTime;

      logger.info('Mise à jour programmée terminée avec succès', {
        username: this.config.username,
        duration,
        statusCode: response.status,
        completedSteps: response.data.completedSteps,
        totalDuration: response.data.totalDuration,
      });
    } catch (error: unknown) {
      const duration = Date.now() - startTime;

      logger.error('Échec de la mise à jour programmée', {
        username: this.config.username,
        duration,
        error: error instanceof Error ? error.message : String(error),
        statusCode: error instanceof AxiosError ? error.response?.status : undefined,
        responseData: error instanceof AxiosError ? error.response?.data : undefined,
      });
    }
  }

  /**
       * Obtient le statut actuel du service
       */
  getStatus(): {
        enabled: boolean;
        running: boolean;
        config: Omit<SchedulingConfig, 'githubToken'> & { githubToken: string };
        nextRun: string | null;
        authTokenValid: boolean;
        tokenExpiry: string | null;
        } {
    return {
      enabled: this.config.enabled,
      running: this.task !== null,
      config: {
        ...this.config,
        githubToken: '***hidden***',
      },
      nextRun: this.getNextRunTime(),
      authTokenValid: this.authToken !== null && this.tokenExpiry !== null && this.tokenExpiry > new Date(),
      tokenExpiry: this.tokenExpiry?.toISOString() ?? null,
    };
  }

  /**
       * Teste la configuration en exécutant une mise à jour immédiate
       */
  async testConfiguration(): Promise<boolean> {
    logger.info('Test de la configuration de scheduling');

    try {
      await this.executeScheduledRefresh();
      return true;
    } catch (error: unknown) {
      logger.error('Échec du test de configuration', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }
}

// Export de l'instance singleton
export default SchedulingService.getInstance();
