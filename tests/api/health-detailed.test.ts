import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { GET as getDetailedHealth } from "@/app/api/health/detailed/route";
import { createApiRequest } from "./helpers";

describe("GET /api/health/detailed", () => {
  const originalStorageDir = process.env.STORAGE_LOCAL_DIR;

  beforeAll(() => {
    // Point storage check at a writable temp dir so it reports healthy in CI.
    process.env.STORAGE_LOCAL_DIR = process.env.TMPDIR || "/tmp";
  });

  afterAll(() => {
    if (originalStorageDir === undefined) {
      delete process.env.STORAGE_LOCAL_DIR;
    } else {
      process.env.STORAGE_LOCAL_DIR = originalStorageDir;
    }
  });

  it("returns a well-formed response with per-service status", async () => {
    const req = createApiRequest("/api/health/detailed");
    const res = await getDetailedHealth(req as any);
    const json = await res.json();

    expect(json.overall).toMatch(/^(healthy|unhealthy)$/);
    expect(typeof json.timestamp).toBe("string");
    expect(json.services).toBeDefined();
    for (const name of ["database", "redis", "storage"] as const) {
      expect(json.services[name].status).toMatch(/^(healthy|unhealthy)$/);
      expect(typeof json.services[name].responseTimeMs).toBe("number");
    }
  });

  it("sets no-store cache header", async () => {
    const req = createApiRequest("/api/health/detailed");
    const res = await getDetailedHealth(req as any);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("returns HTTP 200 only when every service is healthy", async () => {
    const req = createApiRequest("/api/health/detailed");
    const res = await getDetailedHealth(req as any);
    const json = await res.json();

    const allHealthy =
      json.services.database.status === "healthy" &&
      json.services.redis.status === "healthy" &&
      json.services.storage.status === "healthy";

    expect(res.status).toBe(allHealthy ? 200 : 503);
    expect(json.overall).toBe(allHealthy ? "healthy" : "unhealthy");
  });
});
