import { NextFunction, Request, Response } from 'express';
import { ZodError, ZodSchema, z } from 'zod';
import { logWithContext } from '@/utils/logger';

/**
 * Interface pour la validation des requêtes
 */
interface ValidationSchemas {
  params?: ZodSchema<unknown>;
  body?: ZodSchema<unknown>;
  query?: ZodSchema<unknown>;
  headers?: ZodSchema<unknown>;
}

/**
 * Middleware générique de validation Zod
 */
export const validate = (schemas: ValidationSchemas) => {
  return async (
    req: Request,
    _res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    try {
      // Validation des paramètres de route
      if (schemas.params) {
        req.params = (await schemas.params.parseAsync(
          req.params,
        )) as typeof req.params;
      }

      // Validation du body
      if (schemas.body) {
        req.body = (await schemas.body.parseAsync(req.body)) as typeof req.body;
      }

      // Validation des query parameters
      if (schemas.query) {
        const validatedQuery = await schemas.query.parseAsync(req.query);
        // Utiliser Object.defineProperty pour remplacer le getter
        Object.defineProperty(req, 'query', {
          value: validatedQuery,
          writable: true,
          enumerable: true,
          configurable: true,
        });
      }

      // Validation des headers
      if (schemas.headers) {
        req.headers = (await schemas.headers.parseAsync(
          req.headers,
        )) as typeof req.headers;
      }

      // Logging validation success
      logWithContext.api('validation_success', req.path, true, {
        method: req.method,
        schemas: Object.keys(schemas),
      });

      _next();
    } catch (_error) {
      if (_error instanceof ZodError) {
        logWithContext.api('validation_error', req.path, false, {
          method: req.method,
          errors: _error.errors,
          schemas: Object.keys(schemas),
        });

        _res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Les données fournies ne respectent pas le format attendu',
          details: _error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code,
            received:
              'received' in err
                ? (err as { received?: unknown }).received
                : undefined,
          })),
          timestamp: new Date().toISOString(),
        });
      } else {
        _next(_error);
      }
    }
  };
};

// =======================
// SCHÉMAS DE VALIDATION COMMUNS
// =======================

/**
 * Schéma pour les paramètres utilisateur
 */
export const userParamsSchema = z.object({
  username: z
    .string()
    .min(1, "Le nom d'utilisateur est requis")
    .max(39, "Le nom d'utilisateur ne peut pas dépasser 39 caractères")
    .regex(
      /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i,
      "Format de nom d'utilisateur GitHub invalide",
    ),
});

/**
 * Schéma pour les paramètres de repository
 */
export const repoParamsSchema = z.object({
  owner: z
    .string()
    .min(1, 'Le propriétaire est requis')
    .max(39, 'Le nom du propriétaire ne peut pas dépasser 39 caractères')
    .regex(
      /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i,
      'Format de propriétaire GitHub invalide',
    ),
  repo: z
    .string()
    .min(1, 'Le nom du repository est requis')
    .max(100, 'Le nom du repository ne peut pas dépasser 100 caractères')
    .regex(/^[a-zA-Z0-9._-]+$/, 'Format de nom de repository invalide'),
});

/**
 * Schéma pour l'authentification
 */
export const authBodySchema = z.object({
  username: z
    .string()
    .min(1, "Le nom d'utilisateur est requis")
    .max(39, "Le nom d'utilisateur ne peut pas dépasser 39 caractères")
    .regex(
      /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i,
      "Format de nom d'utilisateur GitHub invalide",
    ),
  fullName: z
    .string()
    .min(1, 'Le nom complet est requis')
    .max(255, 'Le nom complet ne peut pas dépasser 255 caractères')
    .regex(
      /^[\p{L}\p{M}\p{Zs}.-]+$/u,
      'Le nom complet contient des caractères invalides',
    ),
  githubToken: z
    .string()
    .min(40, 'Le token GitHub doit contenir au moins 40 caractères')
    .max(255, 'Le token GitHub ne peut pas dépasser 255 caractères')
    .regex(
      /^gh[pousr]_[A-Za-z0-9_]{36,251}$/,
      'Format de token GitHub invalide',
    ),
});

/**
 * Schéma pour les paramètres de pagination
 */
