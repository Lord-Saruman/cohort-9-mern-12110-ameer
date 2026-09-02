import { Router } from 'express';
import type { Pool } from 'mysql2/promise';

import { createRequireAuth } from '../../middleware/auth.middleware';
import { createNotesController } from './notes.controller';

export interface NotesRouterOptions {
  pool: Pool;
  jwtSecret: string;
}

export const createNotesRouter = ({ pool, jwtSecret }: NotesRouterOptions): Router => {
  const router = Router();
  const requireAuth = createRequireAuth(jwtSecret);
  const controller = createNotesController({ pool });

  router.use(requireAuth);

  router.get('/', controller.list);
  router.post('/', controller.create);
  router.get('/:noteId', controller.getById);
  router.patch('/:noteId', controller.update);
  router.delete('/:noteId', controller.delete);

  return router;
};
