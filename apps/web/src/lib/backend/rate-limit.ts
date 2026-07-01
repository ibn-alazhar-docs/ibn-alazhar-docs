import { NextResponse } from "next/server";
import { checkRedisRateLimit } from "./rate-limit/redis";
import { addToMap, getFromMap, incrementMap, startCleanupIfNeeded } from "./rate-limit/store";

export { cleanupExpiredEntries } from "./rate-limit/store";

// IP-based rate limits for public API endpoints.
// WHY: Separate from user-based limits — unauthenticated requests have no user ID,
// and IP is the only reliable identifier.
const RATE_LIMITS: Record<string, { limit: number; windowMs: number }> = {
  "/api/auth/register": { limit: 50, windowMs: 60_000 },
  "/api/auth/callback/credentials": { limit: 50, windowMs: 60_000 },
  "/api/search": { limit: 30, windowMs: 60_000 },
  "/api/search/suggest": { limit: 30, windowMs: 60_000 },
  "/api/export": { limit: 10, windowMs: 60_000 },
  "/api/upload": { limit: 20, windowMs: 60_000 },
  "/api/share": { limit: 30, windowMs: 60_000 },
  "/api/conversion/list": { limit: 30, windowMs: 60_000 },
  "/api/conversion/start": { limit: 10, windowMs: 60_000 },
  "/api/stream": { limit: 10, windowMs: 60_000 },
};

// User-based rate limits for authenticated operations.
// WHY: Stricter than IP-based — a single user could have multiple IPs (mobile + desktop),
// and destructive actions (delete, bulk) need lower limits to prevent abuse.
const USER_RATE_LIMITS: Record<string, { limit: number; windowMs: number }> = {
  "documents:create": { limit: 30, windowMs: 60_000 },
  "documents:delete": { limit: 10, windowMs: 60_000 },
  "documents:export": { limit: 10, windowMs: 60_000 },
  "documents:move": { limit: 20, windowMs: 60_000 },
  "documents:restore": { limit: 10, windowMs: 60_000 },
  "documents:bulk-move": { limit: 5, windowMs: 60_000 },
  "documents:bulk-tag": { limit: 10, windowMs: 60_000 },
  "documents:bulk-untag": { limit: 10, windowMs: 60_000 },
  "documents:tags": { limit: 20, windowMs: 60_000 },
  "documents:share": { limit: 10, windowMs: 60_000 },
  "folders:create": { limit: 20, windowMs: 60_000 },
  "folders:delete": { limit: 10, windowMs: 60_000 },
  "folders:move": { limit: 10, windowMs: 60_000 },
  "folders:restore": { limit: 10, windowMs: 60_000 },
  "folders:empty": { limit: 5, windowMs: 60_000 },
  "tags:create": { limit: 20, windowMs: 60_000 },
  "tags:delete": { limit: 10, windowMs: 60_000 },
  "tags:merge": { limit: 5, windowMs: 60_000 },
  "share:regenerate": { limit: 5, windowMs: 60_000 },
  "account:delete": { limit: 3, windowMs: 60_000 },
  "export:single": { limit: 10, windowMs: 60_000 },
  "export:bulk": { limit: 3, windowMs: 60_000 },
  "admin:users": { limit: 30, windowMs: 60_000 },
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

// WHY: Redis-first with in-memory fallback — Redis is the source of truth for
// distributed rate limiting (multiple server instances), but if Redis is
// unavailable, we fall back to per-instance memory to avoid blocking all requests.
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

export function rateLimitResponse(retryAfterMs?: number): NextResponse {
  return NextResponse.json(
    { error: { code: "RATE_LIMITED", message: "تم تجاوز الحد الأقصى للطلبات" } },
    {
      status: 429,
      headers: {
        "Retry-After": String(Math.ceil((retryAfterMs ?? 60_000) / 1000)),
      },
    },
  );
}
