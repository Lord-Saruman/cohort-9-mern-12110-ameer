import { createApp } from './app';
import { environment } from './config/env';
import { createDatabasePool } from './infrastructure/database';
import { logger } from './infrastructure/logger';

const database = createDatabasePool(environment);
const app = createApp({
  clientOrigin: environment.CLIENT_ORIGIN,
  databasePool: database,
  jwtSecret: environment.JWT_SECRET,
  jwtExpiresIn: environment.JWT_EXPIRES_IN,
  isProduction: environment.NODE_ENV === 'production',
});

const server = app.listen(environment.PORT, () => {
  logger.info({ port: environment.PORT }, 'api server listening');
});

const shutdown = (signal: string): void => {
  logger.info({ signal }, 'shutting down api server');
  server.close(async () => {
    try {
      await database.end();
      process.exit(0);
    } catch (error: unknown) {
      logger.error({ err: error }, 'failed to close database pool cleanly');
      process.exit(1);
    }
  });
};

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
