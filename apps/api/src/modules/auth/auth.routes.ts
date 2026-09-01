import { Router } from 'express';

import { createAuthController, type AuthControllerOptions } from './auth.controller';

export const createAuthRouter = (options: AuthControllerOptions): Router => {
  const router = Router();
  const controller = createAuthController(options);

  router.post('/register', controller.register);
  router.post('/login', controller.login);
  router.post('/logout', controller.logout);

  return router;
};
