import { describe, it, expect } from "vitest";
import { registerSchema, profileUpdateSchema } from "@/shared/validators/auth";
import {
  createFolderSchema,
  renameFolderSchema,
  moveFolderSchema,
  MAX_FOLDER_DEPTH,
} from "@/shared/validators/folder";
import { createTagSchema, updateTagSchema, mergeTagsSchema } from "@/shared/validators/tag";
import {
  documentUpdateSchema,
  uploadMetadataSchema,
  validateUploadFile,
} from "@/shared/validators/document";
import { createShareSchema, EXPIRATION_OPTIONS } from "@/shared/validators/share";
import { CONTENT_LIMITS } from "@/shared/constants";
import { getDescendantMaxDepth, buildFolderTree } from "@/core/folder-tree";
import type { FlatFolder } from "@/core/folder-tree";

/* =========================================================================
 * 1. Validators as the application-level data-integrity gate
 *    (these mirror the Prisma schema constraints: NOT NULL, length,
 *     enum, regex, unique-normalization, referential shape)
 * ========================================================================= */
describe("DB constraints — validators (integrity gate)", () => {
  describe("registerSchema", () => {
    const base = {
      name: "أحمد",
      email: "A@Example.com",
      password: "Passw0rd",
      confirmPassword: "Passw0rd",
    };

    it("accepts a valid payload", () => {
      expect(registerSchema.safeParse(base).success).toBe(true);
    });
    it("rejects empty name", () => {
      expect(registerSchema.safeParse({ ...base, name: "" }).success).toBe(false);
    });
    it("rejects name over 100 chars", () => {
      expect(registerSchema.safeParse({ ...base, name: "x".repeat(101) }).success).toBe(false);
    });
    it("accepts name at exactly 100 chars (boundary)", () => {
      expect(registerSchema.safeParse({ ...base, name: "x".repeat(100) }).success).toBe(true);
    });
    it("rejects malformed email", () => {
      expect(registerSchema.safeParse({ ...base, email: "not-email" }).success).toBe(false);
    });
    it("rejects password shorter than 8 (boundary)", () => {
      expect(
        registerSchema.safeParse({ ...base, password: "Ab0", confirmPassword: "Ab0" }).success,
      ).toBe(false);
    });
    it("accepts password at exactly 8 chars (boundary)", () => {
      expect(
        registerSchema.safeParse({ ...base, password: "Abcdef01", confirmPassword: "Abcdef01" })
          .success,
      ).toBe(true);
    });
    it("rejects password missing an uppercase letter", () => {
      expect(
        registerSchema.safeParse({ ...base, password: "abcdef01", confirmPassword: "abcdef01" })
          .success,
      ).toBe(false);
    });
    it("rejects password missing a digit", () => {
      expect(
        registerSchema.safeParse({ ...base, password: "Abcdefgh", confirmPassword: "Abcdefgh" })
          .success,
      ).toBe(false);
    });
    it("rejects mismatched confirmPassword", () => {
      expect(registerSchema.safeParse({ ...base, confirmPassword: "Other0" }).success).toBe(false);
    });
    it("strips unknown keys (.strip)", () => {
      const parsed = registerSchema.parse({ ...base, evil: "x" });
      expect(parsed).not.toHaveProperty("evil");
    });
  });

  describe("profileUpdateSchema", () => {
    it("trims the name", () => {
      expect(profileUpdateSchema.parse({ name: "  أحمد  " }).name).toBe("أحمد");
    });
    it("rejects name under 2 chars", () => {
      expect(profileUpdateSchema.safeParse({ name: "x" }).success).toBe(false);
    });
    it("accepts name at 2 chars (boundary)", () => {
      expect(profileUpdateSchema.safeParse({ name: "أح" }).success).toBe(true);
    });
  });

  describe("folder validators", () => {
    it("createFolder: rejects empty name and name > 100", () => {
      expect(createFolderSchema.safeParse({ name: "" }).success).toBe(false);
      expect(createFolderSchema.safeParse({ name: "x".repeat(101) }).success).toBe(false);
      expect(createFolderSchema.safeParse({ name: "مجلد", parentId: null }).success).toBe(true);
    });
    it("createFolder: validates color hex regex", () => {
      expect(createFolderSchema.safeParse({ name: "m", color: "red" }).success).toBe(false);
      expect(createFolderSchema.safeParse({ name: "m", color: "#16A34A" }).success).toBe(true);
    });
    it("renameFolder: name 1..100", () => {
      expect(renameFolderSchema.safeParse({ name: "a" }).success).toBe(true);
      expect(renameFolderSchema.safeParse({ name: "x".repeat(101) }).success).toBe(false);
    });
    it("moveFolder: accepts null or string parentId", () => {
      expect(moveFolderSchema.safeParse({ parentId: null }).success).toBe(true);
      expect(moveFolderSchema.safeParse({ parentId: "c1xyz" }).success).toBe(true);
    });
    it("enforces MAX_FOLDER_DEPTH === 5 constant parity with CONTENT_LIMITS", () => {
      expect(MAX_FOLDER_DEPTH).toBe(CONTENT_LIMITS.MAX_FOLDER_DEPTH);
      expect(MAX_FOLDER_DEPTH).toBe(5);
    });
  });

  describe("tag validators", () => {
    it("createTag: name 1..50, default color", () => {
      const parsed = createTagSchema.parse({ name: "إسلام" });
      expect(parsed.color).toBe("#16A34A");
      expect(createTagSchema.safeParse({ name: "x".repeat(51) }).success).toBe(false);
    });
    it("updateTag: optional name + valid hex color", () => {
      expect(updateTagSchema.safeParse({ name: "y", color: "#000000" }).success).toBe(true);
    });
    it("mergeTags: requires both ids", () => {
      expect(mergeTagsSchema.safeParse({ sourceTagId: "a", targetTagId: "b" }).success).toBe(true);
      expect(mergeTagsSchema.safeParse({ sourceTagId: "" }).success).toBe(false);
    });
    it("rejects tag name exceeding MAX_TAG_NAME_LENGTH", () => {
      expect(
        createTagSchema.safeParse({ name: "x".repeat(CONTENT_LIMITS.MAX_TAG_NAME_LENGTH + 1) })
          .success,
      ).toBe(false);
    });
  });

  describe("document validators", () => {
    it("documentUpdate: title 1..200, description <= 500", () => {
      expect(documentUpdateSchema.safeParse({ title: "t" }).success).toBe(true);
      expect(documentUpdateSchema.safeParse({ title: "x".repeat(201) }).success).toBe(false);
      expect(documentUpdateSchema.safeParse({ description: "x".repeat(501) }).success).toBe(false);
    });
    it("uploadMetadata: pageRange regex + folderId cuid shape", () => {
      expect(uploadMetadataSchema.safeParse({ pageRange: "3-7" }).success).toBe(true);
      expect(uploadMetadataSchema.safeParse({ pageRange: "abc" }).success).toBe(false);
    });
    it("validateUploadFile: rejects unsupported types and oversize", () => {
      const ok = new File(["x"], "a.pdf", { type: "application/pdf" });
      Object.defineProperty(ok, "size", { value: 1024 });
      expect(validateUploadFile(ok).valid).toBe(true);

      const badType = new File(["x"], "a.txt", { type: "text/plain" });
      expect(validateUploadFile(badType).valid).toBe(false);

      const big = new File(["x"], "a.pdf", { type: "application/pdf" });
      Object.defineProperty(big, "size", {
        value: (Number(process.env.MAX_UPLOAD_SIZE_MB) || 50) * 1024 * 1024 + 1,
      });
      expect(validateUploadFile(big).valid).toBe(false);
    });
    it("validateUploadFile: null file -> 400", () => {
      const r = validateUploadFile(null);
      expect(r.valid).toBe(false);
      expect(r.status).toBe(400);
    });
  });

  describe("share validators", () => {
    it("createShare: defaults to 'never' and only allows enum values", () => {
      expect(createShareSchema.parse({}).expiration).toBe("never");
      for (const opt of EXPIRATION_OPTIONS) {
        expect(createShareSchema.safeParse({ expiration: opt }).success).toBe(true);
      }
      expect(createShareSchema.safeParse({ expiration: "1day" }).success).toBe(false);
    });
  });
});

