import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAdminAuth } from "@/lib/auth-guards";

interface Metrics {
  timestamp: string;
  uptime: number;
  memory: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
  };
  database: {
    users: number;
    documents: number;
    folders: number;
    tags: number;
    shareLinks: number;
  };
  workers: {
    ocrQueue: number;
    exportQueue: number;
  };
}

async function getDatabaseMetrics(): Promise<Metrics["database"]> {
  const [users, documents, folders, tags, shareLinks] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.document.count({ where: { deletedAt: null } }),
    prisma.folder.count(),
    prisma.tag.count(),
    prisma.shareLink.count(),
  ]);
  return { users, documents, folders, tags, shareLinks };
}

async function getQueueLength(queueName: string, redis: RedisClient): Promise<number> {
  const waiting = await redis.llen(`${queueName}:wait`);
  const active = await redis.llen(`${queueName}:active`);
  const delayed = await redis.zcard(`${queueName}:delayed`);
  return waiting + active + delayed;
}

interface RedisClient {
  llen(key: string): Promise<number>;
  zcard(key: string): Promise<number>;
  quit(): Promise<void>;
}

async function getWorkerMetrics(): Promise<Metrics["workers"]> {
  try {
    const { default: IORedis } = await import("ioredis");
    const redis = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      lazyConnect: true,
    });
    await redis.connect();

    const [ocrQueue, exportQueue] = await Promise.all([
      getQueueLength("pipeline-ocr", redis as unknown as RedisClient),
      getQueueLength("pipeline-export", redis as unknown as RedisClient),
    ]);

    await redis.quit();
    return { ocrQueue, exportQueue };
  } catch {
    return { ocrQueue: -1, exportQueue: -1 };
  }
}

export const GET = withAdminAuth(async () => {
  try {
    const mem = process.memoryUsage();
    const [database, workers] = await Promise.all([getDatabaseMetrics(), getWorkerMetrics()]);

    const metrics: Metrics = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        rss: Math.round(mem.rss / 1024 / 1024),
        heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
      },
      database,
      workers,
    };

    return NextResponse.json(metrics, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to collect metrics" } },
      { status: 500 },
    );
  }
});
