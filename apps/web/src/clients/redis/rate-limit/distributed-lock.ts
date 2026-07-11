import { getRedisClient } from "./redis";
import { logger } from "@/shared/logger";
import { randomUUID } from "crypto";

export class DistributedLockService {
  private static localLocks = new Map<string, { expiresAt: number; value: string }>();

  /**
   * Acquires a lock for a given key with a specified TTL.
   * Uses Redis if available, falls back to in-memory lock if Redis is down/unavailable.
   */
  static async acquire(key: string, ttlMs: number): Promise<{ acquired: boolean; token: string }> {
    const lockKey = `lock:${key}`;
    const token = randomUUID();

    try {
      const redis = await getRedisClient();
      if (redis) {
        const result = await redis.set(lockKey, token, "PX", ttlMs, "NX");
        if (result === "OK") {
          return { acquired: true, token };
        }
        return { acquired: false, token: "" };
      }
    } catch (err) {
      logger.error(err, `Redis lock acquisition failed for key ${key}, falling back to memory:`);
    }

    // In-memory Fallback
    const now = Date.now();
    const existing = this.localLocks.get(lockKey);
    if (existing && now < existing.expiresAt) {
      return { acquired: false, token: "" };
    }

    this.localLocks.set(lockKey, { expiresAt: now + ttlMs, value: token });
    return { acquired: true, token };
  }

  /**
   * Releases a lock only if the token matches, ensuring we don't release another request's lock.
   */
  static async release(key: string, token: string): Promise<boolean> {
    if (!token) return false;
    const lockKey = `lock:${key}`;

    try {
      const redis = await getRedisClient();
      if (redis) {
        const script = `
          if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("del", KEYS[1])
          else
            return 0
          end
        `;
        const result = await redis.eval(script, 1, lockKey, token);
        return result === 1;
      }
    } catch (err) {
      logger.error(err, `Redis lock release failed for key ${key}, falling back to memory:`);
    }

    // In-memory Fallback release
    const existing = this.localLocks.get(lockKey);
    if (existing && existing.value === token) {
      this.localLocks.delete(lockKey);
      return true;
    }

    return false;
  }
}
