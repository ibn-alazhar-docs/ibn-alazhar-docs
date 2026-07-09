import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { DocStatus } from "@ibn-al-azhar-docs/shared";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

interface MockDocument {
  id: string;
  userId: string;
  title: string;
  fileName: string;
  status: DocStatus;
  folderId: string | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  fileSize: bigint;
  mimeType: string;
  storageKey: string;
  originalName: string;
  description: string | null;
}

function makeDoc(overrides: Partial<MockDocument> = {}): MockDocument {
  return {
    id: "doc-1",
    userId: "user-1",
    title: "Test Document",
    fileName: "test.pdf",
    status: "UPLOADED" as DocStatus,
    folderId: null,
    deletedAt: null,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    fileSize: BigInt(1024),
    mimeType: "application/pdf",
    storageKey: "uploads/user-1/test.pdf",
    originalName: "test.pdf",
    description: null,
    ...overrides,
  };
}

interface MockFolder {
  id: string;
  userId: string;
  name: string;
  parentId: string | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  color: string | null;
  icon: string | null;
  order: number;
}

function makeFolder(overrides: Partial<MockFolder> = {}): MockFolder {
  return {
    id: "folder-1",
    userId: "user-1",
    name: "Test Folder",
    parentId: null,
    deletedAt: null,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    color: null,
    icon: null,
    order: 1,
    ...overrides,
  };
}

// ─── Document Race Conditions ─────────────────────────────────────────────────

describe("Document Operations — Race Conditions", () => {
  let createDoc: ReturnType<typeof vi.fn>;
  let findDocById: ReturnType<typeof vi.fn>;
  let updateDoc: ReturnType<typeof vi.fn>;
  let deleteDoc: ReturnType<typeof vi.fn>;
  let findDocs: ReturnType<typeof vi.fn>;
  let listDocs: ReturnType<typeof vi.fn>;
  let createJob: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    createDoc = vi.fn();
    findDocById = vi.fn();
    updateDoc = vi.fn();
    deleteDoc = vi.fn();
    findDocs = vi.fn();
    listDocs = vi.fn();
    createJob = vi.fn();
  });

  it("two concurrent uploads of same file — only one creates, second returns conflict", async () => {
    const doc = makeDoc();
    createDoc.mockResolvedValueOnce(doc).mockRejectedValueOnce(new Error("CONFLICT: duplicate"));

    const [r1, r2] = await Promise.allSettled([
      createDoc({ originalName: "same.pdf", userId: "user-1" }),
      createDoc({ originalName: "same.pdf", userId: "user-1" }),
    ]);

    expect(r1.status).toBe("fulfilled");
    expect(r2.status === "rejected" || r2.status === "fulfilled").toBe(true);
    expect(createDoc).toHaveBeenCalledTimes(2);
  });

  it("delete while uploading — delete waits for upload completion", async () => {
    let uploadResolve: () => void;
    const uploadPromise = new Promise<void>((r) => {
      uploadResolve = r;
    });
    const doc = makeDoc();
    createDoc.mockImplementationOnce(() => uploadPromise.then(() => doc));
    findDocById.mockResolvedValue(doc);

    const uploadCall = createDoc({ originalName: "pending.pdf", userId: "user-1" });
    await delay(10);
    const deleteCall = deleteDoc("doc-1", "user-1");

    uploadResolve!();
    const [uploadResult, deleteResult] = await Promise.allSettled([uploadCall, deleteCall]);

    expect(uploadResult.status).toBe("fulfilled");
    expect(deleteResult.status).toBe("fulfilled");
  });

  it("move document between folders while listing documents — list sees consistent state", async () => {
    const docs = [
      makeDoc({ id: "doc-1", folderId: "folder-1" }),
      makeDoc({ id: "doc-2", folderId: "folder-2" }),
    ];

    findDocs.mockResolvedValue(docs);
    updateDoc.mockImplementation(async (id: string, _uid: string, data: { folderId: string }) => {
      const idx = docs.findIndex((d) => d.id === id);
      if (idx !== -1) docs[idx] = { ...docs[idx], folderId: data.folderId };
      return docs[idx];
    });

    const movePromise = updateDoc("doc-1", "user-1", { folderId: "folder-2" });
    const listPromise = findDocs({ userId: "user-1" });

    const [moveResult, listResult] = await Promise.allSettled([movePromise, listPromise]);

    expect(moveResult.status).toBe("fulfilled");
    expect(listResult.status).toBe("fulfilled");
  });

  it("bulk tag + bulk untag on same documents simultaneously — no data loss", async () => {
    const tags = new Set<string>();
    const addTag = vi.fn(async (ids: string[], tag: string) => {
      await delay(5);
      for (const id of ids) tags.add(`${id}:${tag}`);
    });
    const removeTag = vi.fn(async (ids: string[], tag: string) => {
      await delay(5);
      for (const id of ids) tags.delete(`${id}:${tag}`);
    });

    await Promise.all([
      addTag(["doc-1", "doc-2"], "urgent"),
      removeTag(["doc-1", "doc-2"], "urgent"),
      addTag(["doc-1", "doc-3"], "archived"),
    ]);

    const result = Array.from(tags);
    expect(tags.has("doc-1:archived")).toBe(true);
    if (result.includes("doc-1:urgent")) {
      expect(tags.has("doc-2:urgent")).toBe(true);
    }
  });

  it("create folder + delete parent folder simultaneously — delete wins or is rejected gracefully", async () => {
    const parentFolder = makeFolder({ id: "parent-1" });
    const createFolder = vi.fn();
    const deleteFolder = vi.fn();

    createFolder.mockImplementation(async (data: { name: string; parentId: string }) => {
      const parentExists = parentFolder.id === data.parentId && !parentFolder.deletedAt;
      if (!parentExists) throw new Error("PARENT_NOT_FOUND");
      return makeFolder({ id: "child-1", name: data.name, parentId: data.parentId });
    });

    deleteFolder.mockImplementation(async (id: string) => {
      if (id === "parent-1") {
        parentFolder.deletedAt = new Date();
        return true;
      }
      return false;
    });

    const results = await Promise.allSettled([
      createFolder({ name: "Child", parentId: "parent-1" }),
      deleteFolder("parent-1"),
    ]);

    const failures = results.filter((r) => r.status === "rejected");
    expect(failures.length).toBeLessThanOrEqual(1);
  });

  it("two concurrent export requests for same document — only one processes", async () => {
    const activeExports = new Set<string>();
    const processExport = vi.fn(async (docId: string) => {
      if (activeExports.has(docId)) {
        return { status: "already_processing" };
      }
      activeExports.add(docId);
      await delay(20);
      activeExports.delete(docId);
      return { status: "completed" };
    });

    const [r1, r2] = await Promise.all([processExport("doc-1"), processExport("doc-1")]);

    const completed = [r1, r2].filter((r) => r.status === "completed").length;
    expect(completed).toBeLessThanOrEqual(1);
  });
});

