import { Router, Request, Response } from 'express';

const router = Router();

router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    service: 'gateway',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    correlationId: req.correlationId,
  });
});

router.get('/ready', (req: Request, res: Response) => {
  // In later phases, this checks DB & Redis connectivity
  res.status(200).json({
    status: 'ready',
    service: 'gateway',
    checks: {
      database: 'connected',
      redis: 'connected',
    },
    timestamp: new Date().toISOString(),
    correlationId: req.correlationId,
  });
});

export default router;
