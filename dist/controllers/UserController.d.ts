import { Request, Response } from 'express';
export declare class UserController {
    static getUserProfile: (req: Request, res: Response, next: import("express").NextFunction) => void;
    static searchUsers: (req: Request, res: Response, next: import("express").NextFunction) => void;
    static getUserRepositories: (req: Request, res: Response, next: import("express").NextFunction) => void;
    static getUserAnalysisStatus: (req: Request, res: Response, next: import("express").NextFunction) => void;
    static deleteUserData: (req: Request, res: Response, next: import("express").NextFunction) => void;
    static getUsersStats: (req: Request, res: Response, next: import("express").NextFunction) => void;
}
export default UserController;
//# sourceMappingURL=UserController.d.ts.map