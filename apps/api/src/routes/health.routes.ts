import { Router, type Request, type Response } from 'express';

export const createHealthRouter = (): Router => {
  const router = Router();

  router.get('/', (_request: Request, response: Response): void => {
    response.status(200).json({
      data: {
        status: 'ok',
        timestamp: new Date().toISOString(),
      },
    });
  });

  return router;
};
