import * as cron from 'node-cron';
import axios, { AxiosError } from 'axios';
import logger from '@/utils/logger';
import {
  SCHEDULING_DEFAULTS,
  SCHEDULING_TIMEOUTS,
  SCHEDULING_CALCULATIONS,
  SCHEDULING_CRON_PATTERNS,
  SCHEDULING_MASK,
  SCHEDULING_ERROR_MESSAGES,
  SCHEDULING_MESSAGES,
  SCHEDULING_HTTP,
} from '@/constants';

interface SchedulingConfig {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  time: string;
  timezone: string;
  username: string;
  fullName: string;
  githubToken: string;
  baseUrl: string;
}

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

export class SchedulingService {
  private static instance: SchedulingService;
  private task: cron.ScheduledTask | null = null;
  private config: SchedulingConfig;
  private authToken: string | null = null;
  private tokenExpiry: Date | null = null;

  private constructor() {
    this.config = this.loadConfig();
  }

  static getInstance(): SchedulingService {
    SchedulingService.instance ??= new SchedulingService();
    return SchedulingService.instance;
  }

  private loadConfig(): SchedulingConfig {
    const enabled = process.env.SCHEDULE_ENABLED === 'true';
    const frequency =
      (process.env.SCHEDULE_FREQUENCY as 'daily' | 'weekly' | 'monthly') ??
      SCHEDULING_DEFAULTS.FREQUENCY;
    const time = process.env.SCHEDULE_TIME ?? SCHEDULING_DEFAULTS.TIME;
    const timezone = process.env.SCHEDULE_TIMEZONE ?? SCHEDULING_DEFAULTS.TIMEZONE;
    const username = process.env.GITHUB_USERNAME ?? '';
    const fullName = process.env.GITHUB_FULL_NAME ?? '';
    const githubToken = process.env.GH_TOKEN ?? '';
    const baseUrl =
      process.env.BASE_URL ?? `http://localhost:${process.env.PORT ?? SCHEDULING_DEFAULTS.PORT}`;

    if (enabled && username.length === 0) {
      throw new Error(SCHEDULING_ERROR_MESSAGES.GITHUB_USERNAME_REQUIRED);
    }

    if (enabled && githubToken.length === 0) {
      throw new Error(SCHEDULING_ERROR_MESSAGES.GH_TOKEN_REQUIRED);
    }

    if (enabled && fullName.length === 0) {
      throw new Error(SCHEDULING_ERROR_MESSAGES.GITHUB_FULL_NAME_REQUIRED);
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

  private async fetchAuthToken(): Promise<string> {
    try {
      logger.info(SCHEDULING_MESSAGES.RETRIEVING_AUTH_TOKEN, {
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
            'Content-Type': SCHEDULING_HTTP.CONTENT_TYPE,
          },
          timeout: SCHEDULING_TIMEOUTS.AUTH_TOKEN_REQUEST,
        }
      );

      const { accessToken } = response.data.tokens;

      const expiryDate = new Date();
      expiryDate.setHours(expiryDate.getHours() + SCHEDULING_CALCULATIONS.TOKEN_EXPIRY_HOURS);

      this.authToken = accessToken;
      this.tokenExpiry = expiryDate;

      logger.info(SCHEDULING_MESSAGES.AUTH_TOKEN_RETRIEVED, {
        username: this.config.username,
        expiresAt: expiryDate.toISOString(),
      });

      return accessToken;
    } catch (error: unknown) {
      logger.error(SCHEDULING_MESSAGES.FAILED_TO_RETRIEVE_AUTH_TOKEN, {
        username: this.config.username,
        error: error instanceof Error ? error.message : String(error),
        statusCode: error instanceof AxiosError ? error.response?.status : undefined,
        responseData: error instanceof AxiosError ? error.response?.data : undefined,
      });
      throw error;
    }
  }
  private async ensureValidAuthToken(): Promise<string> {
    if (
      this.authToken === null ||
      this.authToken === '' ||
      this.tokenExpiry === null ||
      this.tokenExpiry <= new Date()
    ) {
      return this.fetchAuthToken();
    }

    return this.authToken;
  }

  start(): void {
    if (this.config.enabled === false) {
      logger.info(SCHEDULING_MESSAGES.SCHEDULING_DISABLED);
      return;
    }

    if (this.task) {
      logger.warning(SCHEDULING_MESSAGES.SCHEDULING_ALREADY_STARTED);
      return;
    }

    const cronExpression = this.getCronExpression();

    try {
      this.task = cron.schedule(cronExpression, () => this.executeScheduledRefresh(), {
        timezone: this.config.timezone,
      });

      logger.info(SCHEDULING_MESSAGES.SCHEDULING_STARTED, {
        frequency: this.config.frequency,
        time: this.config.time,
        timezone: this.config.timezone,
        username: this.config.username,
        cronExpression,
        nextRun: this.getNextRunTime(),
      });
    } catch (error: unknown) {
      logger.error(SCHEDULING_MESSAGES.ERROR_STARTING_SCHEDULING, {
        error: error instanceof Error ? error.message : String(error),
        cronExpression,
      });
      throw error;
    }
  }

  stop(): void {
    if (this.task) {
      this.task.stop();
      this.task = null;
      logger.info(SCHEDULING_MESSAGES.SCHEDULING_STOPPED);
    }
  }

  restart(): void {
    this.stop();
    this.config = this.loadConfig();
    this.authToken = null;
    this.tokenExpiry = null;
    this.start();
  }

  private getCronExpression(): string {
    const [hours, minutes] = this.config.time.split(':');

    switch (this.config.frequency) {
      case 'daily':
        return `${minutes} ${hours} ${SCHEDULING_CRON_PATTERNS.DAILY}`;
      case 'weekly':
        return `${minutes} ${hours} ${SCHEDULING_CRON_PATTERNS.WEEKLY}`;
      case 'monthly':
        return `${minutes} ${hours} ${SCHEDULING_CRON_PATTERNS.MONTHLY}`;
      default:
        throw new Error(
          `${SCHEDULING_ERROR_MESSAGES.UNSUPPORTED_FREQUENCY}${this.config.frequency}`
        );
    }
  }

  private getNextRunTime(): string | null {
    if (!this.task) return null;

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
          nextRun.setDate(
            nextRun.getDate() + (SCHEDULING_CALCULATIONS.DAYS_IN_WEEK - nextRun.getDay())
          );
          break;
        case 'monthly':
          nextRun.setMonth(nextRun.getMonth() + 1, SCHEDULING_CALCULATIONS.FIRST_DAY_OF_MONTH);
          break;
      }
    }

