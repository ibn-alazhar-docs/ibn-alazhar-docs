import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET as searchGet } from "@/app/api/search/route";
import { GET as searchSuggestGet } from "@/app/api/search/suggest/route";
import { mockSession } from "../api/setup";

vi.mock("@/core/composition-root", () => ({
  useCases: {
    search: {
      search: vi.fn().mockResolvedValue({ documents: [], total: 0, suggestions: [] }),
      getSuggestions: vi.fn().mockResolvedValue([]),
    },
  },
}));

vi.mock("@/clients/redis", () => ({
  checkUserRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
  rateLimitResponse: vi
    .fn()
    .mockReturnValue(
      new Response(JSON.stringify({ error: { code: "RATE_LIMITED" } }), { status: 429 }),
    ),
}));

const searchFuzzCases: Array<[string, Record<string, string>]> = [
  ["no params", {}],
  ["empty query", { q: "" }],
  ["SQL injection in q", { q: "' OR 1=1--" }],
  ["XSS in q", { q: "<script>alert(1)</script>" }],
  ["very long q (201 chars)", { q: "A".repeat(201) }],
  ["null byte in q", { q: "test\x00query" }],
  ["control chars in q", { q: "test\n\r\tquery" }],
  ["unicode in q", { q: "tést\u200Bsearch" }],
  ["RTL override in q", { q: "\u202Eoverride" }],
  ["zero-width chars in q", { q: "\u200B\u200C\u200D" }],
  ["emoji in q", { q: "🔍Search📄" }],
  ["SQL injection in type", { q: "test", type: "' OR 1=1--" }],
  ["invalid type", { q: "test", type: "invalid_type" }],
  ["SQL injection in folderId", { q: "test", folderId: "' OR 1=1--" }],
  ["invalid folderId", { q: "test", folderId: "not-a-cuid" }],
  ["SQL injection in status", { q: "test", status: "' OR 1=1--" }],
  ["invalid status", { q: "test", status: "INVALID_STATUS" }],
  ["SQL injection in tagId", { q: "test", tagId: "' OR 1=1--" }],
  ["invalid tagId", { q: "test", tagId: "not-a-tag" }],
  ["negative page", { q: "test", page: "-1" }],
  ["string as page", { q: "test", page: "abc" }],
  ["negative limit", { q: "test", limit: "-1" }],
  ["overflow limit", { q: "test", limit: "999999" }],
  ["string as limit", { q: "test", limit: "abc" }],
  ["prototype pollution", { q: "test", __proto__: "admin" }],
  ["all invalid params", { q: "' OR '1'='1", type: "invalid", page: "abc", limit: "xyz" }],
  ["path traversal in q", { q: "../../etc/passwd" }],
  ["HTML injection in q", { q: "<b>bold</b>" }],
];

const suggestFuzzCases: Array<[string, Record<string, string>]> = [
  ["no params", {}],
  ["empty q", { q: "" }],
  ["SQL injection", { q: "' OR 1=1--" }],
  ["XSS", { q: "<script>alert(1)</script>" }],
  ["very long q (201 chars)", { q: "A".repeat(201) }],
  ["null byte", { q: "test\x00query" }],
  ["control chars", { q: "test\n\r\tquery" }],
  ["unicode", { q: "tést\u200B" }],
  ["RTL override", { q: "\u202Eoverride" }],
  ["zero-width chars", { q: "\u200B\u200C\u200D" }],
  ["emoji", { q: "🔍📄" }],
  ["prototype pollution", { q: "test", __proto__: "admin" }],
];

function createSearchRequest(params: Record<string, string>): Request {
  const sp = new URLSearchParams(params);
  return new Request(`http://localhost/api/search?${sp.toString()}`, { method: "GET" });
}

function createSuggestRequest(params: Record<string, string>): Request {
  const sp = new URLSearchParams(params);
  return new Request(`http://localhost/api/search/suggest?${sp.toString()}`, { method: "GET" });
}

describe("Fuzz: GET /api/search", () => {
  beforeEach(() => {
    mockSession.user = {
      id: "user-search-fuzz",
      name: "Fuzzer",
      email: "fuzz@test.com",
      role: "USER",
    } as any;
  });

  it.each(searchFuzzCases)("handles %s without 500 crash", async (_, params) => {
    const req = createSearchRequest(params);
    const res = await searchGet(req, { params: Promise.resolve({}) } as any);
    expect(res.status).toBeGreaterThanOrEqual(200);
    if (res.status >= 400) {
      const b = await res.json();
      expect(b).toHaveProperty("error");
    }
  });
});

describe("Fuzz: GET /api/search/suggest", () => {
  beforeEach(() => {
    mockSession.user = {
      id: "user-search-fuzz",
      name: "Fuzzer",
      email: "fuzz@test.com",
      role: "USER",
    } as any;
  });

  it.each(suggestFuzzCases)("handles %s without 500 crash", async (_, params) => {
    const req = createSuggestRequest(params);
    const res = await searchSuggestGet(req, { params: Promise.resolve({}) } as any);
    expect(res.status).toBeGreaterThanOrEqual(200);
  });
});
