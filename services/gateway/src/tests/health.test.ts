import request from 'supertest';
import { createApp } from '../app';

describe('Gateway Health Endpoints', () => {
  const app = createApp();

  it('GET /health returns 200 with healthy status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.service).toBe('gateway');
    expect(res.headers['x-correlation-id']).toBeDefined();
  });

  it('GET /api/v1/health returns 200 with healthy status and correlation ID', async () => {
    const customCorrelationId = 'test-corr-12345';
    const res = await request(app)
      .get('/api/v1/health')
      .set('x-correlation-id', customCorrelationId);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.headers['x-correlation-id']).toBe(customCorrelationId);
    expect(res.body.correlationId).toBe(customCorrelationId);
  });

  it('GET /ready returns 200 with readiness status', async () => {
    const res = await request(app).get('/ready');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ready');
  });
});
