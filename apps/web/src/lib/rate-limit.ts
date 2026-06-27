import { checkRedisRateLimit } from "./rate-limit/redis";
import { addToMap, getFromMap, incrementMap, startCleanupIfNeeded } from "./rate-limit/store";

export { cleanupExpiredEntries } from "./rate-limit/store";

const RATE_LIMITS: Record<string, { limit: number; windowMs: number }> = {
  "/api/auth/register": { limit: 50, windowMs: 60_000 },
  "/api/auth/callback/credentials": { limit: 50, windowMs: 60_000 },
  "/api/search": { limit: 30, windowMs: 60_000 },
  "/api/export": { limit: 10, windowMs: 60_000 },
  "/api/upload": { limit: 20, windowMs: 60_000 },
  "/api/share": { limit: 30, windowMs: 60_000 },
};

const USER_RATE_LIMITS: Record<string, { limit: number; windowMs: number }> = {
  "documents:create": { limit: 30, windowMs: 60_000 },
  "documents:delete": { limit: 10, windowMs: 60_000 },
  "tags:create": { limit: 20, windowMs: 60_000 },
  "tags:merge": { limit: 5, windowMs: 60_000 },
  "export:single": { limit: 10, windowMs: 60_000 },
  "export:bulk": { limit: 3, windowMs: 60_000 },
};

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded.split(",");
    const first = parts[0];
    if (first) {
      const ip = first.trim();
      if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ip) || /^[0-9a-fA-F:]{2,39}$/.test(ip)) {
        return ip;
      }
    }
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp && (/^\d{1,3}(\.\d{1,3}){3}$/.test(realIp) || /^[0-9a-fA-F:]{2,39}$/.test(realIp))) {
    return realIp;
  }
  return "unknown";
}

function memoryCheck(
  key: string,
  limit: number,
  windowMs: number,
): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now();
  const entry = getFromMap(key);

  if (!entry || now > entry.resetTime) {
    addToMap(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true };
  }

  if (entry.count >= limit) {
    const retryAfterMs = entry.resetTime - now;
    return { allowed: false, retryAfterMs };
  }

  incrementMap(key);
  return { allowed: true };
}

async function checkWithFallback(
  key: string,
  limit: number,
  windowMs: number,
): Promise<{ allowed: boolean; retryAfterMs?: number }> {
  const redisResult = await checkRedisRateLimit(key, limit, windowMs);
  if (redisResult) return redisResult;
  return memoryCheck(key, limit, windowMs);
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
  return checkWithFallback(key, rule.limit, rule.windowMs);
}

export async function checkUserRateLimit(
  action: string,
  userId: string,
): Promise<{ allowed: boolean; retryAfterMs?: number }> {
  startCleanupIfNeeded();
  const rule = USER_RATE_LIMITS[action];
  if (!rule) return { allowed: true };

  const key = `user:${action}:${userId}`;
  return checkWithFallback(key, rule.limit, rule.windowMs);
}
