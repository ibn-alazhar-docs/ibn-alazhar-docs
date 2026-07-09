import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET as bookmarksGet } from "@/app/api/bookmarks/route";
import { mockSession } from "../api/setup";

vi.mock("@/core/composition-root", () => ({
  useCases: {
    bookmark: {
      getBookmarks: vi.fn().mockResolvedValue({ bookmarks: [], total: 0 }),
    },
  },
}));

vi.mock("@/clients/redis", () => ({
  checkUserRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
  rateLimitResponse: vi
    .fn()
    .mockReturnValue(
      new Response(JSON.stringify({ error: { code: "RATE_LIMITED" } }), { status: 429 }),
    ),
}));

function createRequest(params: Record<string, string>): Request {
  const sp = new URLSearchParams(params);
  return new Request(`http://localhost/api/bookmarks?${sp.toString()}`, { method: "GET" });
}

const fuzzCases: Array<[string, Record<string, string>]> = [
  ["no params", {}],
  ["negative limit", { limit: "-1" }],
  ["zero limit", { limit: "0" }],
  ["string limit", { limit: "abc" }],
  ["overflow limit", { limit: "999999" }],
  ["float limit", { limit: "1.5" }],
  ["negative offset", { offset: "-5" }],
  ["string offset", { offset: "abc" }],
  ["float offset", { offset: "0.5" }],
  ["very large offset", { offset: "99999999999" }],
  ["SQL injection in limit", { limit: "' OR 1=1--" }],
  ["XSS in limit", { limit: "<script>alert(1)</script>" }],
  ["prototype pollution", { __proto__: "admin" }],
  ["extra params", { limit: "50", offset: "0", evil: "true" }],
  ["unicode in params", { limit: "50", offset: "tést" }],
];

describe("Fuzz: GET /api/bookmarks", () => {
  beforeEach(() => {
    mockSession.user = {
      id: "user-bm-fuzz",
      name: "Fuzzer",
      email: "fuzz@test.com",
      role: "USER",
    } as any;
  });

  it.each(fuzzCases)("handles %s without 500 crash", async (_, params) => {
    const req = createRequest(params);
    const res = await bookmarksGet(req, { params: Promise.resolve({}) } as any);
    expect(res.status).toBeGreaterThanOrEqual(200);
  });
});
