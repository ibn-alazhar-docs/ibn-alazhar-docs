import { NextResponse } from "next/server";
import { prisma } from "@/transport/db";
import { withAdminAuth } from "@/middleware/auth-guards";
import { getMetricsViaDriver } from "@ibn-al-azhar-docs/pipeline";

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

async function getWorkerMetrics(): Promise<Metrics["workers"]> {
  try {
    const result = await getMetricsViaDriver();
    const ocrQueue = result.ocrQueue.waiting + result.ocrQueue.active + result.ocrQueue.delayed;
    const exportQueue =
      result.exportQueue.waiting + result.exportQueue.active + result.exportQueue.delayed;
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
