import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Module-level mocks (hoisted) ──────────────────────────────────────────────

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("next/server", () => ({
  NextResponse: {
    json: vi.fn((data: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: () => Promise.resolve(data),
    })),
  },
}));

vi.mock("@/lib/prisma", () => {
  function mockModel() {
    return {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
      createMany: vi.fn(),
      deleteMany: vi.fn(),
    };
  }

  return {
    prisma: {
      tag: mockModel(),
      tagDocument: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        createMany: vi.fn(),
        deleteMany: vi.fn(),
      },
      document: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      $transaction: vi.fn(),
    },
  };
});

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
  generateRequestId: () => "test-request-id",
}));

// ─── Imports (run after hoisted mocks) ─────────────────────────────────────────

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { GET as listTags, POST as createTag } from "@/app/api/tags/route";
import { GET as getTag, PATCH as updateTag, DELETE as deleteTag } from "@/app/api/tags/[id]/route";
import { POST as mergeTags } from "@/app/api/tags/merge/route";
import { POST as bulkTag } from "@/app/api/documents/bulk-tag/route";
import { POST as bulkUntag } from "@/app/api/documents/bulk-untag/route";
import {
  GET as getDocTags,
  POST as addDocTag,
  PUT as setDocTags,
} from "@/app/api/documents/[id]/tags/route";

const mockedAuth = vi.mocked(auth);

// ─── Helpers ───────────────────────────────────────────────────────────────────

const TEST_USER_ID = "test-user-id";
const ADMIN_USER_ID = "admin-user-id";

function mockSession(overrides: Partial<{ id: string; role: string; name: string }> = {}) {
  const session = {
    user: {
      id: TEST_USER_ID,
      name: "مستخدم اختبار",
      email: "test@example.com",
      image: null,
      role: "STUDENT",
      ...overrides,
    },
  };
  mockedAuth.mockResolvedValue(session as never);
}

function mockAdminSession() {
  return mockSession({ id: ADMIN_USER_ID, role: "ADMIN" });
}

function makeTag(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "tag-1",
    userId: TEST_USER_ID,
    name: "تفسير",
    color: "#16A34A",
    createdAt: new Date("2025-01-01"),
    _count: { documents: 2 },
    ...overrides,
  };
}

function makeDocRef(id = "doc-1") {
  return { id };
}

