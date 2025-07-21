import { Request, Response } from 'express';
export declare class AnalyticsController {
    static analyzeUser: (req: Request, res: Response, next: import("express").NextFunction) => void;
    static getAnalyticsOverview: (req: Request, res: Response, next: import("express").NextFunction) => void;
    static getPerformanceMetrics: (req: Request, res: Response, next: import("express").NextFunction) => void;
    static getLanguageAnalytics: (req: Request, res: Response, next: import("express").NextFunction) => void;
    static getActivityPatterns: (req: Request, res: Response, next: import("express").NextFunction) => void;
    static getProductivityScore: (req: Request, res: Response, next: import("express").NextFunction) => void;
    static getDevOpsMaturity: (req: Request, res: Response, next: import("express").NextFunction) => void;
}
export default AnalyticsController;
//# sourceMappingURL=AnalyticsController.d.ts.map