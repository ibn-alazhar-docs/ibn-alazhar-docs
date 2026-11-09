import net from "net";
import { statfsSync } from "node:fs";
import { access, constants, mkdir, unlink, writeFile } from "node:fs/promises";

import { prisma } from "@/transport/db";
import { getRedisClient } from "@/clients/redis/rate-limit/redis";
import { logger } from "@/shared/logger";
import { loadConfig, isRedisHealthy } from "@ibn-al-azhar-docs/pipeline";
import type { DetailedHealthResponse, ServiceCheckResult } from "@ibn-al-azhar-docs/shared";

export interface HealthStatus {
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

export interface ReadyCheck {
  status: string;
  latencyMs: number;
}

export interface ReadyStatus {
  status: "healthy" | "degraded" | "unhealthy";
  version: string;
  timestamp: string;
  checks: { postgres: ReadyCheck; redis: ReadyCheck; storage: ReadyCheck };
}

export interface ActuatorHealth {
  status: "UP" | "DOWN";
  components: {
    db: { status: "UP" | "DOWN"; details: string };
    diskSpace: { status: "UP"; details?: { total: number; free: number; threshold: number } };
    memory: { status: "UP" | "DOWN"; details: { usedMB: number; totalMB: number; maxMB: number } };
  };
  timestamp: string;
  uptime: number;
}

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

async function checkDatabaseDetailed(): Promise<ServiceCheckResult> {
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

async function checkRedisDetailed(): Promise<ServiceCheckResult> {
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

async function checkStorageDetailed(): Promise<ServiceCheckResult> {
  const start = Date.now();
  try {
    // Mirror pipeline resolution: unset STORAGE_DRIVER means "local"
    // (packages/pipeline/src/config/storage.ts), and ensure the root
    // exists instead of failing health because /data was never made in CI.
    const driver = process.env.STORAGE_DRIVER === "s3" ? "s3" : "local";
    if (driver === "local") {
      const root = process.env.STORAGE_LOCAL_DIR || "/data";
      await mkdir(root, { recursive: true });
      await access(root, constants.W_OK);
      return { status: "healthy", responseTimeMs: Date.now() - start };
    }
    const endpoint = process.env.S3_ENDPOINT || "http://localhost:9000";
    const parsedUrl = new URL(endpoint);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return { status: "unhealthy", responseTimeMs: Date.now() - start };
    }
    const response = await fetch(endpoint, { method: "HEAD", signal: AbortSignal.timeout(2000) });
    return response.ok
      ? { status: "healthy", responseTimeMs: Date.now() - start }
      : { status: "unhealthy", responseTimeMs: Date.now() - start };
  } catch (error) {
    logger.warn(
      { error: error instanceof Error ? error.message : String(error) },
      "Health check: Storage unhealthy",
    );
    return { status: "unhealthy", responseTimeMs: Date.now() - start };
  }
}

async function checkPostgresReady(): Promise<ReadyCheck> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: "healthy", latencyMs: Date.now() - start };
  } catch (err) {
    logger.warn({ err }, "Health check: Postgres unhealthy");
    return { status: "unhealthy", latencyMs: Date.now() - start };
  }
}

async function checkRedisReady(): Promise<ReadyCheck> {
  if (process.env.QUEUE_DRIVER === "pg") {
    return { status: "healthy", latencyMs: 0 };
  }
  const start = Date.now();
  try {
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
    const url = new URL(redisUrl);
    const host = url.hostname;
    const port = parseInt(url.port || "6379", 10);

    await new Promise<void>((resolve, reject) => {
      const socket = new net.Socket();
      socket.setTimeout(2000);
      socket.once("connect", () => {
        socket.destroy();
        resolve();
      });
      socket.once("timeout", () => {
        socket.destroy();
        reject(new Error("timeout"));
      });
      socket.once("error", (err) => {
        socket.destroy();
        reject(err);
      });
      socket.connect(port, host);
    });

    return { status: "healthy", latencyMs: Date.now() - start };
  } catch (err) {
    logger.warn({ err }, "Health check: Redis unhealthy");
    return { status: "unhealthy", latencyMs: Date.now() - start };
  }
}

