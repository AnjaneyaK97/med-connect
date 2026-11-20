import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { correlationIdMiddleware } from './middlewares/correlationId';
import { requestLogger } from './middlewares/requestLogger';
import { errorHandler } from './middlewares/errorHandler';
import { MetricsService } from './services/metricsService';
import { authRateLimiter, aiRateLimiter, generalRateLimiter } from './middlewares/rateLimiter';
import healthRoutes from './routes/health';
import authRoutes from './routes/auth';
import triageRoutes from './routes/triage';
import noteRoutes from './routes/notes';
import appointmentRoutes from './routes/appointments';
import consentRoutes from './routes/consents';
import adminRoutes from './routes/admin';

export const createApp = (): Express => {
  const app = express();

  // Security & baseline middlewares
  app.use(helmet());
  app.use(
    cors({
      origin: '*', // Refined per environment in production
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-correlation-id'],
    })
  );
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Tracing and logging
  app.use(correlationIdMiddleware);
  app.use(requestLogger);
  app.use(MetricsService.metricsMiddleware());

  // Prometheus Metrics endpoint
  app.get('/metrics', (_req, res) => {
    res.setHeader('Content-Type', 'text/plain; version=0.0.4');
    res.send(MetricsService.getPrometheusMetrics());
  });

  // OpenAPI Specification endpoint
  app.get(['/openapi.json', '/api/v1/openapi.json'], (_req, res) => {
    const spec = require('./docs/openapi.json');
    res.json(spec);
  });

  // Health and Readiness checks (available at root and /api/v1)
  app.use('/', healthRoutes);
  app.use('/api/v1', healthRoutes);

  // Auth & RBAC routes (with brute-force rate limiting)
  app.use('/api/v1/auth', authRateLimiter, authRoutes);

  // Triage & Async Transcription routes (with AI compute rate limiting)
  app.use('/api/v1/triage', aiRateLimiter, triageRoutes);

  // Clinical Notes & RAG routes (with AI compute rate limiting)
  app.use('/api/v1/notes', aiRateLimiter, noteRoutes);

  // Appointment Management routes
  app.use('/api/v1/appointments', appointmentRoutes);

  // Consent Management routes
  app.use('/api/v1/consents', consentRoutes);

  // Admin Management & Audit routes
  app.use('/api/v1/admin', adminRoutes);

  // Global Error Handler
  app.use(errorHandler);

  return app;
};
