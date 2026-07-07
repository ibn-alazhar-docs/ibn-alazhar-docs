import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { GET as streamGet } from "@/app/api/stream/route";
import { mockSession } from "./setup";
import { createApiRequest } from "./helpers";
import { StreamService } from "@/lib/backend/services/stream.service";

vi.mock("@/lib/backend/rate-limit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
  checkUserRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
  rateLimitResponse: vi.fn().mockReturnValue(
    new Response(JSON.stringify({ error: { code: "RATE_LIMITED" } }), { status: 429 }),
  ),
}));

vi.mock("@/core/composition-root", () => ({
  repos: {
    document: {
      findFirst: vi.fn(),
    },
  },
  useCases: {
    uploadDocument: { execute: vi.fn() },
  },
}));

import { repos } from "@/core/composition-root";

const JOB_ID = "job-123";
const OWNER_ID = "userA-id";

describe("Stream API (/api/stream)", () => {
  let checkConnSpy: any;

  beforeEach(() => {
    mockSession.user = {
      id: OWNER_ID,
      name: "User A",
      email: "usera@example.com",
      role: "USER",
    } as any;

    (repos.document.findFirst as any).mockReset();
    (repos.document.findFirst as any).mockResolvedValue({ id: JOB_ID });

    checkConnSpy = vi
      .spyOn(StreamService, "checkAndIncrementConnections")
      .mockReturnValue({ allowed: true, count: 1 });
    vi.spyOn(StreamService, "decrementConnections").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return 401 when unauthenticated", async () => {
    mockSession.user = null as any;

    const req = createApiRequest("/api/stream?jobId=" + JOB_ID, { method: "GET" });
    const res = await streamGet(req, { params: Promise.resolve({}) } as any);

    expect(res.status).toBe(401);
  });

  it("should return 400 when jobId is missing (malformed input)", async () => {
    const req = createApiRequest("/api/stream", { method: "GET" });
    const res = await streamGet(req, { params: Promise.resolve({}) } as any);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error.code).toBe("BAD_REQUEST");
  });

  it("should return 403 when the document does not exist (invalid doc id)", async () => {
    (repos.document.findFirst as any).mockResolvedValue(null);

    const req = createApiRequest("/api/stream?jobId=" + JOB_ID, { method: "GET" });
    const res = await streamGet(req, { params: Promise.resolve({}) } as any);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error.code).toBe("FORBIDDEN");
  });

  it("should return 403 when user tries to stream a document they do not own", async () => {
    mockSession.user = {
      id: OWNER_ID,
      name: "User A",
      email: "usera@example.com",
      role: "USER",
    } as any;

    // The route filters by session.user.id; a doc owned by another user is not found.
    (repos.document.findFirst as any).mockImplementation(async (where: any) => {
      if (where?.userId === OWNER_ID) return null;
      return { id: JOB_ID };
    });

    const req = createApiRequest("/api/stream?jobId=" + JOB_ID, { method: "GET" });
    const res = await streamGet(req, { params: Promise.resolve({}) } as any);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error.code).toBe("FORBIDDEN");
  });

  it("should return 429 when the per-user SSE connection limit is exceeded", async () => {
    checkConnSpy.mockReturnValue({ allowed: false, count: 5 });

    const req = createApiRequest("/api/stream?jobId=" + JOB_ID, { method: "GET" });
    const res = await streamGet(req, { params: Promise.resolve({}) } as any);
    const data = await res.json();

    expect(res.status).toBe(429);
    expect(data.error.code).toBe("RATE_LIMITED");
  });

  it("should return 200 with an SSE stream for a valid owned document", async () => {
    const abortController = new AbortController();
    const req = new Request("http://localhost/api/stream?jobId=" + JOB_ID, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      signal: abortController.signal,
    });

    const res = await streamGet(req, { params: Promise.resolve({}) } as any);

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");

    const reader = (res.body as ReadableStream<Uint8Array>).getReader();
    const { value } = await reader.read();
    const text = new TextDecoder().decode(value);

    expect(text).toContain("connected");
    expect(text).toContain(JOB_ID);

    abortController.abort();
  });
});
