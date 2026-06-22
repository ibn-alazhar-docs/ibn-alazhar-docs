import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { createHash, randomBytes } from "node:crypto";

const prisma = new PrismaClient();

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

  const user = await prisma.user.create({
    data: {
      id,
      email,
      name,
      role,
      passwordHash: createHash("sha256").update("Test@123456").digest("hex"),
    },
  });

  return { id: user.id, email: user.email, name: user.name!, role: user.role };
}

export async function createTestDocument(userId: string, overrides: Record<string, unknown> = {}) {
  const id = uid();
  const storageKey = `test/${userId}/${id}.pdf`;

  return prisma.document.create({
    data: {
      id,
      userId,
      title: overrides.title ?? `Test Document ${id}`,
      fileName: `test-${id}.pdf`,
      originalName: `test-${id}.pdf`,
      mimeType: "application/pdf",
      fileSize: 1024,
      storageKey,
      status: "COMPLETED",
      ...overrides,
    },
  });
}

export async function createTestFolder(userId: string, overrides: Record<string, unknown> = {}) {
  const id = uid();
  return prisma.folder.create({
    data: {
      id,
      userId,
      name: overrides.name ?? `Test Folder ${id}`,
      parentId: overrides.parentId ?? null,
      color: overrides.color ?? null,
      icon: overrides.icon ?? null,
      order: overrides.order ?? 0,
    },
  });
}

export async function createTestTag(userId: string, overrides: Record<string, unknown> = {}) {
  const id = uid();
  return prisma.tag.create({
    data: {
      id,
      userId,
      name: overrides.name ?? `tag-${id}`,
      color: overrides.color ?? "#16A34A",
    },
  });
}

export async function cleanupTestUsers(userIds: string[]) {
  if (userIds.length === 0) return;
  await prisma.shareLink.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.tagDocument.deleteMany({
    where: { tag: { userId: { in: userIds } } },
  });
  await prisma.tag.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.conversionJob.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.document.deleteMany({ where: { userId: { in: userIds } } });
  const idsJoined = userIds.map((id) => `'${id}'`).join(',');
  await prisma.$executeRawUnsafe(`DELETE FROM "folders" WHERE "userId" IN (${idsJoined})`);
  await prisma.userSetting.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.account.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.session.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
}

export { prisma };
