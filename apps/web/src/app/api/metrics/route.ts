import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, forbiddenResponse } from "@/lib/auth-guards";

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
    prisma.user.count(),
    prisma.document.count(),
    prisma.folder.count(),
    prisma.tag.count(),
    prisma.shareLink.count(),
  ]);
  return { users, documents, folders, tags, shareLinks };
}

async function getWorkerMetrics(): Promise<Metrics["workers"]> {
  // Worker queue depth requires Redis client (ioredis) which is only in worker packages.
  // Return -1 to indicate "unknown" rather than hardcoded zeros.
  return { ocrQueue: -1, exportQueue: -1 };
}

export async function GET(): Promise<NextResponse> {
  const session = await requireRole("ADMIN").catch(() => null);
  if (!session) return forbiddenResponse();

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

    return NextResponse.json(metrics);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
