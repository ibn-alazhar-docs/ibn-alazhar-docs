import type { Redis } from "ioredis";
import { logger } from "@/lib/shared/logger";

let redisClient: Redis | null = null;
let redisFailed = false;
let redisRetryAt = 0;

export async function getRedisClient(): Promise<Redis | null> {
  if (redisFailed && Date.now() < redisRetryAt) return null;
  if (redisClient) return redisClient;

  // @ts-expect-error EdgeRuntime is not defined in standard TS
  if (typeof process !== "undefined" && typeof EdgeRuntime === "undefined") {
    const host = process.env.REDIS_HOST ?? "localhost";
    const port = Number(process.env.REDIS_PORT ?? 6379);
    const password = process.env.REDIS_PASSWORD;
    const url = process.env.REDIS_URL;

    try {
      const IORedisClass = (await import("ioredis")).default;
      if (url) {
        redisClient = new IORedisClass(url, {
          maxRetriesPerRequest: 1,
          lazyConnect: true,
          connectTimeout: 2000,
          // WHY: Upstash Redis uses rediss:// URLs which require TLS.
          tls: url.startsWith("rediss://") ? {} : undefined,
        });
      } else {
        redisClient = new IORedisClass({
          host,
          port,
          password,
          maxRetriesPerRequest: 1,
          lazyConnect: true,
          connectTimeout: 2000,
        });
      }
      redisClient.on("error", (err: unknown) => {
        logger.error(err, "Redis rate limit client error:");
        redisFailed = true;
        redisRetryAt = Date.now() + 30_000;
        redisClient = null;
      });
      return redisClient;
    } catch (e) {
      logger.error(e, "Failed to initialize Redis rate limit client:");
      redisFailed = true;
      redisRetryAt = Date.now() + 30_000;
      return null;
    }
  }
  return null;
}

export function isRedisFailed(): boolean {
  return redisFailed;
}

export async function checkRedisRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<{ allowed: boolean; retryAfterMs?: number } | null> {
  const redis = await getRedisClient();
  if (!redis || redisFailed) return null;

  try {
    const redisKey = `ratelimit:${key}`;
    const p = redis.pipeline();
    p.incr(redisKey);
    p.ttl(redisKey);
    const results = await p.exec();

    if (results && results[0] && results[1]) {
      const [errIncr, count] = results[0];
      const [, ttl] = results[1];

      if (!errIncr && typeof count === "number") {
        if (count === 1) {
          await redis.expire(redisKey, Math.ceil(windowMs / 1000));
        }
        if (count > limit) {
          const retryAfterMs = typeof ttl === "number" && ttl > 0 ? ttl * 1000 : windowMs;
          return { allowed: false, retryAfterMs };
        }
        return { allowed: true };
      }
    }
  } catch (err) {
    logger.error(err, "Redis rate limit check failed, falling back to memory:");
  }

  return null;
}
