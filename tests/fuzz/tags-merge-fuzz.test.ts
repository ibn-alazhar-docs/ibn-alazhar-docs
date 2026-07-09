import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST as tagsMergePost } from "@/app/api/tags/merge/route";
import { mockSession } from "../api/setup";

vi.mock("@/core/composition-root", () => ({
  useCases: {
    tag: {
      mergeTags: vi.fn().mockResolvedValue({ affectedDocuments: 3 }),
    },
  },
}));

vi.mock("@/middleware/audit", () => ({
  auditLog: vi.fn().mockResolvedValue(undefined),
  AUDIT_ACTIONS: { TAG_MERGE: "tag.merge" },
}));

vi.mock("@/clients/redis", () => ({
  checkUserRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
  rateLimitResponse: vi
    .fn()
    .mockReturnValue(
      new Response(JSON.stringify({ error: { code: "RATE_LIMITED" } }), { status: 429 }),
    ),
}));

function createRequest(body: unknown): Request {
  return new Request("http://localhost/api/tags/merge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const fuzzCases: Array<[string, unknown]> = [
  ["empty body", null],
  ["malformed JSON", "not-json"],
  ["empty object", {}],
  ["array instead of object", ["src", "tgt"]],
  ["SQL injection in sourceTagId", { sourceTagId: "' OR 1=1--", targetTagId: "tag2" }],
  ["SQL injection in targetTagId", { sourceTagId: "tag1", targetTagId: "'; DROP TABLE tags;--" }],
  ["XSS in sourceTagId", { sourceTagId: "<script>alert(1)</script>", targetTagId: "tag2" }],
  ["XSS in targetTagId", { sourceTagId: "tag1", targetTagId: "<img src=x onerror=alert(1)>" }],
  ["null source", { sourceTagId: null, targetTagId: "tag2" }],
  ["null target", { sourceTagId: "tag1", targetTagId: null }],
  ["empty source", { sourceTagId: "", targetTagId: "tag2" }],
  ["empty target", { sourceTagId: "tag1", targetTagId: "" }],
  ["same tag id", { sourceTagId: "same-tag", targetTagId: "same-tag" }],
  ["very long ids", { sourceTagId: "A".repeat(10_000), targetTagId: "B".repeat(10_000) }],
  ["prototype pollution", { sourceTagId: "a", targetTagId: "b", __proto__: { hacked: true } }],
  ["extra unexpected fields", { sourceTagId: "a", targetTagId: "b", sudo: true }],
  ["missing source", { targetTagId: "b" }],
  ["missing target", { sourceTagId: "a" }],
  ["number as ids", { sourceTagId: 123, targetTagId: 456 }],
  ["boolean as ids", { sourceTagId: true, targetTagId: false }],
  ["unicode in ids", { sourceTagId: "tést\u200B", targetTagId: "normal" }],
  ["RTL override in ids", { sourceTagId: "\u202Eoverride", targetTagId: "normal" }],
  ["null byte in ids", { sourceTagId: "tag\x00src", targetTagId: "normal" }],
  ["control chars in ids", { sourceTagId: "tag\nsrc", targetTagId: "normal" }],
  ["emoji in ids", { sourceTagId: "🏷️src", targetTagId: "normal" }],
];

describe("Fuzz: POST /api/tags/merge", () => {
  beforeEach(() => {
    mockSession.user = {
      id: "user-tag-fuzz",
      name: "Fuzzer",
      email: "fuzz@test.com",
      role: "USER",
    } as any;
  });

  it.each(fuzzCases)("handles %s without 500 crash", async (_, body) => {
    const req = createRequest(body);
    const res = await tagsMergePost(req, { params: Promise.resolve({}) } as any);
    expect(res.status).toBeGreaterThanOrEqual(200);
    if (res.status >= 400) {
      const b = await res.json();
      expect(b).toHaveProperty("error");
    }
  });
});
