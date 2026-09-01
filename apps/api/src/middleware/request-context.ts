import { randomUUID } from 'node:crypto';

import type { NextFunction, Request, Response } from 'express';

import { logger } from '../infrastructure/logger';

export const requestContext = (request: Request, response: Response, next: NextFunction): void => {
  const requestId = request.header('x-request-id') ?? randomUUID();
  const startedAt = performance.now();

  response.setHeader('x-request-id', requestId);
  response.locals.requestId = requestId;
  response.on('finish', () => {
    logger.info(
      {
        requestId,
        method: request.method,
        path: request.path,
        statusCode: response.statusCode,
        durationMs: Math.round(performance.now() - startedAt),
      },
      'http request completed',
    );
  });
  next();
};
