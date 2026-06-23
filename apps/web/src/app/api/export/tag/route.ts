import { NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse, ownedWhere, isAdmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { tagExportSchema } from "@/lib/export/validators";
import { logger } from "@/lib/logger";
import { getErrorMessage } from "@/lib/errors";
import { contentDispositionHeader } from "@/lib/export/profiles";
import { executeBulkExport } from "@/lib/export/bulk-export-helpers";

export async function POST(request: Request) {
  const session = await requireAuth().catch(() => null);
  if (!session) return unauthorizedResponse();

  const body = await request.json();
  const parsed = tagExportSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid data",
          details: parsed.error.issues,
        },
      },
      { status: 400 },
    );
  }

  const { tagId, format, profile, includeSource } = parsed.data;

  try {
    const tag = await prisma.tag.findFirst({
      where: ownedWhere({ id: tagId }, session),
    });

    if (!tag) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Tag not found" } },
        { status: 404 },
      );
    }

    const tagDocs = await prisma.tagDocument.findMany({
      where: { tagId },
      include: { document: true },
    });

    type DocData = {
      id: string;
      userId: string;
      deletedAt: Date | null;
      title: string;
      description: string | null;
      fileName: string;
      originalName: string;
      mimeType: string;
      fileSize: bigint;
      pageCount: number | null;
      outputFormats: string[];
      language: string | null;
      isRtl: boolean;
      createdAt: Date;
      updatedAt: Date;
      status: string;
      folderId: string | null;
    };
    const allTagDocEntries = tagDocs as unknown as Array<{ document: DocData }>;
    const allDocuments = allTagDocEntries.map((td) => td.document);
    const documents = allDocuments.filter(
      (doc) => doc.deletedAt === null && (isAdmin(session) || doc.userId === session.user.id),
    ) as DocData[];

    if (documents.length === 0) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "No documents with this tag" } },
        { status: 404 },
      );
    }

    if (format !== "zip") {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Tag export requires ZIP" } },
        { status: 400 },
      );
    }

    const { zipBuffer, zipName } = await executeBulkExport(
      documents,
      { userId: session.user.id, includeSource, profile },
      "exp_tag",
      `Tag_${tag.name}_${new Date().toISOString().split("T")[0]}.zip`,
    );

    return new Response(new Uint8Array(zipBuffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": contentDispositionHeader(zipName),
      },
    });
  } catch (error: unknown) {
    const errMessage = getErrorMessage(error);
    logger.error({ errMessage }, "[export] Tag export failed:");
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Tag export failed" } },
      { status: 500 },
    );
  }
}
