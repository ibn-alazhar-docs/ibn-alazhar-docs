import { NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse, ownedWhere } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await requireAuth().catch(() => null);
  if (!session) {
    return unauthorizedResponse();
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
  const folderId = searchParams.get("folderId");
  const status = searchParams.get("status");
  const sort = searchParams.get("sort") || "createdAt";
  const order = searchParams.get("order") || "desc";

  const where = ownedWhere({ deletedAt: null }, session);

  if (folderId === "root") {
    where.folderId = null;
  } else if (folderId) {
    where.folderId = folderId;
  }

  if (status) {
    where.status = status;
  }

  const tagIds = searchParams.getAll("tagId");
  if (tagIds.length > 0) {
    where.AND = tagIds.map((tagId) => ({
      tags: {
        some: { tagId },
      },
    }));
  }

  const validSortFields = ["createdAt", "updatedAt", "title", "fileSize", "status"];
  const sortField = validSortFields.includes(sort) ? sort : "createdAt";
  const sortOrder = order === "asc" ? "asc" : "desc";

  const [documents, total] = await Promise.all([
    prisma.document.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        title: true,
        fileName: true,
        originalName: true,
        mimeType: true,
        fileSize: true,
        status: true,
        pageCount: true,
        outputFormats: true,
        language: true,
        isRtl: true,
        folderId: true,
        createdAt: true,
        updatedAt: true,
        folder: {
          select: { id: true, name: true },
        },
        tags: {
          select: {
            tag: {
              select: { id: true, name: true, color: true },
            },
          },
        },
      },
    }),
    prisma.document.count({ where }),
  ]);
  
  const serializedDocuments = documents.map((doc) => ({
    ...doc,
    fileSize: Number(doc.fileSize),
  }));

  return NextResponse.json({
    documents: serializedDocuments,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
