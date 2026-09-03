import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import type { Pool } from 'mysql2/promise';

import { errorHandler, notFoundHandler } from './middleware/error-handler';
import { requestContext } from './middleware/request-context';
import { createAuthRouter } from './modules/auth/auth.routes';
import { createHealthRouter } from './routes/health.routes';

export interface AppOptions {
  clientOrigin: string;
  databasePool?: Pool;
  jwtSecret?: string;
  jwtExpiresIn?: string;
  isProduction?: boolean;
  rateLimitMax?: number;
  rateLimitWindowMs?: number;
}

export const createApp = ({
  clientOrigin,
  databasePool,
  jwtSecret = 'default-dev-secret',
  jwtExpiresIn = '8h',
  isProduction = false,
  rateLimitMax,
  rateLimitWindowMs,
}: AppOptions): Express => {
  const app = express();

  app.disable('x-powered-by');
  app.use(requestContext);
  app.use(helmet());
  app.use(cors({ origin: clientOrigin, credentials: true }));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  app.use('/api/v1/health', createHealthRouter());
  if (databasePool) {
    app.use(
      '/api/v1/auth',
      createAuthRouter({
        pool: databasePool,
        jwtSecret,
        jwtExpiresIn,
        isProduction,
        rateLimitMax,
        rateLimitWindowMs,
      }),
    );
  }
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
