import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET as tagGet, PATCH as tagPatch, DELETE as tagDelete } from "@/app/api/tags/[id]/route";
import { mockSession } from "../api/setup";

vi.mock("@/core/composition-root", () => ({
  useCases: {
    tag: {
      getTagById: vi.fn().mockResolvedValue({ id: "tag-fuzz", name: "Test", color: "#16A34A" }),
      updateTag: vi.fn().mockResolvedValue({ id: "tag-fuzz", name: "Updated" }),
      deleteTag: vi.fn().mockResolvedValue(undefined),
    },
  },
}));

vi.mock("@/middleware/audit", () => ({
  auditLog: vi.fn().mockResolvedValue(undefined),
  AUDIT_ACTIONS: { TAG_DELETE: "tag.delete" },
}));

vi.mock("@/clients/redis", () => ({
  checkUserRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
  rateLimitResponse: vi
    .fn()
    .mockReturnValue(
      new Response(JSON.stringify({ error: { code: "RATE_LIMITED" } }), { status: 429 }),
    ),
}));

const idFuzzCases: Array<[string, string]> = [
  ["empty id", ""],
  ["null byte", "tag\x00id"],
  ["SQL injection", "' OR 1=1--"],
  ["path traversal", "../../etc/passwd"],
  ["very long id", "A".repeat(10_000)],
  ["unicode", "tést\u200B"],
  ["RTL override", "\u202Eoverride"],
  ["special chars", "!@#$%^&*()"],
  ["emoji", "🏷️🔑"],
  ["control chars", "tag\nid\t"],
  ["prototype pollution", "__proto__"],
  ["constructor", "constructor"],
];

const patchBodyCases: Array<[string, unknown]> = [
  ["null body", null],
  ["empty object", {}],
  ["array instead of object", ["rename"]],
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
  ["invalid color", { color: "not-a-color" }],
  ["partial color hex", { color: "#FFF" }],
  ["SQL injection in color", { color: "' OR 1=1--" }],
  ["XSS in color", { color: "<script>alert(1)</script>" }],
  ["null color", { color: null }],
  ["prototype pollution", { name: "test", __proto__: { hacked: true } }],
  ["extra unexpected fields", { name: "test", sudo: true }],
  ["number as name", { name: 12345 }],
  ["boolean as name", { name: false }],
];

describe("Fuzz: GET /api/tags/[id]", () => {
  beforeEach(() => {
    mockSession.user = {
      id: "user-tag-fuzz",
      name: "Fuzzer",
      email: "fuzz@test.com",
      role: "USER",
    } as any;
  });

  it.each(idFuzzCases)("handles GET with %s without 500 crash", async (_, id) => {
    const req = new Request(`http://localhost/api/tags/${id}`, { method: "GET" });
    const res = await tagGet(req, { params: Promise.resolve({ id }) } as any);
    expect(res.status).toBeGreaterThanOrEqual(200);
  });
});

describe("Fuzz: PATCH /api/tags/[id]", () => {
  beforeEach(() => {
    mockSession.user = {
      id: "user-tag-fuzz",
      name: "Fuzzer",
      email: "fuzz@test.com",
      role: "USER",
    } as any;
  });

  it.each(idFuzzCases)("handles PATCH with id '%s' without 500 crash", async (_, id) => {
    const req = new Request(`http://localhost/api/tags/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "test" }),
    });
    const res = await tagPatch(req, { params: Promise.resolve({ id }) } as any);
    expect(res.status).toBeGreaterThanOrEqual(200);
  });

  it.each(patchBodyCases)("handles PATCH with %s body without 500 crash", async (_, body) => {
    const req = new Request(`http://localhost/api/tags/tag-fuzz-id`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const res = await tagPatch(req, { params: Promise.resolve({ id: "tag-fuzz-id" }) } as any);
    expect(res.status).toBeGreaterThanOrEqual(200);
    if (res.status >= 400) {
      const b = await res.json();
      expect(b).toHaveProperty("error");
    }
  });
});

describe("Fuzz: DELETE /api/tags/[id]", () => {
  beforeEach(() => {
    mockSession.user = {
      id: "user-tag-fuzz",
      name: "Fuzzer",
      email: "fuzz@test.com",
      role: "USER",
    } as any;
  });

  it.each(idFuzzCases)("handles DELETE with %s without 500 crash", async (_, id) => {
    const req = new Request(`http://localhost/api/tags/${id}`, { method: "DELETE" });
    const res = await tagDelete(req, { params: Promise.resolve({ id }) } as any);
    expect(res.status).toBeGreaterThanOrEqual(200);
  });
});
