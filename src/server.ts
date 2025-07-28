import 'dotenv/config';
import http from 'http';
import { fileURLToPath } from 'url';
import { createApp, gracefulShutdown } from './app';
import logger from '@/utils/logger';
import {
  SERVER_CONFIG,
  SERVER_ERROR_CODES,
  SERVER_SYSCALLS,
  SERVER_SIGNALS,
  SERVER_EXIT_CODES,
  SERVER_MESSAGE_TEMPLATES,
  SERVER_ENDPOINTS,
  SERVER_MESSAGES,
} from '@/constants';

const PORT = parseInt(process.env.PORT ?? SERVER_CONFIG.DEFAULT_PORT_STRING, 10);
const HOST = process.env.HOST ?? SERVER_CONFIG.DEFAULT_HOST;

let server: http.Server;

interface ErrnoException extends Error {
  errno?: number;
  code?: string;
  syscall?: string;
  path?: string;
}

const startServer = async (): Promise<void> => {
  try {
    logger.info(SERVER_MESSAGES.STARTUP, {
      port: PORT,
      host: HOST,
      nodeEnv: process.env.NODE_ENV,
      nodeVersion: process.version,
    });

    const app = await createApp();

    server = http.createServer(app);

    server.timeout = SERVER_CONFIG.TIMEOUT_MS;
    server.keepAliveTimeout = SERVER_CONFIG.KEEP_ALIVE_TIMEOUT_MS;
    server.headersTimeout = SERVER_CONFIG.HEADERS_TIMEOUT_MS;

    server.on('error', (error: ErrnoException) => {
      if (error.syscall !== SERVER_SYSCALLS.LISTEN) {
        throw error;
      }

      const bind =
        typeof PORT === 'string'
          ? SERVER_MESSAGE_TEMPLATES.PIPE_BIND(PORT)
          : SERVER_MESSAGE_TEMPLATES.PORT_BIND(PORT);

      switch (error.code) {
        case SERVER_ERROR_CODES.EACCES:
          logger.error(SERVER_MESSAGE_TEMPLATES.ELEVATED_PRIVILEGES(bind));
          process.exit(SERVER_EXIT_CODES.ERROR);
          break;
        case SERVER_ERROR_CODES.EADDRINUSE:
          logger.error(SERVER_MESSAGE_TEMPLATES.ALREADY_IN_USE(bind));
          process.exit(SERVER_EXIT_CODES.ERROR);
          break;
        default:
          logger.error(SERVER_MESSAGES.SERVER_ERROR, {
            error: error.message,
            code: error.code,
            syscall: error.syscall,
          });
          throw error;
      }
    });

    server.on('listening', () => {
      const addr = server.address();
      const bind =
        typeof addr === 'string'
          ? SERVER_MESSAGE_TEMPLATES.PIPE_ADDRESS(addr)
          : SERVER_MESSAGE_TEMPLATES.PORT_ADDRESS(addr?.port ?? 0);

      logger.info(SERVER_MESSAGES.STARTED, {
        address: bind,
        host: HOST,
        port: PORT,
        environment: process.env.NODE_ENV,
        processId: process.pid,
        endpoints: {
          api: SERVER_ENDPOINTS.API(HOST, PORT),
          health: SERVER_ENDPOINTS.HEALTH(HOST, PORT),
          docs: SERVER_ENDPOINTS.DOCS(HOST, PORT),
        },
      });
    });

    server.listen(PORT, HOST);
  } catch (_error: unknown) {
    logger.error(SERVER_MESSAGES.FATAL_ERROR_STARTUP, {
      error: _error instanceof Error ? _error.message : String(_error),
      stack: _error instanceof Error ? _error.stack : undefined,
    });
    process.exit(SERVER_EXIT_CODES.ERROR);
  }
};

const stopServer = async (signal: string): Promise<void> => {
  logger.info(SERVER_MESSAGE_TEMPLATES.SIGNAL_RECEIVED(signal));

  if (typeof server !== 'undefined' && server !== null) {
    server.close(async error => {
      if (error) {
        logger.error(SERVER_MESSAGES.ERROR_SHUTDOWN, {
          error: error.message,
        });
      } else {
        logger.info(SERVER_MESSAGES.HTTP_SERVER_CLOSED);
      }

      await gracefulShutdown();

      process.exit(error ? SERVER_EXIT_CODES.ERROR : SERVER_EXIT_CODES.SUCCESS);
    });

    setTimeout(() => {
      logger.warn(SERVER_MESSAGES.GRACEFUL_SHUTDOWN_TIMEOUT);
      process.exit(SERVER_EXIT_CODES.ERROR);
    }, SERVER_CONFIG.GRACEFUL_SHUTDOWN_TIMEOUT_MS);
  } else {
    await gracefulShutdown();
    process.exit(SERVER_EXIT_CODES.SUCCESS);
  }
};

process.on(SERVER_SIGNALS.SIGTERM, () => stopServer(SERVER_SIGNALS.SIGTERM));
process.on(SERVER_SIGNALS.SIGINT, () => stopServer(SERVER_SIGNALS.SIGINT));
process.on('uncaughtException', (error: Error) => {
  logger.error(SERVER_MESSAGES.UNHANDLED_EXCEPTION, {
    error: error.message,
    stack: error.stack,
  });

  process.exit(SERVER_EXIT_CODES.ERROR);
});

process.on('unhandledRejection', (reason: unknown, promise: Promise<Record<string, unknown>>) => {
  logger.error(SERVER_MESSAGES.UNHANDLED_PROMISE_REJECTION, {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
    promise: promise.toString(),
  });

  if (process.env.NODE_ENV === 'development') {
    process.exit(SERVER_EXIT_CODES.ERROR);
  }
});

process.on('warning', warning => {
  logger.warn(SERVER_MESSAGES.NODE_WARNING, {
    name: warning.name,
    message: warning.message,
    stack: warning.stack,
  });
});

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  startServer().catch(error => {
    logger.error(SERVER_MESSAGES.FATAL_ERROR, {
      error: error.message,
      stack: error.stack,
    });
    process.exit(SERVER_EXIT_CODES.ERROR);
  });
}

export { startServer, stopServer };
export default startServer;
