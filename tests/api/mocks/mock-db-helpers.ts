import { randomBytes } from "node:crypto";
import { mockPrisma } from "./mock-prisma";

// Access the shared store from mock-prisma
function getStore(): Map<string, Map<string, Record<string, unknown>>> {
  return (mockPrisma as any)._store;
}

export const prisma = mockPrisma;

export interface TestUser {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "STUDENT" | "TEACHER";
}

let counter = 0;

function uid(): string {
  return `test_${Date.now()}_${++counter}_${randomBytes(4).toString("hex")}`;
}

export async function createTestUser(overrides: Partial<TestUser> = {}): Promise<TestUser> {
  const id = uid();
  const email = `${id}@test.ibn`;
  const name = overrides.name ?? `Test User ${id}`;
  const role = overrides.role ?? "STUDENT";

  const store = getStore();
  const table = store.get("user") ?? new Map();
  const user = { id, email, name, role, passwordHash: "mock-hash", deletedAt: null };
  table.set(id, user);
  store.set("user", table);

  return { id, email, name, role };
}

export async function createTestDocument(userId: string, overrides: Record<string, unknown> = {}) {
  const id = uid();
  const store = getStore();
  const table = store.get("document") ?? new Map();
  const doc = {
    id,
    userId,
    title: overrides.title ?? `Test Document ${id}`,
    fileName: `test-${id}.pdf`,
    originalName: `test-${id}.pdf`,
    mimeType: "application/pdf",
    fileSize: overrides.fileSize ?? BigInt(1024),
    storageKey: `test/${userId}/${id}.pdf`,
    status: (overrides.status as string) ?? "COMPLETED",
    deletedAt: overrides.deletedAt ?? null,
    folderId: overrides.folderId ?? null,
    description: overrides.description ?? null,
    searchpreview: overrides.searchpreview ?? null,
    wordcount: overrides.wordcount ?? 100,
    pageCount: overrides.pageCount ?? 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  table.set(id, doc);
  store.set("document", table);
  return doc;
}

export async function createTestFolder(userId: string, overrides: Record<string, unknown> = {}) {
  const id = uid();
  const store = getStore();
  const table = store.get("folder") ?? new Map();
  const folder = {
    id,
    userId,
    name: overrides.name ?? `Test Folder ${id}`,
    parentId: overrides.parentId ?? null,
    color: overrides.color ?? null,
    icon: overrides.icon ?? null,
    order: overrides.order ?? 0,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  table.set(id, folder);
  store.set("folder", table);
  return folder;
}

export async function createTestTag(userId: string, overrides: Record<string, unknown> = {}) {
  const id = uid();
  const store = getStore();
  const table = store.get("tag") ?? new Map();
  const tag = {
    id,
    userId,
    name: overrides.name ?? `tag-${id}`,
    color: overrides.color ?? "#16A34A",
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  table.set(id, tag);
  store.set("tag", table);
  return tag;
}

export async function cleanupTestUsers(userIds: string[]) {
  if (userIds.length === 0) return;
  const store = getStore();

  for (const tableName of [
    "shareLink",
    "tagDocument",
    "tag",
    "conversionJob",
    "document",
    "folder",
    "userSetting",
    "account",
    "session",
    "user",
  ]) {
    const table = store.get(tableName);
    if (!table) continue;
    for (const [id, record] of table) {
      const r = record as Record<string, unknown>;
      if (userIds.includes(r.userId as string) || userIds.includes(r.id as string)) {
        table.delete(id);
      }
    }
  }
}
