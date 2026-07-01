import { describe, it, expect } from "vitest";
import { documentUpdateSchema } from "@/lib/shared/validators/document";

describe("documentUpdateSchema", () => {
  it("valid title passes", () => {
    const result = documentUpdateSchema.safeParse({ title: "كتاب التفسير" });
    expect(result.success).toBe(true);
  });

  it("empty title fails", () => {
    const result = documentUpdateSchema.safeParse({ title: "" });
    expect(result.success).toBe(false);
  });

  it("title > 200 chars fails", () => {
    const result = documentUpdateSchema.safeParse({ title: "أ".repeat(201) });
    expect(result.success).toBe(false);
  });

  it("title exactly 200 chars passes", () => {
    const result = documentUpdateSchema.safeParse({ title: "أ".repeat(200) });
    expect(result.success).toBe(true);
  });

  it("description nullable accepted", () => {
    const result = documentUpdateSchema.safeParse({ description: null });
    expect(result.success).toBe(true);
  });

  it("description > 500 chars fails", () => {
    const result = documentUpdateSchema.safeParse({ description: "أ".repeat(501) });
    expect(result.success).toBe(false);
  });

  it("nullable folderId accepted", () => {
    const result = documentUpdateSchema.safeParse({ folderId: null });
    expect(result.success).toBe(true);
  });

  it("all fields optional — empty object passes", () => {
    const result = documentUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("folderId as string passes", () => {
    const result = documentUpdateSchema.safeParse({ folderId: "folder-1" });
    expect(result.success).toBe(true);
  });

  it("all fields together passes", () => {
    const result = documentUpdateSchema.safeParse({
      title: "عنوان",
      description: "وصف المستند",
      folderId: "folder-1",
    });
    expect(result.success).toBe(true);
  });
});
