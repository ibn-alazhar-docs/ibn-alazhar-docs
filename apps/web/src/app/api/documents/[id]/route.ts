import { NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse, ownedWhere } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { documentUpdateSchema } from "@/lib/validators/document";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth().catch(() => null);
  if (!session) {
    return unauthorizedResponse();
  }

  const { id } = await params;

  const document = await prisma.document.findFirst({
    where: ownedWhere({ id }, session),
    include: {
      folder: { select: { id: true, name: true } },
      tags: {
        include: { tag: { select: { id: true, name: true, color: true } } },
      },
    },
  });

  if (!document) {
    return NextResponse.json({ error: "المستند غير موجود" }, { status: 404 });
  }

  const serialized = {
    ...document,
    fileSize: Number(document.fileSize),
  };

  return NextResponse.json({ document: serialized });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth().catch(() => null);
  if (!session) {
    return unauthorizedResponse();
  }

  const { id } = await params;
  const body = await request.json();

  const validation = documentUpdateSchema.safeParse(body);
  if (!validation.success) {
    const firstError = validation.error.issues[0];
    return NextResponse.json(
      { error: firstError?.message || "بيانات غير صحيحة" },
      { status: 400 },
    );
  }

  const { title, description, folderId } = validation.data;

  const document = await prisma.document.findFirst({
    where: ownedWhere({ id, deletedAt: null }, session),
  });

  if (!document) {
    return NextResponse.json({ error: "المستند غير موجود" }, { status: 404 });
  }

  const updateData: Record<string, unknown> = {};
  if (title !== undefined) updateData.title = title;
  if (description !== undefined) updateData.description = description;
  if (folderId !== undefined) {
    if (folderId === null) {
      updateData.folderId = null;
    } else {
      const folder = await prisma.folder.findFirst({
        where: ownedWhere({ id: folderId, deletedAt: null }, session),
      });
      if (!folder) {
        return NextResponse.json({ error: "المجلد غير موجود" }, { status: 404 });
      }
      updateData.folderId = folderId;
    }
  }

  const updated = await prisma.document.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      title: true,
      description: true,
      folderId: true,
      updatedAt: true,
    },
  });

  // Rebuild searchVector if title or description changed
  if (title !== undefined || description !== undefined) {
    await prisma.$executeRaw`
      UPDATE documents
      SET searchvector =
        setweight(to_tsvector('simple', coalesce(${updated.title}, '')), 'A') ||
        setweight(to_tsvector('simple', coalesce(${document.fileName}, '')), 'B') ||
        setweight(to_tsvector('simple', coalesce(${updated.description || ""}, '')), 'C') ||
        setweight(to_tsvector('simple', coalesce((SELECT searchpreview FROM documents WHERE id = ${id}), '')), 'D')
      WHERE id = ${id}
    `;
  }

  return NextResponse.json({ document: updated });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth().catch(() => null);
  if (!session) {
    return unauthorizedResponse();
  }

  const { id } = await params;

  const document = await prisma.document.findFirst({
    where: ownedWhere({ id, deletedAt: null }, session),
  });

  if (!document) {
    return NextResponse.json({ error: "المستند غير موجود" }, { status: 404 });
  }

  await prisma.document.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  return NextResponse.json({ success: true, message: "تم حذف المستند" });
}
