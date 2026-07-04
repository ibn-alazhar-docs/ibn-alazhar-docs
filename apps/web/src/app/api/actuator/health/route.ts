import { NextResponse } from "next/server";
import { prisma } from "@/lib/backend/prisma";
import { statfsSync } from "node:fs";

async function checkDb() {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: "UP" as const, details: `${Date.now() - start}ms` };
  } catch (err) {
    return {
      status: "DOWN" as const,
      details: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

function checkDiskSpace() {
  try {
    const stats = statfsSync("/");
    return {
      status: "UP" as const,
      details: {
        total: stats.blocks * stats.bsize,
        free: stats.bfree * stats.bsize,
        threshold: 1024 * 1024 * 1024,
      },
    };
  } catch {
    return { status: "UP" as const };
  }
}

function checkMemory() {
  const mem = process.memoryUsage();
  const usedMB = Math.round(mem.rss / 1024 / 1024);
  const totalMB = Math.round(mem.heapUsed / 1024 / 1024);
  const maxMB = Math.round(mem.heapTotal / 1024 / 1024);
  const memStatus: "UP" | "DOWN" = usedMB > 450 ? "DOWN" : "UP";
  return { status: memStatus, details: { usedMB, totalMB, maxMB } };
}

export async function GET() {
  const [db, diskSpace, memory] = await Promise.all([
    checkDb(),
    Promise.resolve(checkDiskSpace()),
    Promise.resolve(checkMemory()),
  ]);
  const allUp = db.status === "UP" && diskSpace.status === "UP" && memory.status === "UP";
  return NextResponse.json(
    {
      status: allUp ? "UP" : "DOWN",
      components: { db, diskSpace, memory },
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
    { status: allUp ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
