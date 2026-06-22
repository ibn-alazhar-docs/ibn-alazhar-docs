import { describe, it, expect } from "vitest";
import { toUserId, toDocumentId, toFolderId, toTagId } from "@/lib/types";

describe("toUserId", () => {
  it("returns the input string", () => {
    expect(toUserId("user-123")).toBe("user-123");
  });

  it("empty string returns empty string", () => {
    expect(toUserId("")).toBe("");
  });

  it("preserves unicode", () => {
    expect(toUserId("مستخدم-1")).toBe("مستخدم-1");
  });
});

describe("toDocumentId", () => {
  it("returns the input string", () => {
    expect(toDocumentId("doc-456")).toBe("doc-456");
  });

  it("empty string returns empty string", () => {
    expect(toDocumentId("")).toBe("");
  });
});

describe("toFolderId", () => {
  it("returns the input string", () => {
    expect(toFolderId("folder-789")).toBe("folder-789");
  });

  it("empty string returns empty string", () => {
    expect(toFolderId("")).toBe("");
  });
});

describe("toTagId", () => {
  it("returns the input string", () => {
    expect(toTagId("tag-012")).toBe("tag-012");
  });

  it("empty string returns empty string", () => {
    expect(toTagId("")).toBe("");
  });
});
