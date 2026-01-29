import { NextFunction, Request, Response } from 'express';
import { ZodError, ZodSchema, z } from 'zod';
import { logWithContext } from '@/utils/logger';
import {
  VALIDATION_LIMITS,
  VALIDATION_REGEX,
  VALIDATION_SORT_OPTIONS,
  VALIDATION_SORT_ORDERS,
  VALIDATION_DEFAULTS,
  VALIDATION_ANALYSIS_DEPTH_OPTIONS,
  VALIDATION_BOOLEAN_TRANSFORM,
  VALIDATION_HTML_ENTITIES,
  VALIDATION_HTML_CHARS,
  VALIDATION_MESSAGES,
  VALIDATION_ERROR_CODES,
  VALIDATION_ERROR_MESSAGES,
  VALIDATION_STATUS_CODES,
} from '@/constants';

interface ValidationSchemas {
  params?: ZodSchema<unknown>;
  body?: ZodSchema<unknown>;
  query?: ZodSchema<unknown>;
  headers?: ZodSchema<unknown>;
}

export const validate = (schemas: ValidationSchemas) => {
  return async (req: Request, _res: Response, _next: NextFunction): Promise<void> => {
    try {
      if (schemas.params) {
        req.params = (await schemas.params.parseAsync(req.params)) as typeof req.params;
      }

      if (schemas.body) {
        req.body = (await schemas.body.parseAsync(req.body)) as typeof req.body;
      }

      if (schemas.query) {
        const validatedQuery = await schemas.query.parseAsync(req.query);
        Object.defineProperty(req, 'query', {
          value: validatedQuery,
          writable: true,
          enumerable: true,
          configurable: true,
        });
      }

      if (schemas.headers) {
        req.headers = (await schemas.headers.parseAsync(req.headers)) as typeof req.headers;
      }

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

        _res.status(VALIDATION_STATUS_CODES.BAD_REQUEST).json({
          error: VALIDATION_ERROR_CODES.VALIDATION_ERROR,
          message: VALIDATION_ERROR_MESSAGES.DATA_FORMAT_MISMATCH,
          details: _error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code,
            received: 'received' in err ? (err as { received?: unknown }).received : undefined,
          })),
          timestamp: new Date().toISOString(),
        });
      } else {
        _next(_error);
      }
    }
  };
};

export const userParamsSchema = z.object({
  username: z
    .string()
    .min(VALIDATION_LIMITS.USERNAME_MIN_LENGTH, VALIDATION_MESSAGES.USERNAME_REQUIRED)
    .max(VALIDATION_LIMITS.USERNAME_MAX_LENGTH, VALIDATION_MESSAGES.USERNAME_MAX_LENGTH)
    .regex(VALIDATION_REGEX.GITHUB_USERNAME, VALIDATION_MESSAGES.INVALID_GITHUB_USERNAME),
});

export const repoParamsSchema = z.object({
  owner: z
    .string()
    .min(VALIDATION_LIMITS.USERNAME_MIN_LENGTH, VALIDATION_MESSAGES.OWNER_REQUIRED)
    .max(VALIDATION_LIMITS.OWNER_MAX_LENGTH, VALIDATION_MESSAGES.OWNER_MAX_LENGTH)
    .regex(VALIDATION_REGEX.GITHUB_USERNAME, VALIDATION_MESSAGES.INVALID_GITHUB_OWNER),
  repo: z
    .string()
    .min(VALIDATION_LIMITS.USERNAME_MIN_LENGTH, VALIDATION_MESSAGES.REPO_NAME_REQUIRED)
    .max(VALIDATION_LIMITS.REPO_NAME_MAX_LENGTH, VALIDATION_MESSAGES.REPO_NAME_MAX_LENGTH)
    .regex(VALIDATION_REGEX.REPOSITORY_NAME, VALIDATION_MESSAGES.INVALID_REPO_NAME),
});

export const authBodySchema = z.object({
  username: z
    .string()
    .min(VALIDATION_LIMITS.USERNAME_MIN_LENGTH, VALIDATION_MESSAGES.USERNAME_REQUIRED)
    .max(VALIDATION_LIMITS.USERNAME_MAX_LENGTH, VALIDATION_MESSAGES.USERNAME_MAX_LENGTH)
    .regex(VALIDATION_REGEX.GITHUB_USERNAME, VALIDATION_MESSAGES.INVALID_GITHUB_USERNAME),
  fullName: z
    .string()
    .min(VALIDATION_LIMITS.USERNAME_MIN_LENGTH, VALIDATION_MESSAGES.FULL_NAME_REQUIRED)
    .max(VALIDATION_LIMITS.FULL_NAME_MAX_LENGTH, VALIDATION_MESSAGES.FULL_NAME_MAX_LENGTH)
    .regex(VALIDATION_REGEX.FULL_NAME, VALIDATION_MESSAGES.INVALID_FULL_NAME),
  githubToken: z
    .string()
    .min(VALIDATION_LIMITS.GITHUB_TOKEN_MIN_LENGTH, VALIDATION_MESSAGES.GITHUB_TOKEN_MIN_LENGTH)
    .max(VALIDATION_LIMITS.GITHUB_TOKEN_MAX_LENGTH, VALIDATION_MESSAGES.GITHUB_TOKEN_MAX_LENGTH)
    .regex(VALIDATION_REGEX.GITHUB_TOKEN, VALIDATION_MESSAGES.INVALID_GITHUB_TOKEN),
});

