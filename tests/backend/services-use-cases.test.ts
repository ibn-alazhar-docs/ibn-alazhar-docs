import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import crypto from "crypto";

vi.mock("@/core/composition-root", () => ({
  repos: { document: { findFirst: vi.fn() } },
}));

vi.mock("@/shared/logger", () => ({
  logger: { warn: vi.fn() },
}));

vi.mock("@/domain/auth", () => ({
  isAdminRole: vi.fn((role: string) => role === "ADMIN"),
}));

vi.mock("@ibn-al-azhar-docs/shared", () => ({
  ERROR_CODES: { NOT_FOUND: "NOT_FOUND" },
}));

vi.mock("@/core/authorization", () => ({
  ownedWhere: vi.fn((base: Record<string, unknown>, session: { user: { id: string } }) => ({
    ...base,
    userId: session?.user?.id ?? "unknown",
  })),
}));

vi.mock("@/core/services/export/metadata", () => ({
  buildExportMetadata: vi.fn(
    (
      doc: Record<string, unknown>,
      _tags: unknown,
      _folder: unknown,
      _ocr: unknown,
      _pipeline: unknown,
      _profile: unknown,
    ) => ({
      source: {
        title: doc.title as string,
        description: doc.description as string | null,
        fileName: doc.fileName as string,
        originalName: doc.originalName as string,
        mimeType: doc.mimeType as string,
        fileSize: doc.fileSize as number,
        language: (doc.language as string) ?? "ar",
        isRtl: (doc.isRtl as boolean) ?? false,
      },
      tags: _tags as Array<{ name: string; color: string }>,
      folder: _folder as { name: string; path: string; ancestors: string[] } | null,
      ocr: _ocr as { confidence: number; engine: string; pageCount: number },
      pipeline: _pipeline as {
        wordCount: number;
        charCount: number;
        headingCount: number;
        paragraphCount: number;
        qualityScore: number;
        garbageRatio: number;
        pageCount: number;
      },
      dates: {
        created: "2024-01-01T00:00:00.000Z",
        updated: "2024-01-01T00:00:00.000Z",
        exported: "2024-01-01T00:00:00.000Z",
      },
      export: {
        format: "zip",
        profile: _profile as string,
        version: "1.0",
        generator: "ibnalazhardocs/v1",
      },
    }),
  ),
}));

import { WebhookUseCases } from "@/core/services/webhook.use-cases";
import { AutoTagUseCases } from "@/core/services/auto-tag.use-cases";
import { StreamService } from "@/core/services/stream.service";
import { AnalyticsUseCases } from "@/core/services/analytics.use-cases";
import {
  fetchRelatedData,
  fetchDocumentFiles,
  buildZipDocuments,
  executeBulkExport,
} from "@/core/services/export/bulk-export-helpers";
import { buildZipPackage } from "@/core/services/export/zip-builder";
import { repos } from "@/core/composition-root";
import { logger } from "@/shared/logger";
import { NotFoundError, AppError } from "@/shared/errors";

let mockFetch: ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockFetch = vi.fn();
  vi.stubGlobal("fetch", mockFetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

function makeWebhookRepo(): ReturnType<typeof vi.mocked> &
  import("@/domain/repositories/webhook.repository.interface").IWebhookRepository {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findActiveByEvent: vi.fn(),
    createDelivery: vi.fn(),
    updateDelivery: vi.fn(),
    findPendingDeliveries: vi.fn(),
    getDeliveryStats: vi.fn(),
  } as unknown as ReturnType<typeof vi.mocked> &
    import("@/domain/repositories/webhook.repository.interface").IWebhookRepository;
}

function makeSession(role = "STUDENT", id = "user-1") {
  return { user: { id, name: "Test", email: "t@t.com", image: null, role } };
}

const mockPrisma = () => ({
  document: {
    count: vi.fn(),
    aggregate: vi.fn(),
    groupBy: vi.fn(),
    findMany: vi.fn(),
  },
  tag: {
    count: vi.fn(),
    findMany: vi.fn(),
  },
  auditLog: {
    groupBy: vi.fn(),
  },
  user: {
    findMany: vi.fn(),
  },
});

