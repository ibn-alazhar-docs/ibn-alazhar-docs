import { NextResponse } from "next/server";
import { prisma } from "@/transport/db";
import { loadConfig, isRedisHealthy } from "@ibn-al-azhar-docs/pipeline";

interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  uptime: number;
  checks: {
    database: { status: "ok" | "error"; latencyMs?: number };
    redis: { status: "ok" | "error"; latencyMs?: number };
    memory: { status: "ok" | "warning" | "error"; usedMB: number; limit: number };
    workers: { ocr: "ok" | "unknown"; export: "ok" | "unknown" };
  };
}

export async function GET(): Promise<NextResponse> {
  const checks: HealthStatus["checks"] = {
    database: { status: "error" },
    redis: { status: "error" },
    memory: { status: "ok", usedMB: 0, limit: 512 },
    workers: { ocr: "unknown", export: "unknown" },
  };

  // Probe primary database connectivity
  const dbStart = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { status: "ok", latencyMs: Date.now() - dbStart };
  } catch {
    checks.database = {
      status: "error",
      latencyMs: Date.now() - dbStart,
    };
  }

  // Probe Redis (queue) dependency — never throws.
  const redisStart = Date.now();
  try {
    const ok = await isRedisHealthy(loadConfig());
    checks.redis = { status: ok ? "ok" : "error", latencyMs: Date.now() - redisStart };
  } catch {
    checks.redis = { status: "error", latencyMs: Date.now() - redisStart };
  }

  // Probe system memory limits
  const mem = process.memoryUsage();
  const usedMB = Math.round(mem.rss / 1024 / 1024);
  checks.memory = {
    status: usedMB > 480 ? "error" : usedMB > 400 ? "warning" : "ok",
    usedMB,
    limit: 512,
  };

  // Aggregate service statuses
  const allOk =
    checks.database.status === "ok" &&
    checks.redis.status === "ok" &&
    checks.memory.status === "ok";
  const anyError =
    checks.database.status === "error" ||
    checks.redis.status === "error" ||
    checks.memory.status === "error";

  const overall: HealthStatus["status"] = anyError ? "unhealthy" : allOk ? "healthy" : "degraded";

  const response: HealthStatus = {
    status: overall,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks,
  };

  return NextResponse.json(response, {
    status: anyError ? 503 : 200,
    headers: { "Cache-Control": "no-store" },
  });
}
