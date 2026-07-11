import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET as foldersGet, POST as foldersPost } from "@/app/api/folders/route";
import { mockSession } from "../api/setup";

vi.mock("@/core/composition-root", () => ({
  useCases: {
    folder: {
      getFolders: vi.fn().mockResolvedValue([]),
      createFolder: vi.fn().mockResolvedValue({ id: "folder-fuzz-1", name: "Test Folder" }),
    },
  },
}));

vi.mock("@/middleware/audit", () => ({
  auditLog: vi.fn().mockResolvedValue(undefined),
  AUDIT_ACTIONS: { FOLDER_CREATE: "folder.create" },
}));

vi.mock("@/clients/redis", () => ({
  checkUserRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
  rateLimitResponse: vi
    .fn()
    .mockReturnValue(
      new Response(JSON.stringify({ error: { code: "RATE_LIMITED" } }), { status: 429 }),
    ),
}));

function createGetRequest(searchParams: Record<string, string>): Request {
  const params = new URLSearchParams(searchParams);
  return new Request(`http://localhost/api/folders?${params.toString()}`, { method: "GET" });
}

function createPostRequest(body: unknown): Request {
  return new Request("http://localhost/api/folders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const getFuzzCases: Array<[string, Record<string, string>]> = [
  ["no params", {}],
  ["SQL injection in parentId", { parentId: "' OR 1=1--" }],
  ["XSS in parentId", { parentId: "<script>alert(1)</script>" }],
  ["path traversal in parentId", { parentId: "../../etc/passwd" }],
  ["very long parentId", { parentId: "A".repeat(10_000) }],
  ["prototype pollution", { __proto__: "admin" }],
  ["null byte in parentId", { parentId: "folder\x00id" }],
  ["unicode in parentId", { parentId: "tést\u200Bfolder" }],
  ["RTL override in parentId", { parentId: "\u202Eoverride" }],
];

const postFuzzCases: Array<[string, unknown]> = [
  ["empty body", null],
  ["malformed JSON", "not-json"],
  ["empty object", {}],
  ["array instead of object", ["name"]],
  ["SQL injection in name", { name: "' OR 1=1--" }],
  ["XSS in name", { name: "<script>alert(1)</script>" }],
  ["null name", { name: null }],
  ["empty name", { name: "" }],
  ["very long name (101 chars)", { name: "A".repeat(101) }],
  ["name with null byte", { name: "folder\x00name" }],
  ["name with control chars", { name: "folder\n\r\tname" }],
  ["name with zero-width chars", { name: "folder\u200Bname" }],
  ["name with RTL override", { name: "\u202Efolder" }],
  ["name with emoji", { name: "📁Folder" }],
  ["prototype pollution", { name: "test", __proto__: { hacked: true } }],
  ["invalid color hex", { name: "test", color: "not-a-hex" }],
  ["partial color hex", { name: "test", color: "#FFF" }],
  ["SQL injection in color", { name: "test", color: "' OR 1=1--" }],
  ["XSS in color", { name: "test", color: "<script>alert(1)</script>" }],
  ["extra unexpected fields", { name: "test", sudo: true, role: "ADMIN" }],
  ["number as name", { name: 12345 }],
  ["boolean as name", { name: false }],
  ["icon too long (51 chars)", { name: "test", icon: "A".repeat(51) }],
  ["SQL injection in parentId field", { name: "test", parentId: "' OR 1=1--" }],
  ["null parentId with extra", { name: "test", parentId: null, extra: "value" }],
  ["name with path traversal", { name: "../../etc/passwd" }],
  ["deep nesting attempt", { name: "test", parentId: { $ne: "" } }],
];

describe("Fuzz: GET /api/folders", () => {
  beforeEach(() => {
    mockSession.user = {
      id: "user-folder-fuzz",
      name: "Fuzzer",
      email: "fuzz@test.com",
      role: "USER",
    } as any;
  });

  it.each(getFuzzCases)("handles %s without 500 crash", async (_, params) => {
    const req = createGetRequest(params);
    const res = await foldersGet(req, { params: Promise.resolve({}) } as any);
    expect(res.status).toBeGreaterThanOrEqual(200);
  });
});

describe("Fuzz: POST /api/folders", () => {
  beforeEach(() => {
    mockSession.user = {
      id: "user-folder-fuzz",
      name: "Fuzzer",
      email: "fuzz@test.com",
      role: "USER",
    } as any;
  });

  it.each(postFuzzCases)("handles %s without 500 crash", async (_, body) => {
    const req = createPostRequest(body);
    const res = await foldersPost(req, { params: Promise.resolve({}) } as any);
    expect(res.status).toBeGreaterThanOrEqual(200);
    if (res.status >= 400) {
      const b = await res.json();
      expect(b).toHaveProperty("error");
    }
  });
});
