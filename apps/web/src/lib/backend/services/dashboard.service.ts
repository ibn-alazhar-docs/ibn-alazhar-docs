import { getRedisClient } from "../rate-limit/redis";
import { repos } from "@/core/composition-root";
import { logger } from "@/lib/shared/logger";

export interface DashboardMetrics {
  uploadsLastHour: number;
  avgProcessingTimeSec: number;
  activeUsers15Min: number;
  queueMetrics: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  };
}

export class DashboardService {
  /**
   * Tracks a file upload event in Redis.
   */
  static async trackUpload(documentId: string): Promise<void> {
    try {
      const redis = await getRedisClient();
      if (redis) {
        const now = Date.now();
        await redis.zadd("dashboard:uploads", now, documentId);
        // Clean up uploads older than 1 hour (3600 seconds)
        await redis.zremrangebyscore("dashboard:uploads", "-inf", now - 3600000);
      }
    } catch (err) {
      logger.error(err, "Failed to track upload in DashboardService:");
    }
  }

  /**
   * Tracks user activity for active user count in Redis.
   */
  static async trackUserActivity(userId: string): Promise<void> {
    try {
      const redis = await getRedisClient();
      if (redis) {
        const now = Date.now();
        await redis.zadd("dashboard:active_users", now, userId);
        // Clean up activity older than 15 minutes (900000 ms)
        await redis.zremrangebyscore("dashboard:active_users", "-inf", now - 900000);
      }
    } catch (err) {
      logger.error(err, "Failed to track user activity in DashboardService:");
    }
  }

  /**
   * Computes the metrics for the dashboard.
   */
  static async getMetrics(): Promise<DashboardMetrics> {
    const now = Date.now();
    let uploadsLastHour = 0;
    let activeUsers15Min = 0;

    // 1. Fetch Redis-based metrics
    try {
      const redis = await getRedisClient();
      if (redis) {
        await redis.zremrangebyscore("dashboard:uploads", "-inf", now - 3600000);
        uploadsLastHour = await redis.zcount("dashboard:uploads", now - 3600000, "+inf");

        await redis.zremrangebyscore("dashboard:active_users", "-inf", now - 900000);
        activeUsers15Min = await redis.zcount("dashboard:active_users", now - 900000, "+inf");
      }
    } catch (err) {
      logger.error(err, "Failed to fetch Redis metrics in DashboardService:");
    }

    // 2. Fetch PostgreSQL-based metrics (Average processing time for completed docs in last 24h)
    let avgProcessingTimeSec = 0;
    try {
      const docs = await repos.document.findMany({
        where: {
          status: "COMPLETED",
          updatedAt: { gte: new Date(now - 24 * 60 * 60 * 1000) },
          deletedAt: null,
        },
        select: {
          createdAt: true,
          updatedAt: true,
        },
      });

      if (docs.length > 0) {
        const totalDurationMs = docs.reduce((acc, doc) => {
          const duration = new Date(doc.updatedAt).getTime() - new Date(doc.createdAt).getTime();
          return acc + Math.max(0, duration);
        }, 0);
        avgProcessingTimeSec = Math.round(totalDurationMs / docs.length / 1000);
      }
    } catch (err) {
      logger.error(err, "Failed to calculate processing time in DashboardService:");
    }

    // 3. Fetch BullMQ queue metrics
    let queueMetrics = { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 };
    try {
      const { getQueueMetrics, loadConfig } = await import("@ibn-al-azhar-docs/pipeline");
      const config = loadConfig();
      queueMetrics = await getQueueMetrics(config);
    } catch (err) {
      logger.warn(err, "Queue metrics unavailable in DashboardService (non-critical):");
    }

    return {
      uploadsLastHour,
      avgProcessingTimeSec,
      activeUsers15Min,
      queueMetrics,
    };
  }
}