export const paginationQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform(val => (val !== undefined && val !== null && val !== '' ? parseInt(val, 10) : 1))
    .refine(
      val => val >= 1 && val <= VALIDATION_LIMITS.PAGE_MAX_VALUE,
      VALIDATION_MESSAGES.PAGE_RANGE
    ),
  limit: z
    .string()
    .optional()
    .transform(val =>
      val !== undefined && val !== null && val !== ''
        ? parseInt(val, 10)
        : VALIDATION_LIMITS.LIMIT_DEFAULT_VALUE
    )
    .refine(
      val => val >= 1 && val <= VALIDATION_LIMITS.LIMIT_MAX_VALUE,
      VALIDATION_MESSAGES.LIMIT_RANGE
    ),
  sortBy: z.enum(VALIDATION_SORT_OPTIONS).optional().default(VALIDATION_DEFAULTS.SORT_BY),
  sortOrder: z.enum(VALIDATION_SORT_ORDERS).optional().default(VALIDATION_DEFAULTS.SORT_ORDER),
});

export const repoSearchQuerySchema = z
  .object({
    query: z
      .string()
      .min(VALIDATION_LIMITS.USERNAME_MIN_LENGTH, VALIDATION_MESSAGES.SEARCH_TERM_REQUIRED)
      .max(VALIDATION_LIMITS.FULL_NAME_MAX_LENGTH, VALIDATION_MESSAGES.SEARCH_TERM_MAX_LENGTH)
      .optional(),
    language: z
      .string()
      .max(VALIDATION_LIMITS.LANGUAGE_MAX_LENGTH, VALIDATION_MESSAGES.LANGUAGE_MAX_LENGTH)
      .optional(),
    topic: z
      .string()
      .max(VALIDATION_LIMITS.TOPIC_MAX_LENGTH, VALIDATION_MESSAGES.TOPIC_MAX_LENGTH)
      .optional(),
    minStars: z
      .string()
      .optional()
      .transform(val =>
        val !== undefined && val !== null && val !== '' ? parseInt(val, 10) : undefined
      )
      .refine(
        val => val === undefined || (val >= 0 && val <= VALIDATION_LIMITS.STARS_MAX_VALUE),
        VALIDATION_MESSAGES.MIN_STARS_RANGE
      ),
    minForks: z
      .string()
      .optional()
      .transform(val =>
        val !== undefined && val !== null && val !== '' ? parseInt(val, 10) : undefined
      )
      .refine(
        val => val === undefined || (val >= 0 && val <= VALIDATION_LIMITS.FORKS_MAX_VALUE),
        VALIDATION_MESSAGES.MIN_FORKS_RANGE
      ),
    isPrivate: z
      .string()
      .optional()
      .transform(val => {
        if (val === undefined || val === '') return undefined;
        return val.toLowerCase() === VALIDATION_BOOLEAN_TRANSFORM.TRUE_VALUE;
      }),
    isFork: z
      .string()
      .optional()
      .transform(val => {
        if (val === undefined || val === '') return undefined;
        return val.toLowerCase() === VALIDATION_BOOLEAN_TRANSFORM.TRUE_VALUE;
      }),
    isArchived: z
      .string()
      .optional()
      .transform(val => {
        if (val === undefined || val === '') return undefined;
        return val.toLowerCase() === VALIDATION_BOOLEAN_TRANSFORM.TRUE_VALUE;
      }),
  })
  .merge(paginationQuerySchema);

export const analysisQuerySchema = z.object({
  includePrivate: z
    .string()
    .optional()
    .transform(val => {
      if (val === undefined || val === '') return false;
      return val.toLowerCase() === VALIDATION_BOOLEAN_TRANSFORM.TRUE_VALUE;
    }),
  forceRefresh: z
    .string()
    .optional()
    .transform(val => {
      if (val === undefined || val === '') return false;
      return val.toLowerCase() === VALIDATION_BOOLEAN_TRANSFORM.TRUE_VALUE;
    }),
  maxAge: z
    .string()
    .optional()
    .transform(val =>
      val !== undefined && val !== null && val !== ''
        ? parseInt(val, 10)
        : VALIDATION_LIMITS.MAX_AGE_DEFAULT_HOURS
    )
    .refine(
      val => val >= 1 && val <= VALIDATION_LIMITS.MAX_AGE_MAX_HOURS,
      VALIDATION_MESSAGES.MAX_AGE_RANGE
    ),
});

