import winston from 'winston';
declare const logger: winston.Logger;
export interface LogMeta {
    [key: string]: any;
}
export declare const logWithContext: {
    apiRequest: (method: string, url: string, ip: string, meta?: LogMeta) => void;
    apiResponse: (method: string, url: string, statusCode: number, responseTime: number, meta?: LogMeta) => void;
    githubRequest: (endpoint: string, type: "graphql" | "rest", meta?: LogMeta) => void;
    database: (operation: string, collection: string, meta?: LogMeta) => void;
    aiAnalysis: (analysisType: string, status: "start" | "success" | "error", meta?: LogMeta) => void;
    auth: (action: string, username: string, success: boolean, meta?: LogMeta) => void;
    performance: (operation: string, duration: number, meta?: LogMeta) => void;
    api: (action: string, endpoint: string, success: boolean, meta?: LogMeta) => void;
    security: (event: string, severity: "low" | "medium" | "high" | "critical", meta?: LogMeta) => void;
};
export default logger;
//# sourceMappingURL=logger.d.ts.map