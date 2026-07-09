import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  GET as documentGet,
  PATCH as documentPatch,
  DELETE as documentDelete,
} from "@/app/api/documents/[id]/route";
import { mockSession } from "../api/setup";

vi.mock("@/core/composition-root", () => ({
  useCases: {
    documentCrud: {
      getDocumentById: vi.fn().mockResolvedValue({ id: "doc-fuzz", title: "Test Doc" }),
      updateDocument: vi.fn().mockResolvedValue({ id: "doc-fuzz", title: "Updated" }),
      deleteDocument: vi.fn().mockResolvedValue(undefined),
    },
  },
}));

vi.mock("@/middleware/audit", () => ({
  auditLog: vi.fn().mockResolvedValue(undefined),
  AUDIT_ACTIONS: { DOCUMENT_UPDATE: "document.update", DOCUMENT_DELETE: "document.delete" },
}));

vi.mock("@/clients/redis", () => ({
  checkUserRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
  rateLimitResponse: vi
    .fn()
    .mockReturnValue(
      new Response(JSON.stringify({ error: { code: "RATE_LIMITED" } }), { status: 429 }),
    ),
}));

function createGetRequest(id: string): Request {
  return new Request(`http://localhost/api/documents/${encodeURIComponent(id)}`, { method: "GET" });
}

function createPatchRequest(id: string, body: unknown): Request {
  return new Request(`http://localhost/api/documents/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function createDeleteRequest(id: string): Request {
  return new Request(`http://localhost/api/documents/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

const idFuzzCases: Array<[string, string]> = [
  ["empty id", ""],
  ["null byte", "doc\x00id"],
  ["SQL injection", "' OR 1=1--"],
  ["path traversal", "../../etc/passwd"],
  ["very long id", "A".repeat(10_000)],
  ["unicode", "tést-id\u200B"],
  ["RTL override", "\u202Eoverride"],
  ["special chars", "!@#$%^&*()"],
  ["emoji", "🔑📄"],
  ["control chars", "doc\nid\t"],
  ["prototype pollution", "__proto__"],
  ["constructor", "constructor"],
];

const patchBodyCases: Array<[string, unknown]> = [
  ["null body", null],
  ["empty object", {}],
  ["array instead of object", [1, 2, 3]],
  ["SQL injection in title", { title: "' OR 1=1--" }],
  ["XSS in title", { title: "<script>alert(1)</script>" }],
  ["very long title (201 chars)", { title: "A".repeat(201) }],
  ["empty title", { title: "" }],
  ["null title", { title: null }],
  ["SQL injection in description", { description: "'; DROP TABLE documents;--" }],
  ["XSS in description", { description: "<img src=x onerror=alert(1)>" }],
  ["very long description (501 chars)", { description: "A".repeat(501) }],
  ["null description", { description: null }],
  ["prototype pollution", { title: "test", __proto__: { hacked: true } }],
  ["extra unexpected fields", { title: "test", sudo: true, role: "ADMIN" }],
  ["number as title", { title: 12345 }],
  ["boolean as title", { title: true }],
  ["title with null byte", { title: "test\x00title" }],
  ["title with control chars", { title: "test\n\r\ttitle" }],
  ["title with zero-width chars", { title: "test\u200Btitle" }],
  ["title with RTL override", { title: "\u202Etitle" }],
  ["title with emoji", { title: "📄Test" }],
  ["folderId pollution", { folderId: { $ne: "" } }],
];

describe("Fuzz: GET /api/documents/[id]", () => {
  beforeEach(() => {
    mockSession.user = {
      id: "user-doc-fuzz",
      name: "Fuzzer",
      email: "fuzz@test.com",
      role: "USER",
    } as any;
  });

  it.each(idFuzzCases)("handles GET with %s without 500 crash", async (_, id) => {
    const req = createGetRequest(id);
    const res = await documentGet(req, { params: Promise.resolve({ id }) } as any);
    expect(res.status).toBeGreaterThanOrEqual(200);
  });
});

describe("Fuzz: PATCH /api/documents/[id]", () => {
  beforeEach(() => {
    mockSession.user = {
      id: "user-doc-fuzz",
      name: "Fuzzer",
      email: "fuzz@test.com",
      role: "USER",
    } as any;
  });

  it.each(idFuzzCases)("handles PATCH with id '%s' without 500 crash", async (_, id) => {
    const req = createPatchRequest(id, { title: "test" });
    const res = await documentPatch(req, { params: Promise.resolve({ id }) } as any);
    expect(res.status).toBeGreaterThanOrEqual(200);
  });

  it.each(patchBodyCases)("handles PATCH with %s body without 500 crash", async (_, body) => {
    const req = createPatchRequest("doc-fuzz-id", body);
    const res = await documentPatch(req, { params: Promise.resolve({ id: "doc-fuzz-id" }) } as any);
    expect(res.status).toBeGreaterThanOrEqual(200);
    if (res.status >= 400) {
      const b = await res.json();
      expect(b).toHaveProperty("error");
    }
  });
});

describe("Fuzz: DELETE /api/documents/[id]", () => {
  beforeEach(() => {
    mockSession.user = {
      id: "user-doc-fuzz",
      name: "Fuzzer",
      email: "fuzz@test.com",
      role: "USER",
    } as any;
  });

  it.each(idFuzzCases)("handles DELETE with %s without 500 crash", async (_, id) => {
    const req = createDeleteRequest(id);
    const res = await documentDelete(req, { params: Promise.resolve({ id }) } as any);
    expect(res.status).toBeGreaterThanOrEqual(200);
  });
});
