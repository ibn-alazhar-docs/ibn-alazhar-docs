import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, unauthorizedResponse, ownedWhere } from "@/lib/auth-guards";
import { addTagToDocumentSchema, setDocumentTagsSchema } from "@/lib/validators/tag";
import { logger } from "@/lib/logger";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth().catch(() => null);
    if (!session) return unauthorizedResponse();

    const { id } = await params;

    const document = await prisma.document.findFirst({
      where: ownedWhere({ id }, session),
      select: { id: true },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const tags = await prisma.tagDocument.findMany({
      where: { documentId: id },
      include: {
        tag: {
          select: { id: true, name: true, color: true },
        },
      },
    });

    return NextResponse.json({
      tags: tags.map((td) => td.tag),
    });
  } catch (error: unknown) {
    logger.error(error, "[documents/[id]/tags/GET] Failed:");
    return NextResponse.json({ error: "Failed to load tags" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth().catch(() => null);
    if (!session) return unauthorizedResponse();

    const { id } = await params;
    const body = await request.json();
    const validation = addTagToDocumentSchema.safeParse(body);

    if (!validation.success) {
      const firstError = validation.error.issues[0];
      return NextResponse.json(
        { error: firstError?.message || "Invalid data" },
        { status: 400 },
      );
    }

    const { tagId } = validation.data;

    const document = await prisma.document.findFirst({
      where: ownedWhere({ id }, session),
      select: { id: true },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const tag = await prisma.tag.findFirst({
      where: ownedWhere({ id: tagId }, session),
      select: { id: true, name: true, color: true },
    });

    if (!tag) {
      return NextResponse.json({ error: "Tag not found" }, { status: 404 });
    }

    const existing = await prisma.tagDocument.findUnique({
      where: {
        tagId_documentId: {
          tagId,
          documentId: id,
        },
      },
    });

    if (existing) {
      return NextResponse.json({ error: "Tag already assigned" }, { status: 409 });
    }

    await prisma.tagDocument.create({
      data: {
        tagId,
        documentId: id,
      },
    });

    return NextResponse.json({ success: true, tag }, { status: 201 });
  } catch (error: unknown) {
    logger.error(error, "[documents/[id]/tags/POST] Failed:");
    return NextResponse.json({ error: "Failed to add tag" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth().catch(() => null);
    if (!session) return unauthorizedResponse();

    const { id } = await params;
    const body = await request.json();
    const validation = setDocumentTagsSchema.safeParse(body);

    if (!validation.success) {
      const firstError = validation.error.issues[0];
      return NextResponse.json(
        { error: firstError?.message || "Invalid data" },
        { status: 400 },
      );
    }

    const { tagIds } = validation.data;

    const document = await prisma.document.findFirst({
      where: ownedWhere({ id }, session),
      select: { id: true },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    if (tagIds.length > 0) {
      const validTags = await prisma.tag.findMany({
        where: ownedWhere({ id: { in: tagIds } }, session),
        select: { id: true },
      });

      if (validTags.length !== tagIds.length) {
        return NextResponse.json({ error: "Some tags not found" }, { status: 400 });
      }
    }

    await prisma.tagDocument.deleteMany({
      where: { documentId: id },
    });

    if (tagIds.length > 0) {
      await prisma.tagDocument.createMany({
        data: tagIds.map((tagId) => ({
          tagId,
          documentId: id,
        })),
      });
    }

    return NextResponse.json({ success: true, tagCount: tagIds.length });
  } catch (error: unknown) {
    logger.error(error, "[documents/[id]/tags/PUT] Failed:");
    return NextResponse.json({ error: "Failed to set tags" }, { status: 500 });
  }
}
