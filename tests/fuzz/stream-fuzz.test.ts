import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET as streamGet } from "@/app/api/stream/route";
import { mockSession } from "../api/setup";

vi.mock("@/core/composition-root", () => ({
  repos: {
    document: {
      findFirst: vi.fn().mockResolvedValue({ id: "stream-doc", userId: "user-stream-fuzz" }),
    },
  },
}));

vi.mock("@/core/services/stream.service", () => ({
  StreamService: {
    checkAndIncrementConnections: vi.fn().mockReturnValue({ allowed: true }),
    decrementConnections: vi.fn(),
    sendSSE: vi.fn(),
    closeSSE: vi.fn(),
    handleCompletion: vi.fn(),
    handlePollResult: vi.fn().mockReturnValue(0),
    getDocumentStatus: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock("@/clients/redis", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
  rateLimitResponse: vi
    .fn()
    .mockReturnValue(
      new Response(JSON.stringify({ error: { code: "RATE_LIMITED" } }), { status: 429 }),
    ),
}));

vi.mock("@ibn-al-azhar-docs/pipeline", () => ({
  loadConfig: vi.fn().mockReturnValue({}),
  getJobStatus: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/shared/constants", () => ({
  ERROR_CODES: {
    RATE_LIMITED: "RATE_LIMITED",
    BAD_REQUEST: "BAD_REQUEST",
    FORBIDDEN: "FORBIDDEN",
  },
  LIMITS: {
    MAX_SSE_CONNECTIONS_PER_USER: 3,
    MAX_SSE_POLL_COUNT: 300,
    SSE_TIMEOUT_MS: 600000,
  },
  UI_TIMING: {
    MAX_CONSECUTIVE_COMPLETE_CHECKS: 2,
  },
}));

function createRequest(params: Record<string, string>): Request {
  const sp = new URLSearchParams(params);
  return new Request(`http://localhost/api/stream?${sp.toString()}`, {
    method: "GET",
    headers: { Accept: "text/event-stream" },
  });
}

const fuzzCases: Array<[string, Record<string, string>]> = [
  ["no params", {}],
  ["empty jobId", { jobId: "" }],
  ["SQL injection in jobId", { jobId: "' OR 1=1--" }],
  ["XSS in jobId", { jobId: "<script>alert(1)</script>" }],
  ["null byte in jobId", { jobId: "test\x00job" }],
  ["control chars in jobId", { jobId: "test\njob" }],
  ["very long jobId", { jobId: "A".repeat(10_000) }],
  ["unicode in jobId", { jobId: "tést\u200Bjob" }],
  ["RTL override in jobId", { jobId: "\u202Ejob" }],
  ["zero-width chars in jobId", { jobId: "\u200B\u200C\u200D" }],
  ["emoji in jobId", { jobId: "📄🔑" }],
  ["path traversal in jobId", { jobId: "../../etc/passwd" }],
  ["prototype pollution", { jobId: "test", __proto__: "admin" }],
  ["extra params", { jobId: "test", extra: "value" }],
  ["array jobId", { "jobId[]": ["a", "b"] as unknown as string }],
];

describe("Fuzz: GET /api/stream", () => {
  beforeEach(() => {
    mockSession.user = {
      id: "user-stream-fuzz",
      name: "Fuzzer",
      email: "fuzz@test.com",
      role: "USER",
    } as any;
  });

  it.each(fuzzCases)("handles %s without 500 crash", async (_, params) => {
    const req = createRequest(params);
    const res = await streamGet(req, { params: Promise.resolve({}) } as any);
    expect(res.status).toBeGreaterThanOrEqual(200);
    if (res.status >= 400) {
      const b = await res.json();
      expect(b).toHaveProperty("error");
    }
  });
});