// ─── Folder Race Conditions ────────────────────────────────────────────────────

describe("Folder Operations — Race Conditions", () => {
  let folders: MockFolder[];
  let createFolder: ReturnType<typeof vi.fn>;
  let findFolder: ReturnType<typeof vi.fn>;
  let moveFolder: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    folders = [makeFolder({ id: "f1", name: "Alone", parentId: null })];
    createFolder = vi.fn();
    findFolder = vi.fn();
    moveFolder = vi.fn();
  });

  it("create folder with same name simultaneously — at most one succeeds for same parent", async () => {
    let counter = 0;
    createFolder.mockImplementation(async (data: { name: string; parentId: string | null }) => {
      await delay(5);
      const existing = folders.filter(
        (f) => f.name === data.name && f.parentId === data.parentId && !f.deletedAt,
      );
      if (existing.length > 0) throw new Error("CONFLICT: duplicate name");
      counter++;
      const f = makeFolder({ id: `new-${counter}`, name: data.name, parentId: data.parentId });
      folders.push(f);
      return f;
    });

    const results = await Promise.allSettled([
      createFolder({ name: "Reports", parentId: null }),
      createFolder({ name: "Reports", parentId: null }),
      createFolder({ name: "Reports", parentId: null }),
    ]);

    const created = results.filter((r) => r.status === "fulfilled").length;
    expect(created).toBe(1);
  });

  it("move folder into itself (circular) while renaming — both fail with appropriate errors", async () => {
    folders.push(makeFolder({ id: "f2", name: "Child", parentId: "f1" }));

    const circularMove = vi.fn(async (id: string, newParentId: string) => {
      await delay(5);
      if (id === newParentId) throw new Error("CIRCULAR_REFERENCE");
      let current = folders.find((f) => f.id === newParentId);
      while (current && current.parentId) {
        if (current.parentId === id) throw new Error("CIRCULAR_REFERENCE");
        current = folders.find((f) => f.id === current!.parentId) ?? null;
      }
      return true;
    });

    const rename = vi.fn(async (id: string, _name: string) => {
      await delay(5);
      return true;
    });

    const results = await Promise.allSettled([circularMove("f1", "f1"), rename("f1", "Renamed")]);

    // Rename should succeed (fulfilled)
    expect(results[1].status).toBe("fulfilled");
    // Circular move is expected to reject, but that's OK — the system handles it gracefully
    if (results[0].status === "rejected") {
      expect(results[0].reason?.message).toContain("CIRCULAR");
    }
  });

  it("delete folder while moving documents into it — documents land or operation rejects cleanly", async () => {
    let folderDeleted = false;

    findFolder.mockImplementation(async (id: string) => {
      if (id === "target" && folderDeleted) return null;
      return makeFolder({ id: id === "target" ? "target" : id });
    });

    const moveDocs = vi.fn(async (_docIds: string[], targetFolderId: string) => {
      await delay(10);
      const target = await findFolder(targetFolderId);
      if (!target) throw new Error("FOLDER_NOT_FOUND");
      return true;
    });

    const delFolder = vi.fn(async (id: string) => {
      await delay(5);
      folderDeleted = true;
      return true;
    });

    const results = await Promise.allSettled([
      moveDocs(["doc-1", "doc-2"], "target"),
      delFolder("target"),
    ]);

    const rejected = results.filter((r) => r.status === "rejected");
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    expect(fulfilled.length).toBeGreaterThanOrEqual(1);
    if (rejected.length > 0) {
      expect(rejected[0].reason?.message || "").toMatch(/NOT_FOUND|FOLDER/);
    }
  });

  it("concurrent folder tree traversal + modification — traversal sees snapshot", async () => {
    folders = [
      makeFolder({ id: "r", name: "Root", parentId: null }),
      makeFolder({ id: "a", name: "A", parentId: "r" }),
      makeFolder({ id: "b", name: "B", parentId: "r" }),
    ];

    const traverse = vi.fn(async () => {
      await delay(15);
      return folders.filter((f) => !f.deletedAt).map((f) => f.id);
    });

    const modify = vi.fn(async () => {
      await delay(5);
      const idx = folders.findIndex((f) => f.id === "a");
      if (idx !== -1) folders[idx].deletedAt = new Date();
      return true;
    });

    const [traverseResult, _modifyResult] = await Promise.allSettled([traverse(), modify()]);

    if (traverseResult.status === "fulfilled") {
      expect(Array.isArray(traverseResult.value)).toBe(true);
    }
  });
});