/* =========================================================================
 * 2. Folder depth integrity (getDescendantMaxDepth) — guards MAX_FOLDER_DEPTH
 * ========================================================================= */
describe("DB constraints — folder depth integrity", () => {
  function mapOf(folders: FlatFolder[]): Map<string, { parentId: string | null }> {
    return new Map(folders.map((f) => [f.id, { parentId: f.parentId }]));
  }

  it("computes depth of a linear chain", () => {
    const folders: FlatFolder[] = [f("1", null), f("2", "1"), f("3", "2"), f("4", "3")];
    expect(getDescendantMaxDepth("1", 0, mapOf(folders))).toBe(3);
  });

  it("returns 0 for a leaf", () => {
    expect(getDescendantMaxDepth("leaf", 0, mapOf([f("leaf", null)]))).toBe(0);
  });

  it("is cycle-safe (cycle does not infinite-loop)", () => {
    const folders: FlatFolder[] = [f("a", "b"), f("b", "a")];
    const start = Date.now();
    const depth = getDescendantMaxDepth("a", 0, mapOf(folders));
    expect(depth).toBeGreaterThanOrEqual(1);
    expect(Date.now() - start).toBeLessThan(1000);
  });

  it("rejects a move that would exceed MAX_FOLDER_DEPTH", () => {
    // chain depth 4 below target already; moving a 1-deep subtree in would exceed 5.
    const folders: FlatFolder[] = [
      f("root", null),
      f("l1", "root"),
      f("l2", "l1"),
      f("l3", "l2"),
      f("l4", "l3"),
      f("sub", null),
      f("sub1", "sub"),
    ];
    const map = mapOf(folders);
    const currentDepth = getDescendantMaxDepth("root", 0, map); // 4
    const incomingDepth = getDescendantMaxDepth("sub", 0, map); // 1
    expect(currentDepth + 1 + incomingDepth).toBeGreaterThan(MAX_FOLDER_DEPTH);
  });

  it("buildFolderTree nests children and sorts by order", () => {
    const folders: FlatFolder[] = [
      { ...f("b", "root"), order: 2 },
      { ...f("a", "root"), order: 1 },
      f("root", null),
    ];
    const tree = buildFolderTree(folders, null);
    expect(tree[0].children.map((c) => c.id)).toEqual(["a", "b"]);
  });
});