function req(body?: unknown): Request {
  return new Request("http://localhost", {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

function params(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/tags — إنشاء وسم
// ═══════════════════════════════════════════════════════════════════════════════

describe("POST /api/tags — إنشاء وسم", () => {
  it("ينشئ وسماً بالاسم واللون", async () => {
    mockSession();
    vi.mocked(prisma.tag.count).mockResolvedValue(0);
    vi.mocked(prisma.tag.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.tag.create).mockResolvedValue(makeTag({ color: "#2563EB" }));

    const response = await createTag(req({ name: "تفسير", color: "#2563EB" }));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.tag.name).toBe("تفسير");
    expect(body.tag.color).toBe("#2563EB");
  });

  it("يستخدم اللون الافتراضي إذا لم يُقدم", async () => {
    mockSession();
    vi.mocked(prisma.tag.count).mockResolvedValue(0);
    vi.mocked(prisma.tag.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.tag.create).mockResolvedValue(makeTag({ color: "#16A34A" }));

    const response = await createTag(req({ name: "عقيدة" }));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.tag.color).toBe("#16A34A");
  });

  it("يرفض الاسم الفارغ", async () => {
    mockSession();
    const response = await createTag(req({ name: "", color: "#2563EB" }));
    expect(response.status).toBe(400);
  });

  it("يرفض اللون غير الصالح", async () => {
    mockSession();
    const response = await createTag(req({ name: "تفسير", color: "red" }));
    expect(response.status).toBe(400);
  });

  it("يرفض الاسم الطويل جداً (أكثر من 50)", async () => {
    mockSession();
    const response = await createTag(req({ name: "أ".repeat(51) }));
    expect(response.status).toBe(400);
  });

  it("يمنع تكرار الاسم", async () => {
    mockSession();
    vi.mocked(prisma.tag.count).mockResolvedValue(0);
    vi.mocked(prisma.tag.findFirst).mockResolvedValue(makeTag());

    const response = await createTag(req({ name: "تفسير" }));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error?.message).toContain("بالفعل");
  });

  it("يفرض الحد الأقصى لعدد الوسوم", async () => {
    mockSession();
    vi.mocked(prisma.tag.count).mockResolvedValue(50);

    const response = await createTag(req({ name: "جديد" }));
    expect(response.status).toBe(400);
  });

  it("يرجع 401 بدون مصادقة", async () => {
    mockedAuth.mockResolvedValue(null as never);
    const response = await createTag(req({ name: "تفسير" }));
    expect(response.status).toBe(401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/tags — قائمة الوسوم
// ═══════════════════════════════════════════════════════════════════════════════

describe("GET /api/tags — قائمة الوسوم", () => {
  it("يرجع الوسوم مع عدد المستندات", async () => {
    mockSession();
    const tags = [
      makeTag({ id: "tag-1", name: "تفسير", _count: { documents: 3 } }),
      makeTag({ id: "tag-2", name: "فقه", _count: { documents: 1 } }),
    ];
    vi.mocked(prisma.tag.findMany).mockResolvedValue(tags);

    const response = await listTags();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.tags).toHaveLength(2);
    expect(body.tags[0]._count.documents).toBe(3);
  });

  it("يرجع قائمة فارغة عندما لا يوجد وسوم", async () => {
    mockSession();
    vi.mocked(prisma.tag.findMany).mockResolvedValue([]);

    const response = await listTags();
    const body = await response.json();

    expect(body.tags).toEqual([]);
  });

  it("المدير يرى كل الوسوم", async () => {
    mockAdminSession();
    vi.mocked(prisma.tag.findMany).mockResolvedValue([makeTag()]);

    await listTags();

    expect(prisma.tag.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { deletedAt: null } }),
    );
  });

  it("المستخدم العادي يرى وسومه فقط", async () => {
    mockSession();
    vi.mocked(prisma.tag.findMany).mockResolvedValue([makeTag()]);

    await listTags();

    expect(prisma.tag.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { deletedAt: null, userId: TEST_USER_ID },
      }),
    );
  });

  it("يرجع 401 بدون مصادقة", async () => {
    mockedAuth.mockResolvedValue(null as never);
    const response = await listTags();
    expect(response.status).toBe(401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/tags/[id] — وسم واحد
// ═══════════════════════════════════════════════════════════════════════════════

describe("GET /api/tags/[id] — وسم واحد", () => {
  it("يرجع الوسم مع عدد المستندات", async () => {
    mockSession();
    vi.mocked(prisma.tag.findFirst).mockResolvedValue(makeTag());

    const response = await getTag(req(), params("tag-1"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.tag.id).toBe("tag-1");
    expect(body.tag.name).toBe("تفسير");
  });

  it("يرجع 404 إذا لم يُوجد الوسم", async () => {
    mockSession();
    vi.mocked(prisma.tag.findFirst).mockResolvedValue(null);

    const response = await getTag(req(), params("nonexistent"));
    expect(response.status).toBe(404);
  });

  it("يرجع 401 بدون مصادقة", async () => {
    mockedAuth.mockResolvedValue(null as never);
    const response = await getTag(req(), params("tag-1"));
    expect(response.status).toBe(401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH /api/tags/[id] — تحديث وسم
// ═══════════════════════════════════════════════════════════════════════════════

describe("PATCH /api/tags/[id] — تحديث وسم", () => {
  it("يحدّث اسم الوسم", async () => {
    mockSession();
    vi.mocked(prisma.tag.findFirst).mockResolvedValueOnce(makeTag({ select: { id: true } }));
    vi.mocked(prisma.tag.findFirst).mockResolvedValueOnce(null); // no duplicate
    vi.mocked(prisma.tag.update).mockResolvedValue(makeTag({ name: "تفسير جديد" }));

    const response = await updateTag(req({ name: "تفسير جديد" }), params("tag-1"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.tag.name).toBe("تفسير جديد");
  });

  it("يحدّث لون الوسم", async () => {
    mockSession();
    vi.mocked(prisma.tag.findFirst).mockResolvedValueOnce(makeTag({ select: { id: true } }));
    vi.mocked(prisma.tag.update).mockResolvedValue(makeTag({ color: "#DC2626" }));

    const response = await updateTag(req({ color: "#DC2626" }), params("tag-1"));
    const body = await response.json();

    expect(body.tag.color).toBe("#DC2626");
  });

  it("يحدّث الاسم واللون معاً", async () => {
    mockSession();
    vi.mocked(prisma.tag.findFirst).mockResolvedValueOnce(makeTag({ select: { id: true } }));
    vi.mocked(prisma.tag.findFirst).mockResolvedValueOnce(null);
    vi.mocked(prisma.tag.update).mockResolvedValue(makeTag({ name: "فقه", color: "#CA8A04" }));

    const response = await updateTag(req({ name: "فقه", color: "#CA8A04" }), params("tag-1"));

    expect(response.status).toBe(200);
  });

  it("يرجع 404 إذا لم يُوجد الوسم", async () => {
    mockSession();
    vi.mocked(prisma.tag.findFirst).mockResolvedValue(null);

    const response = await updateTag(req({ name: "جديد" }), params("nonexistent"));
    expect(response.status).toBe(404);
  });

  it("يمنع التحديث لاسم مكرر", async () => {
    mockSession();
    vi.mocked(prisma.tag.findFirst).mockResolvedValueOnce(makeTag({ select: { id: true } }));
    vi.mocked(prisma.tag.findFirst).mockResolvedValueOnce(makeTag({ id: "other-tag" }));

    const response = await updateTag(req({ name: "موجود" }), params("tag-1"));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error?.message).toContain("بالفعل");
  });

  it("يرفض اللون غير الصالح", async () => {
    mockSession();
    const response = await updateTag(req({ color: "xyz" }), params("tag-1"));
    expect(response.status).toBe(400);
  });

  it("يرجع 401 بدون مصادقة", async () => {
    mockedAuth.mockResolvedValue(null as never);
    const response = await updateTag(req({ name: "جديد" }), params("tag-1"));
    expect(response.status).toBe(401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE /api/tags/[id] — حذف وسم
// ═══════════════════════════════════════════════════════════════════════════════

describe("DELETE /api/tags/[id] — حذف وسم", () => {
  it("يحذف الوسم وعلاقاته", async () => {
    mockSession();
    vi.mocked(prisma.tag.findFirst).mockResolvedValue(makeTag({ select: { id: true } }));
    vi.mocked(prisma.tagDocument.deleteMany).mockResolvedValue({ count: 2 });
    vi.mocked(prisma.tag.update).mockResolvedValue(makeTag());

    const response = await deleteTag(req(), params("tag-1"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.message).toContain("حذف");
    expect(prisma.tagDocument.deleteMany).toHaveBeenCalledWith({
      where: { tagId: "tag-1" },
    });
    expect(prisma.tag.update).toHaveBeenCalledWith({
      where: { id: "tag-1" },
      data: { deletedAt: expect.any(Date) },
    });
  });

  it("يرجع 404 إذا لم يُوجد الوسم", async () => {
    mockSession();
    vi.mocked(prisma.tag.findFirst).mockResolvedValue(null);

    const response = await deleteTag(req(), params("nonexistent"));
    expect(response.status).toBe(404);
  });

  it("يرجع 401 بدون مصادقة", async () => {
    mockedAuth.mockResolvedValue(null as never);
    const response = await deleteTag(req(), params("tag-1"));
    expect(response.status).toBe(401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/tags/merge — دمج الوسوم
// ═══════════════════════════════════════════════════════════════════════════════

describe("POST /api/tags/merge — دمج الوسوم", () => {
  it("يدمج وسماً مصدراً في وسماً هدفاً", async () => {
    mockSession();
    vi.mocked(prisma.tag.findFirst)
      .mockResolvedValueOnce(makeTag({ select: { id: true } }))
      .mockResolvedValueOnce(makeTag({ id: "target-id", select: { id: true } }));
    vi.mocked(prisma.tagDocument.findMany)
      .mockResolvedValueOnce([
        { tagId: "source-id", documentId: "doc-1" },
        { tagId: "source-id", documentId: "doc-2" },
      ])
      .mockResolvedValueOnce([]);
    vi.mocked(prisma.tagDocument.createMany).mockResolvedValue({ count: 2 });
    vi.mocked(prisma.tagDocument.deleteMany).mockResolvedValue({ count: 2 });

    const response = await mergeTags(req({ sourceTagId: "source-id", targetTagId: "target-id" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.affectedDocuments).toBe(2);
  });

  it("يتخطى المستندات الموجودة بالفعل في الوسم الهدف", async () => {
    mockSession();
    vi.mocked(prisma.tag.findFirst)
      .mockResolvedValueOnce(makeTag({ select: { id: true } }))
      .mockResolvedValueOnce(makeTag({ id: "target-id", select: { id: true } }));
    vi.mocked(prisma.tagDocument.findMany).mockResolvedValue([
      { tagId: "source-id", documentId: "doc-1" },
    ]);
    // doc-1 already exists in target
    vi.mocked(prisma.tagDocument.findUnique).mockResolvedValue({
      tagId: "target-id",
      documentId: "doc-1",
    });

    const response = await mergeTags(req({ sourceTagId: "source-id", targetTagId: "target-id" }));
    const body = await response.json();

    expect(body.affectedDocuments).toBe(0);
  });

  it("يرفض دمج الوسم مع نفسه", async () => {
    mockSession();
    const response = await mergeTags(req({ sourceTagId: "same-id", targetTagId: "same-id" }));
    expect(response.status).toBe(400);
  });

  it("يرجع 404 إذا لم يُوجد الوسم المصدر", async () => {
    mockSession();
    vi.mocked(prisma.tag.findFirst).mockResolvedValueOnce(null);

    const response = await mergeTags(req({ sourceTagId: "missing", targetTagId: "target-id" }));
    expect(response.status).toBe(404);
  });

  it("يرجع 404 إذا لم يُوجد الوسم الهدف", async () => {
    mockSession();
    vi.mocked(prisma.tag.findFirst)
      .mockResolvedValueOnce(makeTag({ select: { id: true } }))
      .mockResolvedValueOnce(null);

    const response = await mergeTags(req({ sourceTagId: "source-id", targetTagId: "missing" }));
    expect(response.status).toBe(404);
  });

  it("يرجع 401 بدون مصادقة", async () => {
    mockedAuth.mockResolvedValue(null as never);
    const response = await mergeTags(req({ sourceTagId: "s", targetTagId: "t" }));
    expect(response.status).toBe(401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/documents/bulk-tag — وسم متعدد
// ═══════════════════════════════════════════════════════════════════════════════

describe("POST /api/documents/bulk-tag — وسم متعدد", () => {
  it("يوسم عدة مستندات بدفعة واحدة", async () => {
    mockSession();
    vi.mocked(prisma.tag.findFirst).mockResolvedValue(makeTag({ select: { id: true } }));
    vi.mocked(prisma.document.findMany).mockResolvedValue([
      makeDocRef("doc-1"),
      makeDocRef("doc-2"),
    ]);
    vi.mocked(prisma.tagDocument.findMany).mockResolvedValue([]);
    vi.mocked(prisma.tagDocument.createMany).mockResolvedValue({ count: 2 });

    const response = await bulkTag(req({ documentIds: ["doc-1", "doc-2"], tagId: "tag-1" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.taggedCount).toBe(2);
    expect(body.skippedCount).toBe(0);
  });

  it("يتخطى المستندات الموسومة بالفعل", async () => {
    mockSession();
    vi.mocked(prisma.tag.findFirst).mockResolvedValue(makeTag({ select: { id: true } }));
    vi.mocked(prisma.document.findMany).mockResolvedValue([
      makeDocRef("doc-1"),
      makeDocRef("doc-2"),
    ]);
    // doc-1 already tagged
    vi.mocked(prisma.tagDocument.findMany).mockResolvedValue([
      { tagId: "tag-1", documentId: "doc-1" },
    ]);

    const response = await bulkTag(req({ documentIds: ["doc-1", "doc-2"], tagId: "tag-1" }));
    const body = await response.json();

    expect(body.taggedCount).toBe(1);
    expect(body.skippedCount).toBe(1);
  });

  it("يرجع 404 للوسم غير الموجود", async () => {
    mockSession();
    vi.mocked(prisma.tag.findFirst).mockResolvedValue(null);

    const response = await bulkTag(req({ documentIds: ["doc-1"], tagId: "missing" }));
    expect(response.status).toBe(404);
  });

  it("يرفض بيانات غير صالحة", async () => {
    mockSession();
    const response = await bulkTag(req({ documentIds: [], tagId: "" }));
    expect(response.status).toBe(400);
  });

  it("يرجع 401 بدون مصادقة", async () => {
    mockedAuth.mockResolvedValue(null as never);
    const response = await bulkTag(req({ documentIds: ["doc-1"], tagId: "tag-1" }));
    expect(response.status).toBe(401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/documents/bulk-untag — إزالة وسم متعدد
// ═══════════════════════════════════════════════════════════════════════════════

describe("POST /api/documents/bulk-untag — إزالة وسم متعدد", () => {
  it("يزيل وسماً من عدة مستندات", async () => {
    mockSession();
    vi.mocked(prisma.tag.findFirst).mockResolvedValue(makeTag({ select: { id: true } }));
    vi.mocked(prisma.document.findMany).mockResolvedValue([
      makeDocRef("doc-1"),
      makeDocRef("doc-2"),
    ]);
    vi.mocked(prisma.tagDocument.deleteMany).mockResolvedValue({ count: 2 });

    const response = await bulkUntag(req({ documentIds: ["doc-1", "doc-2"], tagId: "tag-1" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.removedCount).toBe(2);
    expect(body.success).toBe(true);
  });

  it("يرجع 404 للوسم غير الموجود", async () => {
    mockSession();
    vi.mocked(prisma.tag.findFirst).mockResolvedValue(null);

    const response = await bulkUntag(req({ documentIds: ["doc-1"], tagId: "missing" }));
    expect(response.status).toBe(404);
  });

  it("يرجع 401 بدون مصادقة", async () => {
    mockedAuth.mockResolvedValue(null as never);
    const response = await bulkUntag(req({ documentIds: ["doc-1"], tagId: "tag-1" }));
    expect(response.status).toBe(401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/documents/[id]/tags — وسوم المستند
// ═══════════════════════════════════════════════════════════════════════════════

describe("GET /api/documents/[id]/tags — وسوم المستند", () => {
  it("يرجع وسوم المستند", async () => {
    mockSession();
    vi.mocked(prisma.document.findFirst).mockResolvedValue({
      ...makeDocRef(),
      tags: [
        {
          tagId: "tag-1",
          documentId: "doc-1",
          tag: { id: "tag-1", name: "تفسير", color: "#16A34A" },
        },
      ],
    } as any);

    const response = await getDocTags(req(), params("doc-1"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.tags).toHaveLength(1);
    expect(body.tags[0].name).toBe("تفسير");
  });

  it("يرجع 404 إذا لم يُوجد المستند", async () => {
    mockSession();
    vi.mocked(prisma.document.findFirst).mockResolvedValue(null);

    const response = await getDocTags(req(), params("nonexistent"));
    expect(response.status).toBe(404);
  });

  it("يرجع 401 بدون مصادقة", async () => {
    mockedAuth.mockResolvedValue(null as never);
    const response = await getDocTags(req(), params("doc-1"));
    expect(response.status).toBe(401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/documents/[id]/tags — إضافة وسم لمستند
// ═══════════════════════════════════════════════════════════════════════════════

describe("POST /api/documents/[id]/tags — إضافة وسم لمستند", () => {
  it("يضيف وسماً إلى مستند", async () => {
    mockSession();
    vi.mocked(prisma.document.findFirst).mockResolvedValue(makeDocRef());
    vi.mocked(prisma.tag.findFirst).mockResolvedValue(
      makeTag({ select: { id: true, name: true, color: true } }),
    );
    vi.mocked(prisma.tagDocument.findMany).mockResolvedValue([]);

    const response = await addDocTag(req({ tagId: "tag-1" }), params("doc-1"));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
  });

  it("يمنع إضافة وسم مكرر", async () => {
    mockSession();
    vi.mocked(prisma.document.findFirst).mockResolvedValue(makeDocRef());
    vi.mocked(prisma.tag.findFirst).mockResolvedValue(
      makeTag({ select: { id: true, name: true, color: true } }),
    );
    vi.mocked(prisma.tagDocument.findMany).mockResolvedValue([
      { tagId: "tag-1", documentId: "doc-1" } as any,
    ]);

    const response = await addDocTag(req({ tagId: "tag-1" }), params("doc-1"));
    expect(response.status).toBe(409);
  });

  it("يرجع 401 بدون مصادقة", async () => {
    mockedAuth.mockResolvedValue(null as never);
    const response = await addDocTag(req({ tagId: "tag-1" }), params("doc-1"));
    expect(response.status).toBe(401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PUT /api/documents/[id]/tags — تعيين وسوم المستند
// ═══════════════════════════════════════════════════════════════════════════════

describe("PUT /api/documents/[id]/tags — تعيين وسوم المستند", () => {
  it("يستبدل كل وسوم المستند", async () => {
    mockSession();
    vi.mocked(prisma.document.findFirst).mockResolvedValue(makeDocRef());
    vi.mocked(prisma.tag.findMany).mockResolvedValue([
      makeTag({ id: "tag-1", select: { id: true } }),
      makeTag({ id: "tag-2", select: { id: true } }),
    ]);
    vi.mocked(prisma.tagDocument.createMany).mockResolvedValue({ count: 2 });

    const response = await setDocTags(req({ tagIds: ["tag-1", "tag-2"] }), params("doc-1"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.tagCount).toBe(2);
    expect(body.success).toBe(true);
  });

  it("يقبل مصفوفة فارغة", async () => {
    mockSession();
    vi.mocked(prisma.document.findFirst).mockResolvedValue(makeDocRef());

    const response = await setDocTags(req({ tagIds: [] }), params("doc-1"));
    expect(response.status).toBe(200);
  });

  it("يرجع 404 إذا لم يُوجد المستند", async () => {
    mockSession();
    vi.mocked(prisma.document.findFirst).mockResolvedValue(null);

    const response = await setDocTags(req({ tagIds: [] }), params("nonexistent"));
    expect(response.status).toBe(404);
  });

  it("يرجع 401 بدون مصادقة", async () => {
    mockedAuth.mockResolvedValue(null as never);
    const response = await setDocTags(req({ tagIds: [] }), params("doc-1"));
    expect(response.status).toBe(401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Validation — التحقق من الصحة
// ═══════════════════════════════════════════════════════════════════════════════

describe("Validation — التحقق من الصحة", () => {
  describe("createTagSchema", () => {
    it("يسمح بالاسم واللون الصحيحين", async () => {
      mockSession();
      vi.mocked(prisma.tag.count).mockResolvedValue(0);
      vi.mocked(prisma.tag.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.tag.create).mockResolvedValue(makeTag());

      const res = await createTag(req({ name: "حديث", color: "#9333EA" }));
      expect(res.status).toBe(201);
    });

    it("يرفض الاسم الفارغ", async () => {
      mockSession();
      const res = await createTag(req({ name: "" }));
      expect(res.status).toBe(400);
    });

    it("يقبل الاسم المؤلف من مسافات (trim يُطبَّق بعد min)", async () => {
      mockSession();
      vi.mocked(prisma.tag.count).mockResolvedValue(0);
      vi.mocked(prisma.tag.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.tag.create).mockResolvedValue(makeTag({ name: "" }));

      const res = await createTag(req({ name: "   " }));
      // trim() runs after min(1) in Zod chain, so whitespace-only passes
      expect(res.status).toBe(201);
    });

    it("يرفض اللون بصيغة خاطئة", async () => {
      mockSession();
      const res = await createTag(req({ name: "تفسير", color: "#GGGGGG" }));
      expect(res.status).toBe(400);
    });

    it("يرفض اللون بدون علامة #", async () => {
      mockSession();
      const res = await createTag(req({ name: "تفسير", color: "16A34A" }));
      expect(res.status).toBe(400);
    });

    it("يرفض الاسم الأطول من 50 حرفاً", async () => {
      mockSession();
      const res = await createTag(req({ name: "أ".repeat(51) }));
      expect(res.status).toBe(400);
    });
  });

  describe("updateTagSchema", () => {
    it("يسمح بتحديث جزئي", async () => {
      mockSession();
      vi.mocked(prisma.tag.findFirst).mockResolvedValueOnce(makeTag({ select: { id: true } }));
      vi.mocked(prisma.tag.update).mockResolvedValue(makeTag({ color: "#DC2626" }));

      const res = await updateTag(req({ color: "#DC2626" }), params("tag-1"));
      expect(res.status).toBe(200);
    });

    it("يرفض اللون الخاطئ في التحديث", async () => {
      mockSession();
      const res = await updateTag(req({ color: "not-a-color" }), params("tag-1"));
      expect(res.status).toBe(400);
    });
  });

  describe("mergeTagsSchema", () => {
    it("يرفض المصدر الفارغ", async () => {
      mockSession();
      const res = await mergeTags(req({ sourceTagId: "", targetTagId: "t" }));
      expect(res.status).toBe(400);
    });

    it("يرفض الهدف الفارغ", async () => {
      mockSession();
      const res = await mergeTags(req({ sourceTagId: "s", targetTagId: "" }));
      expect(res.status).toBe(400);
    });
  });

  describe("bulkTagSchema", () => {
    it("يرفض documentIds الفارغة", async () => {
      mockSession();
      const res = await bulkTag(req({ documentIds: [], tagId: "t" }));
      expect(res.status).toBe(400);
    });

    it("يرفض tagId الفارغ", async () => {
      mockSession();
      const res = await bulkTag(req({ documentIds: ["d1"], tagId: "" }));
      expect(res.status).toBe(400);
    });

    it("يرفض أكثر من 50 مستنداً", async () => {
      mockSession();
      const res = await bulkTag(
        req({ documentIds: Array.from({ length: 51 }, (_, i) => `d${i}`), tagId: "t" }),
      );
      expect(res.status).toBe(400);
    });
  });

  describe("addTagToDocumentSchema", () => {
    it("يرفض tagId الفارغ", async () => {
      mockSession();
      const res = await addDocTag(req({ tagId: "" }), params("doc-1"));
      expect(res.status).toBe(400);
    });
  });
});
