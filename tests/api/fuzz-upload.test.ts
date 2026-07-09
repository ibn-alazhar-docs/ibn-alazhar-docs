import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST as uploadPost } from "@/app/api/upload/route";
import { mockSession } from "./setup";

vi.mock("@/clients/redis", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
  checkUserRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
  rateLimitResponse: vi
    .fn()
    .mockReturnValue(
      new Response(JSON.stringify({ error: { code: "RATE_LIMITED" } }), { status: 429 }),
    ),
}));

vi.mock("@/core/services/dashboard.service", () => ({
  DashboardService: { trackUpload: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock("@/core/composition-root", () => ({
  useCases: {
    uploadDocument: {
      execute: vi.fn().mockResolvedValue({
        id: "doc-fuzz-safe",
        originalName: "safe.pdf",
        fileSize: 100,
      }),
    },
  },
}));

function createRequest(body: (Blob | string | null)[][], contentType?: string) {
  const form = new FormData();
  for (const [key, value] of body) {
    if (value !== null) form.append(key as string, value);
  }
  return new Request("http://localhost/api/upload", {
    method: "POST",
    body: form,
    ...(contentType ? { headers: { "content-type": contentType } } : {}),
  });
}

async function assertNoCrash(res: Response) {
  expect(res.status).not.toBe(500);
  if (res.status >= 400) {
    const body = await res.json();
    expect(body).toHaveProperty("error");
  }
}

describe("Upload API — Fuzz Testing", () => {
  beforeEach(() => {
    mockSession.user = {
      id: "user-fuzz",
      name: "Fuzzer",
      email: "fuzz@test.com",
      role: "USER",
    } as any;
    vi.clearAllMocks();
  });

  it("handles empty FormData (no fields at all)", async () => {
    const form = new FormData();
    const req = new Request("http://localhost/api/upload", { method: "POST", body: form });
    const res = await uploadPost(req, { params: Promise.resolve({}) } as any);
    await assertNoCrash(res);
  });

  it("handles missing file field with only folderId", async () => {
    const form = new FormData();
    form.append("folderId", "c123456789012345678901234");
    const req = new Request("http://localhost/api/upload", { method: "POST", body: form });
    const res = await uploadPost(req, { params: Promise.resolve({}) } as any);
    await assertNoCrash(res);
  });

  it("handles empty file (0 bytes) with valid type", async () => {
    const file = new File([""], "empty.pdf", { type: "application/pdf" });
    const form = new FormData();
    form.append("file", file);
    const req = new Request("http://localhost/api/upload", { method: "POST", body: form });
    const res = await uploadPost(req, { params: Promise.resolve({}) } as any);
    await assertNoCrash(res);
  });

  it("handles text/html file (wrong MIME type)", async () => {
    const file = new File(["<script>alert(1)</script>"], "evil.html", { type: "text/html" });
    const form = new FormData();
    form.append("file", file);
    const req = new Request("http://localhost/api/upload", { method: "POST", body: form });
    const res = await uploadPost(req, { params: Promise.resolve({}) } as any);
    await assertNoCrash(res);
  });

  it("handles file with extremely long filename (10KB)", async () => {
    const name = "A".repeat(10_000) + ".pdf";
    const file = new File(["content"], name, { type: "application/pdf" });
    const form = new FormData();
    form.append("file", file);
    const req = new Request("http://localhost/api/upload", { method: "POST", body: form });
    const res = await uploadPost(req, { params: Promise.resolve({}) } as any);
    await assertNoCrash(res);
  });

  it("handles Unicode path traversal in filename", async () => {
    const file = new File(["content"], "../../etc/passwd.pdf", { type: "application/pdf" });
    const form = new FormData();
    form.append("file", file);
    const req = new Request("http://localhost/api/upload", { method: "POST", body: form });
    const res = await uploadPost(req, { params: Promise.resolve({}) } as any);
    await assertNoCrash(res);
  });

  it("handles Unicode injection with RTL override in filename", async () => {
    const file = new File(["content"], "\u202Efdp.scr\u202D.pdf", { type: "application/pdf" });
    const form = new FormData();
    form.append("file", file);
    const req = new Request("http://localhost/api/upload", { method: "POST", body: form });
    const res = await uploadPost(req, { params: Promise.resolve({}) } as any);
    await assertNoCrash(res);
  });

  it("handles null byte in filename", async () => {
    const file = new File(["content"], "test\x00.pdf", { type: "application/pdf" });
    const form = new FormData();
    form.append("file", file);
    const req = new Request("http://localhost/api/upload", { method: "POST", body: form });
    const res = await uploadPost(req, { params: Promise.resolve({}) } as any);
    await assertNoCrash(res);
  });

  it("handles binary garbage as folderId field", async () => {
    const binary = new Blob([new Uint8Array([0x00, 0xff, 0xde, 0xad, 0xbe, 0xef])]);
    const form = new FormData();
    form.append("file", new File(["dummy"], "doc.pdf", { type: "application/pdf" }));
    form.append("folderId", binary as unknown as string);
    const req = new Request("http://localhost/api/upload", { method: "POST", body: form });
    const res = await uploadPost(req, { params: Promise.resolve({}) } as any);
    await assertNoCrash(res);
  });

  it("handles extremely long folderId value (100KB+)", async () => {
    const longValue = "x".repeat(100_000);
    const form = new FormData();
    form.append("file", new File(["dummy"], "doc.pdf", { type: "application/pdf" }));
    form.append("folderId", longValue);
    const req = new Request("http://localhost/api/upload", { method: "POST", body: form });
    const res = await uploadPost(req, { params: Promise.resolve({}) } as any);
    await assertNoCrash(res);
  });

  it("handles repeated file field names (multiple files)", async () => {
    const form = new FormData();
    form.append("file", new File(["a"], "a.pdf", { type: "application/pdf" }));
    form.append("file", new File(["b"], "b.pdf", { type: "application/pdf" }));
    const req = new Request("http://localhost/api/upload", { method: "POST", body: form });
    const res = await uploadPost(req, { params: Promise.resolve({}) } as any);
    await assertNoCrash(res);
  });

  it("handles extremely large pageRange value", async () => {
    const form = new FormData();
    form.append("file", new File(["x"], "doc.pdf", { type: "application/pdf" }));
    form.append("pageRange", "1-1000000," + "A".repeat(5000));
    const req = new Request("http://localhost/api/upload", { method: "POST", body: form });
    const res = await uploadPost(req, { params: Promise.resolve({}) } as any);
    await assertNoCrash(res);
  });

  it("handles pageRange with SQL injection payload", async () => {
    const form = new FormData();
    form.append("file", new File(["x"], "doc.pdf", { type: "application/pdf" }));
    form.append("pageRange", "1'; DROP TABLE documents; --");
    const req = new Request("http://localhost/api/upload", { method: "POST", body: form });
    const res = await uploadPost(req, { params: Promise.resolve({}) } as any);
    await assertNoCrash(res);
  });

  it("handles folderId with NoSQL injection", async () => {
    const form = new FormData();
    form.append("file", new File(["x"], "doc.pdf", { type: "application/pdf" }));
    form.append("folderId", '{"$gt": ""}');
    const req = new Request("http://localhost/api/upload", { method: "POST", body: form });
    const res = await uploadPost(req, { params: Promise.resolve({}) } as any);
    await assertNoCrash(res);
  });

  it("handles very large multi-field FormData", async () => {
    const form = new FormData();
    form.append("file", new File(["x"], "doc.pdf", { type: "application/pdf" }));
    for (let i = 0; i < 100; i++) {
      form.append(`field_${i}`, "A".repeat(1000));
    }
    const req = new Request("http://localhost/api/upload", { method: "POST", body: form });
    const res = await uploadPost(req, { params: Promise.resolve({}) } as any);
    await assertNoCrash(res);
  });
});