export const paginationQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val !== undefined && val !== null && val !== '' ? parseInt(val, 10) : 1))
    .refine(
      (val) => val >= 1 && val <= 1000,
      'La page doit être entre 1 et 1000',
    ),
  limit: z
    .string()
    .optional()
    .transform((val) => (val !== undefined && val !== null && val !== '' ? parseInt(val, 10) : 20))
    .refine(
      (val) => val >= 1 && val <= 100,
      'La limite doit être entre 1 et 100',
    ),
  sortBy: z
    .enum([
      'createdAt',
      'updatedAt',
      'stargazerCount',
      'forkCount',
      'pushedAt',
      'name',
    ])
    .optional()
    .default('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

/**
 * Schéma pour les filtres de recherche repository
 */
export const repoSearchQuerySchema = z
  .object({
    query: z
      .string()
      .min(1, 'Le terme de recherche est requis')
      .max(255, 'Le terme de recherche ne peut pas dépasser 255 caractères')
      .optional(),
    language: z
      .string()
      .max(50, 'Le langage ne peut pas dépasser 50 caractères')
      .optional(),
    topic: z
      .string()
      .max(35, 'Le topic ne peut pas dépasser 35 caractères')
      .optional(),
    minStars: z
      .string()
      .optional()
      .transform((val) => (val !== undefined && val !== null && val !== '' ? parseInt(val, 10) : undefined))
      .refine(
        (val) => val === undefined || (val >= 0 && val <= 1000000),
        'Le nombre minimum de stars doit être entre 0 et 1,000,000',
      ),
    minForks: z
      .string()
      .optional()
      .transform((val) => (val !== undefined && val !== null && val !== '' ? parseInt(val, 10) : undefined))
      .refine(
        (val) => val === undefined || (val >= 0 && val <= 100000),
        'Le nombre minimum de forks doit être entre 0 et 100,000',
      ),
    isPrivate: z
      .string()
      .optional()
      .transform((val) => {
        if (val === undefined || val === '') return undefined;
        return val.toLowerCase() === 'true';
      }),
    isFork: z
      .string()
      .optional()
      .transform((val) => {
        if (val === undefined || val === '') return undefined;
        return val.toLowerCase() === 'true';
      }),
    isArchived: z
      .string()
      .optional()
      .transform((val) => {
        if (val === undefined || val === '') return undefined;
        return val.toLowerCase() === 'true';
      }),
  })
  .merge(paginationQuerySchema);

/**
 * Schéma pour les paramètres d'analyse
 */
export const analysisQuerySchema = z.object({
  includePrivate: z
    .string()
    .optional()
    .transform((val) => {
      if (val === undefined || val === '') return false;
      return val.toLowerCase() === 'true';
    }),
  forceRefresh: z
    .string()
    .optional()
    .transform((val) => {
      if (val === undefined || val === '') return false;
      return val.toLowerCase() === 'true';
    }),
  maxAge: z
    .string()
    .optional()
    .transform((val) => (val !== undefined && val !== null && val !== '' ? parseInt(val, 10) : 24))
    .refine(
      (val) => val >= 1 && val <= 168,
      "L'âge maximum doit être entre 1 et 168 heures (7 jours)",
    ),
});

/**
 * Schéma pour la mise à jour des métadonnées
 */
export const metadataUpdateSchema = z.object({
  description: z
    .string()
    .max(1000, 'La description ne peut pas dépasser 1000 caractères')
    .optional(),
  tags: z
    .array(z.string().max(50, 'Chaque tag ne peut pas dépasser 50 caractères'))
    .max(20, 'Maximum 20 tags autorisés')
    .optional(),
  isPublic: z.boolean().optional(),
  settings: z
    .object({
      includePrivateRepos: z.boolean().optional(),
      includeForkedRepos: z.boolean().optional(),
      includeArchivedRepos: z.boolean().optional(),
      analysisDepth: z.enum(['basic', 'standard', 'detailed']).optional(),
      aiAnalysisEnabled: z.boolean().optional(),
    })
    .optional(),
});

// =======================
// MIDDLEWARES DE VALIDATION SPÉCIALISÉS
// =======================

/**
 * Validation pour les routes d'authentification
 */
export const validateAuth = validate({
  body: authBodySchema,
});

/**
 * Validation pour les paramètres utilisateur
 */
export const validateUserParams = validate({
  params: userParamsSchema,
});

/**
 * Validation pour les paramètres repository
 */
export const validateRepoParams = validate({
  params: repoParamsSchema,
});

/**
 * Validation pour la pagination
 */
export const validatePagination = validate({
  query: paginationQuerySchema,
});

/**
 * Validation pour la recherche de repositories
 */
export const validateRepoSearch = validate({
  query: repoSearchQuerySchema,
});

/**
 * Validation pour les paramètres d'analyse
 */
export const validateAnalysisParams = validate({
  query: analysisQuerySchema,
});

/**
 * Validation pour la mise à jour des métadonnées
 */
export const validateMetadataUpdate = validate({
  body: metadataUpdateSchema,
});

/**
 * Validation pour les combinaisons courantes
 */
export const validateUserWithPagination = validate({
  params: userParamsSchema,
  query: paginationQuerySchema,
});

export const validateRepoWithPagination = validate({
  params: repoParamsSchema,
  query: paginationQuerySchema,
});

export const validateUserAnalysis = validate({
  params: userParamsSchema,
  query: analysisQuerySchema,
});

/**
 * Middleware de sanitisation des données
 */
export const sanitizeInput = (
  req: Request,
  _res: Response,
  _next: NextFunction,
): void => {
  // DEBUG: Log du contenu avant sanitisation
  // eslint-disable-next-line no-console
  console.log('[SANITIZE DEBUG] req.body:', req.body, 'type:', typeof req.body);
  // eslint-disable-next-line no-console
  console.log('[SANITIZE DEBUG] req.query:', req.query, 'type:', typeof req.query);
  // eslint-disable-next-line no-console
  console.log('[SANITIZE DEBUG] req.params:', req.params, 'type:', typeof req.params);
  // Fonction de sanitisation récursive
  const sanitizeObject = (obj: unknown): unknown => {
    if (typeof obj === 'undefined') return obj;

    if (typeof obj === 'string') {
      // Nettoyer les espaces en début/fin
      let sanitized = obj.trim();
      sanitized = sanitized
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
      return sanitized;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => sanitizeObject(item));
    }

    if (typeof obj === 'object' && obj !== null) {
      const sanitized: { [k: string]: unknown } = {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          sanitized[key] = sanitizeObject(
            (obj as { [k: string]: unknown })[key],
          );
        }
      }
      return sanitized;
    }

    return obj;
  };

  try {
    // Sanitiser le body (affectation directe OK)
    if (typeof req.body !== 'undefined' && req.body !== null) {
      req.body = sanitizeObject(req.body) as typeof req.body;
    }

    // Sanitiser les propriétés de req.query (getter-only)
    if (typeof req.query !== 'undefined' && req.query !== null) {
      const sanitizedQuery = sanitizeObject(req.query) as typeof req.query;
      for (const key of Object.keys(req.query)) {
        // @ts-ignore: mutation intentionnelle
        delete req.query[key];
      }
      for (const key of Object.keys(sanitizedQuery)) {
        // @ts-ignore: mutation intentionnelle
        req.query[key] = sanitizedQuery[key];
      }
    }

    // Sanitiser les propriétés de req.params (getter-only)
    if (typeof req.params !== 'undefined' && req.params !== null) {
      const sanitizedParams = sanitizeObject(req.params) as typeof req.params;
      for (const key of Object.keys(req.params)) {
        // @ts-ignore: mutation intentionnelle
        delete req.params[key];
      }
      for (const key of Object.keys(sanitizedParams)) {
        // @ts-ignore: mutation intentionnelle
        req.params[key] = sanitizedParams[key];
      }
    }

    logWithContext.security('input_sanitized', 'low', {
      path: req.path,
      success: true,
      method: req.method,
      hasBody: typeof req.body !== 'undefined' && req.body !== null,
      hasQuery: Object.keys(req.query ?? {}).length > 0,
      hasParams: Object.keys(req.params ?? {}).length > 0,
    });

    _next();
  } catch (_error: unknown) {
    const errorMessage =
      _error instanceof Error ? _error.message : 'Unknown sanitization error';
    logWithContext.security('sanitization_error', 'medium', {
      path: req.path,
      success: false,
      method: req.method,
      _error: errorMessage,
    });

    _res.status(500).json({
      _error: 'Erreur lors de la sanitisation des données',
      message:
        "Une erreur inattendue s'est produite lors du traitement de votre requête",
      timestamp: new Date().toISOString(),
    });
  }
};
