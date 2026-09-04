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

interface BodyParserError {
  type: string;
  status?: number;
  statusCode?: number;
  message: string;
}

const isBodyParserError = (error: unknown): error is BodyParserError =>
  typeof error === 'object' &&
  error !== null &&
  'type' in error &&
  typeof (error as { type: unknown }).type === 'string' &&
  (error as { type: string }).type.startsWith('entity.');

export const errorHandler: ErrorRequestHandler<unknown, unknown, unknown, unknown, AppLocals> = (
  error: unknown,
  request,
  response,
  _next,
) => {
  if (isBodyParserError(error)) {
    const statusCode = error.statusCode ?? error.status ?? 400;
    const isOversized = error.type === 'entity.too.large' || statusCode === 413;
    const code = isOversized ? 'PAYLOAD_TOO_LARGE' : 'VALIDATION_ERROR';
    const message = isOversized
      ? 'Request payload exceeds the maximum allowed size.'
      : 'Invalid JSON payload provided.';

    logger.warn(
      { err: error, requestId: response.locals.requestId, path: request.path, statusCode },
      'body parser rejected request',
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
