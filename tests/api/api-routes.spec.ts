import { test, expect } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

// Public endpoints (no auth required)
const PUBLIC_GET_ENDPOINTS = [
  { path: "/api/health", name: "Health check" },
  { path: "/api/health/live", name: "Liveness probe" },
  { path: "/api/health/ready", name: "Readiness probe" },
  { path: "/api/actuator/health", name: "Actuator health" },
  { path: "/api/actuator/info", name: "Actuator info" },
  { path: "/api/actuator/metrics", name: "Actuator metrics" },
  { path: "/api/actuator/prometheus", name: "Actuator Prometheus" },
  { path: "/api/metrics", name: "Metrics" },
  { path: "/api/metrics/prometheus", name: "Prometheus metrics" },
  { path: "/api/docs/openapi", name: "OpenAPI spec" },
];

// Protected endpoints (require auth — will return 401/302)
const PROTECTED_GET_ENDPOINTS = [
  { path: "/api/documents", name: "List documents" },
  { path: "/api/folders", name: "List folders" },
  { path: "/api/tags", name: "List tags" },
  { path: "/api/search?q=test", name: "Search" },
  { path: "/api/search/suggest?q=test", name: "Search suggestions" },
  { path: "/api/profile", name: "User profile" },
  { path: "/api/users", name: "List users" },
  { path: "/api/bookmarks", name: "List bookmarks" },
  { path: "/api/analytics", name: "Analytics" },
  { path: "/api/webhooks", name: "List webhooks" },
  { path: "/api/webhooks/stats", name: "Webhook stats" },
  { path: "/api/conversion/list", name: "List conversions" },
  { path: "/api/stream", name: "Stream" },
];

// POST endpoints that need auth
const PROTECTED_POST_ENDPOINTS = [
  { path: "/api/upload", name: "Upload" },
  { path: "/api/documents/bulk-delete", name: "Bulk delete" },
  { path: "/api/documents/bulk-export", name: "Bulk export" },
  { path: "/api/documents/bulk-move", name: "Bulk move" },
  { path: "/api/documents/bulk-tag", name: "Bulk tag" },
  { path: "/api/documents/bulk-untag", name: "Bulk untag" },
  { path: "/api/tags/merge", name: "Merge tags" },
  { path: "/api/export", name: "Export" },
  { path: "/api/export/batch", name: "Batch export" },
  { path: "/api/export/folder", name: "Export folder" },
  { path: "/api/export/tag", name: "Export tag" },
  { path: "/api/conversion/start", name: "Start conversion" },
  { path: "/api/auth/register", name: "Register" },
];

// Dynamic endpoints (need specific IDs)
const DYNAMIC_ENDPOINTS = [
  { path: "/api/documents/nonexistent", name: "Get document by ID" },
  { path: "/api/folders/nonexistent", name: "Get folder by ID" },
  { path: "/api/tags/nonexistent", name: "Get tag by ID" },
  { path: "/api/conversion/nonexistent/status", name: "Conversion status" },
  { path: "/api/share/nonexistent", name: "Share link" },
];

test.describe("API Routes — Public Endpoints", () => {
  for (const endpoint of PUBLIC_GET_ENDPOINTS) {
    test(`${endpoint.name} (${endpoint.path}) should respond`, async ({ request }) => {
      const response = await request.get(`${BASE_URL}${endpoint.path}`);
      // Should not be 500 (server error)
      expect(response.status()).not.toBe(500);
      // Should return JSON or text
      const contentType = response.headers()["content-type"] || "";
      expect(
        contentType.includes("json") || contentType.includes("text") || contentType.includes("plain"),
      ).toBeTruthy();
    });
  }
});

test.describe("API Routes — Protected Endpoints (no auth)", () => {
  for (const endpoint of PROTECTED_GET_ENDPOINTS) {
    test(`${endpoint.name} (${endpoint.path}) should reject unauthenticated`, async ({ request }) => {
      const response = await request.get(`${BASE_URL}${endpoint.path}`);
      // Should return 401 or redirect (302/307)
      expect([401, 302, 307, 403]).toContain(response.status());
    });
  }
});

