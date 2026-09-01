import { createApp } from './app';
import { environment } from './config/env';
import { createDatabasePool } from './infrastructure/database';
import { logger } from './infrastructure/logger';

const app = createApp({ clientOrigin: environment.CLIENT_ORIGIN });
const database = createDatabasePool(environment);

const server = app.listen(environment.PORT, () => {
  logger.info({ port: environment.PORT }, 'api server listening');
});

const shutdown = async (signal: string): Promise<void> => {
  logger.info({ signal }, 'shutting down api server');
  server.close(async () => {
    await database.end();
    process.exit(0);
  });
};

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