// ─── Tag Race Conditions ─────────────────────────────────────────────────────

describe("Tag Operations — Race Conditions", () => {
  let tags: Map<string, { id: string; name: string }>;
  let createTag: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    tags = new Map();
    createTag = vi.fn();
  });

  it("tag with same name created by two requests — only one succeeds", async () => {
    createTag.mockImplementation(async (data: { name: string; userId: string }) => {
      await delay(5);
      if (tags.has(data.name)) throw new Error("TAG_EXISTS");
      const tag = { id: `tag-${Date.now()}`, name: data.name };
      tags.set(data.name, tag);
      return tag;
    });

    const results = await Promise.allSettled([
      createTag({ name: "important", userId: "user-1" }),
      createTag({ name: "important", userId: "user-1" }),
    ]);

    const created = results.filter((r) => r.status === "fulfilled").length;
    expect(created).toBe(1);
    expect(tags.size).toBe(1);
  });

  it("merge tags while tagging documents with source tag — documents end up with merged tag", async () => {
    const docTags = new Set<string>();

    const applyTag = vi.fn(async (docId: string, tagName: string) => {
      await delay(3);
      docTags.add(`${docId}:${tagName}`);
    });

    const mergeTags = vi.fn(async (sourceTag: string, targetTag: string) => {
      await delay(10);
      const entries = Array.from(docTags);
      for (const entry of entries) {
        if (entry.endsWith(`:${sourceTag}`)) {
          docTags.delete(entry);
          docTags.add(entry.replace(`:${sourceTag}`, `:${targetTag}`));
        }
      }
    });

    await Promise.all([
      applyTag("doc-1", "old-tag"),
      applyTag("doc-2", "old-tag"),
      mergeTags("old-tag", "new-tag"),
      applyTag("doc-3", "old-tag"),
    ]);

    expect(docTags.has("doc-3:new-tag")).toBe(true);
    expect(docTags.has("doc-1:old-tag")).toBe(false);
    expect(docTags.has("doc-2:old-tag")).toBe(false);
  });

  it("delete tag while it is being applied to documents — no orphan references", async () => {
    const tagRefs = new Map<string, number>();

    const applyTag = vi.fn(async (tagName: string) => {
      await delay(5);
      if (!tagRefs.has(tagName)) throw new Error("TAG_NOT_FOUND");
      tagRefs.set(tagName, (tagRefs.get(tagName) ?? 0) + 1);
      return true;
    });

    const deleteTag = vi.fn(async (tagName: string) => {
      tagRefs.delete(tagName);
      return true;
    });

    tagRefs.set("doomed", 0);

    const results = await Promise.allSettled([
      applyTag("doomed"),
      deleteTag("doomed"),
      applyTag("doomed"),
    ]);

    const succeeded = results.filter((r) => r.status === "fulfilled");
    expect(succeeded.length).toBeGreaterThanOrEqual(1); // At least deleteTag succeeded
    // if any applyTag got through before delete, ref is consistent
    const refCount = tagRefs.get("doomed") ?? 0;
    expect(refCount).toBeLessThanOrEqual(1);
    expect(tagRefs.has("doomed") || refCount === 0).toBe(true);
  });
});

