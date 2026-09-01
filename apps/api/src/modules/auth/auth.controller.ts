import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { Pool } from 'mysql2/promise';

import { AppError } from '../../common/app-error';
import { loginSchema, registerSchema } from './auth.schemas';
import { loginUser, registerUser } from './auth.service';

export interface AuthControllerOptions {
  pool: Pool;
  jwtSecret: string;
  isProduction: boolean;
}

export interface AuthController {
  register: RequestHandler;
  login: RequestHandler;
  logout: RequestHandler;
}

const getCookieOptions = (isProduction: boolean) => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax' as const,
  maxAge: 24 * 60 * 60 * 1000,
  path: '/',
});

export const createAuthController = ({
  pool,
  jwtSecret,
  isProduction,
}: AuthControllerOptions): AuthController => {
  const cookieOptions = getCookieOptions(isProduction);

  const register = async (
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const parsed = registerSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new AppError({
          statusCode: 400,
          code: 'VALIDATION_ERROR',
          message: 'Please correct the highlighted fields.',
          details: parsed.error.issues.map((issue) => ({
            field: String(issue.path[0] ?? 'body'),
            message: issue.message,
          })),
        });
      }

      const { user, token } = await registerUser(pool, parsed.data, jwtSecret);
      response.cookie('token', token, cookieOptions);
      response.status(201).json({ data: { user } });
    } catch (error: unknown) {
      next(error);
    }
  };

  const login = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = loginSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new AppError({
          statusCode: 400,
          code: 'VALIDATION_ERROR',
          message: 'Please correct the highlighted fields.',
          details: parsed.error.issues.map((issue) => ({
            field: String(issue.path[0] ?? 'body'),
            message: issue.message,
          })),
        });
      }

      const { user, token } = await loginUser(pool, parsed.data, jwtSecret);
      response.cookie('token', token, cookieOptions);
      response.status(200).json({ data: { user } });
    } catch (error: unknown) {
      next(error);
    }
  };

  const logout = (_request: Request, response: Response): void => {
    response.clearCookie('token', {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
    });
    response.status(204).end();
  };

  return { register, login, logout };
};