async function checkStorageReady(): Promise<ReadyCheck> {
  const start = Date.now();
  try {
    if ((process.env.STORAGE_DRIVER || "s3") === "local") {
      const root = process.env.STORAGE_LOCAL_DIR || "/data";
      try {
        await access(root);
      } catch {
        await mkdir(root, { recursive: true });
      }
      const probe = `${root}/.health-${process.pid}-${Date.now()}.tmp`;
      await writeFile(probe, "ok");
      await unlink(probe);
      return { status: "healthy", latencyMs: Date.now() - start };
    }

    const endpoint = process.env.S3_ENDPOINT || "http://localhost:9000";
    const parsedUrl = new URL(endpoint);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return { status: "unhealthy", latencyMs: Date.now() - start };
    }

    const isMinio =
      parsedUrl.hostname.includes("minio") ||
      parsedUrl.hostname === "localhost" ||
      parsedUrl.hostname === "127.0.0.1";
    const url = isMinio ? `${endpoint}/minio/health/live` : endpoint;

    const response = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(3000) });
    return {
      status: response.ok ? "healthy" : "unhealthy",
      latencyMs: Date.now() - start,
    };
  } catch (err) {
    logger.warn({ err }, "Health check: Storage unhealthy");
    return { status: "unhealthy", latencyMs: Date.now() - start };
  }
}

async function checkActuatorDb() {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: "UP" as const, details: `${Date.now() - start}ms` };
  } catch {
    return {
      status: "DOWN" as const,
      details: "database connection check failed",
    };
  }
}

function checkActuatorDiskSpace() {
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

function checkActuatorMemory() {
  const mem = process.memoryUsage();
  const usedMB = Math.round(mem.rss / 1024 / 1024);
  const totalMB = Math.round(mem.heapUsed / 1024 / 1024);
  const maxMB = Math.round(mem.heapTotal / 1024 / 1024);
  const memStatus: "UP" | "DOWN" = usedMB > 450 ? "DOWN" : "UP";
  return { status: memStatus, details: { usedMB, totalMB, maxMB } };
}

export class HealthUseCases {
  async getHealth(): Promise<{ response: HealthStatus; status: 200 | 503 }> {
    const checks: HealthStatus["checks"] = {
      database: { status: "error" },
      redis: { status: "error" },
      memory: { status: "ok", usedMB: 0, limit: 512 },
      workers: { ocr: "unknown", export: "unknown" },
    };

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

    const redisStart = Date.now();
    if (process.env.QUEUE_DRIVER === "pg") {
      checks.redis = { status: "ok", latencyMs: 0 };
    } else {
      try {
        const ok = await isRedisHealthy(loadConfig());
        checks.redis = { status: ok ? "ok" : "error", latencyMs: Date.now() - redisStart };
      } catch {
        checks.redis = { status: "error", latencyMs: Date.now() - redisStart };
      }
    }

    const mem = process.memoryUsage();
    const usedMB = Math.round(mem.rss / 1024 / 1024);
    checks.memory = {
      status: usedMB > 480 ? "error" : usedMB > 400 ? "warning" : "ok",
      usedMB,
      limit: 512,
    };

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

    return { response, status: anyError ? 503 : 200 };
  }

  async getReady(): Promise<{ response: ReadyStatus; status: 200 | 503 }> {
    const [postgres, redis, storage] = await Promise.all([
      checkPostgresReady(),
      checkRedisReady(),
      checkStorageReady(),
    ]);

    const checks = { postgres, redis, storage };
    const allHealthy = Object.values(checks).every((c) => c.status === "healthy");
    const anyUnhealthy = Object.values(checks).some((c) => c.status === "unhealthy");

    const status = allHealthy ? "healthy" : anyUnhealthy ? "unhealthy" : "degraded";

    const response: ReadyStatus = {
      status,
      version: process.env.npm_package_version || "0.0.0",
      timestamp: new Date().toISOString(),
      checks,
    };

    return { response, status: allHealthy ? 200 : 503 };
  }

  async getDetailed(): Promise<{ response: DetailedHealthResponse; status: 200 | 503 }> {
    const [database, redis, storage] = await Promise.all([
      checkDatabaseDetailed(),
      checkRedisDetailed(),
      checkStorageDetailed(),
    ]);

    const allHealthy =
      database.status === "healthy" && redis.status === "healthy" && storage.status === "healthy";

    const response: DetailedHealthResponse = {
      overall: allHealthy ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      services: { database, redis, storage },
    };

    return { response, status: allHealthy ? 200 : 503 };
  }

  async getActuatorHealth(): Promise<{ response: ActuatorHealth; status: 200 | 503 }> {
    const [db, diskSpace, memory] = await Promise.all([
      checkActuatorDb(),
      Promise.resolve(checkActuatorDiskSpace()),
      Promise.resolve(checkActuatorMemory()),
    ]);
    const allUp = db.status === "UP" && diskSpace.status === "UP" && memory.status === "UP";
    const response: ActuatorHealth = {
      status: allUp ? "UP" : "DOWN",
      components: { db, diskSpace, memory },
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
    return { response, status: allUp ? 200 : 503 };
  }
}

export const healthUseCases = new HealthUseCases();
