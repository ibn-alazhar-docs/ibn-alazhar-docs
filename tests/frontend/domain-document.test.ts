import { describe, it, expect } from "vitest";
import {
  isDocumentOwner,
  isDocumentDeleted,
  canDeleteDocument,
  canRestoreDocument,
  isValidStatusTransition,
  getValidTransitions,
  isTerminalStatus,
  formatFileSize,
} from "../../apps/web/src/domain/document";
import type { DomainDocument, DocStatus } from "../../apps/web/src/domain/types";

function makeDoc(overrides: Partial<DomainDocument> = {}): DomainDocument {
  return {
    id: "doc-1",
    userId: "user-1",
    folderId: null,
    title: "Test Doc",
    description: null,
    fileName: "test.pdf",
    originalName: "test.pdf",
    mimeType: "application/pdf",
    fileSize: 1024,
    storageKey: "test/doc-1.pdf",
    status: "COMPLETED",
    pageCount: null,
    pageRange: null,
    outputFormats: [],
    outputKeys: null,
    language: "ar",
    isRtl: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

describe("Domain: Document", () => {
  describe("isDocumentOwner", () => {
    it("returns true when userId matches", () => {
      const doc = makeDoc({ userId: "user-1" });
      expect(isDocumentOwner(doc, "user-1")).toBe(true);
    });

    it("returns false when userId differs", () => {
      const doc = makeDoc({ userId: "user-1" });
      expect(isDocumentOwner(doc, "user-2")).toBe(false);
    });
  });

  describe("isDocumentDeleted", () => {
    it("returns false when deletedAt is null", () => {
      const doc = makeDoc({ deletedAt: null });
      expect(isDocumentDeleted(doc)).toBe(false);
    });

    it("returns true when deletedAt is set", () => {
      const doc = makeDoc({ deletedAt: new Date() });
      expect(isDocumentDeleted(doc)).toBe(true);
    });
  });

  describe("canDeleteDocument", () => {
    it("returns true for active non-archived doc", () => {
      const doc = makeDoc({ deletedAt: null, status: "COMPLETED" });
      expect(canDeleteDocument(doc)).toBe(true);
    });

    it("returns false for deleted doc", () => {
      const doc = makeDoc({ deletedAt: new Date(), status: "COMPLETED" });
      expect(canDeleteDocument(doc)).toBe(false);
    });

    it("returns false for archived doc", () => {
      const doc = makeDoc({ deletedAt: null, status: "ARCHIVED" });
      expect(canDeleteDocument(doc)).toBe(false);
    });
  });

  describe("canRestoreDocument", () => {
    it("returns true for deleted doc", () => {
      const doc = makeDoc({ deletedAt: new Date() });
      expect(canRestoreDocument(doc)).toBe(true);
    });

    it("returns false for active doc", () => {
      const doc = makeDoc({ deletedAt: null });
      expect(canRestoreDocument(doc)).toBe(false);
    });
  });

  describe("isValidStatusTransition", () => {
    it("allows valid transitions", () => {
      expect(isValidStatusTransition("UPLOADED", "VALIDATING")).toBe(true);
      expect(isValidStatusTransition("VALIDATING", "SPLITTING")).toBe(true);
      expect(isValidStatusTransition("GENERATING", "COMPLETED")).toBe(true);
      expect(isValidStatusTransition("FAILED", "UPLOADED")).toBe(true);
    });

    it("rejects invalid transitions", () => {
      expect(isValidStatusTransition("UPLOADED", "COMPLETED")).toBe(false);
      expect(isValidStatusTransition("COMPLETED", "UPLOADED")).toBe(false);
      expect(isValidStatusTransition("ARCHIVED", "UPLOADED")).toBe(false);
    });
  });

  describe("getValidTransitions", () => {
    it("returns correct transitions for UPLOADED", () => {
      expect(getValidTransitions("UPLOADED")).toEqual(["VALIDATING", "FAILED"]);
    });

    it("returns empty for ARCHIVED", () => {
      expect(getValidTransitions("ARCHIVED")).toEqual([]);
    });
  });

  describe("isTerminalStatus", () => {
    it("ARCHIVED is terminal", () => {
      expect(isTerminalStatus("ARCHIVED")).toBe(true);
    });

    it("COMPLETED is not terminal", () => {
      expect(isTerminalStatus("COMPLETED")).toBe(false);
    });
  });

  describe("formatFileSize", () => {
    it("formats bytes", () => {
      expect(formatFileSize(500)).toBe("500 B");
    });

    it("formats kilobytes", () => {
      expect(formatFileSize(1536)).toBe("1.5 KB");
    });

    it("formats megabytes", () => {
      expect(formatFileSize(1048576)).toBe("1.0 MB");
    });

    it("formats gigabytes", () => {
      expect(formatFileSize(1073741824)).toBe("1.0 GB");
    });
  });
});
