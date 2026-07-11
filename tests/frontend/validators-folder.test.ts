import { describe, it, expect } from "vitest";
import {
  createFolderSchema,
  renameFolderSchema,
  moveFolderSchema,
  MAX_FOLDER_DEPTH,
} from "@/shared/validators/folder";

describe("MAX_FOLDER_DEPTH", () => {
  it("is 5", () => {
    expect(MAX_FOLDER_DEPTH).toBe(5);
  });
});

describe("createFolderSchema", () => {
  it("valid name passes", () => {
    const result = createFolderSchema.safeParse({ name: "تفسير" });
    expect(result.success).toBe(true);
  });

  it("empty name fails", () => {
    const result = createFolderSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("name > 100 chars fails", () => {
    const result = createFolderSchema.safeParse({ name: "أ".repeat(101) });
    expect(result.success).toBe(false);
  });

  it("name is trimmed", () => {
    const result = createFolderSchema.parse({ name: "  تفسير  " });
    expect(result.name).toBe("تفسير");
  });

  it("valid hex color passes", () => {
    const result = createFolderSchema.safeParse({ name: "folder", color: "#FF0000" });
    expect(result.success).toBe(true);
  });

  it("lowercase hex color passes", () => {
    const result = createFolderSchema.safeParse({ name: "folder", color: "#ff00aa" });
    expect(result.success).toBe(true);
  });

  it("invalid color fails", () => {
    const result = createFolderSchema.safeParse({ name: "folder", color: "red" });
    expect(result.success).toBe(false);
  });

  it("color without # fails", () => {
    const result = createFolderSchema.safeParse({ name: "folder", color: "FF0000" });
    expect(result.success).toBe(false);
  });

  it("nullable color accepted", () => {
    const result = createFolderSchema.safeParse({ name: "folder", color: null });
    expect(result.success).toBe(true);
  });

  it("nullable parentId accepted", () => {
    const result = createFolderSchema.safeParse({ name: "folder", parentId: null });
    expect(result.success).toBe(true);
  });

  it("string parentId accepted", () => {
    const result = createFolderSchema.safeParse({ name: "folder", parentId: "parent-1" });
    expect(result.success).toBe(true);
  });

  it("icon nullable accepted", () => {
    const result = createFolderSchema.safeParse({ name: "folder", icon: null });
    expect(result.success).toBe(true);
  });

  it("icon string accepted", () => {
    const result = createFolderSchema.safeParse({ name: "folder", icon: "book" });
    expect(result.success).toBe(true);
  });
});

describe("renameFolderSchema", () => {
  it("valid name passes", () => {
    const result = renameFolderSchema.safeParse({ name: "new name" });
    expect(result.success).toBe(true);
  });

  it("empty name fails", () => {
    const result = renameFolderSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("name > 100 chars fails", () => {
    const result = renameFolderSchema.safeParse({ name: "أ".repeat(101) });
    expect(result.success).toBe(false);
  });

  it("name is trimmed", () => {
    const result = renameFolderSchema.parse({ name: "  فقه  " });
    expect(result.name).toBe("فقه");
  });
});

describe("moveFolderSchema", () => {
  it("null parentId passes (move to root)", () => {
    const result = moveFolderSchema.safeParse({ parentId: null });
    expect(result.success).toBe(true);
  });

  it("string parentId passes", () => {
    const result = moveFolderSchema.safeParse({ parentId: "folder-1" });
    expect(result.success).toBe(true);
  });

  it("missing parentId fails", () => {
    const result = moveFolderSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
