import { Router } from 'express';
import { testConnection } from '../db';

const router = Router();

router.get('/health', async (req, res) => {
  const dbHealthy = await testConnection();

  const status = dbHealthy ? 'ok' : 'unhealthy';
  const statusCode = dbHealthy ? 200 : 503;

  res.status(statusCode).json({
    status,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    database: dbHealthy ? 'connected' : 'disconnected',
  });
});

export default router;
