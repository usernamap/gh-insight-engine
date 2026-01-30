import { PrismaClient } from '@prisma/client';
import mongoose from 'mongoose';

import logger from '@/utils/logger';
import {
  DATABASE_ERROR_MESSAGES,
  HEALTH_CHECK_ERROR_MESSAGES,
  DATABASE_MESSAGES,
  DURATION_UNIT,
  DATABASE_CONFIG,
  MASKING_VALUE,
  DATABASE_PROVIDERS,
  ENVIRONMENT_VALUES,
  EMPTY_STRING,
  DATABASE_TABLES,
  PRISMA_LOG_LEVELS,
  MONGOOSE_EVENTS,
} from '@/constants';

export class DatabaseConfig {
  private prismaClient: PrismaClient | null = null;
  private mongooseConnection: mongoose.Connection | null = null;
  private isConnected = false;

  public async initialize(): Promise<void> {
    const databaseUrl = process.env.DATABASE_URL;

    if (databaseUrl == null || databaseUrl === EMPTY_STRING) {
      throw new Error(DATABASE_ERROR_MESSAGES.DATABASE_URL_NOT_DEFINED);
    }

    try {
      await this.initializePrisma(databaseUrl);

      await this.initializeMongoose(databaseUrl);

      this.isConnected = true;

      logger.info(DATABASE_MESSAGES.CONFIGURATION_INITIALIZED, {
        providers: DATABASE_PROVIDERS,
        url: this.sanitizeUrl(databaseUrl),
      });
    } catch (_error: unknown) {
      logger.error(DATABASE_ERROR_MESSAGES.DATABASE_INITIALIZATION_FAILED, {
        error: (_error as Error).message,
        stack: (_error as Error).stack,
      });
      throw new Error(
        `${DATABASE_ERROR_MESSAGES.DATABASE_CONNECTION_FAILED}${(_error as Error).message}`
      );
    }
  }

  private async initializePrisma(databaseUrl: string): Promise<void> {
    this.prismaClient = new PrismaClient({
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
      log: PRISMA_LOG_LEVELS,
    });

    await this.prismaClient.$connect();

    logger.info(DATABASE_MESSAGES.PRISMA_CONNECTION_ESTABLISHED);
  }

  private async initializeMongoose(databaseUrl: string): Promise<void> {
    if (mongoose.connection.readyState === DATABASE_CONFIG.MONGOOSE_READY_STATE) {
      logger.info(DATABASE_MESSAGES.MONGOOSE_CONNECTION_ALREADY_ESTABLISHED);
      this.mongooseConnection = mongoose.connection;
      return;
    }

    const options: mongoose.ConnectOptions = {
      maxPoolSize: DATABASE_CONFIG.MAX_POOL_SIZE,
      serverSelectionTimeoutMS: DATABASE_CONFIG.SERVER_SELECTION_TIMEOUT_MS,
      socketTimeoutMS: DATABASE_CONFIG.SOCKET_TIMEOUT_MS,
      bufferCommands: false,
    };

    await mongoose.connect(databaseUrl, options);

    this.mongooseConnection = mongoose.connection;

    this.mongooseConnection.on(MONGOOSE_EVENTS.CONNECTED, () => {
      logger.info(DATABASE_MESSAGES.MONGOOSE_CONNECTION_ESTABLISHED);
    });

    this.mongooseConnection.on(MONGOOSE_EVENTS.ERROR, err => {
      logger.error(DATABASE_MESSAGES.MONGOOSE_ERROR, { error: err.message });
    });

    this.mongooseConnection.on(MONGOOSE_EVENTS.DISCONNECTED, () => {
      logger.warn(DATABASE_MESSAGES.MONGOOSE_CONNECTION_CLOSED);
    });
  }

  public async healthCheck(): Promise<{
    prisma: boolean;
    mongoose: boolean;
    overall: boolean;
  }> {
    const health = {
      prisma: false,
      mongoose: false,
      overall: false,
    };

    try {
      if (this.prismaClient != null) {
        // @ts-ignore - Prisma v5+ interactive transaction
        await this.prismaClient.$executeRaw`SELECT 1`;
        health.prisma = true;
      }
    } catch (_error: unknown) {
      logger.warn(HEALTH_CHECK_ERROR_MESSAGES.PRISMA_FAILED, {
        error: (_error as Error).message,
      });
    }

    try {
      if (
        this.mongooseConnection?.readyState === DATABASE_CONFIG.MONGOOSE_READY_STATE
      ) {
        health.mongoose = true;
      }
    } catch (_error: unknown) {
      logger.warn(HEALTH_CHECK_ERROR_MESSAGES.MONGOOSE_FAILED, {
        error: (_error as Error).message,
      });
    }

    health.overall = health.prisma && health.mongoose;

    return health;
  }

