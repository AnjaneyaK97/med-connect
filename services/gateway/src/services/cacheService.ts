import Redis from 'ioredis';
import { config } from '../config';

export class CacheService {
  private static redisClient: Redis | null = null;
  private static memoryCache = new Map<string, { value: any; expiresAt: number }>();

  private static getClient(): Redis | null {
    if (!this.redisClient && config.redis.host) {
      try {
        this.redisClient = new Redis({
          host: config.redis.host,
          port: config.redis.port,
          lazyConnect: true,
          retryStrategy: () => null,
        });
        this.redisClient.on('error', () => {});
      } catch {
        this.redisClient = null;
      }
    }
    return this.redisClient;
  }

  public static async get<T>(key: string): Promise<T | null> {
    const redis = this.getClient();
    if (redis && redis.status === 'ready') {
      try {
        const data = await redis.get(key);
        if (data) return JSON.parse(data) as T;
      } catch {
        // Fall back to memoryCache
      }
    }

    // Memory cache fallback
    const entry = this.memoryCache.get(key);
    if (entry) {
      if (entry.expiresAt > Date.now()) {
        return entry.value as T;
      } else {
        this.memoryCache.delete(key);
      }
    }
    return null;
  }

  public static async set(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
    const redis = this.getClient();
    if (redis && redis.status === 'ready') {
      try {
        await redis.setex(key, ttlSeconds, JSON.stringify(value));
        return;
      } catch {
        // Fall back to memoryCache
      }
    }

    // Memory cache fallback
    this.memoryCache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  public static async del(key: string): Promise<void> {
    const redis = this.getClient();
    if (redis && redis.status === 'ready') {
      try {
        await redis.del(key);
      } catch {
        // Fall back to memoryCache
      }
    }
    this.memoryCache.delete(key);
  }

  public static async invalidatePattern(patternPrefix: string): Promise<void> {
    const redis = this.getClient();
    if (redis && redis.status === 'ready') {
      try {
        const keys = await redis.keys(`${patternPrefix}*`);
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      } catch {
        // Fall back to memoryCache
      }
    }

    // Memory cache cleanup
    for (const key of this.memoryCache.keys()) {
      if (key.startsWith(patternPrefix)) {
        this.memoryCache.delete(key);
      }
    }
  }
}