test.describe("API Routes — Protected POST Endpoints (no auth)", () => {
  for (const endpoint of PROTECTED_POST_ENDPOINTS) {
    test(`${endpoint.name} (${endpoint.path}) should reject unauthenticated POST`, async ({
      request,
    }) => {
      const response = await request.post(`${BASE_URL}${endpoint.path}`, {
        data: {},
      });
      // Should return 401, 302, 307, or 403
      expect([401, 302, 307, 403, 405, 415]).toContain(response.status());
    });
  }
});

test.describe("API Routes — Dynamic Endpoints (nonexistent IDs)", () => {
  for (const endpoint of DYNAMIC_ENDPOINTS) {
    test(`${endpoint.name} (${endpoint.path}) should handle invalid ID`, async ({ request }) => {
      const response = await request.get(`${BASE_URL}${endpoint.path}`);
      // Should return 401, 404, or similar (not 500)
      expect(response.status()).not.toBe(500);
    });
  }
});

test.describe("API Routes — Actuator Endpoints", () => {
  test("actuator/health returns proper format", async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/actuator/health`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty("status");
    expect(body).toHaveProperty("components");
    expect(body).toHaveProperty("timestamp");
    expect(body).toHaveProperty("uptime");
    expect(["UP", "DOWN"]).toContain(body.status);
    expect(body.components).toHaveProperty("db");
    expect(body.components).toHaveProperty("memory");
  });

  test("actuator/info returns app info", async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/actuator/info`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty("app");
    expect(body.app).toHaveProperty("name");
    expect(body.app.name).toBe("ibn-al-azhar-docs");
  });

  test("actuator/metrics returns process metrics", async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/actuator/metrics`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty("process");
    expect(body.process).toHaveProperty("uptime");
    expect(body.process).toHaveProperty("memory");
  });

  test("actuator/prometheus returns prometheus format", async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/actuator/prometheus`);
    expect(response.status()).toBe(200);
    const text = await response.text();
    expect(text).toContain("# HELP");
    expect(text).toContain("# TYPE");
  });

  test("actuator/unknown endpoint returns 404", async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/actuator/nonexistent`);
    expect(response.status()).toBe(404);
  });
});

test.describe("API Routes — Health Check Response Structure", () => {
  test("/api/health returns healthy status", async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/health`);
    const body = await response.json();
    expect(body).toHaveProperty("status");
    expect(["healthy", "degraded", "unhealthy"]).toContain(body.status);
    expect(body).toHaveProperty("checks");
    expect(body.checks).toHaveProperty("database");
    expect(body.checks).toHaveProperty("memory");
  });

  test("/api/health/live returns uptime", async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/health/live`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty("uptime");
    expect(body.uptime).toBeGreaterThan(0);
  });

  test("/api/health/ready checks all services", async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/health/ready`);
    const body = await response.json();
    expect(body).toHaveProperty("status");
    expect(body).toHaveProperty("checks");
    expect(body.checks).toHaveProperty("postgres");
    expect(body.checks).toHaveProperty("redis");
    expect(body.checks).toHaveProperty("storage");
  });
});

test.describe("API Routes — Error Handling", () => {
  test("non-existent route returns 404", async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/nonexistent`);
    expect(response.status()).toBe(404);
  });

  test("POST to GET-only route returns 405", async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/health`);
    expect([405, 404]).toContain(response.status());
  });
});

test.describe("API Routes — CSRF Protection", () => {
  test("POST without origin header is allowed for unauthenticated", async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/auth/register`, {
      data: { email: "test@test.com", password: "test123", name: "Test" },
      headers: { "Content-Type": "application/json" },
    });
    // Should not be CSRF error (403 with CSRF message)
    expect(response.status()).not.toBe(403);
  });
});

test.describe("API Routes — Response Headers", () => {
  test("API routes include security headers", async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/health`);
    const headers = response.headers();
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  });

  test("API routes have cache-control", async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/health`);
    const headers = response.headers();
    expect(headers["cache-control"]).toBeDefined();
  });
});
