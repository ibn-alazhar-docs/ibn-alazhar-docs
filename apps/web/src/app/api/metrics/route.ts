import { NextResponse } from "next/server";
import { prisma } from "@/transport/db";
import { withAdminAuth } from "@/middleware/auth-guards";
import { getMetricsViaDriver, JOB_QUEUES } from "@ibn-al-azhar-docs/pipeline";

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
    prisma.tag.count({ where: { deletedAt: null } }),
    prisma.shareLink.count(),
  ]);
  return { users, documents, folders, tags, shareLinks };
}

function sumCounts(obj: Record<string, number>): number {
  return Object.values(obj).reduce((acc, n) => acc + (Number(n) || 0), 0);
}

interface ByQueueMetrics {
  byQueue: Record<string, Record<string, number>>;
}

interface RedisMetrics {
  [queue: string]: { waiting: number; active: number; delayed: number };
}

function isByQueueMetrics(value: unknown): value is ByQueueMetrics {
  return (
    typeof value === "object" &&
    value !== null &&
    "byQueue" in value &&
    typeof (value as ByQueueMetrics).byQueue === "object"
  );
}

function isRedisMetrics(value: unknown): value is RedisMetrics {
  return typeof value === "object" && value !== null && !("byQueue" in value);
}

async function getWorkerMetrics(): Promise<Metrics["workers"]> {
  try {
    const result = await getMetricsViaDriver();

    if (isByQueueMetrics(result)) {
      const ocrQueue = sumCounts(result.byQueue[JOB_QUEUES.OCR] ?? {});
      const exportQueue = sumCounts(result.byQueue[JOB_QUEUES.EXPORT] ?? {});
      return { ocrQueue, exportQueue };
    }

    if (isRedisMetrics(result)) {
      const ocr = result[JOB_QUEUES.OCR];
      const exp = result[JOB_QUEUES.EXPORT];
      const ocrQueue = ocr ? ocr.waiting + ocr.active + ocr.delayed : -1;
      const exportQueue = exp ? exp.waiting + exp.active + exp.delayed : -1;
      return { ocrQueue, exportQueue };
    }

    return { ocrQueue: -1, exportQueue: -1 };
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
