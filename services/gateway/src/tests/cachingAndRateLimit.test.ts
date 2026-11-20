import { CacheService } from '../services/cacheService';
import { createRateLimiter } from '../middlewares/rateLimiter';
import { MetricsService } from '../services/metricsService';
import { Request, Response, NextFunction } from 'express';

describe('Phase 11: Caching, Rate Limiting & Observability', () => {
  describe('CacheService', () => {
    it('sets, gets, and deletes cached data with TTL', async () => {
      const key = 'test:doctor:doc-100';
      const data = { id: 'doc-100', name: 'Dr. Smith', available: true };

      await CacheService.set(key, data, 60);

      const cached = await CacheService.get<typeof data>(key);
      expect(cached).toEqual(data);

      await CacheService.del(key);
      const afterDel = await CacheService.get(key);
      expect(afterDel).toBeNull();
    });

    it('invalidates all keys matching a specific prefix pattern', async () => {
      await CacheService.set('doctors:cardiology:1', { name: 'A' }, 60);
      await CacheService.set('doctors:cardiology:2', { name: 'B' }, 60);
      await CacheService.set('patients:1', { name: 'P' }, 60);

      await CacheService.invalidatePattern('doctors:cardiology');

      expect(await CacheService.get('doctors:cardiology:1')).toBeNull();
      expect(await CacheService.get('doctors:cardiology:2')).toBeNull();
      expect(await CacheService.get('patients:1')).not.toBeNull();
    });
  });

  describe('RateLimiter Middleware', () => {
    it('allows requests within limit and attaches rate limit headers', async () => {
      const limiter = createRateLimiter({
        limit: 5,
        windowSeconds: 60,
        prefix: 'test_allow',
      });

      const mockReq: Partial<Request> = {
        ip: '192.168.1.100',
        socket: {} as any,
      };
      const headers: Record<string, any> = {};
      const mockRes: Partial<Response> = {
        setHeader: (k: string, v: any) => {
          headers[k] = v;
        },
      };
      const next = jest.fn();

      await limiter(mockReq as Request, mockRes as Response, next);

      expect(next).toHaveBeenCalledWith();
      expect(headers['X-RateLimit-Limit']).toBe(5);
      expect(headers['X-RateLimit-Remaining']).toBe(4);
    });

    it('blocks requests exceeding limit with 429 status', async () => {
      const limiter = createRateLimiter({
        limit: 2,
        windowSeconds: 60,
        prefix: 'test_block',
      });

      const mockReq: Partial<Request> = {
        ip: '192.168.1.200',
        socket: {} as any,
      };
      const mockRes: Partial<Response> = {
        setHeader: jest.fn(),
      };
      let lastErr: any = null;
      const next = (err?: any) => {
        lastErr = err;
      };

      // Request 1
      await limiter(mockReq as Request, mockRes as Response, next);
      expect(lastErr).toBeUndefined();

      // Request 2
      await limiter(mockReq as Request, mockRes as Response, next);
      expect(lastErr).toBeUndefined();

      // Request 3 (exceeds limit 2)
      await limiter(mockReq as Request, mockRes as Response, next);
      expect(lastErr).toBeDefined();
      expect(lastErr.statusCode).toBe(429);
      expect(lastErr.message).toContain('Rate limit exceeded');
    });
  });

  describe('Prometheus MetricsService', () => {
    it('records requests and formats standard Prometheus plaintext metrics', () => {
      MetricsService.recordRequest('GET', '/api/v1/triage/sessions', 200, 45);
      MetricsService.recordAiStage('whisper_stt', 320);
      MetricsService.incrementRedFlag();

      const metricsText = MetricsService.getPrometheusMetrics();

      expect(metricsText).toContain('mediconnect_uptime_seconds');
      expect(metricsText).toContain('mediconnect_http_requests_total');
      expect(metricsText).toContain('mediconnect_ai_stage_duration_ms{stage="whisper_stt"}');
      expect(metricsText).toContain('mediconnect_red_flag_alerts_total 1');
    });
  });
});