  public async transaction<T>(
    operations: (prisma: PrismaClient) => Promise<T> // eslint-disable-line no-unused-vars
  ): Promise<T> {
    if (this.prismaClient == null) {
      throw new Error(DATABASE_ERROR_MESSAGES.PRISMA_CLIENT_NOT_INITIALIZED);
    }

    const startTime = Date.now();

    try {
      // @ts-ignore - Prisma v5+ interactive transaction
      const result = await this.prismaClient.$transaction(operations);

      const duration = Date.now() - startTime;
      logger.debug(DATABASE_MESSAGES.TRANSACTION_COMPLETED, {
        duration: `${duration}${DURATION_UNIT}`,
      });

      return result as T;
    } catch (_error: unknown) {
      const duration = Date.now() - startTime;
      logger.error(DATABASE_MESSAGES.TRANSACTION_FAILED, {
        duration: `${duration}${DURATION_UNIT}`,
        error: (_error as Error).message,
      });
      throw _error as Error;
    }
  }

  public async createIndexes(): Promise<void> {
    if (this.prismaClient == null) {
      throw new Error(DATABASE_ERROR_MESSAGES.PRISMA_CLIENT_NOT_INITIALIZED);
    }

    try {
      logger.info(DATABASE_MESSAGES.INDEXES_CREATED);
    } catch (_error: unknown) {
      logger.error(DATABASE_ERROR_MESSAGES.ERROR_CREATING_INDEXES, {
        error: (_error as Error).message,
      });
      throw _error as Error;
    }
  }

  public async cleanup(): Promise<void> {
    try {
      if (this.prismaClient != null) {
        await this.prismaClient.$disconnect();
        this.prismaClient = null;
        logger.info(DATABASE_MESSAGES.PRISMA_CONNECTION_CLOSED);
      }

      if (this.mongooseConnection != null) {
        await mongoose.disconnect();
        this.mongooseConnection = null;
        logger.info(DATABASE_MESSAGES.MONGOOSE_CONNECTION_CLOSED);
      }

      this.isConnected = false;
    } catch (_error: unknown) {
      logger.error(DATABASE_ERROR_MESSAGES.ERROR_CLOSING_CONNECTIONS, {
        error: (_error as Error).message,
      });
    }
  }

  public async cleanupTestData(): Promise<void> {
    if (process.env.NODE_ENV !== ENVIRONMENT_VALUES.TEST) {
      throw new Error(DATABASE_ERROR_MESSAGES.DATA_CLEANUP_TEST_MODE_ONLY);
    }

    if (this.prismaClient == null) {
      throw new Error(DATABASE_ERROR_MESSAGES.PRISMA_CLIENT_NOT_INITIALIZED);
    }

    try {
      // @ts-ignore - Prisma v5+ interactive transaction
      await this.prismaClient.$executeRaw`DELETE FROM ${DATABASE_TABLES.DATASETS}`;
      // @ts-ignore - Prisma v5+ interactive transaction
      await this.prismaClient.$executeRaw`DELETE FROM ${DATABASE_TABLES.REPOSITORIES}`;
      // @ts-ignore - Prisma v5+ interactive transaction
      await this.prismaClient.$executeRaw`DELETE FROM ${DATABASE_TABLES.USERS}`;

      logger.info(DATABASE_MESSAGES.TEST_DATA_CLEANED);
    } catch (_error: unknown) {
      logger.error(DATABASE_ERROR_MESSAGES.ERROR_CLEANING_TEST_DATA, {
        error: (_error as Error).message,
      });
      throw _error as Error;
    }
  }

