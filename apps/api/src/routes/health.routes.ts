import { Router } from 'express';

export const createHealthRouter = (): Router => {
  const router = Router();

  router.get('/', (_request, response) => {
    response.status(200).json({
      data: {
        status: 'ok',
        timestamp: new Date().toISOString(),
      },
    });
  });

  return router;
};
