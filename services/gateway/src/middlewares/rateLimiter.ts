import { Request, Response, NextFunction } from 'express';
import { CacheService } from '../services/cacheService';
import { AppError } from './errorHandler';

export interface RateLimiterOptions {
  limit: number;
  windowSeconds: number;
  prefix?: string;
}

export const createRateLimiter = (options: RateLimiterOptions) => {
  const { limit, windowSeconds, prefix = 'rl' } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Exclude test environments if needed, but test logic handles it smoothly
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const identifier = req.user?.userId || ip;
    const cacheKey = `mediconnect:${prefix}:${identifier}`;

    try {
      const currentCount = (await CacheService.get<number>(cacheKey)) || 0;

      res.setHeader('X-RateLimit-Limit', limit);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - (currentCount + 1)));
      res.setHeader('X-RateLimit-Reset', windowSeconds);

      if (currentCount >= limit) {
        return next(
          new AppError(
            `Rate limit exceeded: Maximum ${limit} requests per ${windowSeconds}s allowed. Please retry later.`,
            429
          )
        );
      }

      await CacheService.set(cacheKey, currentCount + 1, windowSeconds);
      next();
    } catch {
      // In case of rate limiter error, allow request to proceed (fail open)
      next();
    }
  };
};

// Preset rate limiters
export const authRateLimiter = createRateLimiter({
  limit: 10,
  windowSeconds: 60,
  prefix: 'auth',
});

export const aiRateLimiter = createRateLimiter({
  limit: 20,
  windowSeconds: 60,
  prefix: 'ai',
});

export const generalRateLimiter = createRateLimiter({
  limit: 120,
  windowSeconds: 60,
  prefix: 'gen',
});