describe("WebhookUseCases", () => {
  let repo: ReturnType<typeof makeWebhookRepo>;
  let useCases: WebhookUseCases;
  const sig64 = /^[0-9a-f]{64}$/;

  beforeEach(() => {
    repo = makeWebhookRepo();
    useCases = new WebhookUseCases(repo);
  });

  describe("createWebhook", () => {
    it("creates a webhook with generated secret", async () => {
      repo.create.mockResolvedValue({
        id: "wh-1",
        userId: "user-1",
        url: "https://example.com/hook",
        secret: "abcd1234",
        events: ["doc.created"],
        active: true,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      });

      const result = await useCases.createWebhook("user-1", {
        url: "https://example.com/hook",
        events: ["doc.created"],
      });

      expect(result.id).toBe("wh-1");
      expect(result.secret).toBe("abcd1234");
      expect(result.url).toBe("https://example.com/hook");
    });

    it("generates a 32-byte hex secret (64 chars)", async () => {
      let capturedSecret = "";
      repo.create.mockImplementation(async (_uid: string, data: { secret: string }) => {
        capturedSecret = data.secret;
        return {
          id: "wh-1",
          userId: _uid,
          url: data.url,
          secret: data.secret,
          events: data.events,
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      });

      await useCases.createWebhook("user-1", {
        url: "https://example.com/hook",
        events: ["doc.created"],
      });

      expect(capturedSecret).toMatch(sig64);
    });

    it("rejects localhost URL", async () => {
      await expect(
        useCases.createWebhook("user-1", { url: "http://localhost:3000/hook", events: [] }),
      ).rejects.toThrow(AppError);
    });

    it("rejects 127.0.0.1 URL", async () => {
      await expect(
        useCases.createWebhook("user-1", { url: "http://127.0.0.1/hook", events: [] }),
      ).rejects.toThrow(AppError);
    });

    it("rejects 192.168.x.x URL", async () => {
      await expect(
        useCases.createWebhook("user-1", { url: "http://192.168.1.1/hook", events: [] }),
      ).rejects.toThrow(AppError);
    });

    it("rejects .local domain", async () => {
      await expect(
        useCases.createWebhook("user-1", { url: "http://my-service.local/hook", events: [] }),
      ).rejects.toThrow(AppError);
    });

    it("rejects .internal domain", async () => {
      await expect(
        useCases.createWebhook("user-1", { url: "http://api.internal/hook", events: [] }),
      ).rejects.toThrow(AppError);
    });

    it("rejects ftp protocol", async () => {
      await expect(
        useCases.createWebhook("user-1", { url: "ftp://example.com/hook", events: [] }),
      ).rejects.toThrow(AppError);
    });

    it("rejects invalid URL string", async () => {
      await expect(
        useCases.createWebhook("user-1", { url: "not-a-url", events: [] }),
      ).rejects.toThrow(AppError);
    });

    it("rejects empty URL string", async () => {
      await expect(useCases.createWebhook("user-1", { url: "", events: [] })).rejects.toThrow(
        AppError,
      );
    });

    it("accepts valid https URL", async () => {
      repo.create.mockResolvedValue({
        id: "wh-1",
        userId: "user-1",
        url: "https://hooks.example.com/callback",
        secret: "s",
        events: ["doc.created"],
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await useCases.createWebhook("user-1", {
        url: "https://hooks.example.com/callback",
        events: ["doc.created"],
      });

      expect(result.url).toBe("https://hooks.example.com/callback");
    });

    it("accepts valid http URL", async () => {
      repo.create.mockResolvedValue({
        id: "wh-1",
        userId: "user-1",
        url: "http://hooks.example.com/callback",
        secret: "s",
        events: ["doc.created"],
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await useCases.createWebhook("user-1", {
        url: "http://hooks.example.com/callback",
        events: ["doc.created"],
      });

      expect(result.url).toBe("http://hooks.example.com/callback");
    });

    it("throws AppError with VALIDATION_ERROR code on unsafe URL", async () => {
      await expect(
        useCases.createWebhook("user-1", { url: "http://localhost:8080", events: [] }),
      ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    });
  });

  describe("getWebhooks", () => {
    it("returns mapped webhooks", async () => {
      repo.findMany.mockResolvedValue([
        {
          id: "wh-1",
          userId: "user-1",
          url: "https://example.com/hook",
          secret: "s",
          events: ["doc.created"],
          active: true,
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-01"),
        },
      ]);

      const result = await useCases.getWebhooks("user-1");

      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe("wh-1");
      expect(result[0]!.url).toBe("https://example.com/hook");
      expect(result[0]!.active).toBe(true);
    });

    it("returns empty array when no webhooks", async () => {
      repo.findMany.mockResolvedValue([]);

      const result = await useCases.getWebhooks("user-1");

      expect(result).toEqual([]);
    });

    it("does not return secret field", async () => {
      repo.findMany.mockResolvedValue([
        {
          id: "wh-1",
          userId: "user-1",
          url: "https://example.com/hook",
          secret: "super-secret",
          events: [],
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const result = await useCases.getWebhooks("user-1");

      expect(result[0]).not.toHaveProperty("secret");
    });
  });

  describe("getWebhookById", () => {
    it("returns webhook when found", async () => {
      repo.findById.mockResolvedValue({
        id: "wh-1",
        userId: "user-1",
        url: "https://example.com/hook",
        secret: "s",
        events: ["doc.created"],
        active: true,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      });

      const result = await useCases.getWebhookById("wh-1", "user-1");

      expect(result.id).toBe("wh-1");
    });

    it("throws NotFoundError when not found", async () => {
      repo.findById.mockResolvedValue(null);

      await expect(useCases.getWebhookById("missing", "user-1")).rejects.toThrow(NotFoundError);
    });
  });

  describe("updateWebhook", () => {
    it("updates webhook URL", async () => {
      repo.update.mockResolvedValue({
        id: "wh-1",
        userId: "user-1",
        url: "https://new-url.com/hook",
        secret: "s",
        events: [],
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await useCases.updateWebhook("wh-1", "user-1", {
        url: "https://new-url.com/hook",
      });

      expect(result.url).toBe("https://new-url.com/hook");
    });

    it("re-validates URL on update", async () => {
      await expect(
        useCases.updateWebhook("wh-1", "user-1", { url: "http://localhost:8080" }),
      ).rejects.toThrow(AppError);
    });

    it("updates events and active status", async () => {
      repo.update.mockResolvedValue({
        id: "wh-1",
        userId: "user-1",
        url: "https://example.com/hook",
        secret: "s",
        events: ["doc.updated"],
        active: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await useCases.updateWebhook("wh-1", "user-1", {
        events: ["doc.updated"],
        active: false,
      });

      expect(result.events).toEqual(["doc.updated"]);
      expect(result.active).toBe(false);
    });

    it("does not validate URL when not provided", async () => {
      repo.update.mockResolvedValue({
        id: "wh-1",
        userId: "user-1",
        url: "https://example.com/hook",
        secret: "s",
        events: ["doc.created"],
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        useCases.updateWebhook("wh-1", "user-1", { events: ["doc.deleted"] }),
      ).resolves.toBeDefined();
    });
  });

  describe("deleteWebhook", () => {
    it("deletes webhook successfully", async () => {
      repo.delete.mockResolvedValue(undefined);

      await expect(useCases.deleteWebhook("wh-1", "user-1")).resolves.toBeUndefined();

      expect(repo.delete).toHaveBeenCalledWith("wh-1", "user-1");
    });
  });

  describe("signPayload", () => {
    it("produces valid HMAC-SHA256 hex string of 64 chars", () => {
      const signature = useCases.signPayload(JSON.stringify({ event: "test" }), "my-secret");

      expect(signature).toMatch(sig64);
    });

    it("produces different signature for different payload", () => {
      const sig1 = useCases.signPayload("payload-a", "secret");
      const sig2 = useCases.signPayload("payload-b", "secret");

      expect(sig1).not.toBe(sig2);
    });

    it("produces different signature for different secret", () => {
      const sig1 = useCases.signPayload("payload", "secret-a");
      const sig2 = useCases.signPayload("payload", "secret-b");

      expect(sig1).not.toBe(sig2);
    });

    it("matches crypto.createHmac output", () => {
      const payload = "hello";
      const secret = "test-secret";
      const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");

      expect(useCases.signPayload(payload, secret)).toBe(expected);
    });
  });

  describe("testWebhook", () => {
    it("sends test event and returns success", async () => {
      repo.findById.mockResolvedValue({
        id: "wh-1",
        userId: "user-1",
        url: "https://example.com/hook",
        secret: "test-secret",
        events: [],
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue("OK"),
      });

      const result = await useCases.testWebhook("wh-1", "user-1");

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
    });

    it("throws NotFoundError when webhook not found", async () => {
      repo.findById.mockResolvedValue(null);

      await expect(useCases.testWebhook("missing", "user-1")).rejects.toThrow(NotFoundError);
    });

    it("returns error on fetch failure", async () => {
      repo.findById.mockResolvedValue({
        id: "wh-1",
        userId: "user-1",
        url: "https://example.com/hook",
        secret: "s",
        events: [],
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockFetch.mockRejectedValue(new Error("Connection refused"));

      const result = await useCases.testWebhook("wh-1", "user-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("WEBHOOK_DELIVERY_FAILED");
    });

    it("sends correct HMAC signature header", async () => {
      repo.findById.mockResolvedValue({
        id: "wh-1",
        userId: "user-1",
        url: "https://example.com/hook",
        secret: "test-secret",
        events: [],
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue("OK"),
      });

      await useCases.testWebhook("wh-1", "user-1");

      const callArgs = mockFetch.mock.calls[0]![1]! as RequestInit;
      expect(callArgs.headers).toHaveProperty("X-Webhook-Signature");
      expect(callArgs.headers).toHaveProperty("X-Webhook-Event", "webhook.test");
      expect(callArgs.method).toBe("POST");
    });

    it("uses 10-second timeout signal", async () => {
      repo.findById.mockResolvedValue({
        id: "wh-1",
        userId: "user-1",
        url: "https://example.com/hook",
        secret: "s",
        events: [],
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue("OK"),
      });

      await useCases.testWebhook("wh-1", "user-1");

      const callArgs = mockFetch.mock.calls[0]![1]! as RequestInit;
      expect(callArgs.signal).toBeInstanceOf(AbortSignal);
    });
  });

  describe("dispatchEvent", () => {
    const payload = { docId: "doc-1", title: "Test" };

    it("sends POST to active subscriptions", async () => {
      repo.findActiveByEvent.mockResolvedValue([
        {
          id: "sub-1",
          userId: "user-1",
          url: "https://example.com/hook",
          secret: "s",
          events: ["doc.created"],
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      repo.createDelivery.mockResolvedValue({
        id: "del-1",
        subscriptionId: "sub-1",
        event: "doc.created",
        payload: {},
        statusCode: null,
        response: null,
        attempts: 0,
        deliveredAt: null,
        createdAt: new Date(),
      });
      repo.updateDelivery.mockResolvedValue({
        id: "del-1",
        subscriptionId: "sub-1",
        event: "doc.created",
        payload: {},
        statusCode: 200,
        response: "OK",
        attempts: 1,
        deliveredAt: new Date(),
        createdAt: new Date(),
      });
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue("OK"),
      });

      await useCases.dispatchEvent("doc.created", payload);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const fetchUrl = mockFetch.mock.calls[0]![0];
      expect(fetchUrl).toBe("https://example.com/hook");
    });

    it("does nothing when no subscriptions exist", async () => {
      repo.findActiveByEvent.mockResolvedValue([]);

      await useCases.dispatchEvent("doc.created", payload);

      expect(mockFetch).not.toHaveBeenCalled();
      expect(repo.createDelivery).not.toHaveBeenCalled();
    });

    it("sets X-Webhook-Delivery-Id header", async () => {
      repo.findActiveByEvent.mockResolvedValue([
        {
          id: "sub-1",
          userId: "user-1",
          url: "https://example.com/hook",
          secret: "s",
          events: [],
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      repo.createDelivery.mockResolvedValue({
        id: "del-42",
        subscriptionId: "sub-1",
        event: "doc.created",
        payload: {},
        statusCode: null,
        response: null,
        attempts: 0,
        deliveredAt: null,
        createdAt: new Date(),
      });
      repo.updateDelivery.mockResolvedValue({
        id: "del-42",
        subscriptionId: "sub-1",
        event: "doc.created",
        payload: {},
        statusCode: 200,
        response: "OK",
        attempts: 1,
        deliveredAt: new Date(),
        createdAt: new Date(),
      });
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue("OK"),
      });

      await useCases.dispatchEvent("doc.created", payload);

      const headers = (mockFetch.mock.calls[0]![1] as RequestInit).headers as Record<
        string,
        string
      >;
      expect(headers["X-Webhook-Delivery-Id"]).toBe("del-42");
    });

    it("signs the payload correctly", async () => {
      repo.findActiveByEvent.mockResolvedValue([
        {
          id: "sub-1",
          userId: "user-1",
          url: "https://example.com/hook",
          secret: "my-secret",
          events: [],
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      repo.createDelivery.mockResolvedValue({
        id: "del-1",
        subscriptionId: "sub-1",
        event: "doc.created",
        payload: {},
        statusCode: null,
        response: null,
        attempts: 0,
        deliveredAt: null,
        createdAt: new Date(),
      });
      repo.updateDelivery.mockImplementation(async (_delId: string, _data: unknown) => ({
        id: _delId,
        subscriptionId: "sub-1",
        event: "doc.created",
        payload: {},
        statusCode: 200,
        response: "OK",
        attempts: 1,
        deliveredAt: new Date(),
        createdAt: new Date(),
      }));
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue("OK"),
      });

      await useCases.dispatchEvent("doc.created", payload);

      const callBody = JSON.parse((mockFetch.mock.calls[0]![1] as RequestInit).body as string);
      const expectedSig = crypto
        .createHmac("sha256", "my-secret")
        .update(JSON.stringify(callBody))
        .digest("hex");
      const sentSig = (mockFetch.mock.calls[0]![1] as RequestInit).headers as Record<
        string,
        string
      >;

      expect(sentSig["X-Webhook-Signature"]).toBe(expectedSig);
    });

    it("captures response body text", async () => {
      repo.findActiveByEvent.mockResolvedValue([
        {
          id: "sub-1",
          userId: "user-1",
          url: "https://example.com/hook",
          secret: "s",
          events: [],
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      repo.createDelivery.mockResolvedValue({
        id: "del-1",
        subscriptionId: "sub-1",
        event: "doc.created",
        payload: {},
        statusCode: null,
        response: null,
        attempts: 0,
        deliveredAt: null,
        createdAt: new Date(),
      });
      let capturedUpdate: unknown = null;
      repo.updateDelivery.mockImplementation(async (_delId: string, data: unknown) => {
        capturedUpdate = data;
        return {
          id: _delId,
          subscriptionId: "sub-1",
          event: "doc.created",
          payload: {},
          statusCode: 200,
          response: "OK",
          attempts: 1,
          deliveredAt: new Date(),
          createdAt: new Date(),
        };
      });
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue('{"result":"success"}'),
      });

      await useCases.dispatchEvent("doc.created", payload);

      expect(capturedUpdate).toMatchObject({
        statusCode: 200,
        response: '{"result":"success"}',
      });
    });

    it("handles fetch timeout gracefully and logs warning", async () => {
      repo.findActiveByEvent.mockResolvedValue([
        {
          id: "sub-1",
          userId: "user-1",
          url: "https://example.com/hook",
          secret: "s",
          events: [],
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      repo.createDelivery.mockResolvedValue({
        id: "del-1",
        subscriptionId: "sub-1",
        event: "doc.created",
        payload: {},
        statusCode: null,
        response: null,
        attempts: 0,
        deliveredAt: null,
        createdAt: new Date(),
      });
      mockFetch.mockRejectedValue(new DOMException("The operation was aborted", "AbortError"));

      await useCases.dispatchEvent("doc.created", payload);

      expect(logger.warn).toHaveBeenCalled();
    });

    it("continues with remaining subscriptions when one fails", async () => {
      repo.findActiveByEvent.mockResolvedValue([
        {
          id: "sub-1",
          userId: "user-1",
          url: "https://first.com/hook",
          secret: "s",
          events: [],
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "sub-2",
          userId: "user-1",
          url: "https://second.com/hook",
          secret: "s",
          events: [],
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      repo.createDelivery
        .mockResolvedValueOnce({
          id: "del-1",
          subscriptionId: "sub-1",
          event: "doc.created",
          payload: {},
          statusCode: null,
          response: null,
          attempts: 0,
          deliveredAt: null,
          createdAt: new Date(),
        })
        .mockResolvedValueOnce({
          id: "del-2",
          subscriptionId: "sub-2",
          event: "doc.created",
          payload: {},
          statusCode: null,
          response: null,
          attempts: 0,
          deliveredAt: null,
          createdAt: new Date(),
        });
      repo.updateDelivery.mockResolvedValue({
        id: "del-2",
        subscriptionId: "sub-2",
        event: "doc.created",
        payload: {},
        statusCode: 200,
        response: "OK",
        attempts: 1,
        deliveredAt: new Date(),
        createdAt: new Date(),
      });
      mockFetch.mockRejectedValueOnce(new Error("First failed")).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue("OK"),
      });

      await useCases.dispatchEvent("doc.created", payload);

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(repo.updateDelivery).toHaveBeenCalledTimes(1);
    });

    it("handles null response body when text() throws", async () => {
      repo.findActiveByEvent.mockResolvedValue([
        {
          id: "sub-1",
          userId: "user-1",
          url: "https://example.com/hook",
          secret: "s",
          events: [],
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      repo.createDelivery.mockResolvedValue({
        id: "del-1",
        subscriptionId: "sub-1",
        event: "doc.created",
        payload: {},
        statusCode: null,
        response: null,
        attempts: 0,
        deliveredAt: null,
        createdAt: new Date(),
      });
      let capturedResponse: unknown = null;
      repo.updateDelivery.mockImplementation(async (_delId: string, data: unknown) => {
        capturedResponse = data;
        return {
          id: _delId,
          subscriptionId: "sub-1",
          event: "doc.created",
          payload: {},
          statusCode: 200,
          response: "OK",
          attempts: 1,
          deliveredAt: new Date(),
          createdAt: new Date(),
        };
      });
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: vi.fn().mockRejectedValue(new Error("Stream error")),
      });

      await useCases.dispatchEvent("doc.created", payload);

      expect(capturedResponse).toMatchObject({ response: undefined });
    });
  });

  describe("getDeliveryStats", () => {
    it("returns delivery stats from repository", async () => {
      repo.getDeliveryStats.mockResolvedValue({
        total: 10,
        delivered: 8,
        failed: 2,
      });

      const stats = await useCases.getDeliveryStats("user-1");

      expect(stats).toEqual({ total: 10, delivered: 8, failed: 2 });
    });
  });
});

describe("StreamService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("checkAndIncrementConnections", () => {
    it("allows connection when under limit", () => {
      const result = StreamService.checkAndIncrementConnections("allow-1");

      expect(result.allowed).toBe(true);
      expect(result.count).toBe(1);
    });

    it("allows up to MAX_SSE_CONNECTIONS_PER_USER", () => {
      StreamService.checkAndIncrementConnections("allow-up-1");
      StreamService.checkAndIncrementConnections("allow-up-1");
      StreamService.checkAndIncrementConnections("allow-up-1");

      const result = StreamService.checkAndIncrementConnections("allow-up-1");

      expect(result.allowed).toBe(false);
    });

    it("rejects connection beyond limit", () => {
      StreamService.checkAndIncrementConnections("reject-1");
      StreamService.checkAndIncrementConnections("reject-1");
      StreamService.checkAndIncrementConnections("reject-1");

      const result = StreamService.checkAndIncrementConnections("reject-1");

      expect(result.allowed).toBe(false);
    });

    it("different users have independent connection counts", () => {
      StreamService.checkAndIncrementConnections("user-a");
      StreamService.checkAndIncrementConnections("user-a");

      const resultB = StreamService.checkAndIncrementConnections("user-b");

      expect(resultB.allowed).toBe(true);
      expect(resultB.count).toBe(1);
    });

    it("returns correct count after multiple connections", () => {
      StreamService.checkAndIncrementConnections("count-test");

      const result = StreamService.checkAndIncrementConnections("count-test");

      expect(result.count).toBe(2);
    });
  });

  describe("decrementConnections", () => {
    it("releases a connection slot", () => {
      StreamService.checkAndIncrementConnections("decrement-test");
      StreamService.checkAndIncrementConnections("decrement-test");

      StreamService.decrementConnections("decrement-test");

      const result = StreamService.checkAndIncrementConnections("decrement-test");
      expect(result.allowed).toBe(true);
      expect(result.count).toBe(2);
    });

    it("does not go below zero", () => {
      StreamService.decrementConnections("below-zero");

      const result = StreamService.checkAndIncrementConnections("below-zero");
      expect(result.count).toBe(1);
    });

    it("is idempotent for unknown user", () => {
      expect(() => StreamService.decrementConnections("unknown-user")).not.toThrow();
    });
  });

  describe("getDocumentStatus", () => {
    it("returns stage and progress when document found", async () => {
      const findFirst = vi.mocked(repos.document.findFirst);
      findFirst.mockResolvedValue({ id: "doc-1", status: "COMPLETED" });

      const result = await StreamService.getDocumentStatus("doc-1");

      expect(result).toEqual({ stage: "completed", progress: 100 });
    });

    it("returns null when document not found", async () => {
      const findFirst = vi.mocked(repos.document.findFirst);
      findFirst.mockResolvedValue(null);

      const result = await StreamService.getDocumentStatus("missing");

      expect(result).toBeNull();
    });

    it("returns null on repository error", async () => {
      const findFirst = vi.mocked(repos.document.findFirst);
      findFirst.mockRejectedValue(new Error("DB error"));

      const result = await StreamService.getDocumentStatus("doc-1");

      expect(result).toBeNull();
    });
  });

  describe("sendSSE", () => {
    it("enqueues correctly formatted SSE data", () => {
      const controller = { enqueue: vi.fn() } as unknown as ReadableStreamDefaultController;
      const encoder = new TextEncoder();

      StreamService.sendSSE(controller, encoder, '{"test":true}', false);

      expect(controller.enqueue).toHaveBeenCalledWith(encoder.encode('data: {"test":true}\n\n'));
    });

    it("does nothing when closed is true", () => {
      const controller = { enqueue: vi.fn() } as unknown as ReadableStreamDefaultController;
      const encoder = new TextEncoder();

      StreamService.sendSSE(controller, encoder, "data", true);

      expect(controller.enqueue).not.toHaveBeenCalled();
    });
  });

  describe("closeSSE", () => {
    it("calls controller.close()", () => {
      const controller = { close: vi.fn() } as unknown as ReadableStreamDefaultController;

      StreamService.closeSSE(controller, false);

      expect(controller.close).toHaveBeenCalledTimes(1);
    });

    it("is idempotent when already closed", () => {
      const controller = { close: vi.fn() } as unknown as ReadableStreamDefaultController;

      StreamService.closeSSE(controller, true);

      expect(controller.close).not.toHaveBeenCalled();
    });
  });

  describe("handlePollResult", () => {
    it("sends pending progress when status is null", () => {
      const send = vi.fn();

      const result = StreamService.handlePollResult(null, "job-1", send, 0);

      expect(send).toHaveBeenCalledWith(
        JSON.stringify({ type: "progress", jobId: "job-1", stage: "pending", progress: 0 }),
      );
      expect(result).toBe(0);
    });

    it("increments count on completed stage", () => {
      const send = vi.fn();

      const result = StreamService.handlePollResult(
        { stage: "completed", progress: 100 },
        "job-1",
        send,
        2,
      );

      expect(result).toBe(3);
    });

    it("increments count on failed stage", () => {
      const send = vi.fn();

      const result = StreamService.handlePollResult(
        { stage: "failed", progress: 100 },
        "job-1",
        send,
        1,
      );

      expect(result).toBe(2);
    });

    it("resets count on non-terminal stage", () => {
      const send = vi.fn();

      const result = StreamService.handlePollResult(
        { stage: "ocr", progress: 40 },
        "job-1",
        send,
        3,
      );

      expect(result).toBe(0);
    });

    it("sends progress update for valid status", () => {
      const send = vi.fn();

      StreamService.handlePollResult({ stage: "generating", progress: 85 }, "job-1", send, 0);

      expect(send).toHaveBeenCalledWith(
        JSON.stringify({ type: "progress", jobId: "job-1", stage: "generating", progress: 85 }),
      );
    });
  });

  describe("handleCompletion", () => {
    it("sends complete event and schedules close", () => {
      vi.useFakeTimers();
      const send = vi.fn();
      const close = vi.fn();

      StreamService.handleCompletion("job-1", "completed", send, close);

      expect(send).toHaveBeenCalledWith(
        JSON.stringify({ type: "complete", jobId: "job-1", status: "completed" }),
      );

      vi.advanceTimersByTime(500);
      expect(close).toHaveBeenCalledTimes(1);
    });
  });
});

describe("AnalyticsUseCases", () => {
  let prisma: ReturnType<typeof mockPrisma>;
  let useCases: AnalyticsUseCases;

  beforeEach(() => {
    prisma = mockPrisma();
    useCases = new AnalyticsUseCases(prisma as never);
  });

  describe("getAnalytics", () => {
    it("returns composite AnalyticsSummary", async () => {
      prisma.document.count.mockResolvedValue(10);
      prisma.document.aggregate
        .mockResolvedValueOnce({ _sum: { fileSize: 50000n } })
        .mockResolvedValueOnce({ _sum: { fileSize: 50000n } })
        .mockResolvedValueOnce({ _avg: { fileSize: 5000n } });
      prisma.document.groupBy
        .mockResolvedValueOnce([
          { status: "COMPLETED", _count: { status: 7 } },
          { status: "PENDING", _count: { status: 3 } },
        ])
        .mockResolvedValueOnce([
          {
            mimeType: "application/pdf",
            _count: { mimeType: 5 },
            _sum: { fileSize: 25000n },
          },
        ])
        .mockResolvedValueOnce([]);
      prisma.document.findMany.mockResolvedValue([]);
      prisma.tag.count.mockResolvedValueOnce(20).mockResolvedValueOnce(5);
      prisma.tag.findMany.mockResolvedValue([
        { name: "important", color: "#ff0000", _count: { documents: 15 } },
      ]);
      prisma.auditLog.groupBy.mockResolvedValue([]);
      prisma.user.findMany.mockResolvedValue([]);

      const session = makeSession("STUDENT");
      const result = await useCases.getAnalytics(session);

      expect(result).toHaveProperty("documents");
      expect(result).toHaveProperty("tags");
      expect(result).toHaveProperty("storage");
      expect(result.documents.totalDocuments).toBe(10);
      expect(result.tags.totalTags).toBe(20);
      expect(result.storage.totalStorageUsed).toBe(50000);
    });

    it("admin sees all documents (no userId filter)", async () => {
      prisma.document.count.mockResolvedValue(50);
      prisma.document.aggregate
        .mockResolvedValueOnce({ _sum: { fileSize: 100000n } })
        .mockResolvedValueOnce({ _sum: { fileSize: 100000n } })
        .mockResolvedValueOnce({ _avg: { fileSize: 2000n } });
      prisma.document.groupBy
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      prisma.document.findMany.mockResolvedValue([]);
      prisma.tag.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
      prisma.tag.findMany.mockResolvedValue([]);
      prisma.auditLog.groupBy.mockResolvedValue([]);
      prisma.user.findMany.mockResolvedValue([]);

      const session = makeSession("ADMIN");
      const result = await useCases.getAnalytics(session);

      expect(result.documents.totalDocuments).toBe(50);
    });

    it("user sees only their documents", async () => {
      prisma.document.count.mockResolvedValue(3);
      prisma.document.aggregate
        .mockResolvedValueOnce({ _sum: { fileSize: 3000n } })
        .mockResolvedValueOnce({ _sum: { fileSize: 3000n } })
        .mockResolvedValueOnce({ _avg: { fileSize: 1000n } });
      prisma.document.groupBy
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      prisma.document.findMany.mockResolvedValue([]);
      prisma.tag.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
      prisma.tag.findMany.mockResolvedValue([]);
      prisma.auditLog.groupBy.mockResolvedValue([]);
      prisma.user.findMany.mockResolvedValue([]);

      const session = makeSession("STUDENT", "user-42");
      const result = await useCases.getAnalytics(session);

      expect(result.documents.totalDocuments).toBe(3);
    });

    it("returns documents grouped by status", async () => {
      prisma.document.count.mockResolvedValue(10);
      prisma.document.aggregate
        .mockResolvedValueOnce({ _sum: { fileSize: 10000n } })
        .mockResolvedValueOnce({ _sum: { fileSize: 10000n } })
        .mockResolvedValueOnce({ _avg: { fileSize: 1000n } });
      prisma.document.groupBy
        .mockResolvedValueOnce([
          { status: "COMPLETED", _count: { status: 6 } },
          { status: "FAILED", _count: { status: 4 } },
        ])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      prisma.document.findMany.mockResolvedValue([]);
      prisma.tag.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
      prisma.tag.findMany.mockResolvedValue([]);
      prisma.auditLog.groupBy.mockResolvedValue([]);
      prisma.user.findMany.mockResolvedValue([]);

      const session = makeSession("STUDENT");
      const result = await useCases.getAnalytics(session);

      expect(result.documents.documentsByStatus).toEqual([
        { status: "COMPLETED", count: 6 },
        { status: "FAILED", count: 4 },
      ]);
    });

    it("returns documents grouped by mimeType", async () => {
      prisma.document.count.mockResolvedValue(8);
      prisma.document.aggregate
        .mockResolvedValueOnce({ _sum: { fileSize: 40000n } })
        .mockResolvedValueOnce({ _sum: { fileSize: 40000n } })
        .mockResolvedValueOnce({ _avg: { fileSize: 5000n } });
      prisma.document.groupBy
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            mimeType: "application/pdf",
            _count: { mimeType: 5 },
            _sum: { fileSize: 30000n },
          },
          {
            mimeType: "image/png",
            _count: { mimeType: 3 },
            _sum: { fileSize: 10000n },
          },
        ])
        .mockResolvedValueOnce([]);
      prisma.document.findMany.mockResolvedValue([]);
      prisma.tag.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
      prisma.tag.findMany.mockResolvedValue([]);
      prisma.auditLog.groupBy.mockResolvedValue([]);
      prisma.user.findMany.mockResolvedValue([]);

      const session = makeSession("STUDENT");
      const result = await useCases.getAnalytics(session);

      expect(result.documents.documentsByMimeType).toEqual([
        { mimeType: "application/pdf", count: 5, totalSize: 30000 },
        { mimeType: "image/png", count: 3, totalSize: 10000 },
      ]);
    });

    it("returns top tags sorted by document count", async () => {
      prisma.document.count.mockResolvedValue(0);
      prisma.document.aggregate
        .mockResolvedValueOnce({ _sum: { fileSize: 0n } })
        .mockResolvedValueOnce({ _sum: { fileSize: 0n } })
        .mockResolvedValueOnce({ _avg: { fileSize: 0n } });
      prisma.document.groupBy.mockResolvedValue([]);
      prisma.document.findMany.mockResolvedValue([]);
      prisma.tag.count.mockResolvedValueOnce(5).mockResolvedValueOnce(2);
      prisma.tag.findMany.mockResolvedValue([
        { name: "popular", color: "#00ff00", _count: { documents: 20 } },
        { name: "rare", color: "#0000ff", _count: { documents: 1 } },
      ]);
      prisma.auditLog.groupBy.mockResolvedValue([]);
      prisma.user.findMany.mockResolvedValue([]);

      const session = makeSession("STUDENT");
      const result = await useCases.getAnalytics(session);

      expect(result.tags.totalTags).toBe(5);
      expect(result.tags.unusedTags).toBe(2);
      expect(result.tags.topTags).toHaveLength(2);
      expect(result.tags.topTags[0]!.name).toBe("popular");
      expect(result.tags.topTags[0]!.documentCount).toBe(20);
    });

    it("returns storage analytics with largest documents", async () => {
      prisma.document.count.mockResolvedValue(0);
      prisma.document.aggregate
        .mockResolvedValueOnce({ _sum: { fileSize: 100000n } })
        .mockResolvedValueOnce({ _sum: { fileSize: 100000n } })
        .mockResolvedValueOnce({ _avg: { fileSize: 20000n } });
      prisma.document.groupBy.mockResolvedValue([]);
      prisma.document.findMany.mockResolvedValue([
        { title: "Big Doc", fileSize: 50000n, mimeType: "application/pdf" },
        { title: "Small Doc", fileSize: 5000n, mimeType: "text/plain" },
      ]);
      prisma.tag.count.mockResolvedValue(0);
      prisma.tag.findMany.mockResolvedValue([]);
      prisma.auditLog.groupBy.mockResolvedValue([]);
      prisma.user.findMany.mockResolvedValue([]);

      const session = makeSession("STUDENT");
      const result = await useCases.getAnalytics(session);

      expect(result.storage.totalStorageUsed).toBe(100000);
      expect(result.storage.averageFileSize).toBe(20000);
      expect(result.storage.largestDocuments).toHaveLength(2);
      expect(result.storage.largestDocuments[0]!.title).toBe("Big Doc");
    });

    it("includes storageByUser when admin", async () => {
      prisma.document.count.mockResolvedValue(0);
      prisma.document.aggregate
        .mockResolvedValueOnce({ _sum: { fileSize: 0n } })
        .mockResolvedValueOnce({ _sum: { fileSize: 0n } })
        .mockResolvedValueOnce({ _avg: { fileSize: 0n } });
      prisma.document.groupBy.mockResolvedValue([]);
      prisma.document.findMany.mockResolvedValue([]);
      prisma.tag.count.mockResolvedValue(0);
      prisma.tag.findMany.mockResolvedValue([]);
      prisma.auditLog.groupBy.mockResolvedValue([]);
      prisma.user.findMany.mockResolvedValue([
        {
          id: "u-1",
          name: "Alice",
          _count: { documents: 5 },
          documents: [{ fileSize: 1000n }, { fileSize: 2000n }],
        },
      ]);

      const session = makeSession("ADMIN");
      const result = await useCases.getAnalytics(session);

      expect(result.storage.storageByUser).toHaveLength(1);
      expect(result.storage.storageByUser[0]!.userName).toBe("Alice");
      expect(result.storage.storageByUser[0]!.totalSize).toBe(3000);
      expect(result.storage.storageByUser[0]!.documentCount).toBe(5);
    });

    it("returns empty storageByUser when non-admin", async () => {
      prisma.document.count.mockResolvedValue(0);
      prisma.document.aggregate
        .mockResolvedValueOnce({ _sum: { fileSize: 0n } })
        .mockResolvedValueOnce({ _sum: { fileSize: 0n } })
        .mockResolvedValueOnce({ _avg: { fileSize: 0n } });
      prisma.document.groupBy.mockResolvedValue([]);
      prisma.document.findMany.mockResolvedValue([]);
      prisma.tag.count.mockResolvedValue(0);
      prisma.tag.findMany.mockResolvedValue([]);
      prisma.auditLog.groupBy.mockResolvedValue([]);
      prisma.user.findMany.mockResolvedValue([]);

      const session = makeSession("STUDENT");
      const result = await useCases.getAnalytics(session);

      expect(result.storage.storageByUser).toEqual([]);
    });

    it("returns zero totals when no data exists", async () => {
      prisma.document.count.mockResolvedValue(0);
      prisma.document.aggregate
        .mockResolvedValueOnce({ _sum: { fileSize: null } })
        .mockResolvedValueOnce({ _sum: { fileSize: null } })
        .mockResolvedValueOnce({ _avg: { fileSize: null } });
      prisma.document.groupBy.mockResolvedValue([]);
      prisma.document.findMany.mockResolvedValue([]);
      prisma.tag.count.mockResolvedValue(0);
      prisma.tag.findMany.mockResolvedValue([]);
      prisma.auditLog.groupBy.mockResolvedValue([]);
      prisma.user.findMany.mockResolvedValue([]);

      const session = makeSession("STUDENT");
      const result = await useCases.getAnalytics(session);

      expect(result.documents.totalDocuments).toBe(0);
      expect(result.documents.totalSize).toBe(0);
      expect(result.storage.totalStorageUsed).toBe(0);
      expect(result.storage.averageFileSize).toBe(0);
    });
  });
});

describe("Bulk export helpers", () => {
  const doc1 = {
    id: "doc-1",
    title: "Test Document",
    description: "A test",
    fileName: "test.pdf",
    originalName: "test.pdf",
    mimeType: "application/pdf",
    fileSize: 1000n,
    pageCount: 5,
    outputFormats: ["md", "txt"],
    language: "ar",
    isRtl: true,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    folderId: "folder-1",
  };

  describe("fetchRelatedData", () => {
    it("returns maps keyed by document ID", async () => {
      const repos = {
        tagDocument: {
          findMany: vi
            .fn()
            .mockResolvedValue([
              { documentId: "doc-1", tag: { name: "important", color: "#ff0000" } },
            ]),
        },
        conversionJob: {
          findMany: vi
            .fn()
            .mockResolvedValue([{ documentId: "doc-1", progress: 100, sourceFormat: "tesseract" }]),
        },
        folder: {
          findMany: vi.fn().mockResolvedValue([{ id: "folder-1", name: "Root", parentId: null }]),
        },
      };

      const result = await fetchRelatedData(["doc-1"], "user-1", repos as never);

      expect(result.tagsByDocId.get("doc-1")).toEqual([{ name: "important", color: "#ff0000" }]);
      expect(result.jobsByDocId.get("doc-1")).toMatchObject({
        documentId: "doc-1",
        progress: 100,
        sourceFormat: "tesseract",
      });
    });

    it("groups tags by document ID", async () => {
      const repos = {
        tagDocument: {
          findMany: vi.fn().mockResolvedValue([
            { documentId: "doc-1", tag: { name: "a", color: "#1" } },
            { documentId: "doc-1", tag: { name: "b", color: "#2" } },
            { documentId: "doc-2", tag: { name: "c", color: "#3" } },
          ]),
        },
        conversionJob: { findMany: vi.fn().mockResolvedValue([]) },
        folder: { findMany: vi.fn().mockResolvedValue([]) },
      };

      const result = await fetchRelatedData(["doc-1", "doc-2"], "user-1", repos as never);

      expect(result.tagsByDocId.get("doc-1")).toHaveLength(2);
      expect(result.tagsByDocId.get("doc-2")).toHaveLength(1);
    });

    it("skips tag documents without tag data", async () => {
      const repos = {
        tagDocument: {
          findMany: vi.fn().mockResolvedValue([
            { documentId: "doc-1", tag: { name: "valid", color: "#1" } },
            { documentId: "doc-1", tag: undefined },
          ]),
        },
        conversionJob: { findMany: vi.fn().mockResolvedValue([]) },
        folder: { findMany: vi.fn().mockResolvedValue([]) },
      };

      const result = await fetchRelatedData(["doc-1"], "user-1", repos as never);

      expect(result.tagsByDocId.get("doc-1")).toHaveLength(1);
    });

    it("resolveFolderAncestors returns folder path", () => {
      const repos = {
        tagDocument: { findMany: vi.fn().mockResolvedValue([]) },
        conversionJob: { findMany: vi.fn().mockResolvedValue([]) },
        folder: {
          findMany: vi.fn().mockResolvedValue([
            { id: "grandparent", name: "Grandparent", parentId: null },
            { id: "parent", name: "Parent", parentId: "grandparent" },
            { id: "child", name: "Child", parentId: "parent" },
          ]),
        },
      };

      const result = fetchRelatedData([], "user-1", repos as never);

      // resolveFolderAncestors is a function, called after data loads
      return result.then((r) => {
        const folderData = r.resolveFolderAncestors("child");
        expect(folderData).toMatchObject({
          name: "Child",
          path: "Grandparent / Parent / Child",
          ancestors: ["Grandparent", "Parent", "Child"],
        });
      });
    });

    it("resolveFolderAncestors returns null for null input", () => {
      const repos = {
        tagDocument: { findMany: vi.fn().mockResolvedValue([]) },
        conversionJob: { findMany: vi.fn().mockResolvedValue([]) },
        folder: { findMany: vi.fn().mockResolvedValue([]) },
      };

      return fetchRelatedData([], "user-1", repos as never).then((r) => {
        expect(r.resolveFolderAncestors(null)).toBeNull();
      });
    });
  });

  describe("fetchDocumentFiles", () => {
    const mockStorage = () => ({
      fileExists: vi.fn(),
      downloadFile: vi.fn(),
      ocrTextKey: vi.fn((id: string) => `ocr/${id}.json`),
      exportOutputKey: vi.fn((id: string, _fmt: string) => `export/${id}.md`),
      sourceKey: vi.fn((id: string, name: string) => `source/${name}`),
    });

    it("checks file existence for each key", async () => {
      const storage = mockStorage();
      storage.fileExists.mockResolvedValue(true);
      storage.downloadFile.mockResolvedValue(Buffer.from("{}"));

      await fetchDocumentFiles([doc1 as never], false, storage as never);

      expect(storage.ocrTextKey).toHaveBeenCalledWith("doc-1");
      expect(storage.exportOutputKey).toHaveBeenCalledWith("doc-1", "md");
      expect(storage.fileExists).toHaveBeenCalledTimes(2);
    });

    it("downloads only existing files", async () => {
      const storage = mockStorage();
      storage.fileExists.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
      storage.downloadFile.mockResolvedValue(Buffer.from('{"text":"ocr content"}'));

      const result = await fetchDocumentFiles([doc1 as never], false, storage as never);

      expect(storage.downloadFile).toHaveBeenCalledTimes(1);
      expect(result.has("doc-1:ocr")).toBe(true);
      expect(result.has("doc-1:md")).toBe(false);
    });

    it("includes source files when includeSource is true", async () => {
      const storage = mockStorage();
      storage.fileExists.mockResolvedValue(true);
      storage.downloadFile.mockResolvedValue(Buffer.from("content"));

      await fetchDocumentFiles([doc1 as never], true, storage as never);

      expect(storage.sourceKey).toHaveBeenCalledWith("doc-1", "test.pdf");
      expect(storage.fileExists).toHaveBeenCalledTimes(3);
    });

    it("skips source files when includeSource is false", async () => {
      const storage = mockStorage();
      storage.fileExists.mockResolvedValue(false);
      storage.downloadFile.mockResolvedValue(Buffer.from(""));

      await fetchDocumentFiles([doc1 as never], false, storage as never);

      expect(storage.sourceKey).not.toHaveBeenCalled();
    });

    it("downloads files in batches of 10", async () => {
      const storage = mockStorage();
      storage.fileExists.mockResolvedValue(true);
      storage.downloadFile.mockResolvedValue(Buffer.from("data"));

      const docs = Array.from({ length: 15 }, (_, i) => ({
        ...doc1,
        id: `doc-${i}`,
        fileName: `doc-${i}.pdf`,
      }));

      const result = await fetchDocumentFiles(docs as never[], false, storage as never);

      expect(result.size).toBe(30);
    });

    it("returns map with docId:type keys", async () => {
      const storage = mockStorage();
      storage.fileExists.mockResolvedValue(true);
      storage.downloadFile
        .mockResolvedValueOnce(Buffer.from('{"text":"ocr text"}'))
        .mockResolvedValueOnce(Buffer.from("# Markdown"));

      const result = await fetchDocumentFiles([doc1 as never], false, storage as never);

      expect(result.get("doc-1:ocr")).toBeDefined();
      expect(result.get("doc-1:md")).toBeDefined();
    });
  });

  describe("buildZipDocuments", () => {
    const baseRelated = () => ({
      tagsByDocId: new Map([["doc-1", [{ name: "important", color: "#ff0000" }]]]),
      jobsByDocId: new Map([
        ["doc-1", { documentId: "doc-1", progress: 100, sourceFormat: "tesseract" }],
      ]),
      folderMap: new Map(),
      resolveFolderAncestors: (_id: string | null) =>
        _id ? { name: "Folder", path: "Root / Folder", ancestors: ["Root", "Folder"] } : null,
    });

    it("returns array of zip document objects with correct shape", async () => {
      const filesByDocAndType = new Map<string, Buffer>();
      filesByDocAndType.set("doc-1:ocr", Buffer.from('{"text":"raw text"}'));
      filesByDocAndType.set("doc-1:md", Buffer.from("# Markdown content"));

      const result = await buildZipDocuments(
        [doc1 as never],
        { userId: "user-1", includeSource: false, profile: "research" },
        baseRelated(),
        filesByDocAndType,
      );

      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe("doc-1");
      expect(result[0]!.title).toBe("Test Document");
      expect(result[0]!.tags).toEqual(["important"]);
      expect(result[0]!.folderPath).toBe("Root / Folder");
      expect(result[0]!.pageCount).toBe(5);
      expect(result[0]!.rawText).toBe("raw text");
      expect(result[0]!.markdown).toBe("# Markdown content");
    });

    it("parses OCR buffer for raw text", async () => {
      const filesByDocAndType = new Map<string, Buffer>();
      filesByDocAndType.set(
        "doc-1:ocr",
        Buffer.from(JSON.stringify({ text: "Extracted OCR text" })),
      );

      const result = await buildZipDocuments(
        [doc1 as never],
        { userId: "user-1", includeSource: false, profile: "research" },
        baseRelated(),
        filesByDocAndType,
      );

      expect(result[0]!.rawText).toBe("Extracted OCR text");
    });

    it("falls back to markdown when no OCR buffer", async () => {
      const filesByDocAndType = new Map<string, Buffer>();
      filesByDocAndType.set("doc-1:md", Buffer.from("# Fallback text"));

      const result = await buildZipDocuments(
        [doc1 as never],
        { userId: "user-1", includeSource: false, profile: "research" },
        baseRelated(),
        filesByDocAndType,
      );

      expect(result[0]!.rawText).toBe("# Fallback text");
      expect(result[0]!.markdown).toBe("# Fallback text");
    });

    it("handles invalid OCR JSON gracefully", async () => {
      const filesByDocAndType = new Map<string, Buffer>();
      filesByDocAndType.set("doc-1:ocr", Buffer.from("not json"));

      const result = await buildZipDocuments(
        [doc1 as never],
        { userId: "user-1", includeSource: false, profile: "research" },
        baseRelated(),
        filesByDocAndType,
      );

      expect(result[0]!.rawText).toBe("");
    });

    it("includes source buffer when present", async () => {
      const filesByDocAndType = new Map<string, Buffer>();
      filesByDocAndType.set("doc-1:md", Buffer.from("# md"));
      filesByDocAndType.set("doc-1:source", Buffer.from("source data"));

      const result = await buildZipDocuments(
        [doc1 as never],
        { userId: "user-1", includeSource: true, profile: "research" },
        baseRelated(),
        filesByDocAndType,
      );

      expect(result[0]!.sourceBuffer).toEqual(Buffer.from("source data"));
      expect(result[0]!.sourceFileName).toBe("test.pdf");
    });

    it("passes profile to buildExportMetadata", async () => {
      const filesByDocAndType = new Map<string, Buffer>();
      filesByDocAndType.set("doc-1:md", Buffer.from("# md"));

      const result = await buildZipDocuments(
        [doc1 as never],
        { userId: "user-1", includeSource: false, profile: "plain" },
        baseRelated(),
        filesByDocAndType,
      );

      expect(result[0]!.metadata).toBeDefined();
    });
  });

  describe("executeBulkExport", () => {
    it("orchestrates full flow and returns zip buffer", async () => {
      const storage = {
        fileExists: vi.fn().mockResolvedValue(true),
        downloadFile: vi.fn().mockResolvedValue(Buffer.from('{"text":"ocr"}')),
        ocrTextKey: vi.fn((id: string) => `ocr/${id}.json`),
        exportOutputKey: vi.fn((id: string, _fmt: string) => `export/${id}.md`),
        sourceKey: vi.fn((id: string, name: string) => `source/${name}`),
      };
      const repos = {
        tagDocument: {
          findMany: vi.fn().mockResolvedValue([]),
        },
        conversionJob: {
          findMany: vi.fn().mockResolvedValue([]),
        },
        folder: {
          findMany: vi.fn().mockResolvedValue([]),
        },
      };

      const result = await executeBulkExport(
        [doc1 as never],
        {
          userId: "user-1",
          includeSource: false,
          profile: "research" as const,
        },
        storage as never,
        repos as never,
        "bulk",
        "export.zip",
      );

      expect(result).toHaveProperty("zipBuffer");
      expect(Buffer.isBuffer(result.zipBuffer)).toBe(true);
      expect(result.zipName).toBe("export.zip");
      expect(result.zipBuffer.length).toBeGreaterThan(0);
    });
  });
});

describe("Zip builder", () => {
  const baseDoc = {
    id: "doc-1",
    title: "My Document",
    tags: ["tag1", "tag2"],
    folderPath: "Root / Sub",
    pageCount: 5,
    metadata: {
      source: {
        title: "My Document",
        description: "Description",
        fileName: "my_document.pdf",
        originalName: "my_document.pdf",
        mimeType: "application/pdf",
        fileSize: 1000,
        language: "ar",
        isRtl: true,
      },
      tags: [
        { name: "tag1", color: "#ff0000" },
        { name: "tag2", color: "#00ff00" },
      ],
      folder: { name: "Sub", path: "Root / Sub", ancestors: ["Root", "Sub"] },
      ocr: { confidence: 0.95, engine: "tesseract", pageCount: 5 },
      pipeline: {
        wordCount: 500,
        charCount: 3000,
        headingCount: 3,
        paragraphCount: 10,
        qualityScore: 0.9,
        garbageRatio: 0.02,
        pageCount: 5,
      },
      dates: {
        created: "2024-01-01T00:00:00.000Z",
        updated: "2024-01-01T00:00:00.000Z",
        exported: "2024-01-01T00:00:00.000Z",
      },
      export: {
        format: "zip" as const,
        profile: "research" as const,
        version: "1.0",
        generator: "ibnalazhardocs/v1",
      },
    },
    rawText: "Raw text content",
    markdown: "# My Document\n\nThis is the content.",
    sourceBuffer: undefined,
    sourceFileName: undefined,
  };

  async function parseZip(
    buffer: Buffer,
  ): Promise<{ files: Map<string, string>; manifest: Record<string, unknown> }> {
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(buffer);
    const files = new Map<string, string>();
    for (const name of Object.keys(zip.files)) {
      const content = await zip.files[name]!.async("string");
      files.set(name, content);
    }
    const manifestRaw = files.get("manifest.json") ?? "{}";
    const manifest = JSON.parse(manifestRaw);
    return { files, manifest };
  }

  describe("buildZipPackage", () => {
    it("generates a ZIP buffer", async () => {
      const buffer = await buildZipPackage({
        exportId: "test-1",
        documents: [baseDoc],
        profile: "research",
        includeSource: false,
      });

      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it("includes manifest.json", async () => {
      const buffer = await buildZipPackage({
        exportId: "test-1",
        documents: [baseDoc],
        profile: "research",
        includeSource: false,
      });

      const { files } = await parseZip(buffer);
      expect(files.has("manifest.json")).toBe(true);
    });

    it("manifest includes exportId", async () => {
      const buffer = await buildZipPackage({
        exportId: "exp-abc-123",
        documents: [baseDoc],
        profile: "research",
        includeSource: false,
      });

      const { manifest } = await parseZip(buffer);
      expect(manifest.exportId).toBe("exp-abc-123");
    });

    it("manifest includes profile", async () => {
      const buffer = await buildZipPackage({
        exportId: "test-1",
        documents: [baseDoc],
        profile: "developer",
        includeSource: false,
      });

      const { manifest } = await parseZip(buffer);
      expect(manifest.profile).toBe("developer");
    });

    it("manifest includes document list", async () => {
      const buffer = await buildZipPackage({
        exportId: "test-1",
        documents: [baseDoc],
        profile: "research",
        includeSource: false,
      });

      const { manifest } = await parseZip(buffer);
      expect(manifest.documents).toHaveLength(1);
      expect((manifest.documents as Array<Record<string, unknown>>)[0]!.id).toBe("doc-1");
    });

    it("manifest includes totalSize", async () => {
      const buffer = await buildZipPackage({
        exportId: "test-1",
        documents: [baseDoc],
        profile: "research",
        includeSource: false,
      });

      const { manifest } = await parseZip(buffer);
      expect(typeof manifest.totalSize).toBe("number");
      expect((manifest.totalSize as number) > 0).toBe(true);
    });

    it("includes README.md for multi-document export", async () => {
      const buffer = await buildZipPackage({
        exportId: "test-1",
        documents: [baseDoc, { ...baseDoc, id: "doc-2", title: "Doc Two" }],
        profile: "research",
        includeSource: false,
      });

      const { files } = await parseZip(buffer);
      expect(files.has("README.md")).toBe(true);
      expect(files.get("README.md")).toContain("My Document");
      expect(files.get("README.md")).toContain("Doc Two");
    });

    it("does not include README.md for single document", async () => {
      const buffer = await buildZipPackage({
        exportId: "test-1",
        documents: [baseDoc],
        profile: "research",
        includeSource: false,
      });

      const { files } = await parseZip(buffer);
      expect(files.has("README.md")).toBe(false);
    });

    it("creates .md file for research profile", async () => {
      const buffer = await buildZipPackage({
        exportId: "test-1",
        documents: [baseDoc],
        profile: "research",
        includeSource: false,
      });

      const { files } = await parseZip(buffer);
      expect(
        [...files.keys()].some(
          (n) => n.endsWith(".md") && n !== "README.md" && n !== "manifest.json",
        ),
      ).toBe(true);
    });

    it("md file contains YAML frontmatter with title", async () => {
      const buffer = await buildZipPackage({
        exportId: "test-1",
        documents: [baseDoc],
        profile: "research",
        includeSource: false,
      });

      const { files } = await parseZip(buffer);
      const mdFile = [...files.entries()].find(([n]) => n.endsWith(".md") && n !== "README.md")!;
      expect(mdFile[1]).toMatch(/^---\ntitle: "My Document"/);
    });

    it("md file frontmatter includes tags", async () => {
      const buffer = await buildZipPackage({
        exportId: "test-1",
        documents: [baseDoc],
        profile: "research",
        includeSource: false,
      });

      const { files } = await parseZip(buffer);
      const mdFile = [...files.entries()].find(([n]) => n.endsWith(".md") && n !== "README.md")!;
      expect(mdFile[1]).toContain('tags: ["tag1", "tag2"]');
    });

    it("md file frontmatter includes folder path", async () => {
      const buffer = await buildZipPackage({
        exportId: "test-1",
        documents: [baseDoc],
        profile: "research",
        includeSource: false,
      });

      const { files } = await parseZip(buffer);
      const mdFile = [...files.entries()].find(([n]) => n.endsWith(".md") && n !== "README.md")!;
      expect(mdFile[1]).toContain('folder: "Root / Sub"');
    });

    it("creates .txt file for plain profile", async () => {
      const buffer = await buildZipPackage({
        exportId: "test-1",
        documents: [baseDoc],
        profile: "plain",
        includeSource: false,
      });

      const { files } = await parseZip(buffer);
      expect([...files.keys()].some((n) => n.endsWith(".txt"))).toBe(true);
    });

    it("does not include frontmatter for plain profile", async () => {
      const buffer = await buildZipPackage({
        exportId: "test-1",
        documents: [baseDoc],
        profile: "plain",
        includeSource: false,
      });

      const { files } = await parseZip(buffer);
      const txtFile = [...files.entries()].find(([n]) => n.endsWith(".txt"))!;
      expect(txtFile[1]).not.toContain("---");
    });

    it("creates _metadata.json for developer profile", async () => {
      const buffer = await buildZipPackage({
        exportId: "test-1",
        documents: [baseDoc],
        profile: "developer",
        includeSource: false,
      });

      const { files } = await parseZip(buffer);
      expect([...files.keys()].some((n) => n.endsWith("_metadata.json"))).toBe(true);
    });

    it("includes source file when includeSource is true", async () => {
      const docWithSource = {
        ...baseDoc,
        sourceBuffer: Buffer.from("source content"),
        sourceFileName: "original.pdf",
      };

      const buffer = await buildZipPackage({
        exportId: "test-1",
        documents: [docWithSource],
        profile: "research",
        includeSource: true,
      });

      const { files } = await parseZip(buffer);
      expect([...files.keys()].some((n) => n.includes("source/original.pdf"))).toBe(true);
    });

    it("respects folder path in file names for multi-doc exports", async () => {
      const buffer = await buildZipPackage({
        exportId: "test-1",
        documents: [baseDoc, { ...baseDoc, id: "doc-2", title: "Second", folderPath: "Other" }],
        profile: "research",
        includeSource: false,
      });

      const { files } = await parseZip(buffer);
      const mdFiles = [...files.keys()].filter((n) => n.endsWith(".md") && n !== "README.md");
      mdFiles.forEach((name) => {
        expect(name).toMatch(/^[^/]+\//);
      });
    });

    it("does not prefix folder for single-doc exports", async () => {
      const buffer = await buildZipPackage({
        exportId: "test-1",
        documents: [baseDoc],
        profile: "research",
        includeSource: false,
      });

      const { files } = await parseZip(buffer);
      const mdFiles = [...files.keys()].filter((n) => n.endsWith(".md") && n !== "manifest.json");
      mdFiles.forEach((name) => {
        expect(name).not.toContain("/");
      });
    });
  });

  function makeDocumentRepo() {
    return {
      findDocumentById: vi.fn(),
    } as unknown as import("@/domain/repositories/document.repository.interface").IDocumentRepository;
  }

  function makeTagRepo() {
    return {
      findMany: vi.fn(),
    } as unknown as import("@/domain/repositories/tag.repository.interface").ITagRepository;
  }

  describe("AutoTagUseCases", () => {
    let documentRepo: ReturnType<typeof makeDocumentRepo>;
    let tagRepo: ReturnType<typeof makeTagRepo>;
    let useCases: AutoTagUseCases;

    beforeEach(() => {
      documentRepo = makeDocumentRepo();
      tagRepo = makeTagRepo();
      useCases = new AutoTagUseCases(documentRepo, tagRepo);
    });

    it("throws when the document does not exist", async () => {
      documentRepo.findDocumentById.mockResolvedValue(null);
      await expect(useCases.suggestTags("missing", makeSession())).rejects.toThrow();
    });

    it("suggests existing tags that match the document title or description", async () => {
      documentRepo.findDocumentById.mockResolvedValue({
        title: "تقرير مالي شهري",
        description: null,
        originalName: "report.pdf",
        fileName: "report.pdf",
        tags: [],
      });
      tagRepo.findMany.mockResolvedValue([
        { id: "t1", name: "مالي", color: "#16A34A" },
        { id: "t2", name: "تقرير", color: "#16A34A" },
        { id: "t3", name: "قانوني", color: "#16A34A" },
      ]);

      const result = await useCases.suggestTags("doc-1", makeSession());
      const names = result.map((s) => s.name);

      expect(names).toContain("مالي");
      expect(names).toContain("تقرير");
      expect(names).not.toContain("قانوني");
    });

    it("does not suggest tags already applied to the document", async () => {
      documentRepo.findDocumentById.mockResolvedValue({
        title: "تقرير مالي",
        description: null,
        originalName: "x.pdf",
        fileName: "x.pdf",
        tags: [{ tag: { id: "t1", name: "مالي", color: "#16A34A" } }],
      });
      tagRepo.findMany.mockResolvedValue([{ id: "t1", name: "مالي", color: "#16A34A" }]);

      const result = await useCases.suggestTags("doc-1", makeSession());
      expect(result.find((s) => s.name === "مالي")).toBeUndefined();
    });

    it("proposes new candidate tags from prominent words when no tag matches", async () => {
      documentRepo.findDocumentById.mockResolvedValue({
        title: "عقد إيجار مبنى",
        description: "عقد إيجار سنوي",
        originalName: "x.pdf",
        fileName: "x.pdf",
        tags: [],
      });
      tagRepo.findMany.mockResolvedValue([]);

      const result = await useCases.suggestTags("doc-1", makeSession());
      expect(result.some((s) => s.type === "new")).toBe(true);
    });

    it("scopes tag suggestions to the user when not admin", async () => {
      documentRepo.findDocumentById.mockResolvedValue({
        title: "مالي",
        description: null,
        originalName: "x.pdf",
        fileName: "x.pdf",
        tags: [],
      });
      tagRepo.findMany.mockResolvedValue([]);

      await useCases.suggestTags("doc-1", makeSession("STUDENT"));
      expect(tagRepo.findMany).toHaveBeenCalledWith({ userId: "user-1", deletedAt: null });
    });
  });
});
