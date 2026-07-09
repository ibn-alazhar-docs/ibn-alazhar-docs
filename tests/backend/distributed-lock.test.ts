import { describe, it, expect, vi, beforeEach } from "vitest";
import { DistributedLockService } from "@/clients/redis/rate-limit/distributed-lock";
import { getRedisClient } from "@/clients/redis/rate-limit/redis";

vi.mock("@/clients/redis/rate-limit/redis", () => {
  const mockRedis = {
    set: vi.fn(),
    eval: vi.fn(),
  };
  return {
    getRedisClient: vi.fn().mockResolvedValue(mockRedis),
  };
});

describe("DistributedLockService", () => {
  let mockRedis: any;

  beforeEach(async () => {
    mockRedis = await getRedisClient();
    mockRedis.set.mockReset();
    mockRedis.eval.mockReset();
    (DistributedLockService as any).localLocks.clear();
  });

  describe("Using Redis (Redis is healthy)", () => {
    it("successfully acquires a lock when key is free", async () => {
      mockRedis.set.mockResolvedValue("OK");

      const result = await DistributedLockService.acquire("test-key", 5000);

      expect(result.acquired).toBe(true);
      expect(result.token).toBeDefined();
      expect(result.token.length).toBeGreaterThan(0);
      expect(mockRedis.set).toHaveBeenCalledWith("lock:test-key", result.token, "PX", 5000, "NX");
    });

    it("fails to acquire lock when key is already locked", async () => {
      mockRedis.set.mockResolvedValue(null);

      const result = await DistributedLockService.acquire("test-key", 5000);

      expect(result.acquired).toBe(false);
      expect(result.token).toBe("");
    });

    it("safely releases a lock when token matches", async () => {
      mockRedis.eval.mockResolvedValue(1);

      const success = await DistributedLockService.release("test-key", "valid-token");

      expect(success).toBe(true);
      expect(mockRedis.eval).toHaveBeenCalled();
    });

    it("fails to release lock when token does not match", async () => {
      mockRedis.eval.mockResolvedValue(0);

      const success = await DistributedLockService.release("test-key", "invalid-token");

      expect(success).toBe(false);
    });
  });

  describe("In-Memory Fallback (Redis is unavailable)", () => {
    beforeEach(() => {
      vi.mocked(getRedisClient).mockResolvedValueOnce(null);
    });

    it("successfully acquires a lock using memory store", async () => {
      const result = await DistributedLockService.acquire("mem-key", 100);

      expect(result.acquired).toBe(true);
      expect(result.token).toBeDefined();
    });

    it("fails to acquire lock in memory before TTL expires", async () => {
      const first = await DistributedLockService.acquire("mem-key", 100);
      expect(first.acquired).toBe(true);

      vi.mocked(getRedisClient).mockResolvedValueOnce(null);
      const second = await DistributedLockService.acquire("mem-key", 100);
      expect(second.acquired).toBe(false);
    });

    it("acquires lock in memory after TTL expires", async () => {
      const result = await DistributedLockService.acquire("mem-key", 10);
      expect(result.acquired).toBe(true);

      await new Promise((resolve) => setTimeout(resolve, 20));

      vi.mocked(getRedisClient).mockResolvedValueOnce(null);
      const second = await DistributedLockService.acquire("mem-key", 10);
      expect(second.acquired).toBe(true);
    });

    it("releases lock in memory when token matches", async () => {
      const result = await DistributedLockService.acquire("mem-key", 100);
      expect(result.acquired).toBe(true);

      vi.mocked(getRedisClient).mockResolvedValueOnce(null);
      const released = await DistributedLockService.release("mem-key", result.token);
      expect(released).toBe(true);
    });

    it("fails to release lock in memory when token does not match", async () => {
      const result = await DistributedLockService.acquire("mem-key", 100);
      expect(result.acquired).toBe(true);

      vi.mocked(getRedisClient).mockResolvedValueOnce(null);
      const released = await DistributedLockService.release("mem-key", "wrong-token");
      expect(released).toBe(false);
    });
  });
});
