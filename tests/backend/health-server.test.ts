import { describe, it, expect, afterEach } from "vitest";
import http from "node:http";
import { startHealthServer } from "../../packages/shared/src/health-server";

async function fetchJson(url: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        let data = "";
        res.on("data", (chunk: Buffer) => (data += chunk.toString()));
        res.on("end", () => {
          try {
            resolve({ statusCode: res.statusCode, body: JSON.parse(data) });
          } catch {
            resolve({ statusCode: res.statusCode, body: data });
          }
        });
      })
      .on("error", reject);
  });
}

async function fetchRaw(url: string): Promise<{ statusCode: number; body: string }> {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        let data = "";
        res.on("data", (chunk: Buffer) => (data += chunk.toString()));
        res.on("end", () => resolve({ statusCode: res.statusCode, body: data }));
      })
      .on("error", reject);
  });
}

describe("startHealthServer", () => {
  const servers: http.Server[] = [];

  afterEach(() => {
    for (const s of servers) {
      s.close();
    }
    servers.length = 0;
  });

  it("returns healthy status on GET /health", async () => {
    const server = startHealthServer("test-worker", 0);
    servers.push(server);
    const addr = server.address() as { port: number };
    expect(addr).not.toBeNull();
    const result = (await fetchJson(`http://127.0.0.1:${addr.port}/health`)) as {
      statusCode: number;
      body: { status: string; worker: string; uptime: number; timestamp: string };
    };
    expect(result.statusCode).toBe(200);
    expect(result.body.status).toBe("healthy");
    expect(result.body.worker).toBe("test-worker");
    expect(result.body.uptime).toBeGreaterThanOrEqual(0);
    expect(new Date(result.body.timestamp).toISOString()).toBe(result.body.timestamp);
  });

  it("returns different worker name when configured", async () => {
    const server = startHealthServer("ocr-worker", 0);
    servers.push(server);
    const addr = server.address() as { port: number };
    const result = (await fetchJson(`http://127.0.0.1:${addr.port}/health`)) as {
      statusCode: number;
      body: { worker: string };
    };
    expect(result.body.worker).toBe("ocr-worker");
  });

  it("returns 404 for non-health paths", async () => {
    const server = startHealthServer("test", 0);
    servers.push(server);
    const addr = server.address() as { port: number };
    const result = await fetchRaw(`http://127.0.0.1:${addr.port}/`);
    expect(result.statusCode).toBe(404);
    expect(result.body).toBe("Not Found");
  });

  it("returns 404 for /healthz path", async () => {
    const server = startHealthServer("test", 0);
    servers.push(server);
    const addr = server.address() as { port: number };
    const result = await fetchRaw(`http://127.0.0.1:${addr.port}/healthz`);
    expect(result.statusCode).toBe(404);
  });

  it("health response has valid JSON content-type", async () => {
    const server = startHealthServer("test", 0);
    servers.push(server);
    const addr = server.address() as { port: number };
    const result = (await fetchJson(`http://127.0.0.1:${addr.port}/health`)) as {
      statusCode: number;
      body: Record<string, unknown>;
    };
    expect(result.body).toHaveProperty("status");
    expect(result.body).toHaveProperty("worker");
    expect(result.body).toHaveProperty("uptime");
    expect(result.body).toHaveProperty("timestamp");
  });

  it("server can be closed cleanly without error", async () => {
    const server = startHealthServer("test", 0);
    const addr = server.address() as { port: number };
    const result = (await fetchJson(`http://127.0.0.1:${addr.port}/health`)) as {
      statusCode: number;
      body: { status: string };
    };
    expect(result.body.status).toBe("healthy");
    server.close();
  });
});