  private sanitizeUrl(url: string): string {
    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.password) {
        parsedUrl.password = MASKING_VALUE;
      }
      return parsedUrl.toString();
    } catch {
      return DATABASE_ERROR_MESSAGES.INVALID_URL;
    }
  }

  public getPrismaClient(): PrismaClient | null {
    return this.prismaClient;
  }

  public getMongooseConnection(): mongoose.Connection | null {
    return this.mongooseConnection;
  }

  public getConnectionStatus(): boolean {
    return this.isConnected;
  }

  public async findMany<T>(model: string, options: Record<string, unknown> = {}): Promise<T[]> {
    if (this.prismaClient == null) {
      throw new Error(DATABASE_ERROR_MESSAGES.PRISMA_CLIENT_NOT_INITIALIZED);
    }

    const startTime = Date.now();

    try {
      // @ts-ignore - Dynamic model access
      const result = await this.prismaClient[model].findMany(options);

      const duration = Date.now() - startTime;
      logger.debug(DATABASE_MESSAGES.FIND_MANY_OPERATION, {
        model,
        count: result.length,
        duration: `${duration}${DURATION_UNIT}`,
      });

      return result;
    } catch (_error: unknown) {
      logger.error(DATABASE_ERROR_MESSAGES.FIND_MANY_OPERATION_FAILED, {
        model,
        error: (_error as Error).message,
      });
      throw _error as Error;
    }
  }

  public async findUnique<T>(model: string, where: Record<string, unknown>): Promise<T | null> {
    if (this.prismaClient == null) {
      throw new Error(DATABASE_ERROR_MESSAGES.PRISMA_CLIENT_NOT_INITIALIZED);
    }

    const startTime = Date.now();

    try {
      // @ts-ignore - Dynamic model access
      const result = await this.prismaClient[model].findUnique({ where });

      const duration = Date.now() - startTime;
      logger.debug(DATABASE_MESSAGES.FIND_UNIQUE_OPERATION, {
        model,
        found: result != null,
        duration: `${duration}${DURATION_UNIT}`,
      });

      return result;
    } catch (_error: unknown) {
      logger.error(DATABASE_ERROR_MESSAGES.FIND_UNIQUE_OPERATION_FAILED, {
        model,
        error: (_error as Error).message,
      });
      throw _error as Error;
    }
  }

  public async create<T>(model: string, data: Record<string, unknown>): Promise<T> {
    if (this.prismaClient == null) {
      throw new Error(DATABASE_ERROR_MESSAGES.PRISMA_CLIENT_NOT_INITIALIZED);
    }

    const startTime = Date.now();

    try {
      // @ts-ignore - Dynamic model access
      const result = await this.prismaClient[model].create({ data });

      const duration = Date.now() - startTime;
      logger.debug(DATABASE_MESSAGES.CREATE_OPERATION, {
        model,
        duration: `${duration}${DURATION_UNIT}`,
      });

      return result;
    } catch (_error: unknown) {
      logger.error(DATABASE_ERROR_MESSAGES.CREATE_OPERATION_FAILED, {
        model,
        error: (_error as Error).message,
      });
      throw _error as Error;
    }
  }

  public async update<T>(
    model: string,
    where: Record<string, unknown>,
    data: Record<string, unknown>
  ): Promise<T> {
    if (this.prismaClient == null) {
      throw new Error(DATABASE_ERROR_MESSAGES.PRISMA_CLIENT_NOT_INITIALIZED);
    }

    const startTime = Date.now();

    try {
      // @ts-ignore - Dynamic model access
      const result = await this.prismaClient[model].update({ where, data });

      const duration = Date.now() - startTime;
      logger.debug(DATABASE_MESSAGES.UPDATE_OPERATION, {
        model,
        duration: `${duration}${DURATION_UNIT}`,
      });

      return result;
    } catch (_error: unknown) {
      logger.error(DATABASE_ERROR_MESSAGES.UPDATE_OPERATION_FAILED, {
        model,
        error: (_error as Error).message,
      });
      throw _error as Error;
    }
  }

  public async delete<T>(model: string, where: Record<string, unknown>): Promise<T> {
    if (this.prismaClient == null) {
      throw new Error(DATABASE_ERROR_MESSAGES.PRISMA_CLIENT_NOT_INITIALIZED);
    }

    const startTime = Date.now();

    try {
      // @ts-ignore - Dynamic model access
      const result = await this.prismaClient[model].delete({ where });

      const duration = Date.now() - startTime;
      logger.debug(DATABASE_MESSAGES.DELETE_OPERATION, {
        model,
        duration: `${duration}${DURATION_UNIT}`,
      });

      return result;
    } catch (_error: unknown) {
      logger.error(DATABASE_ERROR_MESSAGES.DELETE_OPERATION_FAILED, {
        model,
        error: (_error as Error).message,
      });
      throw _error as Error;
    }
  }
}

export const databaseConfig = new DatabaseConfig();
export default databaseConfig;
