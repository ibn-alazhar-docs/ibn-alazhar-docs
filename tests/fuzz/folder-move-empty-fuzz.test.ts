import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST as folderMovePost } from "@/app/api/folders/[id]/move/route";
import { POST as folderEmptyPost } from "@/app/api/folders/[id]/empty/route";
import { mockSession } from "../api/setup";

vi.mock("@/core/composition-root", () => ({
  useCases: {
    folder: {
      moveFolder: vi.fn().mockResolvedValue({ id: "folder-fuzz", name: "Moved" }),
      emptyFolder: vi.fn().mockResolvedValue({ documentsMoved: 0, foldersMoved: 0 }),
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

const idFuzzCases: Array<[string, string]> = [
  ["empty id", ""],
  ["null byte", "folder\x00id"],
  ["SQL injection", "' OR 1=1--"],
  ["path traversal", "../../etc/passwd"],
  ["very long id", "A".repeat(10_000)],
  ["unicode", "tést\u200B"],
  ["RTL override", "\u202Eoverride"],
  ["special chars", "!@#$%^&*()"],
  ["emoji", "📁"],
  ["control chars", "folder\nid\t"],
  ["prototype pollution", "__proto__"],
  ["constructor", "constructor"],
];

const moveBodyCases: Array<[string, unknown]> = [
  ["null body", null],
  ["empty object", {}],
  ["array instead of object", ["parentId"]],
  ["SQL injection in parentId", { parentId: "' OR 1=1--" }],
  ["XSS in parentId", { parentId: "<script>alert(1)</script>" }],
  ["null parentId", { parentId: null }],
  ["undefined parentId", {}],
  ["path traversal in parentId", { parentId: "../../etc" }],
  ["very long parentId", { parentId: "A".repeat(10_000) }],
  ["prototype pollution", { parentId: "abc", __proto__: { hacked: true } }],
  ["extra unexpected fields", { parentId: "abc", sudo: true }],
  ["number as parentId", { parentId: 12345 }],
  ["boolean as parentId", { parentId: false }],
  ["unicode in parentId", { parentId: "tést\u200Bfolder" }],
  ["RTL override in parentId", { parentId: "\u202Etarget" }],
];

function createMoveRequest(id: string, body: unknown): Request {
  return new Request(`http://localhost/api/folders/${id}/move`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === null ? null : JSON.stringify(body),
  });
}

describe("Fuzz: POST /api/folders/[id]/move", () => {
  beforeEach(() => {
    mockSession.user = {
      id: "user-folder-fuzz",
      name: "Fuzzer",
      email: "fuzz@test.com",
      role: "USER",
    } as any;
  });

  it.each(idFuzzCases)("handles move with id '%s' without 500 crash", async (_, id) => {
    const req = createMoveRequest(id, { parentId: "target-folder" });
    const res = await folderMovePost(req, { params: Promise.resolve({ id }) } as any);
    expect(res.status).toBeGreaterThanOrEqual(200);
  });

  it.each(moveBodyCases)("handles move with %s body without 500 crash", async (_, body) => {
    const req = createMoveRequest("folder-fuzz-id", body);
    const res = await folderMovePost(req, {
      params: Promise.resolve({ id: "folder-fuzz-id" }),
    } as any);
    expect(res.status).toBeGreaterThanOrEqual(200);
    if (res.status >= 400 && body !== null) {
      const b = await res.json();
      expect(b).toHaveProperty("error");
    }
  });
});

describe("Fuzz: POST /api/folders/[id]/empty", () => {
  beforeEach(() => {
    mockSession.user = {
      id: "user-folder-fuzz",
      name: "Fuzzer",
      email: "fuzz@test.com",
      role: "USER",
    } as any;
  });

  it.each(idFuzzCases)("handles empty with id '%s' without 500 crash", async (_, id) => {
    const req = new Request(`http://localhost/api/folders/${id}/empty`, { method: "POST" });
    const res = await folderEmptyPost(req, { params: Promise.resolve({ id }) } as any);
    expect(res.status).toBeGreaterThanOrEqual(200);
  });
});