    return nextRun.toISOString();
  }

  private async executeScheduledRefresh(): Promise<void> {
    const startTime = Date.now();

    logger.info(SCHEDULING_MESSAGES.STARTING_SCHEDULED_UPDATE, {
      username: this.config.username,
      timestamp: new Date().toISOString(),
    });

    try {
      const authToken = await this.ensureValidAuthToken();

      const response = await axios.post(
        `${this.config.baseUrl}/api/refresh/${this.config.username}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': SCHEDULING_HTTP.CONTENT_TYPE,
          },
          timeout: SCHEDULING_TIMEOUTS.REFRESH_OPERATION,
        }
      );

      const duration = Date.now() - startTime;

      logger.info(SCHEDULING_MESSAGES.SCHEDULED_UPDATE_COMPLETED, {
        username: this.config.username,
        duration,
        statusCode: response.status,
        completedSteps: response.data.completedSteps,
        totalDuration: response.data.totalDuration,
      });
    } catch (error: unknown) {
      const duration = Date.now() - startTime;

      logger.error(SCHEDULING_MESSAGES.SCHEDULED_UPDATE_FAILED, {
        username: this.config.username,
        duration,
        error: error instanceof Error ? error.message : String(error),
        statusCode: error instanceof AxiosError ? error.response?.status : undefined,
        responseData: error instanceof AxiosError ? error.response?.data : undefined,
      });
    }
  }

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
        githubToken: SCHEDULING_MASK.HIDDEN_TOKEN,
      },
      nextRun: this.getNextRunTime(),
      authTokenValid:
        this.authToken !== null && this.tokenExpiry !== null && this.tokenExpiry > new Date(),
      tokenExpiry: this.tokenExpiry?.toISOString() ?? null,
    };
  }

  async testConfiguration(): Promise<boolean> {
    logger.info(SCHEDULING_MESSAGES.TEST_CONFIGURATION);

    try {
      await this.executeScheduledRefresh();
      return true;
    } catch (error: unknown) {
      logger.error(SCHEDULING_MESSAGES.CONFIGURATION_TEST_FAILED, {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }
}

export default SchedulingService.getInstance();
