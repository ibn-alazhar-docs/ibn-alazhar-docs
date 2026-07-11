import { describe, it, expect, vi, beforeEach } from "vitest";
import { DashboardService } from "@/core/services/dashboard.service";
import { getRedisClient } from "@/clients/redis/rate-limit/redis";
import { repos } from "@/core/composition-root";

vi.mock("@/clients/redis/rate-limit/redis", () => {
  const mockRedis = {
    zadd: vi.fn(),
    zremrangebyscore: vi.fn(),
    zcount: vi.fn(),
  };
  return {
    getRedisClient: vi.fn().mockResolvedValue(mockRedis),
  };
});

vi.mock("@/core/composition-root", () => {
  return {
    repos: {
      document: {
        findMany: vi.fn(),
      },
    },
  };
});

vi.mock("@ibn-al-azhar-docs/pipeline", () => {
  return {
    loadConfig: vi.fn().mockReturnValue({}),
    getQueueMetrics: vi.fn().mockResolvedValue({
      waiting: 2,
      active: 1,
      completed: 10,
      failed: 0,
      delayed: 1,
    }),
  };
});

describe("DashboardService", () => {
  let mockRedis: any;

  beforeEach(async () => {
    mockRedis = await getRedisClient();
    mockRedis.zadd.mockReset();
    mockRedis.zremrangebyscore.mockReset();
    mockRedis.zcount.mockReset();
    vi.mocked(repos.document.findMany).mockReset();
  });

  it("successfully tracks uploads in Redis", async () => {
    mockRedis.zadd.mockResolvedValue(1);
    mockRedis.zremrangebyscore.mockResolvedValue(0);

    await DashboardService.trackUpload("doc-123");

    expect(mockRedis.zadd).toHaveBeenCalledWith("dashboard:uploads", expect.any(Number), "doc-123");
    expect(mockRedis.zremrangebyscore).toHaveBeenCalledWith(
      "dashboard:uploads",
      "-inf",
      expect.any(Number),
    );
  });

  it("successfully tracks active users in Redis", async () => {
    mockRedis.zadd.mockResolvedValue(1);
    mockRedis.zremrangebyscore.mockResolvedValue(0);

    await DashboardService.trackUserActivity("user-123");

    expect(mockRedis.zadd).toHaveBeenCalledWith(
      "dashboard:active_users",
      expect.any(Number),
      "user-123",
    );
    expect(mockRedis.zremrangebyscore).toHaveBeenCalledWith(
      "dashboard:active_users",
      "-inf",
      expect.any(Number),
    );
  });

  it("gets all analytics metrics correctly", async () => {
    mockRedis.zremrangebyscore.mockResolvedValue(0);
    mockRedis.zcount.mockResolvedValueOnce(5).mockResolvedValueOnce(12);

    const now = new Date();
    const created1 = new Date(now.getTime() - 10000);
    const created2 = new Date(now.getTime() - 20000);
    vi.mocked(repos.document.findMany).mockResolvedValue([
      { createdAt: created1, updatedAt: now },
      { createdAt: created2, updatedAt: now },
    ] as any);

    const metrics = await DashboardService.getMetrics();

    expect(metrics.uploadsLastHour).toBe(5);
    expect(metrics.activeUsers15Min).toBe(12);
    expect(metrics.avgProcessingTimeSec).toBe(15);
    expect(metrics.queueMetrics).toEqual({
      waiting: 2,
      active: 1,
      completed: 10,
      failed: 0,
      delayed: 1,
    });
  });
});
