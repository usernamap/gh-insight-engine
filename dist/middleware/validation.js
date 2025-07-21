"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeInput = exports.validateUserAnalysis = exports.validateRepoWithPagination = exports.validateUserWithPagination = exports.validateMetadataUpdate = exports.validateAnalysisParams = exports.validateRepoSearch = exports.validateUserSearch = exports.validatePagination = exports.validateDatasetParams = exports.validateRepoParams = exports.validateUserParams = exports.validateAuth = exports.metadataUpdateSchema = exports.datasetParamsSchema = exports.analysisQuerySchema = exports.repoSearchQuerySchema = exports.userSearchQuerySchema = exports.paginationQuerySchema = exports.authBodySchema = exports.repoParamsSchema = exports.userParamsSchema = exports.validate = void 0;
const zod_1 = require("zod");
const logger_1 = require("@/utils/logger");
const validate = (schemas) => {
    return async (req, res, next) => {
        try {
            if (schemas.params) {
                req.params = await schemas.params.parseAsync(req.params);
            }
            if (schemas.body) {
                req.body = await schemas.body.parseAsync(req.body);
            }
            if (schemas.query) {
                req.query = await schemas.query.parseAsync(req.query);
            }
            if (schemas.headers) {
                req.headers = await schemas.headers.parseAsync(req.headers);
            }
            logger_1.logWithContext.api('validation_success', req.path, true, {
                method: req.method,
                schemas: Object.keys(schemas),
            });
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                logger_1.logWithContext.api('validation_error', req.path, false, {
                    method: req.method,
                    errors: error.errors,
                    schemas: Object.keys(schemas),
                });
                res.status(400).json({
                    error: 'Erreur de validation des données',
                    message: 'Les données fournies ne respectent pas le format attendu',
                    details: error.errors.map(err => ({
                        field: err.path.join('.'),
                        message: err.message,
                        code: err.code,
                        received: err.received,
                    })),
                    timestamp: new Date().toISOString(),
                });
            }
            else {
                next(error);
            }
        }
    };
};
exports.validate = validate;
exports.userParamsSchema = zod_1.z.object({
    username: zod_1.z.string()
        .min(1, 'Le nom d\'utilisateur est requis')
        .max(39, 'Le nom d\'utilisateur ne peut pas dépasser 39 caractères')
        .regex(/^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i, 'Format de nom d\'utilisateur GitHub invalide'),
});
exports.repoParamsSchema = zod_1.z.object({
    owner: zod_1.z.string()
        .min(1, 'Le propriétaire est requis')
        .max(39, 'Le nom du propriétaire ne peut pas dépasser 39 caractères')
        .regex(/^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i, 'Format de propriétaire GitHub invalide'),
    repo: zod_1.z.string()
        .min(1, 'Le nom du repository est requis')
        .max(100, 'Le nom du repository ne peut pas dépasser 100 caractères')
        .regex(/^[a-zA-Z0-9._-]+$/, 'Format de nom de repository invalide'),
});
exports.authBodySchema = zod_1.z.object({
    username: zod_1.z.string()
        .min(1, 'Le nom d\'utilisateur est requis')
        .max(39, 'Le nom d\'utilisateur ne peut pas dépasser 39 caractères')
        .regex(/^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i, 'Format de nom d\'utilisateur GitHub invalide'),
    fullName: zod_1.z.string()
        .min(1, 'Le nom complet est requis')
        .max(255, 'Le nom complet ne peut pas dépasser 255 caractères')
        .regex(/^[\p{L}\p{M}\p{Zs}.-]+$/u, 'Le nom complet contient des caractères invalides'),
    githubToken: zod_1.z.string()
        .min(40, 'Le token GitHub doit contenir au moins 40 caractères')
        .max(255, 'Le token GitHub ne peut pas dépasser 255 caractères')
        .regex(/^gh[pousr]_[A-Za-z0-9_]{36,251}$/, 'Format de token GitHub invalide'),
});
exports.paginationQuerySchema = zod_1.z.object({
    page: zod_1.z.string()
        .optional()
        .transform(val => val ? parseInt(val, 10) : 1)
        .refine(val => val >= 1 && val <= 1000, 'La page doit être entre 1 et 1000'),
    limit: zod_1.z.string()
        .optional()
        .transform(val => val ? parseInt(val, 10) : 20)
        .refine(val => val >= 1 && val <= 100, 'La limite doit être entre 1 et 100'),
    sortBy: zod_1.z.enum(['createdAt', 'updatedAt', 'stargazerCount', 'forkCount', 'pushedAt', 'name'])
        .optional()
        .default('updatedAt'),
    sortOrder: zod_1.z.enum(['asc', 'desc'])
        .optional()
        .default('desc'),
});
exports.userSearchQuerySchema = zod_1.z.object({
    query: zod_1.z.string()
        .min(1, 'Le terme de recherche est requis')
        .max(255, 'Le terme de recherche ne peut pas dépasser 255 caractères')
        .optional(),
    location: zod_1.z.string()
        .max(100, 'La localisation ne peut pas dépasser 100 caractères')
        .optional(),
    language: zod_1.z.string()
        .max(50, 'Le langage ne peut pas dépasser 50 caractères')
        .optional(),
    minFollowers: zod_1.z.string()
        .optional()
        .transform(val => val ? parseInt(val, 10) : undefined)
        .refine(val => val === undefined || (val >= 0 && val <= 1000000), 'Le nombre minimum de followers doit être entre 0 et 1,000,000'),
    minRepos: zod_1.z.string()
        .optional()
        .transform(val => val ? parseInt(val, 10) : undefined)
        .refine(val => val === undefined || (val >= 0 && val <= 10000), 'Le nombre minimum de repos doit être entre 0 et 10,000'),
}).merge(exports.paginationQuerySchema);
exports.repoSearchQuerySchema = zod_1.z.object({
    query: zod_1.z.string()
        .min(1, 'Le terme de recherche est requis')
        .max(255, 'Le terme de recherche ne peut pas dépasser 255 caractères')
        .optional(),
    language: zod_1.z.string()
        .max(50, 'Le langage ne peut pas dépasser 50 caractères')
        .optional(),
    topic: zod_1.z.string()
        .max(35, 'Le topic ne peut pas dépasser 35 caractères')
        .optional(),
    minStars: zod_1.z.string()
        .optional()
        .transform(val => val ? parseInt(val, 10) : undefined)
        .refine(val => val === undefined || (val >= 0 && val <= 1000000), 'Le nombre minimum de stars doit être entre 0 et 1,000,000'),
    minForks: zod_1.z.string()
        .optional()
        .transform(val => val ? parseInt(val, 10) : undefined)
        .refine(val => val === undefined || (val >= 0 && val <= 100000), 'Le nombre minimum de forks doit être entre 0 et 100,000'),
    isPrivate: zod_1.z.string()
        .optional()
        .transform(val => {
        if (val === undefined || val === '')
            return undefined;
        return val.toLowerCase() === 'true';
    }),
    isFork: zod_1.z.string()
        .optional()
        .transform(val => {
        if (val === undefined || val === '')
            return undefined;
        return val.toLowerCase() === 'true';
    }),
    isArchived: zod_1.z.string()
        .optional()
        .transform(val => {
        if (val === undefined || val === '')
            return undefined;
        return val.toLowerCase() === 'true';
    }),
}).merge(exports.paginationQuerySchema);
exports.analysisQuerySchema = zod_1.z.object({
    includePrivate: zod_1.z.string()
        .optional()
        .transform(val => {
        if (val === undefined || val === '')
            return false;
        return val.toLowerCase() === 'true';
    }),
    forceRefresh: zod_1.z.string()
        .optional()
        .transform(val => {
        if (val === undefined || val === '')
            return false;
        return val.toLowerCase() === 'true';
    }),
    maxAge: zod_1.z.string()
        .optional()
        .transform(val => val ? parseInt(val, 10) : 24)
        .refine(val => val >= 1 && val <= 168, 'L\'âge maximum doit être entre 1 et 168 heures (7 jours)'),
});
exports.datasetParamsSchema = zod_1.z.object({
    id: zod_1.z.string()
        .length(24, 'L\'ID du dataset doit être un ObjectId MongoDB valide')
        .regex(/^[0-9a-fA-F]{24}$/, 'L\'ID du dataset doit être un ObjectId MongoDB valide'),
});
exports.metadataUpdateSchema = zod_1.z.object({
    description: zod_1.z.string()
        .max(1000, 'La description ne peut pas dépasser 1000 caractères')
        .optional(),
    tags: zod_1.z.array(zod_1.z.string().max(50, 'Chaque tag ne peut pas dépasser 50 caractères'))
        .max(20, 'Maximum 20 tags autorisés')
        .optional(),
    isPublic: zod_1.z.boolean()
        .optional(),
    settings: zod_1.z.object({
        includePrivateRepos: zod_1.z.boolean().optional(),
        includeForkedRepos: zod_1.z.boolean().optional(),
        includeArchivedRepos: zod_1.z.boolean().optional(),
        analysisDepth: zod_1.z.enum(['basic', 'standard', 'detailed']).optional(),
        aiAnalysisEnabled: zod_1.z.boolean().optional(),
    }).optional(),
});
exports.validateAuth = (0, exports.validate)({
    body: exports.authBodySchema,
});
exports.validateUserParams = (0, exports.validate)({
    params: exports.userParamsSchema,
});
exports.validateRepoParams = (0, exports.validate)({
    params: exports.repoParamsSchema,
});
exports.validateDatasetParams = (0, exports.validate)({
    params: exports.datasetParamsSchema,
});
exports.validatePagination = (0, exports.validate)({
    query: exports.paginationQuerySchema,
});
exports.validateUserSearch = (0, exports.validate)({
    query: exports.userSearchQuerySchema,
});
exports.validateRepoSearch = (0, exports.validate)({
    query: exports.repoSearchQuerySchema,
});
exports.validateAnalysisParams = (0, exports.validate)({
    query: exports.analysisQuerySchema,
});
exports.validateMetadataUpdate = (0, exports.validate)({
    body: exports.metadataUpdateSchema,
});
exports.validateUserWithPagination = (0, exports.validate)({
    params: exports.userParamsSchema,
    query: exports.paginationQuerySchema,
});
exports.validateRepoWithPagination = (0, exports.validate)({
    params: exports.repoParamsSchema,
    query: exports.paginationQuerySchema,
});
exports.validateUserAnalysis = (0, exports.validate)({
    params: exports.userParamsSchema,
    query: exports.analysisQuerySchema,
});
const sanitizeInput = (req, res, next) => {
    const sanitizeObject = (obj) => {
        if (obj === null || obj === undefined)
            return obj;
        if (typeof obj === 'string') {
            obj = obj.trim();
            obj = obj
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#x27;')
                .replace(/\//g, '&#x2F;');
            return obj;
        }
        if (Array.isArray(obj)) {
            return obj.map(item => sanitizeObject(item));
        }
        if (typeof obj === 'object') {
            const sanitized = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    sanitized[key] = sanitizeObject(obj[key]);
                }
            }
            return sanitized;
        }
        return obj;
    };
    try {
        if (req.body) {
            req.body = sanitizeObject(req.body);
        }
        if (req.query) {
            req.query = sanitizeObject(req.query);
        }
        if (req.params) {
            req.params = sanitizeObject(req.params);
        }
        logger_1.logWithContext.security('input_sanitized', req.path, true, {
            method: req.method,
            hasBody: !!req.body,
            hasQuery: Object.keys(req.query || {}).length > 0,
            hasParams: Object.keys(req.params || {}).length > 0,
        });
        next();
    }
    catch (error) {
        logger_1.logWithContext.security('sanitization_error', req.path, false, {
            method: req.method,
            error: error.message,
        });
        res.status(500).json({
            error: 'Erreur lors de la sanitisation des données',
            message: 'Une erreur inattendue s\'est produite lors du traitement de votre requête',
            timestamp: new Date().toISOString(),
        });
    }
};
exports.sanitizeInput = sanitizeInput;
//# sourceMappingURL=validation.js.map