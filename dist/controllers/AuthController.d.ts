import { Request, Response } from 'express';
export declare class AuthController {
    static login: (req: Request, _res: Response, _next: import("express").NextFunction) => void;
    static refresh: (req: Request, _res: Response, _next: import("express").NextFunction) => void;
    static logout: (req: Request, _res: Response, _next: import("express").NextFunction) => void;
    static validateToken: (req: Request, _res: Response, _next: import("express").NextFunction) => void;
    static getCurrentUser: (req: Request, _res: Response, _next: import("express").NextFunction) => void;
}
export default AuthController;
//# sourceMappingURL=AuthController.d.ts.map