export const metadataUpdateSchema = z.object({
  description: z
    .string()
    .max(VALIDATION_LIMITS.DESCRIPTION_MAX_LENGTH, VALIDATION_MESSAGES.DESCRIPTION_MAX_LENGTH)
    .optional(),
  tags: z
    .array(z.string().max(VALIDATION_LIMITS.TAG_MAX_LENGTH, VALIDATION_MESSAGES.TAG_MAX_LENGTH))
    .max(VALIDATION_LIMITS.TAGS_MAX_COUNT, VALIDATION_MESSAGES.TAGS_MAX_COUNT)
    .optional(),
  isPublic: z.boolean().optional(),
  settings: z
    .object({
      includePrivateRepos: z.boolean().optional(),
      includeForkedRepos: z.boolean().optional(),
      includeArchivedRepos: z.boolean().optional(),
      analysisDepth: z.enum(VALIDATION_ANALYSIS_DEPTH_OPTIONS).optional(),
      aiAnalysisEnabled: z.boolean().optional(),
    })
    .optional(),
});

export const validateAuth = validate({
  body: authBodySchema,
});

export const validateUserParams = validate({
  params: userParamsSchema,
});

export const validateRepoParams = validate({
  params: repoParamsSchema,
});

export const validatePagination = validate({
  query: paginationQuerySchema,
});

export const validateRepoSearch = validate({
  query: repoSearchQuerySchema,
});

export const validateAnalysisParams = validate({
  query: analysisQuerySchema,
});

export const validateMetadataUpdate = validate({
  body: metadataUpdateSchema,
});

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

export const sanitizeInput = (req: Request, _res: Response, _next: NextFunction): void => {
  const sanitizeObject = (obj: unknown): unknown => {
    if (typeof obj === 'undefined') return obj;

    if (typeof obj === 'string') {
      let sanitized = obj.trim();
      sanitized = sanitized
        .replace(
          new RegExp(VALIDATION_HTML_CHARS.AMPERSAND, 'g'),
          VALIDATION_HTML_ENTITIES.AMPERSAND
        )
        .replace(
          new RegExp(VALIDATION_HTML_CHARS.LESS_THAN, 'g'),
          VALIDATION_HTML_ENTITIES.LESS_THAN
        )
        .replace(
          new RegExp(VALIDATION_HTML_CHARS.GREATER_THAN, 'g'),
          VALIDATION_HTML_ENTITIES.GREATER_THAN
        )
        .replace(
          new RegExp(VALIDATION_HTML_CHARS.QUOTATION_MARK, 'g'),
          VALIDATION_HTML_ENTITIES.QUOTATION_MARK
        )
        .replace(
          new RegExp(VALIDATION_HTML_CHARS.APOSTROPHE, 'g'),
          VALIDATION_HTML_ENTITIES.APOSTROPHE
        )
        .replace(new RegExp(VALIDATION_HTML_CHARS.SOLIDUS, 'g'), VALIDATION_HTML_ENTITIES.SOLIDUS);
      return sanitized;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => sanitizeObject(item));
    }

    if (typeof obj === 'object' && obj !== null) {
      const sanitized: { [k: string]: unknown } = {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          sanitized[key] = sanitizeObject((obj as { [k: string]: unknown })[key]);
        }
      }
      return sanitized;
    }

    return obj;
  };

  try {
    if (typeof req.body !== 'undefined' && req.body !== null) {
      req.body = sanitizeObject(req.body) as typeof req.body;
    }

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
      ip: req.ip,
      userAgent: req.get('user-agent'),
      origin: req.get('origin'),
      referer: req.get('referer'),
      hasBody: typeof req.body !== 'undefined' && req.body !== null,
      hasQuery: Object.keys(req.query ?? {}).length > 0,
      hasParams: Object.keys(req.params ?? {}).length > 0,
    });

    _next();
  } catch (_error: unknown) {
    const errorMessage =
      _error instanceof Error
        ? _error.message
        : VALIDATION_ERROR_MESSAGES.UNKNOWN_SANITIZATION_ERROR;
    logWithContext.security('sanitization_error', 'medium', {
      path: req.path,
      success: false,
      method: req.method,
      _error: errorMessage,
    });

    _res.status(VALIDATION_STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      _error: VALIDATION_ERROR_CODES.SANITIZATION_ERROR,
      message: VALIDATION_ERROR_MESSAGES.UNEXPECTED_PROCESSING_ERROR,
      timestamp: new Date().toISOString(),
    });
  }
};
