"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.insightsRoutes =
  exports.analyticsRoutes =
  exports.repositoryRoutes =
  exports.userRoutes =
  exports.authRoutes =
  exports.setupRoutes =
    void 0;
const express_1 = require("express");
const auth_1 = __importDefault(require("./auth"));
exports.authRoutes = auth_1.default;
const users_1 = __importDefault(require("./users"));
exports.userRoutes = users_1.default;
const repositories_1 = __importDefault(require("./repositories"));
exports.repositoryRoutes = repositories_1.default;
const analytics_1 = __importDefault(require("./analytics"));
exports.analyticsRoutes = analytics_1.default;
const insights_1 = __importDefault(require("./insights"));
exports.insightsRoutes = insights_1.default;
const logger_1 = __importDefault(require("@/utils/logger"));
const setupRoutes = (app) => {
  const apiRouter = (0, express_1.Router)();
  apiRouter.get("/health", (req, res) => {
    res.status(200).json({
      status: "healthy",
      service: "GitHub Insight Engine API",
      version: process.env.npm_package_version || "1.0.0",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
    });
  });
  apiRouter.get("/ping", (req, res) => {
    res
      .status(200)
      .json({ message: "pong", timestamp: new Date().toISOString() });
  });
  apiRouter.use("/auth", auth_1.default);
  apiRouter.use("/users", users_1.default);
  apiRouter.use("/repositories", repositories_1.default);
  apiRouter.use("/analytics", analytics_1.default);
  apiRouter.use("/insights", insights_1.default);
  app.use("/api", apiRouter);
  app.get("/", (req, res) => {
    res.status(200).json({
      name: "GitHub Insight Engine API",
      description:
        "API REST pour l'analyse en profondeur des données GitHub avec insights IA",
      version: process.env.npm_package_version || "1.0.0",
      documentation: {
        endpoints: {
          "/api/health": "Health check du service",
          "/api/ping": "Test de connectivité simple",
          "/api/auth/*": "Authentification et gestion des tokens",
          "/api/users/*": "Gestion des utilisateurs GitHub",
          "/api/repositories/*": "Recherche et gestion des repositories",
          "/api/analytics/*": "Analyses quantitatives et métriques",
          "/api/insights/*": "Insights IA qualitatifs et recommandations",
        },
        authentication: {
          type: "JWT Bearer Token",
          login: "POST /api/auth/login avec GitHub Classic Token",
          refresh: "POST /api/auth/refresh",
        },
        rateLimit: {
          global: "100 requêtes par 15 minutes par IP",
          auth: "5 tentatives de connexion par 15 minutes par IP",
          analysis: "10 analyses par heure par IP",
        },
        support: {
          github:
            process.env.GITHUB_REPOSITORY_URL ||
            "https://github.com/org/gh-insight-engine",
          documentation: "/docs (à venir)",
        },
      },
      timestamp: new Date().toISOString(),
    });
  });
  logger_1.default.info("Routes API configurées", {
    routes: [
      "/api/health",
      "/api/ping",
      "/api/auth/*",
      "/api/users/*",
      "/api/repositories/*",
      "/api/analytics/*",
      "/api/insights/*",
    ],
    totalRoutes: 7,
  });
};
exports.setupRoutes = setupRoutes;
//# sourceMappingURL=index.js.map
