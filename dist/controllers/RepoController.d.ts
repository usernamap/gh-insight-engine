import { Request, Response } from 'express';
export declare class RepoController {
    static getRepository: (req: Request, res: Response, next: import("express").NextFunction) => void;
    static searchRepositories: (req: Request, res: Response, next: import("express").NextFunction) => void;
    static enrichRepository: (req: Request, res: Response, next: import("express").NextFunction) => void;
    static getLanguagesStats: (req: Request, res: Response, next: import("express").NextFunction) => void;
    static getTrendingRepositories: (req: Request, res: Response, next: import("express").NextFunction) => void;
}
export default RepoController;
//# sourceMappingURL=RepoController.d.ts.map