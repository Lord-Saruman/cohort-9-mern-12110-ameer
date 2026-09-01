import type { ErrorRequestHandler, RequestHandler } from 'express';

import { AppError } from '../common/app-error';
import { logger } from '../infrastructure/logger';
import type { AppLocals } from './request-context';

export const notFoundHandler: RequestHandler<unknown, unknown, unknown, unknown, AppLocals> = (
  request,
  response,
) => {
  response.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Route ${request.method} ${request.path} was not found.`,
      requestId: response.locals.requestId,
    },
  });
};

const isEntityParseError = (error: unknown): error is { type: string; status: number } =>
  typeof error === 'object' &&
  error !== null &&
  'type' in error &&
  (error as { type: unknown }).type === 'entity.parse.failed';

export const errorHandler: ErrorRequestHandler<unknown, unknown, unknown, unknown, AppLocals> = (
  error: unknown,
  request,
  response,
  _next,
) => {
  if (isEntityParseError(error)) {
    const statusCode = 400;
    const code = 'VALIDATION_ERROR';
    const message = 'Invalid JSON payload provided.';

    logger.warn(
      { err: error, requestId: response.locals.requestId, path: request.path, statusCode },
      'invalid json body',
    );
    response.status(statusCode).json({
      error: {
        code,
        message,
        requestId: response.locals.requestId,
      },
    });
    return;
  }

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
