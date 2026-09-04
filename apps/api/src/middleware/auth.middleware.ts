import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { AppError } from '../common/app-error';
import { verifyAuthToken } from '../modules/auth/auth.service';
import type { AppLocals } from './request-context';

export const createRequireAuth = (jwtSecret: string): RequestHandler => {
  return (request: Request, response: Response, next: NextFunction): void => {
    const cookieToken = (request.cookies as Record<string, string> | undefined)?.token;
    const authHeader = request.headers.authorization;
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined;

    const token = cookieToken || bearerToken;
    if (!token) {
      throw new AppError({
        statusCode: 401,
        code: 'UNAUTHENTICATED',
        message: 'Authentication required to access this resource.',
      });
    }

    const payload = verifyAuthToken(token, jwtSecret);
    (response.locals as AppLocals).user = payload;
    next();
  };
};
