import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST as uploadPost } from "@/app/api/upload/route";
import { mockSession } from "./setup";

vi.mock("@/lib/backend/rate-limit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
  checkUserRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
  rateLimitResponse: vi.fn().mockReturnValue(
    new Response(JSON.stringify({ error: { code: "RATE_LIMITED" } }), { status: 429 }),
  ),
}));

vi.mock("@/lib/backend/services/dashboard.service", () => ({
  DashboardService: {
    trackUpload: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@/core/composition-root", () => ({
  repos: {
    document: { findFirst: vi.fn() },
  },
  useCases: {
    uploadDocument: {
      execute: vi.fn().mockResolvedValue({
        id: "doc-new-123",
        originalName: "test.pdf",
        fileSize: 1024,
      }),
    },
  },
}));

import { useCases } from "@/core/composition-root";

const OWNER_ID = "userA-id";

function createUploadRequest(file: File | null, extra: Record<string, string> = {}) {
  const form = new FormData();
  if (file) form.append("file", file, file.name);
  for (const [key, value] of Object.entries(extra)) {
    form.append(key, value);
  }
  return new Request("http://localhost/api/upload", { method: "POST", body: form });
}

describe("Upload API (/api/upload)", () => {
  beforeEach(() => {
    mockSession.user = {
      id: OWNER_ID,
      name: "User A",
      email: "usera@example.com",
      role: "USER",
    } as any;
    vi.clearAllMocks();
  });

  it("should return 401 when unauthenticated", async () => {
    mockSession.user = null as any;

    const file = new File([new Uint8Array([1, 2, 3])], "test.pdf", {
      type: "application/pdf",
    });
    const req = createUploadRequest(file);
    const res = await uploadPost(req, { params: Promise.resolve({}) } as any);

    expect(res.status).toBe(401);
  });

  it("should return 201 and a document id for an accepted PDF upload", async () => {
    const file = new File([new Uint8Array([1, 2, 3])], "test.pdf", {
      type: "application/pdf",
    });
    const req = createUploadRequest(file);
    const res = await uploadPost(req, { params: Promise.resolve({}) } as any);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.documentId).toBeDefined();
    expect(data.jobId).toBe(data.documentId);
    expect(data.fileName).toBe("test.pdf");
    expect(data.status).toBe("pending");
    expect(useCases.uploadDocument.execute).toHaveBeenCalledOnce();
  });

  it("should accept image/jpeg uploads", async () => {
    const file = new File([new Uint8Array([1, 2, 3])], "photo.jpg", {
      type: "image/jpeg",
    });
    const req = createUploadRequest(file);
    const res = await uploadPost(req, { params: Promise.resolve({}) } as any);

    expect(res.status).toBe(201);
  });

  it("should accept image/png uploads", async () => {
    const file = new File([new Uint8Array([1, 2, 3])], "photo.png", {
      type: "image/png",
    });
    const req = createUploadRequest(file);
    const res = await uploadPost(req, { params: Promise.resolve({}) } as any);

    expect(res.status).toBe(201);
  });

  it("should reject disallowed MIME types with 400", async () => {
    const file = new File([new Uint8Array([1, 2, 3])], "evil.html", {
      type: "text/html",
    });
    const req = createUploadRequest(file);
    const res = await uploadPost(req, { params: Promise.resolve({}) } as any);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error.code).toBe("VALIDATION_ERROR");
  });

  it("should reject missing file with 400", async () => {
    const req = createUploadRequest(null);
    const res = await uploadPost(req, { params: Promise.resolve({}) } as any);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error.code).toBe("VALIDATION_ERROR");
  });

  it("should reject files that exceed the max upload size with 400", async () => {
    const oversized = new File(
      [new Uint8Array(50 * 1024 * 1024 + 1024)],
      "huge.pdf",
      { type: "application/pdf" },
    );
    const req = createUploadRequest(oversized);
    const res = await uploadPost(req, { params: Promise.resolve({}) } as any);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error.code).toBe("VALIDATION_ERROR");
    expect(useCases.uploadDocument.execute).not.toHaveBeenCalled();
  });
});
