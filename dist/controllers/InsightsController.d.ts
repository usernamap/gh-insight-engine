import { Request, Response } from "express";
export declare class InsightsController {
  static generateInsights: (
    req: Request,
    res: Response,
    next: import("express").NextFunction,
  ) => void;
  static getInsightsSummary: (
    req: Request,
    res: Response,
    next: import("express").NextFunction,
  ) => void;
  static getDeveloperPersonality: (
    req: Request,
    res: Response,
    next: import("express").NextFunction,
  ) => void;
  static getRecommendations: (
    req: Request,
    res: Response,
    next: import("express").NextFunction,
  ) => void;
  static getStrengths: (
    req: Request,
    res: Response,
    next: import("express").NextFunction,
  ) => void;
  static getGrowthOpportunities: (
    req: Request,
    res: Response,
    next: import("express").NextFunction,
  ) => void;
  static getSkillAssessment: (
    req: Request,
    res: Response,
    next: import("express").NextFunction,
  ) => void;
  static getCareerInsights: (
    req: Request,
    res: Response,
    next: import("express").NextFunction,
  ) => void;
}
export default InsightsController;
//# sourceMappingURL=InsightsController.d.ts.map
