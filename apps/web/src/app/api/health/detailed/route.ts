import { NextResponse } from "next/server";
import { prisma } from "@/transport/db";
import { getRedisClient } from "@/clients/redis/rate-limit/redis";
import { logger } from "@/shared/logger";
import type { DetailedHealthResponse, ServiceCheckResult } from "@ibn-al-azhar-docs/shared";

const CHECK_TIMEOUT_MS = 2000;

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer!: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("timeout")), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Check database connectivity (Requirement 4.1).
 * Uses a lightweight SELECT 1 query with a 2s timeout (Requirement 8.2).
 */
async function checkDatabase(): Promise<ServiceCheckResult> {
  const start = Date.now();
  try {
    await withTimeout(prisma.$queryRaw`SELECT 1` as Promise<unknown>, CHECK_TIMEOUT_MS);
    return { status: "healthy", responseTimeMs: Date.now() - start };
  } catch (error) {
    logger.warn(
      { error: error instanceof Error ? error.message : String(error) },
      "Health check: Database unhealthy",
    );
    return { status: "unhealthy", responseTimeMs: Date.now() - start };
  }
}

/**
 * Check Redis connectivity (Requirement 4.2).
 * Uses a single PING command to minimize quota usage (Requirement 15.2, 15.4).
 */
async function checkRedis(): Promise<ServiceCheckResult> {
  // When the Postgres queue driver is active, Redis/BullMQ is not used, so a
  // missing Redis is expected and must not fail the readiness probe.
  if (process.env.QUEUE_DRIVER === "pg") {
    return { status: "healthy", responseTimeMs: 0 };
  }
  const start = Date.now();
  try {
    const client = await getRedisClient();
    if (!client) {
      return { status: "unhealthy", responseTimeMs: Date.now() - start };
    }
    await withTimeout(client.ping(), CHECK_TIMEOUT_MS);
    return { status: "healthy", responseTimeMs: Date.now() - start };
  } catch (error) {
    logger.warn(
      { error: error instanceof Error ? error.message : String(error) },
      "Health check: Redis unhealthy",
    );
    return { status: "unhealthy", responseTimeMs: Date.now() - start };
  }
}

/**
 * Check storage availability (Requirement 4.3).
 * Uses fs.access (read-only, no side effects per Requirement 8.3).
 */
async function checkStorage(): Promise<ServiceCheckResult> {
  const start = Date.now();
  try {
    const storagePath = process.env.STORAGE_LOCAL_DIR || "/data";
    const { access, constants } = await import("node:fs/promises");
    await withTimeout(access(storagePath, constants.W_OK), CHECK_TIMEOUT_MS);
    return { status: "healthy", responseTimeMs: Date.now() - start };
  } catch (error) {
    logger.warn(
      { error: error instanceof Error ? error.message : String(error) },
      "Health check: Storage unhealthy",
    );
    return { status: "unhealthy", responseTimeMs: Date.now() - start };
  }
}

/**
 * Enhanced health check endpoint (Requirements 4.1-4.6, 8.1-8.3).
 * Returns per-service status with response times. HTTP 200 only when every
 * service is healthy, otherwise HTTP 503 with the failing services listed.
 */
export async function GET() {
  const start = Date.now();
  try {
    const [database, redis, storage] = await Promise.all([
      checkDatabase(),
      checkRedis(),
      checkStorage(),
    ]);

    const allHealthy =
      database.status === "healthy" && redis.status === "healthy" && storage.status === "healthy";

    const response: DetailedHealthResponse = {
      overall: allHealthy ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      services: { database, redis, storage },
    };

    return NextResponse.json(response, {
      status: allHealthy ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    logger.error(
      { error, duration: Date.now() - start },
      "Detailed health check failed unexpectedly",
    );
    return NextResponse.json(
      {
        overall: "unhealthy",
        timestamp: new Date().toISOString(),
        error: "Health check failed",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
