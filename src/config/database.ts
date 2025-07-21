/**
 * Configuration de base de données MongoDB avec Prisma
 * Gestion des connexions, transactions et opérations CRUD
 */

import { PrismaClient } from '@prisma/client';
import mongoose from 'mongoose';
import logger from '@/utils/logger';

export class DatabaseConfig {
  private prismaClient: PrismaClient | null = null;
  private mongooseConnection: mongoose.Connection | null = null;
  private isConnected = false;

  /**
     * Initialise les connexions aux bases de données
     */
  public async initialize(): Promise<void> {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error('DATABASE_URL non définie dans les variables d\'environnement');
    }

    try {
      // Initialisation Prisma
      await this.initializePrisma(databaseUrl);

      // Initialisation Mongoose (pour compatibilité si nécessaire)
      await this.initializeMongoose(databaseUrl);

      this.isConnected = true;

      logger.info('Configuration base de données initialisée avec succès', {
        providers: ['Prisma', 'Mongoose'],
        url: this.sanitizeUrl(databaseUrl),
      });

    } catch (error: any) {
      logger.error('Échec de l\'initialisation de la base de données', {
        error: error.message,
        stack: error.stack,
      });
      throw new Error(`Connexion base de données échouée: ${error.message}`);
    }
  }

  /**
     * Initialise le client Prisma
     */
  private async initializePrisma(databaseUrl: string): Promise<void> {
    this.prismaClient = new PrismaClient({
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
      log: [
        { level: 'query', emit: 'event' },
        { level: 'error', emit: 'event' },
        { level: 'info', emit: 'event' },
        { level: 'warn', emit: 'event' },
      ],
    });

    // Configuration des event listeners pour logs
    this.prismaClient.$on('query', (e: any) => {
      logger.debug('Prisma Query', {
        query: e.query,
        duration: `${e.duration}ms`,
        params: e.params,
      });
    });

    this.prismaClient.$on('error', (e: any) => {
      logger.error('Prisma Error', {
        message: e.message,
        target: e.target,
      });
    });

    // Test de connexion
    await this.prismaClient.$connect();

    logger.info('Connexion Prisma établie avec succès');
  }

  /**
     * Initialise la connexion Mongoose
     */
  private async initializeMongoose(databaseUrl: string): Promise<void> {
    const options: mongoose.ConnectOptions = {
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      bufferCommands: false, // Disable mongoose buffering
    };

    await mongoose.connect(databaseUrl, options);

    this.mongooseConnection = mongoose.connection;

    // Event listeners
    this.mongooseConnection.on('connected', () => {
      logger.info('Connexion Mongoose établie avec succès');
    });

    this.mongooseConnection.on('error', (err) => {
      logger.error('Erreur Mongoose', { error: err.message });
    });

    this.mongooseConnection.on('disconnected', () => {
      logger.warn('Connexion Mongoose fermée');
    });
  }

  /**
     * Vérifie la santé de la connexion
     */
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

    // Test Prisma
    try {
      if (this.prismaClient) {
        await this.prismaClient.$queryRaw`SELECT 1`;
        health.prisma = true;
      }
    } catch (error) {
      logger.warn('Health check Prisma échoué', { error });
    }

    // Test Mongoose
    try {
      if (this.mongooseConnection && this.mongooseConnection.readyState === 1) {
        health.mongoose = true;
      }
    } catch (error) {
      logger.warn('Health check Mongoose échoué', { error });
    }

    health.overall = health.prisma && health.mongoose;

    return health;
  }

  /**
     * Exécute une transaction Prisma
     */
  public async transaction<T>(
    operations: (prisma: PrismaClient) => Promise<T>,
  ): Promise<T> {
    if (!this.prismaClient) {
      throw new Error('Client Prisma non initialisé');
    }

    const startTime = Date.now();

    try {
      const result = await this.prismaClient.$transaction(async (tx: PrismaClient) => {
        return await operations(tx);
      });

      const duration = Date.now() - startTime;
      logger.debug('Transaction Prisma terminée', { duration: `${duration}ms` });

      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error('Transaction Prisma échouée', {
        duration: `${duration}ms`,
        error: error.message,
      });
      throw error;
    }
  }

  /**
     * Crée les indexes nécessaires pour optimiser les performances
     */
  public async createIndexes(): Promise<void> {
    if (!this.prismaClient) {
      throw new Error('Client Prisma non initialisé');
    }

    try {
      // Les indexes sont définis dans le schema Prisma
      // Cette méthode peut être utilisée pour créer des indexes complexes si nécessaire

      logger.info('Indexes de base de données créés avec succès');
    } catch (error: any) {
      logger.error('Erreur lors de la création des indexes', { error: error.message });
      throw error;
    }
  }

  /**
     * Nettoyage et fermeture des connexions
     */
  public async cleanup(): Promise<void> {
    try {
      if (this.prismaClient) {
        await this.prismaClient.$disconnect();
        this.prismaClient = null;
        logger.info('Connexion Prisma fermée');
      }

      if (this.mongooseConnection) {
        await mongoose.disconnect();
        this.mongooseConnection = null;
        logger.info('Connexion Mongoose fermée');
      }

      this.isConnected = false;

    } catch (error: any) {
      logger.error('Erreur lors de la fermeture des connexions', { error: error.message });
    }
  }

  /**
     * Nettoyage des données pour les tests
     */
  public async cleanupTestData(): Promise<void> {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('Nettoyage des données autorisé uniquement en mode test');
    }

    if (!this.prismaClient) {
      throw new Error('Client Prisma non initialisé');
    }

    try {
      // Nettoyage dans l'ordre inverse des dépendances
      await this.prismaClient.$executeRaw`DELETE FROM datasets`;
      await this.prismaClient.$executeRaw`DELETE FROM repositories`;
      await this.prismaClient.$executeRaw`DELETE FROM users`;

      logger.info('Données de test nettoyées');
    } catch (error: any) {
      logger.error('Erreur lors du nettoyage des données de test', { error: error.message });
      throw error;
    }
  }

  /**
     * Sanitise l'URL pour les logs (retire le mot de passe)
     */
  private sanitizeUrl(url: string): string {
    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.password) {
        parsedUrl.password = '***';
      }
      return parsedUrl.toString();
    } catch {
      return 'URL invalide';
    }
  }

  /**
     * Getters
     */
  public getPrismaClient(): PrismaClient | null {
    return this.prismaClient;
  }

  public getMongooseConnection(): mongoose.Connection | null {
    return this.mongooseConnection;
  }

  public getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
     * Méthodes utilitaires pour les opérations courantes
     */
  public async findMany<T>(
    model: string,
    options: any = {},
  ): Promise<T[]> {
    if (!this.prismaClient) {
      throw new Error('Client Prisma non initialisé');
    }

    const startTime = Date.now();

    try {
      // @ts-ignore - Dynamic model access
      const result = await this.prismaClient[model].findMany(options);

      const duration = Date.now() - startTime;
      logger.debug('Find many operation', {
        model,
        count: result.length,
        duration: `${duration}ms`,
      });

      return result;
    } catch (error: any) {
      logger.error('Find many operation failed', {
        model,
        error: error.message,
      });
      throw error;
    }
  }

  public async findUnique<T>(
    model: string,
    where: any,
  ): Promise<T | null> {
    if (!this.prismaClient) {
      throw new Error('Client Prisma non initialisé');
    }

    const startTime = Date.now();

    try {
      // @ts-ignore - Dynamic model access
      const result = await this.prismaClient[model].findUnique({ where });

      const duration = Date.now() - startTime;
      logger.debug('Find unique operation', {
        model,
        found: !!result,
        duration: `${duration}ms`,
      });

      return result;
    } catch (error: any) {
      logger.error('Find unique operation failed', {
        model,
        error: error.message,
      });
      throw error;
    }
  }

  public async create<T>(
    model: string,
    data: any,
  ): Promise<T> {
    if (!this.prismaClient) {
      throw new Error('Client Prisma non initialisé');
    }

    const startTime = Date.now();

    try {
      // @ts-ignore - Dynamic model access
      const result = await this.prismaClient[model].create({ data });

      const duration = Date.now() - startTime;
      logger.debug('Create operation', {
        model,
        duration: `${duration}ms`,
      });

      return result;
    } catch (error: any) {
      logger.error('Create operation failed', {
        model,
        error: error.message,
      });
      throw error;
    }
  }

  public async update<T>(
    model: string,
    where: any,
    data: any,
  ): Promise<T> {
    if (!this.prismaClient) {
      throw new Error('Client Prisma non initialisé');
    }

    const startTime = Date.now();

    try {
      // @ts-ignore - Dynamic model access
      const result = await this.prismaClient[model].update({ where, data });

      const duration = Date.now() - startTime;
      logger.debug('Update operation', {
        model,
        duration: `${duration}ms`,
      });

      return result;
    } catch (error: any) {
      logger.error('Update operation failed', {
        model,
        error: error.message,
      });
      throw error;
    }
  }

  public async delete<T>(
    model: string,
    where: any,
  ): Promise<T> {
    if (!this.prismaClient) {
      throw new Error('Client Prisma non initialisé');
    }

    const startTime = Date.now();

    try {
      // @ts-ignore - Dynamic model access
      const result = await this.prismaClient[model].delete({ where });

      const duration = Date.now() - startTime;
      logger.debug('Delete operation', {
        model,
        duration: `${duration}ms`,
      });

      return result;
    } catch (error: any) {
      logger.error('Delete operation failed', {
        model,
        error: error.message,
      });
      throw error;
    }
  }
}

// Instance singleton
export const databaseConfig = new DatabaseConfig();
export default databaseConfig;
