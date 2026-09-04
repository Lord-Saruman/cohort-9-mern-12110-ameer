import { Router, type Request, type Response, type NextFunction, type RequestHandler } from 'express';

import type { AppLocals } from '../../middleware/request-context';
import { createRequireAuth } from '../../middleware/auth.middleware';
import { createAuthController, type AuthControllerOptions } from './auth.controller';

export interface AuthRouterOptions extends AuthControllerOptions {
  rateLimitMax?: number;
  rateLimitWindowMs?: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export const createRateLimiter = (options: {
  max: number;
  windowMs: number;
}): RequestHandler => {
  const hits = new Map<string, RateLimitEntry>();

  return (request: Request, response: Response, next: NextFunction): void => {
    const now = Date.now();
    const clientKey = request.ip || request.socket.remoteAddress || 'unknown';
    const entry = hits.get(clientKey);

    if (!entry || now > entry.resetAt) {
      hits.set(clientKey, { count: 1, resetAt: now + options.windowMs });
      next();
      return;
    }

    if (entry.count >= options.max) {
      const locals = response.locals as AppLocals | undefined;
      response.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please try again later.',
          requestId: locals?.requestId,
        },
      });
      return;
    }

    entry.count += 1;
    next();
  };
};

export const createAuthRouter = (options: AuthRouterOptions): Router => {
  const router = Router();
  const controller = createAuthController(options);
  const requireAuth = createRequireAuth(options.jwtSecret);

  const authRateLimiter = createRateLimiter({
    windowMs: options.rateLimitWindowMs ?? 15 * 60 * 1000,
    max: options.rateLimitMax ?? 20,
  });

  router.post('/register', authRateLimiter, controller.register);
  router.post('/login', authRateLimiter, controller.login);
  router.post('/logout', requireAuth, controller.logout);
  router.get('/me', requireAuth, controller.me);

  return router;
};
