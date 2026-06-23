import { NextResponse } from "next/server";
import { withAuth, ownedWhere } from "@/lib/auth-guards";
import { handleRouteError } from "@/lib/route-helpers";
import { prisma } from "@/lib/prisma";
import { folderExportSchema } from "@/lib/export/validators";
import { contentDispositionHeader } from "@/lib/export/profiles";
import { executeBulkExport } from "@/lib/export/bulk-export-helpers";

export const POST = withAuth(async (request, { session }) => {
  try {
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
    return handleRouteError(error, "export/folder/POST", "فشل تصدير المجلد");
  }
});
