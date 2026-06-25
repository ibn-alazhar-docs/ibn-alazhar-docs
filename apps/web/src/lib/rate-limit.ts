import type { Redis } from "ioredis";
import { logger } from "@/lib/logger";

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const MAX_MAP_SIZE = 10000;

const RATE_LIMITS: Record<string, { limit: number; windowMs: number }> = {
  "/api/auth/register": { limit: 50, windowMs: 60_000 },
  "/api/auth/callback/credentials": { limit: 50, windowMs: 60_000 },
  "/api/search": { limit: 30, windowMs: 60_000 },
  "/api/export": { limit: 10, windowMs: 60_000 },
  "/api/upload": { limit: 20, windowMs: 60_000 },
  "/api/share": { limit: 30, windowMs: 60_000 },
};

let redisClient: Redis | null = null;
let redisFailed = false;
let redisRetryAt = 0;

async function getRedisClient(): Promise<Redis | null> {
  if (redisFailed && Date.now() < redisRetryAt) return null;
  if (redisClient) return redisClient;

  // Check if we can run under Node runtime (avoid importing on Edge)
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

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0];
    if (first) return first.trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}

function addToMap(key: string, value: { count: number; resetTime: number }) {
  if (rateLimitMap.size >= MAX_MAP_SIZE) {
    const oldestKey = rateLimitMap.keys().next().value;
    if (oldestKey !== undefined) {
      rateLimitMap.delete(oldestKey);
    }
  }
  rateLimitMap.set(key, value);
}

export async function checkRateLimit(
  pathname: string,
  request: Request,
): Promise<{ allowed: boolean; retryAfterMs?: number }> {
  startCleanupIfNeeded();
  const rule = RATE_LIMITS[pathname];
  if (!rule) return { allowed: true };

  const ip = getClientIp(request);
  const key = `${pathname}:${ip}`;
  const now = Date.now();

  const redis = await getRedisClient();
  if (redis && !redisFailed) {
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
            await redis.expire(redisKey, Math.ceil(rule.windowMs / 1000));
          }
          if (count > rule.limit) {
            const retryAfterMs = typeof ttl === "number" && ttl > 0 ? ttl * 1000 : rule.windowMs;
            return { allowed: false, retryAfterMs };
          }
          return { allowed: true };
        }
      }
    } catch (err) {
      logger.error(err, "Redis rate limit check failed, falling back to memory:");
    }
  }

  // Bounded Memory Fallback
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetTime) {
    addToMap(key, { count: 1, resetTime: now + rule.windowMs });
    return { allowed: true };
  }

  if (entry.count >= rule.limit) {
    const retryAfterMs = entry.resetTime - now;
    return { allowed: false, retryAfterMs };
  }

  entry.count++;
  return { allowed: true };
}

export function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}

let cleanupStarted = false;
function startCleanupIfNeeded(): void {
  if (cleanupStarted) return;
  cleanupStarted = true;
  if (typeof setInterval !== "undefined") {
    setInterval(cleanupExpiredEntries, 60_000);
  }
}
