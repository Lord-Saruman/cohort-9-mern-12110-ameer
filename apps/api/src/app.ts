import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';

import { errorHandler, notFoundHandler } from './middleware/error-handler';
import { requestContext } from './middleware/request-context';
import { createHealthRouter } from './routes/health.routes';

export type AppOptions = {
  clientOrigin: string;
};

export const createApp = ({ clientOrigin }: AppOptions): Express => {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: clientOrigin, credentials: true }));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  app.use(requestContext);

  app.use('/api/v1/health', createHealthRouter());
  // Auth and notes routers are added here after their vertical slices are implemented.
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
