import path from 'path';
import fs from 'fs';
import { Express, Request, Response } from 'express';
import { serve as swaggerUIServe, setup as swaggerUISetup } from 'swagger-ui-express';
import yaml from 'js-yaml';
import logger from '@/utils/logger';

/**
 * Charge la spécification OpenAPI depuis le fichier YAML
 */
const loadOpenAPISpec = (): Record<string, unknown> => {
  try {
    const openAPIPath = path.join(process.cwd(), 'openapi.yaml');

    if (!fs.existsSync(openAPIPath)) {
      throw new Error('Fichier openapi.yaml non trouvé');
    }

    const fileContents = fs.readFileSync(openAPIPath, 'utf8');
    const spec = yaml.load(fileContents) as Record<string, unknown>;

    const info = (spec.info ?? {}) as Record<string, unknown>;
    const components = (spec.components ?? {}) as Record<string, unknown>;
    logger.info('Spécification OpenAPI chargée avec succès', {
      version: info.version,
      title: info.title,
      pathsCount: Object.keys((spec.paths ?? {}) as Record<string, unknown>).length,
      schemasCount: Object.keys((components.schemas ?? {}) as Record<string, unknown>).length,
    });

    return spec;
  } catch (error) {
    logger.error('Erreur lors du chargement de la spécification OpenAPI', {
      error: error instanceof Error ? error.message : String(error),
    });

    // Retourner une spécification minimale en cas d'erreur
    return {
      openapi: '3.1.0',
      info: {
        title: 'GitHub Insight Engine API',
        version: '0.1.0',
        description: 'Erreur lors du chargement de la spécification complète',
      },
      paths: {},
    };
  }
};

/**
 * Génère la spécification OpenAPI complète (utilise uniquement le fichier YAML)
 */
const generateOpenAPISpec = (): Record<string, unknown> => {
  try {
    // Charger uniquement la spécification YAML pour éviter les conflits
    const spec = loadOpenAPISpec();

    // Valider que c'est bien OpenAPI 3.x et non Swagger 2.0
    if (!('openapi' in spec) || typeof spec.openapi !== 'string' || !spec.openapi.startsWith('3.')) {
      logger.warn('Spécification OpenAPI invalide, utilisation des valeurs par défaut');
      return {
        openapi: '3.1.0',
        info: {
          title: 'GitHub Insight Engine API',
          version: '0.1.0',
          description: 'API REST pour l\'analyse en profondeur des données GitHub avec insights IA',
        },
        paths: {},
      };
    }

    return spec;
  } catch (error) {
    logger.error('Erreur lors de la génération de la spécification OpenAPI', {
      error: error instanceof Error ? error.message : String(error),
    });

    // Retourner une spécification minimale valide
    return {
      openapi: '3.1.0',
      info: {
        title: 'GitHub Insight Engine API',
        version: '0.1.0',
        description: 'Erreur lors du chargement de la spécification',
      },
      paths: {},
    };
  }
};

/**
 * Configuration de Redoc pour la documentation
 */
const redocOptions = {
  title: 'GitHub Insight Engine API Documentation',
  logo: {
    url: '/logo.png',
    altText: 'GitHub Insight Engine Logo',
  },
  theme: {
    colors: {
      primary: {
        main: '#0969da',
      },
      success: {
        main: '#1a7f37',
      },
      warning: {
        main: '#d1242f',
      },
      error: {
        main: '#cf222e',
      },
    },
    typography: {
      fontSize: '14px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
      headings: {
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
        fontWeight: '600',
      },
    },
    sidebar: {
      width: '300px',
      backgroundColor: '#f6f8fa',
    },
  },
  hideDownloadButton: false,
  disableSearch: false,
  expandResponses: '200,201',
  jsonSampleExpandLevel: 2,
  hideSingleRequestSampleTab: true,
  menuToggle: true,
  nativeScrollbars: false,
  pathInMiddlePanel: true,
  requiredPropsFirst: true,
  scrollYOffset: 0,
  showExtensions: true,
  sortPropsAlphabetically: true,
  payloadSampleIdx: 0,
};

/**
 * Configuration de Swagger UI (alternative à Redoc)
 */
const swaggerUIOptions = {
  customCss: `
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info .title { color: #0969da; }
  `,
  customSiteTitle: 'GitHub Insight Engine API - Swagger UI',
  swaggerOptions: {
    docExpansion: 'list',
    filter: true,
    showRequestHeaders: true,
    showCommonExtensions: true,
    tryItOutEnabled: true,
  },
};

/**
 * Middleware pour rafraîchir la spécification OpenAPI
 */
