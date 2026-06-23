import { NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse, ownedWhere } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { folderExportSchema } from "@/lib/export/validators";
import { logger } from "@/lib/logger";
import { getErrorMessage } from "@/lib/errors";
import { contentDispositionHeader } from "@/lib/export/profiles";
import { executeBulkExport } from "@/lib/export/bulk-export-helpers";

export async function POST(request: Request) {
  const session = await requireAuth().catch(() => null);
  if (!session) return unauthorizedResponse();

  const body = await request.json();
  const parsed = folderExportSchema.safeParse(body);

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

  const { folderId, format, profile, includeSource, recursive } = parsed.data;

  try {
    const folder = await prisma.folder.findFirst({
      where: ownedWhere({ id: folderId }, session),
    });

    if (!folder) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Folder not found" } },
        { status: 404 },
      );
    }

    const folderIds: string[] = [folderId];

    if (recursive) {
      const childFolders = await prisma.folder.findMany({
        where: ownedWhere(
          {
            parentId: folderId,
          },
          session,
        ),
        select: { id: true },
      });
      folderIds.push(...childFolders.map((f) => f.id));
    }

    const documents = await prisma.document.findMany({
      where: ownedWhere(
        {
          folderId: { in: folderIds },
          deletedAt: null,
        },
        session,
      ),
    });

    if (documents.length === 0) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Folder is empty" } },
        { status: 404 },
      );
    }

    if (format !== "zip") {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Folder export requires ZIP" } },
        { status: 400 },
      );
    }

    const { zipBuffer, zipName } = await executeBulkExport(
      documents,
      { userId: session.user.id, includeSource, profile },
      "exp_folder",
      `Folder_${folder.name}_${new Date().toISOString().split("T")[0]}.zip`,
    );

    return new Response(new Uint8Array(zipBuffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": contentDispositionHeader(zipName),
      },
    });
  } catch (error: unknown) {
    const errMessage = getErrorMessage(error);
    logger.error({ errMessage }, "[export] Folder export failed:");
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Folder export failed" } },
      { status: 500 },
    );
  }
}
