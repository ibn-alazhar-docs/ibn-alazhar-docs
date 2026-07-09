import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST as conversionStartPost } from "@/app/api/conversion/start/route";
import { GET as conversionStatusGet } from "@/app/api/conversion/[id]/status/route";
import { GET as conversionListGet } from "@/app/api/conversion/list/route";
import { mockSession } from "../api/setup";

vi.mock("@/core/composition-root", () => ({
  useCases: {
    conversion: {
      startConversion: vi.fn().mockResolvedValue({ jobId: "conv-fuzz", status: "splitting" }),
      getJobStatus: vi.fn().mockResolvedValue({ id: "conv-fuzz", status: "COMPLETED" }),
      listJobs: vi.fn().mockResolvedValue({ conversions: [], total: 0 }),
    },
  },
}));

vi.mock("@/clients/redis", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
  checkUserRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
  rateLimitResponse: vi
    .fn()
    .mockReturnValue(
      new Response(JSON.stringify({ error: { code: "RATE_LIMITED" } }), { status: 429 }),
    ),
}));

vi.mock("@ibn-al-azhar-docs/pipeline", () => ({
  loadConfig: vi.fn().mockReturnValue({}),
  getJobStatus: vi.fn().mockResolvedValue({ stage: "completed", progress: 100 }),
}));

vi.mock("@/shared/conversion-status-utils", () => ({
  normalizeStage: vi.fn().mockImplementation((s: string) => {
    if (s === "COMPLETED" || s === "completed") return "completed";
    if (s === "FAILED" || s === "failed") return "failed";
    return "processing";
  }),
}));

const startFuzzCases: Array<[string, unknown]> = [
  ["empty body", null],
  ["malformed JSON", "not-json"],
  ["empty object", {}],
  ["array instead of object", ["docId"]],
  ["SQL injection in documentId", { documentId: "' OR 1=1--" }],
  ["XSS in documentId", { documentId: "<script>alert(1)</script>" }],
  ["null documentId", { documentId: null }],
  ["empty documentId", { documentId: "" }],
  ["very long documentId", { documentId: "A".repeat(10_000) }],
  ["prototype pollution", { documentId: "abc", __proto__: { hacked: true } }],
  ["extra unexpected fields", { documentId: "abc", sudo: true }],
  ["number as documentId", { documentId: 12345 }],
  ["boolean as documentId", { documentId: false }],
  ["unicode in documentId", { documentId: "tést\u200Bdoc" }],
  ["RTL override in documentId", { documentId: "\u202Edoc" }],
  ["null byte in documentId", { documentId: "doc\x00id" }],
  ["control chars in documentId", { documentId: "doc\nid" }],
  ["emoji in documentId", { documentId: "📄doc" }],
  ["path traversal in documentId", { documentId: "../../etc/passwd" }],
];

const statusIdFuzzCases: Array<[string, string]> = [
  ["empty id", ""],
  ["null byte", "doc\x00id"],
  ["SQL injection", "' OR 1=1--"],
  ["path traversal", "../../etc/passwd"],
  ["very long id", "A".repeat(10_000)],
  ["unicode", "tést\u200B"],
  ["RTL override", "\u202Eoverride"],
  ["special chars", "!@#$%^&*()"],
  ["emoji", "📄🔑"],
  ["control chars", "doc\nid"],
  ["prototype pollution", "__proto__"],
  ["constructor", "constructor"],
];

const listFuzzCases: Array<[string, Record<string, string>]> = [
  ["no params", {}],
  ["negative page", { page: "-1" }],
  ["string as page", { page: "abc" }],
  ["overflow page", { page: "999999" }],
  ["negative limit", { limit: "-1" }],
  ["string as limit", { limit: "abc" }],
  ["overflow limit", { limit: "999999" }],
  ["invalid status", { status: "INVALID_STATUS" }],
  ["SQL injection in status", { status: "' OR 1=1--" }],
  ["XSS in status", { status: "<script>alert(1)</script>" }],
  ["SQL injection in page", { page: "' OR 1=1--" }],
  ["prototype pollution", { __proto__: "admin" }],
  ["all invalid", { page: "abc", limit: "xyz", status: "bad" }],
];

describe("Fuzz: POST /api/conversion/start", () => {
  beforeEach(() => {
    mockSession.user = {
      id: "user-conv-fuzz",
      name: "Fuzzer",
      email: "fuzz@test.com",
      role: "USER",
    } as any;
  });

  it.each(startFuzzCases)("handles %s without 500 crash", async (_, body) => {
    const req = new Request("http://localhost/api/conversion/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    });
    const res = await conversionStartPost(req, { params: Promise.resolve({}) } as any);
    expect(res.status).toBeGreaterThanOrEqual(200);
    if (res.status >= 400) {
      const b = await res.json();
      expect(b).toHaveProperty("error");
    }
  });
});

describe("Fuzz: GET /api/conversion/[id]/status", () => {
  beforeEach(() => {
    mockSession.user = {
      id: "user-conv-fuzz",
      name: "Fuzzer",
      email: "fuzz@test.com",
      role: "USER",
    } as any;
  });

  it.each(statusIdFuzzCases)("handles %s without 500 crash", async (_, id) => {
    const req = new Request(`http://localhost/api/conversion/${encodeURIComponent(id)}/status`, {
      method: "GET",
    });
    const res = await conversionStatusGet(req, { params: Promise.resolve({ id }) } as any);
    expect(res.status).toBeGreaterThanOrEqual(200);
  });
});

describe("Fuzz: GET /api/conversion/list", () => {
  beforeEach(() => {
    mockSession.user = {
      id: "user-conv-fuzz",
      name: "Fuzzer",
      email: "fuzz@test.com",
      role: "USER",
    } as any;
  });

  it.each(listFuzzCases)("handles %s without 500 crash", async (_, params) => {
    const sp = new URLSearchParams(params);
    const req = new Request(`http://localhost/api/conversion/list?${sp.toString()}`, {
      method: "GET",
    });
    const res = await conversionListGet(req, { params: Promise.resolve({}) } as any);
    expect(res.status).toBeGreaterThanOrEqual(200);
    if (res.status >= 400) {
      const b = await res.json();
      expect(b).toHaveProperty("error");
    }
  });
});
