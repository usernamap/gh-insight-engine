import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';
interface ValidationSchemas {
    params?: ZodSchema<any>;
    body?: ZodSchema<any>;
    query?: ZodSchema<any>;
    headers?: ZodSchema<any>;
}
export declare const validate: (schemas: ValidationSchemas) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const userParamsSchema: z.ZodObject<{
    username: z.ZodString;
}, "strip", z.ZodTypeAny, {
    username: string;
}, {
    username: string;
}>;
export declare const repoParamsSchema: z.ZodObject<{
    owner: z.ZodString;
    repo: z.ZodString;
}, "strip", z.ZodTypeAny, {
    repo: string;
    owner: string;
}, {
    repo: string;
    owner: string;
}>;
export declare const authBodySchema: z.ZodObject<{
    username: z.ZodString;
    fullName: z.ZodString;
    githubToken: z.ZodString;
}, "strip", z.ZodTypeAny, {
    username: string;
    fullName: string;
    githubToken: string;
}, {
    username: string;
    fullName: string;
    githubToken: string;
}>;
export declare const paginationQuerySchema: z.ZodObject<{
    page: z.ZodEffects<z.ZodEffects<z.ZodOptional<z.ZodString>, number, string | undefined>, number, string | undefined>;
    limit: z.ZodEffects<z.ZodEffects<z.ZodOptional<z.ZodString>, number, string | undefined>, number, string | undefined>;
    sortBy: z.ZodDefault<z.ZodOptional<z.ZodEnum<["createdAt", "updatedAt", "stargazerCount", "forkCount", "pushedAt", "name"]>>>;
    sortOrder: z.ZodDefault<z.ZodOptional<z.ZodEnum<["asc", "desc"]>>>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    sortBy: "name" | "createdAt" | "updatedAt" | "stargazerCount" | "forkCount" | "pushedAt";
    sortOrder: "desc" | "asc";
    page: number;
}, {
    limit?: string | undefined;
    sortBy?: "name" | "createdAt" | "updatedAt" | "stargazerCount" | "forkCount" | "pushedAt" | undefined;
    sortOrder?: "desc" | "asc" | undefined;
    page?: string | undefined;
}>;
export declare const userSearchQuerySchema: z.ZodObject<{
    query: z.ZodOptional<z.ZodString>;
    location: z.ZodOptional<z.ZodString>;
    language: z.ZodOptional<z.ZodString>;
    minFollowers: z.ZodEffects<z.ZodEffects<z.ZodOptional<z.ZodString>, number | undefined, string | undefined>, number | undefined, string | undefined>;
    minRepos: z.ZodEffects<z.ZodEffects<z.ZodOptional<z.ZodString>, number | undefined, string | undefined>, number | undefined, string | undefined>;
} & {
    page: z.ZodEffects<z.ZodEffects<z.ZodOptional<z.ZodString>, number, string | undefined>, number, string | undefined>;
    limit: z.ZodEffects<z.ZodEffects<z.ZodOptional<z.ZodString>, number, string | undefined>, number, string | undefined>;
    sortBy: z.ZodDefault<z.ZodOptional<z.ZodEnum<["createdAt", "updatedAt", "stargazerCount", "forkCount", "pushedAt", "name"]>>>;
    sortOrder: z.ZodDefault<z.ZodOptional<z.ZodEnum<["asc", "desc"]>>>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    sortBy: "name" | "createdAt" | "updatedAt" | "stargazerCount" | "forkCount" | "pushedAt";
    sortOrder: "desc" | "asc";
    page: number;
    query?: string | undefined;
    location?: string | undefined;
    language?: string | undefined;
    minFollowers?: number | undefined;
    minRepos?: number | undefined;
}, {
    limit?: string | undefined;
    query?: string | undefined;
    location?: string | undefined;
    language?: string | undefined;
    sortBy?: "name" | "createdAt" | "updatedAt" | "stargazerCount" | "forkCount" | "pushedAt" | undefined;
    sortOrder?: "desc" | "asc" | undefined;
    page?: string | undefined;
    minFollowers?: string | undefined;
    minRepos?: string | undefined;
}>;
export declare const repoSearchQuerySchema: z.ZodObject<{
    query: z.ZodOptional<z.ZodString>;
    language: z.ZodOptional<z.ZodString>;
    topic: z.ZodOptional<z.ZodString>;
    minStars: z.ZodEffects<z.ZodEffects<z.ZodOptional<z.ZodString>, number | undefined, string | undefined>, number | undefined, string | undefined>;
    minForks: z.ZodEffects<z.ZodEffects<z.ZodOptional<z.ZodString>, number | undefined, string | undefined>, number | undefined, string | undefined>;
    isPrivate: z.ZodEffects<z.ZodOptional<z.ZodString>, boolean | undefined, string | undefined>;
    isFork: z.ZodEffects<z.ZodOptional<z.ZodString>, boolean | undefined, string | undefined>;
    isArchived: z.ZodEffects<z.ZodOptional<z.ZodString>, boolean | undefined, string | undefined>;
} & {
    page: z.ZodEffects<z.ZodEffects<z.ZodOptional<z.ZodString>, number, string | undefined>, number, string | undefined>;
    limit: z.ZodEffects<z.ZodEffects<z.ZodOptional<z.ZodString>, number, string | undefined>, number, string | undefined>;
    sortBy: z.ZodDefault<z.ZodOptional<z.ZodEnum<["createdAt", "updatedAt", "stargazerCount", "forkCount", "pushedAt", "name"]>>>;
    sortOrder: z.ZodDefault<z.ZodOptional<z.ZodEnum<["asc", "desc"]>>>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    sortBy: "name" | "createdAt" | "updatedAt" | "stargazerCount" | "forkCount" | "pushedAt";
    sortOrder: "desc" | "asc";
    page: number;
    query?: string | undefined;
    language?: string | undefined;
    isPrivate?: boolean | undefined;
    isArchived?: boolean | undefined;
    isFork?: boolean | undefined;
    topic?: string | undefined;
    minStars?: number | undefined;
    minForks?: number | undefined;
}, {
    limit?: string | undefined;
    query?: string | undefined;
    language?: string | undefined;
    isPrivate?: string | undefined;
    isArchived?: string | undefined;
    isFork?: string | undefined;
    sortBy?: "name" | "createdAt" | "updatedAt" | "stargazerCount" | "forkCount" | "pushedAt" | undefined;
    sortOrder?: "desc" | "asc" | undefined;
    page?: string | undefined;
    topic?: string | undefined;
    minStars?: string | undefined;
    minForks?: string | undefined;
}>;
export declare const analysisQuerySchema: z.ZodObject<{
    includePrivate: z.ZodEffects<z.ZodOptional<z.ZodString>, boolean, string | undefined>;
    forceRefresh: z.ZodEffects<z.ZodOptional<z.ZodString>, boolean, string | undefined>;
    maxAge: z.ZodEffects<z.ZodEffects<z.ZodOptional<z.ZodString>, number, string | undefined>, number, string | undefined>;
}, "strip", z.ZodTypeAny, {
    includePrivate: boolean;
    forceRefresh: boolean;
    maxAge: number;
}, {
    includePrivate?: string | undefined;
    forceRefresh?: string | undefined;
    maxAge?: string | undefined;
}>;
export declare const datasetParamsSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
export declare const metadataUpdateSchema: z.ZodObject<{
    description: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    isPublic: z.ZodOptional<z.ZodBoolean>;
    settings: z.ZodOptional<z.ZodObject<{
        includePrivateRepos: z.ZodOptional<z.ZodBoolean>;
        includeForkedRepos: z.ZodOptional<z.ZodBoolean>;
        includeArchivedRepos: z.ZodOptional<z.ZodBoolean>;
        analysisDepth: z.ZodOptional<z.ZodEnum<["basic", "standard", "detailed"]>>;
        aiAnalysisEnabled: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        includePrivateRepos?: boolean | undefined;
        includeForkedRepos?: boolean | undefined;
        includeArchivedRepos?: boolean | undefined;
        analysisDepth?: "basic" | "standard" | "detailed" | undefined;
        aiAnalysisEnabled?: boolean | undefined;
    }, {
        includePrivateRepos?: boolean | undefined;
        includeForkedRepos?: boolean | undefined;
        includeArchivedRepos?: boolean | undefined;
        analysisDepth?: "basic" | "standard" | "detailed" | undefined;
        aiAnalysisEnabled?: boolean | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    description?: string | undefined;
    tags?: string[] | undefined;
    isPublic?: boolean | undefined;
    settings?: {
        includePrivateRepos?: boolean | undefined;
        includeForkedRepos?: boolean | undefined;
        includeArchivedRepos?: boolean | undefined;
        analysisDepth?: "basic" | "standard" | "detailed" | undefined;
        aiAnalysisEnabled?: boolean | undefined;
    } | undefined;
}, {
    description?: string | undefined;
    tags?: string[] | undefined;
    isPublic?: boolean | undefined;
    settings?: {
        includePrivateRepos?: boolean | undefined;
        includeForkedRepos?: boolean | undefined;
        includeArchivedRepos?: boolean | undefined;
        analysisDepth?: "basic" | "standard" | "detailed" | undefined;
        aiAnalysisEnabled?: boolean | undefined;
    } | undefined;
}>;
export declare const validateAuth: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const validateUserParams: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const validateRepoParams: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const validateDatasetParams: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const validatePagination: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const validateUserSearch: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const validateRepoSearch: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const validateAnalysisParams: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const validateMetadataUpdate: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const validateUserWithPagination: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const validateRepoWithPagination: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const validateUserAnalysis: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const sanitizeInput: (req: Request, res: Response, next: NextFunction) => void;
export {};
//# sourceMappingURL=validation.d.ts.map