import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { mockSession } from "./setup";
import { POST as startConversion } from "@/app/api/conversion/start/route";
import { GET as listConversions } from "@/app/api/conversion/list/route";
import { createTestUser, createTestDocument, cleanupTestUsers } from "../integration/helpers/db";

const { mockEnqueueSplitting } = vi.hoisted(() => ({
  mockEnqueueSplitting: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/backend/rate-limit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
  checkUserRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
  rateLimitResponse: vi
    .fn()
    .mockReturnValue(
      new Response(JSON.stringify({ error: { code: "RATE_LIMITED" } }), { status: 429 }),
    ),
  cleanupExpiredEntries: vi.fn(),
}));

vi.mock("@ibn-al-azhar-docs/pipeline", () => ({
  loadConfig: vi.fn().mockReturnValue({}),
  enqueueSplitting: mockEnqueueSplitting,
}));

describe("Conversion API", () => {
  let userA: any;
  let userB: any;
  let docA: any;

  beforeAll(async () => {
    userA = await createTestUser({ name: "User A", role: "STUDENT" });
    userB = await createTestUser({ name: "User B", role: "STUDENT" });

    docA = await createTestDocument(userA.id, {
      title: "Doc A",
      status: "UPLOADED",
    });
  });

  afterAll(async () => {
    await cleanupTestUsers([userA.id, userB.id]);
  });

  beforeEach(() => {
    mockSession.user = {
      id: userA.id,
      name: userA.name,
      email: userA.email,
      role: userA.role,
    } as any;
    vi.clearAllMocks();
  });

  describe("POST /api/conversion/start", () => {
    it("returns 401 if unauthorized", async () => {
      mockSession.user = null as any;
      const req = new Request("http://localhost/api/conversion/start", {
        method: "POST",
        body: JSON.stringify({ documentId: docA.id }),
      });
      const res = await startConversion(req);
      expect(res.status).toBe(401);
    });

    it("returns 400 for missing documentId", async () => {
      const req = new Request("http://localhost/api/conversion/start", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const res = await startConversion(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error.code).toBe("VALIDATION_ERROR");
    });

    it("returns 404 for document not owned by user", async () => {
      const req = new Request("http://localhost/api/conversion/start", {
        method: "POST",
        body: JSON.stringify({ documentId: docA.id }),
      });
      mockSession.user = {
        id: userB.id,
        name: userB.name,
        email: userB.email,
        role: userB.role,
      } as any;
      const res = await startConversion(req);
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error.code).toBe("NOT_FOUND");
    });

    it("returns 200 and starts conversion", async () => {
      const req = new Request("http://localhost/api/conversion/start", {
        method: "POST",
        body: JSON.stringify({ documentId: docA.id }),
      });
      const res = await startConversion(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.jobId).toBe(docA.id);
      expect(data.status).toBe("splitting");
      expect(mockEnqueueSplitting).toHaveBeenCalledOnce();
    });
  });

  describe("GET /api/conversion/list", () => {
    it("returns 401 if unauthorized", async () => {
      mockSession.user = null as any;
      const res = await listConversions();
      expect(res.status).toBe(401);
    });

    it("returns paginated conversion jobs", async () => {
      const req = new Request("http://localhost/api/conversion/list");
      const res = await listConversions(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.jobs).toBeDefined();
      expect(data.pagination).toBeDefined();
      expect(typeof data.pagination.page).toBe("number");
      expect(typeof data.pagination.total).toBe("number");
    });

    it("respects page and limit params", async () => {
      const req = new Request("http://localhost/api/conversion/list?page=1&limit=5");
      const res = await listConversions(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.pagination.page).toBe(1);
      expect(data.pagination.limit).toBe(5);
    });

    it("includes Cache-Control header", async () => {
      const req = new Request("http://localhost/api/conversion/list");
      const res = await listConversions(req);
      expect(res.headers.get("Cache-Control")).toBe("private, no-store");
    });
  });
});
