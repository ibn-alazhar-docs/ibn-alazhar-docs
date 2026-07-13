import { describe, it, expect, beforeEach, vi } from "vitest";
import { mockSession } from "./setup";
import { POST as uploadPost } from "@/app/api/upload/route";

function h(req: Request) {
  return uploadPost(req, { params: Promise.resolve({}) } as any);
}

const { mockUploadExecute, mockHandleRouteError, mockValidateUploadFile, mockSafeParse } =
  vi.hoisted(() => ({
    mockUploadExecute: vi.fn().mockResolvedValue({
      id: "doc-contract-1",
      originalName: "test.pdf",
      fileSize: 1024,
    }),
    mockHandleRouteError: vi
      .fn()
      .mockReturnValue(
        new Response(
          JSON.stringify({ error: { code: "INTERNAL_ERROR", message: "تعذر رفع الملف" } }),
          { status: 500, headers: { "Content-Type": "application/json" } },
        ),
      ),
    mockValidateUploadFile: vi.fn(),
    mockSafeParse: vi.fn().mockReturnValue({ success: true, data: {} }),
  }));

vi.mock("@/shared/validators/document", () => ({
  validateUploadFile: mockValidateUploadFile,
  uploadMetadataSchema: { safeParse: mockSafeParse },
  MAX_UPLOAD_SIZE_MB: 50,
}));

vi.mock("@/shared/route-helpers", () => ({
  handleRouteError: mockHandleRouteError,
}));

vi.mock("@/core/composition-root", () => ({
  useCases: {
    uploadDocument: {
      execute: mockUploadExecute,
    },
  },
}));

vi.mock("@/core/services/dashboard.service", () => ({
  DashboardService: {
    trackUpload: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@/clients/redis", () => ({
  checkUserRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
  rateLimitResponse: vi.fn().mockReturnValue(new Response("rate limited", { status: 429 })),
}));

async function assertContract(res: Response, expectedStatus: number) {
  expect(res.status).toBe(expectedStatus);
  const body = await res.json();
  expect(body).toBeDefined();
  return body as Record<string, unknown>;
}

function createRequest(fileOrNull: File | null, overrides?: { folderId?: string }): Request {
  const form = new FormData();
  if (fileOrNull) form.append("file", fileOrNull);
  if (overrides?.folderId) form.append("folderId", overrides.folderId);
  return new Request("http://localhost:3000/api/upload", {
    method: "POST",
    body: form,
  });
}

describe("Upload API — Contract Validation", () => {
  beforeEach(() => {
    mockSession.user = {
      id: "user-1",
      name: "Test User",
      email: "test@example.com",
      role: "USER",
    } as any;
    mockValidateUploadFile.mockImplementation((file: File | null) => {
      if (!file) return { valid: false, error: "الملف مطلوب", status: 400 };
      if (!file.name.endsWith(".pdf"))
        return { valid: false, error: "نوع الملف غير مدعوم", status: 400 };
      if (file.size > 10_485_760) return { valid: false, error: "الملف كبير جداً", status: 413 };
      return { valid: true };
    });
    mockHandleRouteError.mockReturnValue(
      new Response(
        JSON.stringify({ error: { code: "INTERNAL_ERROR", message: "تعذر رفع الملف" } }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      ),
    );
  });

  describe("201 Created — successful upload", () => {
    it("returns 201 with expected JSON shape for valid PDF", async () => {
      const file = new File(["dummy"], "report.pdf", { type: "application/pdf" });
      const res = await h(createRequest(file));
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body).toHaveProperty("success", true);
      expect(body).toHaveProperty("jobId");
      expect(body).toHaveProperty("documentId");
      expect(body).toHaveProperty("fileName");
      expect(typeof body.fileSize).toBe("number");
    });
  });

  describe("400 Bad Request — validation errors", () => {
    it("returns 400 with error shape for unsupported file type", async () => {
      const file = new File(["x"], "doc.png", { type: "image/png" });
      const body = await assertContract(await h(createRequest(file)), 400);

      expect(body).toHaveProperty("error");
      expect(body.error).toHaveProperty("code", "VALIDATION_ERROR");
      expect(body.error).toHaveProperty("message");
    });

    it("returns 400 with error shape for missing file", async () => {
      const body = await assertContract(await h(createRequest(null)), 400);

      expect(body).toHaveProperty("error");
      expect(body.error).toHaveProperty("code", "VALIDATION_ERROR");
    });

    it("returns 400 with error shape for invalid metadata", async () => {
      mockSafeParse.mockReturnValueOnce({
        success: false,
        error: { issues: [{ message: "معرف المجلد غير صالح" }] },
      });
      const file = new File(["x"], "doc.pdf", { type: "application/pdf" });
      const body = await assertContract(await h(createRequest(file)), 400);

      expect(body.error).toHaveProperty("code", "VALIDATION_ERROR");
      expect(body.error).toHaveProperty("message");
    });
  });

  describe("401 Unauthorized — no session", () => {
    it("returns 401 with error shape when unauthenticated", async () => {
      mockSession.user = null as any;

      const file = new File(["x"], "doc.pdf", { type: "application/pdf" });
      const body = await assertContract(await h(createRequest(file)), 401);

      expect(body).toHaveProperty("error");
    });
  });

  describe("403 Forbidden — insufficient permissions", () => {
    it("returns 403 with error shape when route handler rejects", async () => {
      mockUploadExecute.mockRejectedValueOnce(new Error("Forbidden action"));
      mockHandleRouteError.mockReturnValueOnce(
        new Response(JSON.stringify({ error: { code: "FORBIDDEN", message: "ليس لديك صلاحية" } }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }),
      );

      const file = new File(["x"], "doc.pdf", { type: "application/pdf" });
      const body = await assertContract(await h(createRequest(file)), 403);

      expect(body.error).toHaveProperty("code", "FORBIDDEN");
    });
  });

  describe("413 Payload Too Large", () => {
    it("returns 413 with error shape when file is oversized", async () => {
      const big = new File(["x".repeat(20_971_520)], "huge.pdf", { type: "application/pdf" });
      const body = await assertContract(await h(createRequest(big)), 413);

      expect(body).toHaveProperty("error");
      expect(body.error).toHaveProperty("code", "VALIDATION_ERROR");
    });
  });

  describe("415 Unsupported Media Type", () => {
    it("returns 400 with error shape when type is rejected", async () => {
      const file = new File(["x"], "doc.png", { type: "image/png" });
      const body = await assertContract(await h(createRequest(file)), 400);

      expect(body).toHaveProperty("error");
    });
  });

  describe("500 Internal Server Error", () => {
    it("returns 500 with error shape on unexpected failure", async () => {
      mockUploadExecute.mockRejectedValueOnce(new Error("Upload crashed"));

      const file = new File(["x"], "doc.pdf", { type: "application/pdf" });
      const body = await assertContract(await h(createRequest(file)), 500);

      expect(body).toHaveProperty("error");
    });
  });
});
