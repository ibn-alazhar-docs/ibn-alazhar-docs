import { describe, it, expect } from "vitest";
import { GET as getActuatorInfo } from "@/app/api/actuator/info/route";
import { GET as getActuatorMetrics } from "@/app/api/actuator/metrics/route";
import { GET as getActuatorPrometheus } from "@/app/api/actuator/prometheus/route";
import { GET as getActuatorHealth } from "@/app/api/actuator/health/route";
import { createApiRequest } from "./helpers";

describe("Actuator API", () => {
  const originalToken = process.env.ACTUATOR_BEARER_TOKEN;

  beforeAll(() => {
    process.env.ACTUATOR_BEARER_TOKEN = "test-token";
  });

  afterAll(() => {
    if (originalToken === undefined) {
      delete process.env.ACTUATOR_BEARER_TOKEN;
    } else {
      process.env.ACTUATOR_BEARER_TOKEN = originalToken;
    }
  });

  describe("GET /api/actuator/info", () => {
    it("returns app info with 200", async () => {
      const req = createApiRequest("/api/actuator/info");
      const res = await getActuatorInfo();
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.app).toBeDefined();
      expect(json.app.name).toBe("ibn-al-azhar-docs");
      expect(json.app.version).toBeDefined();
      expect(json.build).toBeDefined();
      expect(json.build.timestamp).toBeDefined();
    });

    it("sets no-store cache header", async () => {
      const res = await getActuatorInfo();
      expect(res.headers.get("Cache-Control")).toBe("no-store");
    });
  });

  describe("GET /api/actuator/metrics", () => {
    it("returns process metrics with 200", async () => {
      const token = process.env.ACTUATOR_BEARER_TOKEN || process.env.PROMETHEUS_BEARER_TOKEN;
      const req = createApiRequest("/api/actuator/metrics", { headers: { authorization: `Bearer ${token}` } });
      const res = await getActuatorMetrics(req as any);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.process).toBeDefined();
      expect(json.process.uptime).toBeGreaterThan(0);
      expect(json.process.memory).toBeDefined();
      expect(json.process.memory.rss).toBeGreaterThan(0);
      expect(json.process.memory.heapTotal).toBeGreaterThan(0);
      expect(json.process.memory.heapUsed).toBeGreaterThan(0);
      expect(json.process.cpu).toBeDefined();
      expect(json.timestamp).toBeDefined();
    });

    it("sets no-store cache header", async () => {
      const token = process.env.ACTUATOR_BEARER_TOKEN || process.env.PROMETHEUS_BEARER_TOKEN;
      const req = createApiRequest("/api/actuator/metrics", { headers: { authorization: `Bearer ${token}` } });
      const res = await getActuatorMetrics(req as any);
      expect(res.headers.get("Cache-Control")).toBe("no-store");
    });
  });

  describe("GET /api/actuator/prometheus", () => {
    it("returns Prometheus-format text", async () => {
      const token = process.env.ACTUATOR_BEARER_TOKEN || process.env.PROMETHEUS_BEARER_TOKEN;
      const req = createApiRequest("/api/actuator/prometheus", { headers: { authorization: `Bearer ${token}` } });
      const res = await getActuatorPrometheus(req as any);
      const text = await res.text();

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toContain("text/plain");
      expect(text).toContain("# HELP process_uptime_seconds");
      expect(text).toContain("# TYPE process_uptime_seconds gauge");
      expect(text).toContain("process_uptime_seconds");
      expect(text).toContain("process_memory_rss_bytes");
      expect(text).toContain("process_memory_heap_total_bytes");
      expect(text).toContain("process_memory_heap_used_bytes");
      expect(text).toContain("up 1");
    });
  });

  describe("GET /api/actuator/health", () => {
    it("returns health status with UP/DOWN", async () => {
      const res = await getActuatorHealth();
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.status).toBeDefined();
      expect(["UP", "DOWN"]).toContain(json.status);
      expect(json.components).toBeDefined();
      expect(json.components.db).toBeDefined();
      expect(json.components.db.status).toMatch(/^(UP|DOWN)$/);
      expect(json.timestamp).toBeDefined();
      expect(json.uptime).toBeGreaterThan(0);
    });

    it("sets no-store cache header", async () => {
      const res = await getActuatorHealth();
      expect(res.headers.get("Cache-Control")).toBe("no-store");
    });
  });
});