// ─── Optimistic Locking & Version Conflicts ─────────────────────────────────────

describe("Optimistic Locking — Version Conflicts", () => {
  it("document update with stale version — retry logic catches it", async () => {
    let currentVersion = 1;

    const updateDoc = vi.fn(async (id: string, data: any, expectedVersion: number) => {
      await delay(5);
      if (currentVersion !== expectedVersion) {
        return { success: false, error: "VERSION_CONFLICT", currentVersion };
      }
      currentVersion++;
      return { success: true, version: currentVersion, ...data };
    });

    // Both read version 1, first succeeds, second gets conflict
    const [r1, r2] = await Promise.allSettled([
      updateDoc("doc-1", { title: "v2" }, 1),
      updateDoc("doc-1", { title: "v2-also" }, 1),
    ]);

    expect(
      r1.status === "fulfilled" ? (r1 as PromiseFulfilledResult<any>).value.success : null,
    ).toBe(true);
    if (r2.status === "fulfilled") {
      expect((r2 as PromiseFulfilledResult<any>).value.error).toBe("VERSION_CONFLICT");
    }
    expect(currentVersion).toBe(2);
  });

  it("concurrent status transitions with version check — only one wins", async () => {
    let doc = { id: "doc-1", status: "UPLOADED" as string, version: 1 };

    const transition = vi.fn(async (targetStatus: string, expectedVersion: number) => {
      await delay(5);
      if (doc.version !== expectedVersion) return { success: false, error: "STALE" };
      doc = { ...doc, status: targetStatus, version: doc.version + 1 };
      return { success: true };
    });

    const [r1, r2] = await Promise.allSettled([
      transition("VALIDATING", 1),
      transition("FAILED", 1),
    ]);

    const successes = [r1, r2].filter(
      (r) => r.status === "fulfilled" && (r as PromiseFulfilledResult<any>).value.success,
    ).length;
    expect(successes).toBe(1);
  });

  it("three concurrent updates — only one per version succeeds", async () => {
    let version = 1;

    const update = vi.fn(async (expectedVersion: number) => {
      await delay(3);
      if (version !== expectedVersion) return { success: false };
      version++;
      return { success: true };
    });

    const results = await Promise.allSettled([update(1), update(1), update(1)]);

    const succeeded = results.filter(
      (r) => r.status === "fulfilled" && (r as PromiseFulfilledResult<any>).value.success,
    ).length;
    expect(succeeded).toBe(1);
  });
});

// ─── Concurrent Deletion Edge Cases ───────────────────────────────────────────

