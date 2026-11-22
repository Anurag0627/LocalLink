import { createServer } from 'node:http';
import { closeDatabase, connectDatabase } from './config/database.js';
import { env } from './config/env.js';
import logger from './config/logger.js';
import app from './app.js';

let httpServer;
let shuttingDown = false;

function listen(server) {
  return new Promise((resolve, reject) => {
    const onError = (error) => reject(error);

    server.once('error', onError);
    server.listen(env.PORT, () => {
      server.off('error', onError);
      resolve();
    });
  });
}

function closeHttpServer() {
  if (!httpServer?.listening) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    httpServer.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

async function shutdown(signal) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  logger.info({ signal }, 'Server shutdown started');

  let shutdownFailed = false;

  try {
    await closeHttpServer();
  } catch (error) {
    shutdownFailed = true;
    logger.error({ errorName: error.name }, 'Failed to close HTTP server');
  }

  try {
    await closeDatabase();
  } catch (error) {
    shutdownFailed = true;
    logger.error({ errorName: error.name }, 'Failed to close MongoDB connection');
  }

  if (shutdownFailed) {
    process.exitCode = 1;
    return;
  }

  logger.info('Server shutdown completed');
}

async function startServer() {
  await connectDatabase();

  if (shuttingDown) {
    await closeDatabase();
    return;
  }

  httpServer = createServer(app);
  await listen(httpServer);
  logger.info({ port: env.PORT }, 'LocalLink API is listening');
}

process.once('SIGINT', () => {
  void shutdown('SIGINT');
});

process.once('SIGTERM', () => {
  void shutdown('SIGTERM');
});

try {
  await startServer();
} catch (error) {
  logger.fatal({ errorName: error.name }, 'Server startup failed');

  try {
    await closeDatabase();
  } catch (closeError) {
    logger.error(
      { errorName: closeError.name },
      'Failed to close MongoDB connection after startup failure',
    );
  }

  process.exitCode = 1;
}