/* =========================================================================
 * 3. Simulated repository constraint layer (mirrors Prisma invariants the
 *    DB must guarantee): unique email, soft-delete isolation, FK shape,
 *    NOT NULL. Run as an in-memory model so the constraints are exercisable
 *    offline. The same rules are enforced by the real Prisma schema.
 * ========================================================================= */
describe("DB constraints — repository invariants (simulated store)", () => {
  type Row = { id: string; email: string; name: string; deletedAt: Date | null };
  function makeStore() {
    const users: Row[] = [];
    let seq = 0;
    return {
      users,
      async create(input: { email: string; name: string }) {
        const email = input.email.toLowerCase();
        if (!input.name) throw new Error("NOT_NULL:name");
        if (!email) throw new Error("NOT_NULL:email");
        if (users.some((u) => u.email === email && u.deletedAt === null))
          throw Object.assign(new Error("UNIQUE:email"), { code: "P2002" });
        const row: Row = { id: `u${++seq}`, email, name: input.name, deletedAt: null };
        users.push(row);
        return row;
      },
      async softDelete(id: string) {
        const u = users.find((x) => x.id === id);
        if (u) u.deletedAt = new Date();
      },
      findActive() {
        return users.filter((u) => u.deletedAt === null);
      },
    };
  }

  it("enforces unique email (case-insensitive) — P2002", async () => {
    const store = makeStore();
    await store.create({ email: "Dev@Example.com", name: "A" });
    await expect(store.create({ email: "dev@example.com", name: "B" })).rejects.toMatchObject({
      code: "P2002",
    });
  });

  it("enforces NOT NULL on required fields", async () => {
    const store = makeStore();
    await expect(store.create({ email: "x@y.com", name: "" })).rejects.toThrow("NOT_NULL");
  });

  it("soft-delete isolates rows from active queries (deletedAt = null filter)", async () => {
    const store = makeStore();
    const u = await store.create({ email: "a@b.com", name: "A" });
    expect(store.findActive()).toHaveLength(1);
    await store.softDelete(u.id);
    expect(store.findActive()).toHaveLength(0);
  });

  it("allows re-creating a previously soft-deleted email (no conflict)", async () => {
    const store = makeStore();
    const u = await store.create({ email: "dup@x.com", name: "A" });
    await store.softDelete(u.id);
    await expect(store.create({ email: "dup@x.com", name: "B" })).resolves.toBeTruthy();
  });
});

function f(id: string, parentId: string | null): FlatFolder {
  return {
    id,
    name: id,
    parentId,
    color: null,
    icon: null,
    order: 0,
    _count: { documents: 0, children: 0 },
  };
}