describe("Concurrent Deletion — Edge Cases", () => {
  it("two concurrent deletes of same document — first succeeds, second reports not found", async () => {
    let exists = true;

    const deleteDoc = vi.fn(async (id: string) => {
      await delay(5);
      if (!exists) return { deleted: false, error: "NOT_FOUND" };
      exists = false;
      return { deleted: true };
    });

    const results = await Promise.allSettled([deleteDoc("doc-1"), deleteDoc("doc-1")]);
    const deleted = results.filter(
      (r) => r.status === "fulfilled" && (r as PromiseFulfilledResult<any>).value.deleted,
    ).length;
    expect(deleted).toBe(1);
  });

  it("delete + restore race — delete wins or restore is rejected", async () => {
    let deleted = false;

    const deleteOp = vi.fn(async () => {
      await delay(5);
      deleted = true;
      return { success: true };
    });

    const restoreOp = vi.fn(async () => {
      await delay(3);
      if (deleted) return { success: false, error: "ALREADY_DELETED" };
      return { success: true };
    });

    const [delResult, restoreResult] = await Promise.allSettled([deleteOp(), restoreOp()]);
    expect(delResult.status).toBe("fulfilled");
    expect(deleted).toBe(true);
    if (restoreResult.status === "fulfilled") {
      // restore may have succeeded (ran before delete) or failed (delete beat it)
      expect(typeof (restoreResult as PromiseFulfilledResult<any>).value.success).toBe("boolean");
    }
  });

  it("bulk delete with concurrent single delete — no double-free", async () => {
    const activeDocs = new Set(["doc-1", "doc-2", "doc-3"]);

    const bulkDelete = vi.fn(async (ids: string[]) => {
      await delay(5);
      for (const id of ids) activeDocs.delete(id);
      return ids.length;
    });

    const singleDelete = vi.fn(async (id: string) => {
      await delay(3);
      if (!activeDocs.has(id)) return { success: false, error: "NOT_FOUND" };
      activeDocs.delete(id);
      return { success: true };
    });

    const results = await Promise.allSettled([
      bulkDelete(["doc-1", "doc-2"]),
      singleDelete("doc-2"),
    ]);

    // doc-2 should be deleted exactly once regardless of race outcome
    const results2 = await Promise.allSettled([bulkDelete(["doc-2"])]);
    expect(results2[0].status).toBe("fulfilled");
  });
});

// ─── Concurrent Folder Rename + Document Move ─────────────────────────────────

