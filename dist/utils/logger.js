"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.logWithContext = void 0;
const winston_1 = __importDefault(require("winston"));
const path_1 = __importDefault(require("path"));
const logsDir = path_1.default.join(process.cwd(), "logs");
const logFormat = winston_1.default.format.combine(
  winston_1.default.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston_1.default.format.errors({ stack: true }),
  winston_1.default.format.json(),
);
const transports = [
  new winston_1.default.transports.Console({
    level: process.env.NODE_ENV === "production" ? "info" : "debug",
    format: winston_1.default.format.combine(
      winston_1.default.format.colorize(),
      winston_1.default.format.simple(),
    ),
  }),
  new winston_1.default.transports.File({
    filename: path_1.default.join(logsDir, "app.log"),
    level: "info",
    format: logFormat,
    maxsize: 10485760,
    maxFiles: 5,
    tailable: true,
  }),
  new winston_1.default.transports.File({
    filename: path_1.default.join(logsDir, "error.log"),
    level: "error",
    format: logFormat,
    maxsize: 10485760,
    maxFiles: 5,
    tailable: true,
  }),
];
const logger = winston_1.default.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: logFormat,
  transports,
  exitOnError: false,
});
logger.exceptions.handle(
  new winston_1.default.transports.File({
    filename: path_1.default.join(logsDir, "exceptions.log"),
    format: logFormat,
  }),
);
logger.rejections.handle(
  new winston_1.default.transports.File({
    filename: path_1.default.join(logsDir, "rejections.log"),
    format: logFormat,
  }),
);
exports.logWithContext = {
  apiRequest: (method, url, ip, meta) => {
    logger.info("API Request", {
      type: "api_request",
      method,
      url,
      ip,
      ...meta,
    });
  },
  apiResponse: (method, url, statusCode, responseTime, meta) => {
    const level = statusCode >= 400 ? "warn" : "info";
    logger.log(level, "API Response", {
      type: "api_response",
      method,
      url,
      statusCode,
      responseTime: `${responseTime}ms`,
      ...meta,
    });
  },
  githubRequest: (endpoint, type, meta) => {
    logger.debug("GitHub API Request", {
      type: "github_request",
      endpoint,
      apiType: type,
      ...meta,
    });
  },
  database: (operation, collection, meta) => {
    logger.debug("Database Operation", {
      type: "database",
      operation,
      collection,
      ...meta,
    });
  },
  aiAnalysis: (analysisType, status, meta) => {
    const level = status === "error" ? "error" : "info";
    logger.log(level, "AI Analysis", {
      type: "ai_analysis",
      analysisType,
      status,
      ...meta,
    });
  },
  auth: (action, username, success, meta) => {
    const level = success ? "info" : "warn";
    logger.log(level, "Authentication", {
      type: "auth",
      action,
      username,
      success,
      ...meta,
    });
  },
  performance: (operation, duration, meta) => {
    const level = duration > 5000 ? "warn" : "info";
    logger.log(level, "Performance", {
      type: "performance",
      operation,
      duration: `${duration}ms`,
      ...meta,
    });
  },
  api: (action, endpoint, success, meta) => {
    const level = success ? "info" : "warn";
    logger.log(level, "API Action", {
      type: "api_action",
      action,
      endpoint,
      success,
      ...meta,
    });
  },
  security: (event, severity, meta) => {
    const level =
      severity === "critical" ? "error" : severity === "high" ? "warn" : "info";
    logger.log(level, "Security Event", {
      type: "security",
      event,
      severity,
      ...meta,
    });
  },
};
exports.default = logger;
//# sourceMappingURL=logger.js.map
