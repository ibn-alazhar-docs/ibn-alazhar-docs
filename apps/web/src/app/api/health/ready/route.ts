import { NextResponse } from "next/server";
import { prisma } from "@/transport/db";
import { logger } from "@/shared/logger";
import net from "net";

async function checkPostgres(): Promise<{ status: string; latencyMs: number }> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: "healthy", latencyMs: Date.now() - start };
  } catch (err) {
    logger.warn({ err }, "Health check: Postgres unhealthy");
    return { status: "unhealthy", latencyMs: Date.now() - start };
  }
}

async function checkRedis(): Promise<{ status: string; latencyMs: number }> {
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

async function checkStorage(): Promise<{ status: string; latencyMs: number }> {
  const start = Date.now();
  try {
    // In local filesystem mode there is no S3/MinIO service to probe — verify
    // the configured local root is present and writable instead.
    if ((process.env.STORAGE_DRIVER || "s3") === "local") {
      const { access, writeFile, unlink, mkdir } = await import("node:fs/promises");
      const { dirname } = await import("node:path");
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

    const isMinio = parsedUrl.hostname.includes("minio");
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

export async function GET() {
  const [postgres, redis, storage] = await Promise.all([
    checkPostgres(),
    checkRedis(),
    checkStorage(),
  ]);

  const checks = { postgres, redis, storage };
  const allHealthy = Object.values(checks).every((c) => c.status === "healthy");
  const anyUnhealthy = Object.values(checks).some((c) => c.status === "unhealthy");

  const status = allHealthy ? "healthy" : anyUnhealthy ? "unhealthy" : "degraded";

  return NextResponse.json(
    {
      status,
      version: process.env.npm_package_version || "0.0.0",
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: allHealthy ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
