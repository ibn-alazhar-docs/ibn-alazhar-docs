import { describe, it, expect } from "vitest";
import { GET as getHealthLive } from "@/app/api/health/live/route";
import { GET as getHealthReady } from "@/app/api/health/ready/route";
import { createApiRequest } from "./helpers";

describe("Health Endpoints", () => {
  describe("GET /api/health/live", () => {
    it("returns healthy status with 200", async () => {
      const res = await getHealthLive();
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.status).toBe("healthy");
      expect(json.timestamp).toBeDefined();
      expect(json.uptime).toBeGreaterThan(0);
    });

    it("sets no-store cache header", async () => {
      const res = await getHealthLive();
      expect(res.headers.get("Cache-Control")).toBe("no-store");
    });
  });

  describe("GET /api/health/ready", () => {
    it("returns readiness status with checks", async () => {
      const res = await getHealthReady();
      const json = await res.json();

      expect(json.status).toBeDefined();
      expect(["healthy", "unhealthy", "degraded"]).toContain(json.status);
      expect(json.version).toBeDefined();
      expect(json.timestamp).toBeDefined();
      expect(json.checks).toBeDefined();
      expect(json.checks.postgres).toBeDefined();
      expect(json.checks.postgres.status).toBeDefined();
      expect(json.checks.postgres.latencyMs).toBeGreaterThanOrEqual(0);
      expect(json.checks.redis).toBeDefined();
      expect(json.checks.redis.status).toBeDefined();
      expect(json.checks.storage).toBeDefined();
      expect(json.checks.storage.status).toBeDefined();
    });

    it("returns 503 when any check is unhealthy", async () => {
      const res = await getHealthReady();
      const json = await res.json();

      if (json.status === "unhealthy") {
        expect(res.status).toBe(503);
      } else {
        expect(res.status).toBe(200);
      }
    });

    it("sets no-store cache header", async () => {
      const res = await getHealthReady();
      expect(res.headers.get("Cache-Control")).toBe("no-store");
    });
  });
});
