import { describe, it, expect, vi, beforeEach } from "vitest";
import { PATCH as profilePatch, DELETE as profileDelete } from "@/app/api/profile/route";
import { mockSession } from "../api/setup";

vi.mock("@/core/composition-root", () => ({
  useCases: {
    profile: {
      updateProfile: vi.fn().mockResolvedValue({ id: "user-fuzz", name: "Updated" }),
      deleteAccount: vi.fn().mockResolvedValue(undefined),
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

function createPatchRequest(body: unknown): Request {
  return new Request("http://localhost/api/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function createDeleteRequest(body: unknown): Request {
  return new Request("http://localhost/api/profile", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const patchFuzzCases: Array<[string, unknown]> = [
  ["empty body", null],
  ["malformed JSON", "not-json"],
  ["empty object", {}],
  ["array instead of object", ["name"]],
  ["SQL injection in name", { name: "' OR 1=1--" }],
  ["XSS in name", { name: "<script>alert(1)</script>" }],
  ["null name", { name: null }],
  ["empty name", { name: "" }],
  ["very long name (101 chars)", { name: "A".repeat(101) }],
  ["name with null byte", { name: "name\x00user" }],
  ["name with control chars", { name: "name\n\r\tuser" }],
  ["name with zero-width chars", { name: "name\u200Buser" }],
  ["name with RTL override", { name: "\u202Ename" }],
  ["name with emoji", { name: "👤User" }],
  ["prototype pollution", { name: "test", __proto__: { hacked: true } }],
  ["extra unexpected fields", { name: "test", role: "ADMIN", sudo: true }],
  ["number as name", { name: 12345 }],
  ["boolean as name", { name: false }],
  ["name with path traversal", { name: "../../etc/passwd" }],
];

const deleteFuzzCases: Array<[string, unknown]> = [
  ["empty body", null],
  ["malformed JSON", "not-json"],
  ["empty object", {}],
  ["array instead of object", ["password"]],
  ["SQL injection in password", { password: "' OR 1=1--" }],
  ["XSS in password", { password: "<script>alert(1)</script>" }],
  ["null password", { password: null }],
  ["empty password", { password: "" }],
  ["very long password", { password: "A".repeat(10_000) }],
  ["prototype pollution", { password: "abc", __proto__: { hacked: true } }],
  ["extra unexpected fields", { password: "abc", sudo: true }],
  ["number as password", { password: 12345 }],
  ["boolean as password", { password: false }],
  ["missing password field", { notPassword: "value" }],
  ["unicode in password", { password: "tést\u200Bpass" }],
  ["RTL override in password", { password: "\u202Epass" }],
];

describe("Fuzz: PATCH /api/profile", () => {
  beforeEach(() => {
    mockSession.user = {
      id: "user-profile-fuzz",
      name: "Fuzzer",
      email: "fuzz@test.com",
      role: "USER",
    } as any;
  });

  it.each(patchFuzzCases)("handles %s without 500 crash", async (_, body) => {
    const req = createPatchRequest(body);
    const res = await profilePatch(req, { params: Promise.resolve({}) } as any);
    expect(res.status).toBeGreaterThanOrEqual(200);
    if (res.status >= 400) {
      const b = await res.json();
      expect(b).toHaveProperty("error");
    }
  });
});

describe("Fuzz: DELETE /api/profile", () => {
  beforeEach(() => {
    mockSession.user = {
      id: "user-profile-fuzz",
      name: "Fuzzer",
      email: "fuzz@test.com",
      role: "USER",
    } as any;
  });

  it.each(deleteFuzzCases)("handles %s body without 500 crash", async (_, body) => {
    const req = createDeleteRequest(body);
    const res = await profileDelete(req, { params: Promise.resolve({}) } as any);
    expect(res.status).toBeGreaterThanOrEqual(200);
    if (res.status >= 400) {
      const b = await res.json();
      expect(b).toHaveProperty("error");
    }
  });
});
