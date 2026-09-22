import path from 'path';
import fs from 'fs';
import { Express, Request, Response } from 'express';
import { serve as swaggerUIServe, setup as swaggerUISetup } from 'swagger-ui-express';
import yaml from 'js-yaml';
import logger from '@/utils/logger';
import {
  DOCUMENTATION_CONSTANTS,
  DOCUMENTATION_ROUTES,
  DOCUMENTATION_MESSAGES,
  DOCUMENTATION_ERROR_CODES,
} from '@/constants';

const loadOpenAPISpec = (): Record<string, unknown> => {
  try {
    const openAPIPath = path.join(process.cwd(), DOCUMENTATION_CONSTANTS.OPENAPI_FILE);

    if (!fs.existsSync(openAPIPath)) {
      throw new Error(DOCUMENTATION_MESSAGES.FILE_NOT_FOUND);
    }

    const fileContents = fs.readFileSync(openAPIPath, DOCUMENTATION_CONSTANTS.UTF8_ENCODING);
    const spec = yaml.load(fileContents) as Record<string, unknown>;

    const info = (spec.info ?? {}) as Record<string, unknown>;
    const components = (spec.components ?? {}) as Record<string, unknown>;
    logger.info(DOCUMENTATION_MESSAGES.SPECIFICATION_LOADED, {
      version: info.version,
      title: info.title,
      pathsCount: Object.keys((spec.paths ?? {}) as Record<string, unknown>).length,
      schemasCount: Object.keys((components.schemas ?? {}) as Record<string, unknown>).length,
    });

    return spec;
  } catch (error) {
    logger.error(DOCUMENTATION_MESSAGES.ERROR_LOADING_SPECIFICATION, {
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      openapi: DOCUMENTATION_CONSTANTS.OPENAPI_VERSION,
      info: {
        title: DOCUMENTATION_CONSTANTS.API_TITLE,
        version: DOCUMENTATION_CONSTANTS.API_VERSION,
        description: DOCUMENTATION_CONSTANTS.ERROR_LOADING_DESCRIPTION,
      },
      paths: {},
    };
  }
};

const generateOpenAPISpec = (): Record<string, unknown> => {
  try {
    const spec = loadOpenAPISpec();

    if (
      !('openapi' in spec) ||
      typeof spec.openapi !== 'string' ||
      !spec.openapi.startsWith('3.')
    ) {
      logger.warn(DOCUMENTATION_MESSAGES.INVALID_SPECIFICATION);
      return {
        openapi: DOCUMENTATION_CONSTANTS.OPENAPI_VERSION,
        info: {
          title: DOCUMENTATION_CONSTANTS.API_TITLE,
          version: DOCUMENTATION_CONSTANTS.API_VERSION,
          description: DOCUMENTATION_CONSTANTS.API_DESCRIPTION,
        },
        paths: {},
      };
    }

    return spec;
  } catch (error) {
    logger.error(DOCUMENTATION_MESSAGES.ERROR_GENERATING_SPECIFICATION, {
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      openapi: DOCUMENTATION_CONSTANTS.OPENAPI_VERSION,
      info: {
        title: DOCUMENTATION_CONSTANTS.API_TITLE,
        version: DOCUMENTATION_CONSTANTS.API_VERSION,
        description: DOCUMENTATION_CONSTANTS.ERROR_SPECIFICATION_DESCRIPTION,
      },
      paths: {},
    };
  }
};

const swaggerUIOptions = {
  customCss: `
    .swagger-ui .topbar {
      background-color: #0d1117;
      border-bottom: 1px solid #30363d;
      padding: 10px 0;
    }
    .swagger-ui .topbar .topbar-wrapper {
      display: flex;
      align-items: center;
    }
    .swagger-ui .topbar .topbar-wrapper .link {
      display: flex;
      align-items: center;
      text-decoration: none;
    }
    .swagger-ui .topbar .topbar-wrapper .link img {
      content: url('/api-logo.svg');
      height: 38px;
      width: 38px;
    }
    .swagger-ui .topbar .topbar-wrapper .link span {
      display: none;
    }
    .swagger-ui .topbar .topbar-wrapper .link::after {
      content: 'GitHub Insight Engine API';
      color: #f0f6fc;
      font-size: 16px;
      font-weight: 600;
      margin-left: 12px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    }
    .swagger-ui .info {
      margin: 24px 0 16px 0;
    }
    .swagger-ui .info .title {
      color: #0969da;
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .swagger-ui .info .title::before {
      content: '';
      display: inline-block;
      width: 44px;
      height: 44px;
      background: url('/api-logo.svg') no-repeat center center;
      background-size: contain;
      flex-shrink: 0;
    }
  `,
  customSiteTitle: DOCUMENTATION_CONSTANTS.SWAGGER_TITLE,
  customfavIcon: '/favicon.ico" />\n  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=20260922" />\n  <link rel="apple-touch-icon-precomposed" sizes="180x180" href="/apple-touch-icon-precomposed.png?v=20260922" />\n  <meta name="apple-mobile-web-app-title" content="GH Insight" />\n  <meta name="apple-mobile-web-app-capable" content="yes" />\n  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />\n  <link rel="manifest" href="/manifest.json',
  swaggerOptions: {
    docExpansion: 'list',
    filter: true,
    showRequestHeaders: true,
    showCommonExtensions: true,
    tryItOutEnabled: true,
  },
};

const refreshSpecMiddleware = (req: Request, _res: Response, next: Function): void => {
  if (process.env.NODE_ENV === DOCUMENTATION_CONSTANTS.DEVELOPMENT_ENV) {
    try {
      req.app.locals.openAPISpec = generateOpenAPISpec();
    } catch (error) {
      logger.warn(DOCUMENTATION_MESSAGES.UNABLE_REFRESH_SPECIFICATION, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  next();
};

export const setupDocumentation = (app: Express): void => {
  logger.info(DOCUMENTATION_MESSAGES.CONFIGURING_DOCUMENTATION);

  try {
    const openAPISpec = generateOpenAPISpec();
    app.locals.openAPISpec = openAPISpec;

    app.get(
      DOCUMENTATION_ROUTES.OPENAPI_JSON,
      refreshSpecMiddleware,
      (req: Request, res: Response) => {
        res.setHeader(
          DOCUMENTATION_CONSTANTS.CONTENT_TYPE_HEADER,
          DOCUMENTATION_CONSTANTS.JSON_CONTENT_TYPE
        );
        res.setHeader(
          DOCUMENTATION_CONSTANTS.CORS_HEADER,
          DOCUMENTATION_CONSTANTS.CORS_ALLOW_ORIGIN
        );
        res.json(req.app.locals.openAPISpec);
      }
    );

    app.get(
      DOCUMENTATION_ROUTES.OPENAPI_YAML,
      refreshSpecMiddleware,
      (req: Request, res: Response) => {
        res.setHeader(
          DOCUMENTATION_CONSTANTS.CONTENT_TYPE_HEADER,
          DOCUMENTATION_CONSTANTS.YAML_CONTENT_TYPE
        );
        res.setHeader(
          DOCUMENTATION_CONSTANTS.CORS_HEADER,
          DOCUMENTATION_CONSTANTS.CORS_ALLOW_ORIGIN
        );
        res.send(yaml.dump(req.app.locals.openAPISpec));
      }
    );

    app.use(
      DOCUMENTATION_ROUTES.DOCS,
      refreshSpecMiddleware,
      swaggerUIServe,
      swaggerUISetup(app.locals.openAPISpec, swaggerUIOptions)
    );

    app.get(DOCUMENTATION_ROUTES.DOC_HEALTH, (req: Request, res: Response) => {
      const spec = req.app.locals.openAPISpec as Record<string, unknown>;
      const info = (spec.info ?? {}) as Record<string, unknown>;
      const components = (spec.components ?? {}) as Record<string, unknown>;
      const health = {
        status: DOCUMENTATION_CONSTANTS.HEALTH_STATUS,
        documentation: {
          title: info.title ?? DOCUMENTATION_CONSTANTS.UNKNOWN_VALUE,
          version: info.version ?? DOCUMENTATION_CONSTANTS.UNKNOWN_VALUE,
          pathsCount: Object.keys((spec.paths ?? {}) as Record<string, unknown>).length,
          schemasCount: Object.keys((components.schemas ?? {}) as Record<string, unknown>).length,
          lastGenerated: new Date().toISOString(),
        },
        endpoints: {
          swaggerUI: DOCUMENTATION_ROUTES.DOCS,
          openAPIJson: DOCUMENTATION_ROUTES.OPENAPI_JSON,
          openAPIYaml: DOCUMENTATION_ROUTES.OPENAPI_YAML,
        },
      };

      res.json(health);
    });

    app.get(DOCUMENTATION_ROUTES.DOCUMENTATION, (_req: Request, res: Response) => {
      res.redirect(301, DOCUMENTATION_ROUTES.DOC);
    });

    const schemasCount = Object.keys(
      (openAPISpec.components ?? {}) as Record<string, unknown>
    ).length;
    logger.info(DOCUMENTATION_MESSAGES.DOCUMENTATION_CONFIGURED, {
      endpoints: {
        swaggerUI: DOCUMENTATION_ROUTES.DOCS,
        openAPIJson: DOCUMENTATION_ROUTES.OPENAPI_JSON,
        openAPIYaml: DOCUMENTATION_ROUTES.OPENAPI_YAML,
        health: DOCUMENTATION_ROUTES.DOC_HEALTH,
      },
      pathsCount: Object.keys((openAPISpec.paths ?? {}) as Record<string, unknown>).length,
      schemasCount,
    });
  } catch (error) {
    logger.error(DOCUMENTATION_MESSAGES.ERROR_CONFIGURING_DOCUMENTATION, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    app.get(DOCUMENTATION_ROUTES.DOC, (_req: Request, res: Response) => {
      res.status(DOCUMENTATION_ERROR_CODES.INTERNAL_SERVER_ERROR).json({
        error: DOCUMENTATION_MESSAGES.DOCUMENTATION_UNAVAILABLE,
        message: DOCUMENTATION_MESSAGES.ERROR_LOADING_API_DOCUMENTATION,
        timestamp: new Date().toISOString(),
      });
    });
  }
};

export const validateOpenAPISpec = (spec: Record<string, unknown>): boolean => {
  try {
    if (!('openapi' in spec) || !('info' in spec) || !('paths' in spec)) {
      return false;
    }

    const version = spec.openapi as string;
    if (!version.startsWith('3.')) {
      return false;
    }

    const info = (spec.info ?? {}) as Record<string, unknown>;
    if (!('title' in info) || !('version' in info)) {
      return false;
    }

    const paths = (spec.paths ?? {}) as Record<string, unknown>;
    if (Object.keys(paths).length === 0) {
      return false;
    }

    return true;
  } catch (error) {
    logger.error(DOCUMENTATION_MESSAGES.ERROR_VALIDATING_SPECIFICATION, {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
};

export default {
  setupDocumentation,
  validateOpenAPISpec,
  loadOpenAPISpec,
  generateOpenAPISpec,
};
