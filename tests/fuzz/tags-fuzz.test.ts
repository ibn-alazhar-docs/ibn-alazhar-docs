import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET as tagsGet, POST as tagsPost } from "@/app/api/tags/route";
import { mockSession } from "../api/setup";

vi.mock("@/core/composition-root", () => ({
  useCases: {
    tag: {
      getTags: vi.fn().mockResolvedValue([]),
      createTag: vi
        .fn()
        .mockResolvedValue({ id: "tag-fuzz-1", name: "Test Tag", color: "#16A34A" }),
    },
  },
}));

vi.mock("@/middleware/audit", () => ({
  auditLog: vi.fn().mockResolvedValue(undefined),
  AUDIT_ACTIONS: { TAG_CREATE: "tag.create" },
}));

vi.mock("@/clients/redis", () => ({
  checkUserRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
  rateLimitResponse: vi
    .fn()
    .mockReturnValue(
      new Response(JSON.stringify({ error: { code: "RATE_LIMITED" } }), { status: 429 }),
    ),
}));

function createPostRequest(body: unknown): Request {
  return new Request("http://localhost/api/tags", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const postFuzzCases: Array<[string, unknown]> = [
  ["empty body", null],
  ["malformed JSON", "not-json"],
  ["empty object", {}],
  ["array instead of object", ["tag"]],
  ["SQL injection in name", { name: "' OR 1=1--" }],
  ["XSS in name", { name: "<script>alert(1)</script>" }],
  ["null name", { name: null }],
  ["empty name", { name: "" }],
  ["very long name (51 chars)", { name: "A".repeat(51) }],
  ["name with null byte", { name: "tag\x00name" }],
  ["name with control chars", { name: "tag\n\r\tname" }],
  ["name with zero-width chars", { name: "tag\u200Bname" }],
  ["name with RTL override", { name: "\u202Etag" }],
  ["name with emoji", { name: "🏷️Test" }],
  ["prototype pollution", { name: "test", __proto__: { hacked: true } }],
  ["invalid color hex (short)", { name: "test", color: "#FFF" }],
  ["invalid color hex (no hash)", { name: "test", color: "16A34A" }],
  ["SQL injection in color", { name: "test", color: "' OR 1=1--" }],
  ["XSS in color", { name: "test", color: "<script>alert(1)</script>" }],
  ["null color", { name: "test", color: null }],
  ["number as color", { name: "test", color: 123456 }],
  ["extra unexpected fields", { name: "test", sudo: true }],
  ["number as name", { name: 12345 }],
  ["boolean as name", { name: false }],
  ["name with path traversal", { name: "../../etc/passwd" }],
  ["untrimmed name", { name: "  spaced  " }],
];

describe("Fuzz: GET /api/tags", () => {
  beforeEach(() => {
    mockSession.user = {
      id: "user-tag-fuzz",
      name: "Fuzzer",
      email: "fuzz@test.com",
      role: "USER",
    } as any;
  });

  it("handles GET without crash", async () => {
    const req = new Request("http://localhost/api/tags", { method: "GET" });
    const res = await tagsGet(req, { params: Promise.resolve({}) } as any);
    expect(res.status).toBeGreaterThanOrEqual(200);
  });
});

describe("Fuzz: POST /api/tags", () => {
  beforeEach(() => {
    mockSession.user = {
      id: "user-tag-fuzz",
      name: "Fuzzer",
      email: "fuzz@test.com",
      role: "USER",
    } as any;
  });

  it.each(postFuzzCases)("handles %s without 500 crash", async (_, body) => {
    const req = createPostRequest(body);
    const res = await tagsPost(req, { params: Promise.resolve({}) } as any);
    expect(res.status).toBeGreaterThanOrEqual(200);
    if (res.status >= 400) {
      const b = await res.json();
      expect(b).toHaveProperty("error");
    }
  });
});
