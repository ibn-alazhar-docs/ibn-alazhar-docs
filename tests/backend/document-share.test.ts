import { describe, it, expect, vi, beforeEach } from "vitest";
import { DocumentShareUseCases } from "@/core/services/document-share.use-cases";
import type { IDocumentRepository } from "@/domain/repositories/document.repository.interface";
import type { IShareRepository } from "@/domain/repositories/share.repository.interface";
import { NotFoundError, AppError } from "@/shared/errors";

function makeDoc(overrides: Record<string, unknown> = {}) {
  return {
    id: "doc-1",
    userId: "user-1",
    title: "Test",
    status: "COMPLETED",
    ...overrides,
  };
}

function makeShare(overrides: Record<string, unknown> = {}) {
  return {
    id: "share-1",
    token: "abc123",
    documentId: "doc-1",
    userId: "user-1",
    expiresAt: null,
    createdAt: new Date(),
    document: { title: "Test" },
    ...overrides,
  };
}

describe("DocumentShareUseCases", () => {
  let documentRepo: {
    findDocumentById: ReturnType<typeof vi.fn>;
  };
  let shareRepo: {
    findShareLinkByDocumentId: ReturnType<typeof vi.fn>;
    createShareLink: ReturnType<typeof vi.fn>;
    updateShareLinkToken: ReturnType<typeof vi.fn>;
    deleteShareLinkByDocumentId: ReturnType<typeof vi.fn>;
  };
  let useCases: DocumentShareUseCases;

  beforeEach(() => {
    documentRepo = { findDocumentById: vi.fn() };
    shareRepo = {
      findShareLinkByDocumentId: vi.fn(),
      createShareLink: vi.fn(),
      updateShareLinkToken: vi.fn(),
      deleteShareLinkByDocumentId: vi.fn(),
    };
    useCases = new DocumentShareUseCases(
      documentRepo as unknown as IDocumentRepository,
      shareRepo as unknown as IShareRepository,
    );
  });

  describe("getShareLink", () => {
    it("returns share link when it exists", async () => {
      shareRepo.findShareLinkByDocumentId.mockResolvedValue(makeShare());

      const result = await useCases.getShareLink("doc-1", "user-1");

      expect(result).toEqual(expect.objectContaining({ token: "abc123" }));
    });

    it("returns null when no share link exists", async () => {
      shareRepo.findShareLinkByDocumentId.mockResolvedValue(null);

      const result = await useCases.getShareLink("doc-1", "user-1");

      expect(result).toBeNull();
    });
  });

  describe("createShareLink", () => {
    it("creates a share link for a completed document", async () => {
      documentRepo.findDocumentById.mockResolvedValue(makeDoc());
      shareRepo.findShareLinkByDocumentId.mockResolvedValue(null);
      shareRepo.createShareLink.mockResolvedValue(makeShare());

      const result = await useCases.createShareLink("doc-1", "user-1", "never");

      expect(shareRepo.createShareLink).toHaveBeenCalled();
    });

    it("returns existing share link if one already exists", async () => {
      documentRepo.findDocumentById.mockResolvedValue(makeDoc());
      const existing = makeShare();
      shareRepo.findShareLinkByDocumentId.mockResolvedValue(existing);

      const result = await useCases.createShareLink("doc-1", "user-1", "never");

      expect(result).toEqual(existing);
      expect(shareRepo.createShareLink).not.toHaveBeenCalled();
    });

    it("throws NotFoundError when document not found", async () => {
      documentRepo.findDocumentById.mockResolvedValue(null);

      await expect(useCases.createShareLink("missing", "user-1", null)).rejects.toThrow(
        NotFoundError,
      );
    });

    it("throws when document not ready", async () => {
      documentRepo.findDocumentById.mockResolvedValue(makeDoc({ status: "PROCESSING" }));

      await expect(useCases.createShareLink("doc-1", "user-1", null)).rejects.toThrow(AppError);
    });
  });

  describe("regenerateShareLink", () => {
    it("regenerates token for existing share link", async () => {
      documentRepo.findDocumentById.mockResolvedValue(makeDoc());
      shareRepo.findShareLinkByDocumentId.mockResolvedValue(makeShare());
      shareRepo.updateShareLinkToken.mockResolvedValue(makeShare({ token: "new-token" }));

      const result = await useCases.regenerateShareLink("doc-1", "user-1");

      expect(result.token).toBe("new-token");
    });

    it("throws when no share link exists", async () => {
      documentRepo.findDocumentById.mockResolvedValue(makeDoc());
      shareRepo.findShareLinkByDocumentId.mockResolvedValue(null);

      await expect(useCases.regenerateShareLink("doc-1", "user-1")).rejects.toThrow(AppError);
    });
  });

  describe("deleteShareLink", () => {
    it("deletes share link", async () => {
      documentRepo.findDocumentById.mockResolvedValue(makeDoc());
      shareRepo.findShareLinkByDocumentId.mockResolvedValue(makeShare());
      shareRepo.deleteShareLinkByDocumentId.mockResolvedValue({ count: 1 });

      const result = await useCases.deleteShareLink("doc-1", "user-1");

      expect(result).toBe(true);
    });

    it("throws when no share link exists", async () => {
      documentRepo.findDocumentById.mockResolvedValue(makeDoc());
      shareRepo.findShareLinkByDocumentId.mockResolvedValue(null);

      await expect(useCases.deleteShareLink("doc-1", "user-1")).rejects.toThrow(AppError);
    });
  });
});