const refreshSpecMiddleware = (req: Request, _res: Response, next: Function): void => {
  // En développement, recharger la spécification à chaque requête
  if (process.env.NODE_ENV === 'development') {
    try {
      req.app.locals.openAPISpec = generateOpenAPISpec();
    } catch (error) {
      logger.warn('Impossible de rafraîchir la spécification OpenAPI', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  next();
};

/**
 * Configuration de la documentation pour l'application Express
 */
export const setupDocumentation = (app: Express): void => {
  logger.info('Configuration de la documentation API...');

  try {
    // Générer la spécification OpenAPI
    const openAPISpec = generateOpenAPISpec();
    app.locals.openAPISpec = openAPISpec;

    // Endpoint pour servir la spécification OpenAPI en JSON
    app.get('/openapi.json', refreshSpecMiddleware, (req: Request, res: Response) => {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.json(req.app.locals.openAPISpec);
    });

    // Endpoint pour servir la spécification OpenAPI en YAML
    app.get('/openapi.yaml', refreshSpecMiddleware, (req: Request, res: Response) => {
      res.setHeader('Content-Type', 'application/x-yaml');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.send(yaml.dump(req.app.locals.openAPISpec));
    });

    // Documentation Redoc sur /doc
    app.get('/doc', refreshSpecMiddleware, (_req: Request, res: Response) => {
      const redocHTML = `
<!DOCTYPE html>
<html>
  <head>
    <title>${redocOptions.title}</title>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link href="https://fonts.googleapis.com/css?family=Montserrat:300,400,700|Roboto:300,400,700" rel="stylesheet">
    <style>
      body { margin: 0; padding: 0; }
    </style>
  </head>
  <body>
    <redoc spec-url='/openapi.json'></redoc>
    <script src="https://cdn.jsdelivr.net/npm/redoc@2.1.3/bundles/redoc.standalone.js"></script>
  </body>
</html>`;

      res.send(redocHTML);
    });

    // Documentation Swagger UI sur /docs (alternative)
    app.use('/docs', refreshSpecMiddleware, swaggerUIServe, swaggerUISetup(app.locals.openAPISpec, swaggerUIOptions));

    // Endpoint de santé pour la documentation
    app.get('/doc/health', (req: Request, res: Response) => {
      const spec = req.app.locals.openAPISpec as Record<string, unknown>;
      const info = (spec.info ?? {}) as Record<string, unknown>;
      const components = (spec.components ?? {}) as Record<string, unknown>;
      const health = {
        status: 'healthy',
        documentation: {
          title: info.title ?? 'Unknown',
          version: info.version ?? 'Unknown',
          pathsCount: Object.keys((spec.paths ?? {}) as Record<string, unknown>).length,
          schemasCount: Object.keys((components.schemas ?? {}) as Record<string, unknown>).length,
          lastGenerated: new Date().toISOString(),
        },
        endpoints: {
          redoc: '/doc',
          swaggerUI: '/docs',
          openAPIJson: '/openapi.json',
          openAPIYaml: '/openapi.yaml',
        },
      };

      res.json(health);
    });

    // Redirection de /documentation vers /doc
    app.get('/documentation', (_req: Request, res: Response) => {
      res.redirect(301, '/doc');
    });

    const schemasCount = Object.keys((openAPISpec.components ?? {}) as Record<string, unknown>).length;
    logger.info('Documentation API configurée avec succès', {
      endpoints: {
        redoc: '/doc',
        swaggerUI: '/docs',
        openAPIJson: '/openapi.json',
        openAPIYaml: '/openapi.yaml',
        health: '/doc/health',
      },
      pathsCount: Object.keys((openAPISpec.paths ?? {}) as Record<string, unknown>).length,
      schemasCount,
    });
  } catch (error) {
    logger.error('Erreur lors de la configuration de la documentation', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Configuration minimale en cas d'erreur
    app.get('/doc', (_req: Request, res: Response) => {
      res.status(500).json({
        error: 'Documentation indisponible',
        message: 'Erreur lors du chargement de la documentation API',
        timestamp: new Date().toISOString(),
      });
    });
  }
};

/**
 * Middleware pour valider la spécification OpenAPI
 */
export const validateOpenAPISpec = (spec: Record<string, unknown>): boolean => {
  try {
    // Vérifications de base
    if (!('openapi' in spec) || !('info' in spec) || !('paths' in spec)) {
      return false;
    }

    // Vérifier la version OpenAPI
    const version = spec.openapi as string;
    if (!version.startsWith('3.')) {
      return false;
    }

    // Vérifier les informations de base
    const info = (spec.info ?? {}) as Record<string, unknown>;
    if (!('title' in info) || !('version' in info)) {
      return false;
    }

    // Vérifier qu'il y a au moins un path
    const paths = (spec.paths ?? {}) as Record<string, unknown>;
    if (Object.keys(paths).length === 0) {
      return false;
    }

    return true;
  } catch (error) {
    logger.error('Erreur lors de la validation de la spécification OpenAPI', {
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
