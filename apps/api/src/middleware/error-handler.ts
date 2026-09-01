import type { ErrorRequestHandler, RequestHandler } from 'express';

import { AppError } from '../common/app-error';
import { logger } from '../infrastructure/logger';

export const notFoundHandler: RequestHandler = (request, response) => {
  response.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Route ${request.method} ${request.path} was not found.`,
      requestId: response.locals.requestId,
    },
  });
};

export const errorHandler: ErrorRequestHandler = (error: unknown, request, response, _next) => {
  const appError = error instanceof AppError ? error : undefined;
  const statusCode = appError?.statusCode ?? 500;
  const code = appError?.code ?? 'INTERNAL_ERROR';
  const message = appError?.message ?? 'An unexpected error occurred.';

  logger.error(
    { err: error, requestId: response.locals.requestId, path: request.path, statusCode },
    'request failed',
  );
  response.status(statusCode).json({
    error: {
      code,
      message,
      details: appError?.details,
      requestId: response.locals.requestId,
    },
  });
};
