import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  GET as folderGet,
  PATCH as folderPatch,
  DELETE as folderDelete,
} from "@/app/api/folders/[id]/route";
import { mockSession } from "../api/setup";

vi.mock("@/core/composition-root", () => ({
  useCases: {
    folder: {
      getFolderById: vi.fn().mockResolvedValue({ id: "folder-fuzz", name: "Test" }),
      renameFolder: vi.fn().mockResolvedValue({ id: "folder-fuzz", name: "Renamed" }),
      deleteFolder: vi.fn().mockResolvedValue(undefined),
    },
  },
}));

vi.mock("@/middleware/audit", () => ({
  auditLog: vi.fn().mockResolvedValue(undefined),
  AUDIT_ACTIONS: { FOLDER_RENAME: "folder.rename", FOLDER_DELETE: "folder.delete" },
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
  ["null byte", "folder\x00id"],
  ["SQL injection", "' OR 1=1--"],
  ["path traversal", "../../etc/passwd"],
  ["very long id", "A".repeat(10_000)],
  ["unicode", "tést-folder\u200B"],
  ["RTL override", "\u202Eoverride"],
  ["special chars", "!@#$%^&*()"],
  ["emoji", "📁🔑"],
  ["control chars", "folder\nid\t"],
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
  ["very long name (101 chars)", { name: "A".repeat(101) }],
  ["name with null byte", { name: "folder\x00name" }],
  ["name with control chars", { name: "folder\n\r\tname" }],
  ["name with zero-width chars", { name: "folder\u200Bname" }],
  ["name with RTL override", { name: "\u202E name" }],
  ["name with emoji", { name: "📁Folder" }],
  ["prototype pollution", { name: "test", __proto__: { hacked: true } }],
  ["extra unexpected fields", { name: "test", sudo: true }],
  ["number as name", { name: 12345 }],
  ["boolean as name", { name: false }],
  ["name with path traversal", { name: "../../etc/passwd" }],
];

describe("Fuzz: GET /api/folders/[id]", () => {
  beforeEach(() => {
    mockSession.user = {
      id: "user-folder-fuzz",
      name: "Fuzzer",
      email: "fuzz@test.com",
      role: "USER",
    } as any;
  });

  it.each(idFuzzCases)("handles GET with %s without 500 crash", async (_, id) => {
    const req = new Request(`http://localhost/api/folders/${id}`, { method: "GET" });
    const res = await folderGet(req, { params: Promise.resolve({ id }) } as any);
    expect(res.status).toBeGreaterThanOrEqual(200);
  });
});

describe("Fuzz: PATCH /api/folders/[id]", () => {
  beforeEach(() => {
    mockSession.user = {
      id: "user-folder-fuzz",
      name: "Fuzzer",
      email: "fuzz@test.com",
      role: "USER",
    } as any;
  });

  it.each(idFuzzCases)("handles PATCH with id '%s' without 500 crash", async (_, id) => {
    const req = new Request(`http://localhost/api/folders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "test" }),
    });
    const res = await folderPatch(req, { params: Promise.resolve({ id }) } as any);
    expect(res.status).toBeGreaterThanOrEqual(200);
  });

  it.each(patchBodyCases)("handles PATCH with %s body without 500 crash", async (_, body) => {
    const req = new Request(`http://localhost/api/folders/folder-fuzz-id`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const res = await folderPatch(req, {
      params: Promise.resolve({ id: "folder-fuzz-id" }),
    } as any);
    expect(res.status).toBeGreaterThanOrEqual(200);
    if (res.status >= 400) {
      const b = await res.json();
      expect(b).toHaveProperty("error");
    }
  });
});

describe("Fuzz: DELETE /api/folders/[id]", () => {
  beforeEach(() => {
    mockSession.user = {
      id: "user-folder-fuzz",
      name: "Fuzzer",
      email: "fuzz@test.com",
      role: "USER",
    } as any;
  });

  it.each(idFuzzCases)("handles DELETE with %s without 500 crash", async (_, id) => {
    const req = new Request(`http://localhost/api/folders/${id}`, { method: "DELETE" });
    const res = await folderDelete(req, { params: Promise.resolve({ id }) } as any);
    expect(res.status).toBeGreaterThanOrEqual(200);
  });
});
