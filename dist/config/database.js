"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.databaseConfig = exports.DatabaseConfig = void 0;
const client_1 = require("@prisma/client");
const mongoose_1 = __importDefault(require("mongoose"));
const logger_1 = __importDefault(require("@/utils/logger"));
class DatabaseConfig {
  constructor() {
    this.prismaClient = null;
    this.mongooseConnection = null;
    this.isConnected = false;
  }
  async initialize() {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error(
        "DATABASE_URL non définie dans les variables d'environnement",
      );
    }
    try {
      await this.initializePrisma(databaseUrl);
      await this.initializeMongoose(databaseUrl);
      this.isConnected = true;
      logger_1.default.info(
        "Configuration base de données initialisée avec succès",
        {
          providers: ["Prisma", "Mongoose"],
          url: this.sanitizeUrl(databaseUrl),
        },
      );
    } catch (error) {
      logger_1.default.error(
        "Échec de l'initialisation de la base de données",
        {
          error: error.message,
          stack: error.stack,
        },
      );
      throw new Error(`Connexion base de données échouée: ${error.message}`);
    }
  }
  async initializePrisma(databaseUrl) {
    this.prismaClient = new client_1.PrismaClient({
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
      log: [
        { level: "query", emit: "event" },
        { level: "error", emit: "event" },
        { level: "info", emit: "event" },
        { level: "warn", emit: "event" },
      ],
    });
    this.prismaClient.$on("query", (e) => {
      logger_1.default.debug("Prisma Query", {
        query: e.query,
        duration: `${e.duration}ms`,
        params: e.params,
      });
    });
    this.prismaClient.$on("error", (e) => {
      logger_1.default.error("Prisma Error", {
        message: e.message,
        target: e.target,
      });
    });
    await this.prismaClient.$connect();
    logger_1.default.info("Connexion Prisma établie avec succès");
  }
  async initializeMongoose(databaseUrl) {
    const options = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferCommands: false,
    };
    await mongoose_1.default.connect(databaseUrl, options);
    this.mongooseConnection = mongoose_1.default.connection;
    this.mongooseConnection.on("connected", () => {
      logger_1.default.info("Connexion Mongoose établie avec succès");
    });
    this.mongooseConnection.on("error", (err) => {
      logger_1.default.error("Erreur Mongoose", { error: err.message });
    });
    this.mongooseConnection.on("disconnected", () => {
      logger_1.default.warn("Connexion Mongoose fermée");
    });
  }
  async healthCheck() {
    const health = {
      prisma: false,
      mongoose: false,
      overall: false,
    };
    try {
      if (this.prismaClient) {
        await this.prismaClient.$queryRaw`SELECT 1`;
        health.prisma = true;
      }
    } catch (error) {
      logger_1.default.warn("Health check Prisma échoué", { error });
    }
    try {
      if (this.mongooseConnection && this.mongooseConnection.readyState === 1) {
        health.mongoose = true;
      }
    } catch (error) {
      logger_1.default.warn("Health check Mongoose échoué", { error });
    }
    health.overall = health.prisma && health.mongoose;
    return health;
  }
  async transaction(operations) {
    if (!this.prismaClient) {
      throw new Error("Client Prisma non initialisé");
    }
    const startTime = Date.now();
    try {
      const result = await this.prismaClient.$transaction(async (tx) => {
        return await operations(tx);
      });
      const duration = Date.now() - startTime;
      logger_1.default.debug("Transaction Prisma terminée", {
        duration: `${duration}ms`,
      });
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger_1.default.error("Transaction Prisma échouée", {
        duration: `${duration}ms`,
        error: error.message,
      });
      throw error;
    }
  }
  async createIndexes() {
    if (!this.prismaClient) {
      throw new Error("Client Prisma non initialisé");
    }
    try {
      logger_1.default.info("Indexes de base de données créés avec succès");
    } catch (error) {
      logger_1.default.error("Erreur lors de la création des indexes", {
        error: error.message,
      });
      throw error;
    }
  }
  async cleanup() {
    try {
      if (this.prismaClient) {
        await this.prismaClient.$disconnect();
        this.prismaClient = null;
        logger_1.default.info("Connexion Prisma fermée");
      }
      if (this.mongooseConnection) {
        await mongoose_1.default.disconnect();
        this.mongooseConnection = null;
        logger_1.default.info("Connexion Mongoose fermée");
      }
      this.isConnected = false;
    } catch (error) {
      logger_1.default.error("Erreur lors de la fermeture des connexions", {
        error: error.message,
      });
    }
  }
  async cleanupTestData() {
    if (process.env.NODE_ENV !== "test") {
      throw new Error("Nettoyage des données autorisé uniquement en mode test");
    }
    if (!this.prismaClient) {
      throw new Error("Client Prisma non initialisé");
    }
    try {
      await this.prismaClient.$executeRaw`DELETE FROM datasets`;
      await this.prismaClient.$executeRaw`DELETE FROM repositories`;
      await this.prismaClient.$executeRaw`DELETE FROM users`;
      logger_1.default.info("Données de test nettoyées");
    } catch (error) {
      logger_1.default.error("Erreur lors du nettoyage des données de test", {
        error: error.message,
      });
      throw error;
    }
  }
  sanitizeUrl(url) {
    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.password) {
        parsedUrl.password = "***";
      }
      return parsedUrl.toString();
    } catch {
      return "URL invalide";
    }
  }
  getPrismaClient() {
    return this.prismaClient;
  }
  getMongooseConnection() {
    return this.mongooseConnection;
  }
  getConnectionStatus() {
    return this.isConnected;
  }
  async findMany(model, options = {}) {
    if (!this.prismaClient) {
      throw new Error("Client Prisma non initialisé");
    }
    const startTime = Date.now();
    try {
      const result = await this.prismaClient[model].findMany(options);
      const duration = Date.now() - startTime;
      logger_1.default.debug("Find many operation", {
        model,
        count: result.length,
        duration: `${duration}ms`,
      });
      return result;
    } catch (error) {
      logger_1.default.error("Find many operation failed", {
        model,
        error: error.message,
      });
      throw error;
    }
  }
  async findUnique(model, where) {
    if (!this.prismaClient) {
      throw new Error("Client Prisma non initialisé");
    }
    const startTime = Date.now();
    try {
      const result = await this.prismaClient[model].findUnique({ where });
      const duration = Date.now() - startTime;
      logger_1.default.debug("Find unique operation", {
        model,
        found: !!result,
        duration: `${duration}ms`,
      });
      return result;
    } catch (error) {
      logger_1.default.error("Find unique operation failed", {
        model,
        error: error.message,
      });
      throw error;
    }
  }
  async create(model, data) {
    if (!this.prismaClient) {
      throw new Error("Client Prisma non initialisé");
    }
    const startTime = Date.now();
    try {
      const result = await this.prismaClient[model].create({ data });
      const duration = Date.now() - startTime;
      logger_1.default.debug("Create operation", {
        model,
        duration: `${duration}ms`,
      });
      return result;
    } catch (error) {
      logger_1.default.error("Create operation failed", {
        model,
        error: error.message,
      });
      throw error;
    }
  }
  async update(model, where, data) {
    if (!this.prismaClient) {
      throw new Error("Client Prisma non initialisé");
    }
    const startTime = Date.now();
    try {
      const result = await this.prismaClient[model].update({ where, data });
      const duration = Date.now() - startTime;
      logger_1.default.debug("Update operation", {
        model,
        duration: `${duration}ms`,
      });
      return result;
    } catch (error) {
      logger_1.default.error("Update operation failed", {
        model,
        error: error.message,
      });
      throw error;
    }
  }
  async delete(model, where) {
    if (!this.prismaClient) {
      throw new Error("Client Prisma non initialisé");
    }
    const startTime = Date.now();
    try {
      const result = await this.prismaClient[model].delete({ where });
      const duration = Date.now() - startTime;
      logger_1.default.debug("Delete operation", {
        model,
        duration: `${duration}ms`,
      });
      return result;
    } catch (error) {
      logger_1.default.error("Delete operation failed", {
        model,
        error: error.message,
      });
      throw error;
    }
  }
}
exports.DatabaseConfig = DatabaseConfig;
exports.databaseConfig = new DatabaseConfig();
exports.default = exports.databaseConfig;
//# sourceMappingURL=database.js.map
