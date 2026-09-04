import type { RequestHandler } from 'express';
import type { Pool } from 'mysql2/promise';

import { AppError } from '../../common/app-error';
import type { AppLocals } from '../../middleware/request-context';
import { loginSchema, registerSchema } from './auth.schemas';
import { loginUser, registerUser, toUserDto } from './auth.service';
import { findUserById } from './auth.repository';

export interface AuthControllerOptions {
  pool: Pool;
  jwtSecret: string;
  jwtExpiresIn: string;
  isProduction: boolean;
}

export interface AuthController {
  register: RequestHandler;
  login: RequestHandler;
  logout: RequestHandler;
  me: RequestHandler;
}

const parseDurationMs = (duration: string): number => {
  const match = duration.match(/^(\d+)\s*(s|m|h|d)$/i);
  if (!match || !match[1] || !match[2]) return 24 * 60 * 60 * 1000;
  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return value * (multipliers[unit] ?? 24 * 60 * 60 * 1000);
};

export const createAuthController = ({
  pool,
  jwtSecret,
  jwtExpiresIn,
  isProduction,
}: AuthControllerOptions): AuthController => {
  const cookieMaxAge = parseDurationMs(jwtExpiresIn);

  const getCookieOptions = () => ({
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax' as const,
    maxAge: cookieMaxAge,
    path: '/',
  });

  const register: RequestHandler = async (request, response, next): Promise<void> => {
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

      const { user, token } = await registerUser(pool, parsed.data, jwtSecret, jwtExpiresIn);
      response.cookie('token', token, getCookieOptions());
      response.status(201).json({ data: { user } });
    } catch (error: unknown) {
      next(error);
    }
  };

  const login: RequestHandler = async (request, response, next): Promise<void> => {
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

      const { user, token } = await loginUser(pool, parsed.data, jwtSecret, jwtExpiresIn);
      response.cookie('token', token, getCookieOptions());
      response.status(200).json({ data: { user } });
    } catch (error: unknown) {
      next(error);
    }
  };

  const logout: RequestHandler = (_request, response): void => {
    response.clearCookie('token', {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
    });
    response.status(204).end();
  };

  const me: RequestHandler = async (_request, response, next): Promise<void> => {
    try {
      const locals = response.locals as AppLocals;
      const userId = locals.user?.userId;
      if (!userId) {
        throw new AppError({
          statusCode: 401,
          code: 'UNAUTHENTICATED',
          message: 'Authentication required to access this resource.',
        });
      }

      const user = await findUserById(pool, userId);
      if (!user) {
        throw new AppError({
          statusCode: 401,
          code: 'UNAUTHENTICATED',
          message: 'Authenticated user no longer exists.',
        });
      }

      response.status(200).json({ data: { user: toUserDto(user) } });
    } catch (error: unknown) {
      next(error);
    }
  };

  return { register, login, logout, me };
};