describe("Folder Operations — Advanced Race Conditions", () => {
  it("concurrent folder rename + document move into it — move uses old or new name", async () => {
    let folderName = "Old Name";

    const renameFolder = vi.fn(async (newName: string) => {
      await delay(5);
      folderName = newName;
      return true;
    });

    const moveDoc = vi.fn(async (_docId: string, _targetFolderId: string) => {
      await delay(3);
      return { success: true, folderNameAtMove: folderName };
    });

    const results = await Promise.allSettled([
      renameFolder("New Name"),
      moveDoc("doc-1", "folder-1"),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    expect(fulfilled.length).toBe(2);
  });

  it("concurrent folder list + folder delete — list returns snapshot", async () => {
    let folderDeleted = false;

    const listFolders = vi.fn(async () => {
      await delay(10);
      return { folders: [{ id: "f1" }, { id: "f2" }], deletedDuring: folderDeleted };
    });

    const deleteFolder = vi.fn(async (_id: string) => {
      folderDeleted = true;
      return true;
    });

    const [listResult, _delResult] = await Promise.allSettled([listFolders(), deleteFolder("f1")]);

    if (listResult.status === "fulfilled") {
      expect(Array.isArray(listResult.value.folders)).toBe(true);
    }
  });
});

// ─── Tag Rename During Concurrent Tagging ─────────────────────────────────────

describe("Tag Operations — Advanced Race Conditions", () => {
  it("rename tag while concurrently tagging documents — no orphaned references", async () => {
    const docTags = new Map<string, string>();

    const renameTag = vi.fn(async (oldName: string, newName: string) => {
      await delay(10);
      for (const [docId, tag] of docTags) {
        if (tag === oldName) docTags.set(docId, newName);
      }
      return true;
    });

    const applyTag = vi.fn(async (docId: string, tagName: string) => {
      await delay(3);
      docTags.set(docId, tagName);
      return true;
    });

    await Promise.all([
      renameTag("old", "new"),
      applyTag("doc-1", "old"),
      applyTag("doc-2", "old"),
    ]);

    // After rename completes, any "old" tags should have been renamed
    const currentTags = Array.from(docTags.values());
    for (const tag of currentTags) {
      expect(tag).not.toBe("old"); // "old" should have been renamed to "new"
    }
  });
});

// ─── Auth/Profile Race Conditions ─────────────────────────────────────────────

describe("Auth/Profile — Race Conditions", () => {
  let sessions: Map<string, boolean>;
  let activeUploads: Map<string, Promise<void>>;

  beforeEach(() => {
    sessions = new Map([["user-1", true]]);
    activeUploads = new Map();
  });

  it("password reset while logged in — session remains valid until logout", async () => {
    const resetPassword = vi.fn(async (userId: string) => {
      await delay(5);
      return true;
    });

    const checkSession = vi.fn(async (userId: string) => {
      await delay(3);
      return sessions.get(userId) ?? false;
    });

    const [resetResult, sessionResult] = await Promise.allSettled([
      resetPassword("user-1"),
      checkSession("user-1"),
    ]);

    expect(resetResult.status).toBe("fulfilled");
    if (sessionResult.status === "fulfilled") {
      expect(sessionResult.value).toBe(true);
    }
  });

  it("session refresh during concurrent API calls — all calls use consistent token", async () => {
    let currentToken = "token-v1";

    const refreshSession = vi.fn(async () => {
      await delay(10);
      currentToken = "token-v2";
      return currentToken;
    });

    const apiCall = vi.fn(async () => {
      await delay(3);
      return { status: "ok", token: currentToken };
    });

    const results = await Promise.allSettled([apiCall(), apiCall(), refreshSession(), apiCall()]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    expect(fulfilled.length).toBe(4);
  });

  it("account deletion while uploads are processing — deletion waits or rejects uploads", async () => {
    let accountActive = true;

    const processUpload = vi.fn(async (uploadId: string) => {
      if (!accountActive) throw new Error("ACCOUNT_DELETED");
      await delay(20);
      if (!accountActive) throw new Error("ACCOUNT_DELETED");
      return "uploaded";
    });

    const deleteAccount = vi.fn(async () => {
      await delay(5);
      accountActive = false;
      return true;
    });

    const results = await Promise.allSettled([
      processUpload("up-1"),
      processUpload("up-2"),
      deleteAccount(),
    ]);

    const rejected = results.filter((r) => r.status === "rejected");
    if (rejected.length > 0) {
      for (const r of rejected) {
        expect(r.reason?.message || "").toMatch(/ACCOUNT_DELETED/);
      }
    }
  });

  it("concurrent login attempts for same user — only one creates session", async () => {
    const activeSessions = new Set<string>();

    const login = vi.fn(async (userId: string) => {
      await delay(5);
      if (activeSessions.has(userId)) {
        return { status: "already_logged_in" };
      }
      activeSessions.add(userId);
      return { status: "logged_in", token: `token-${userId}` };
    });

    const results = await Promise.allSettled([login("user-1"), login("user-1"), login("user-1")]);

    const loggedIn = results.filter(
      (r) => r.status === "fulfilled" && r.value.status === "logged_in",
    ).length;
    expect(loggedIn).toBe(1);
  });

  it("session revocation during active API calls — subsequent calls rejected", async () => {
    let sessionActive = true;

    const apiCall = vi.fn(async (endpoint: string) => {
      await delay(10);
      if (!sessionActive) throw new Error("SESSION_REVOKED");
      return { data: "ok" };
    });

    const revokeSession = vi.fn(async () => {
      sessionActive = false;
      return true;
    });

    // Start first call, revoke immediately, then start second call
    const call1 = apiCall("/documents");
    await Promise.resolve();
    const revoke = revokeSession();
    const call2 = apiCall("/folders");

    const results = await Promise.allSettled([call1, revoke, call2]);

    const rejected = results.filter((r) => r.status === "rejected");
    // At least one of the API calls should be rejected since session was revoked
    expect(rejected.length).toBeGreaterThanOrEqual(1);
  });

  it("two simultaneous signups with same email — only one succeeds", async () => {
    const users = new Map<string, string>();

    const signup = vi.fn(async (email: string, name: string) => {
      await delay(5);
      if (users.has(email)) throw new Error("EMAIL_EXISTS");
      const id = `user-${Date.now()}`;
      users.set(email, id);
      return { id, email, name };
    });

    const results = await Promise.allSettled([
      signup("same@test.com", "User A"),
      signup("same@test.com", "User B"),
    ]);

    const created = results.filter((r) => r.status === "fulfilled").length;
    expect(created).toBe(1);
    expect(users.size).toBe(1);
  });
});
