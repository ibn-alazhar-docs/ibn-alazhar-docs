import { NextResponse } from "next/server";
import { withAuth, ownedWhere } from "@/lib/auth-guards";
import { handleRouteError } from "@/lib/route-helpers";
import { prisma } from "@/lib/prisma";
import { batchExportSchema } from "@/lib/export/validators";
import { contentDispositionHeader } from "@/lib/export/profiles";
import { executeBulkExport } from "@/lib/export/bulk-export-helpers";

export const POST = withAuth(async (request, { session }) => {
  try {
    const body = await request.json();
    const parsed = batchExportSchema.safeParse(body);

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

    const { documentIds, format, profile, includeSource } = parsed.data;

    const validDocs = await prisma.document.findMany({
      where: ownedWhere(
        {
          id: { in: documentIds },
          deletedAt: null,
        },
        session,
      ),
    });

    if (validDocs.length === 0) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "No documents found" } },
        { status: 404 },
      );
    }

    if (validDocs.length !== documentIds.length) {
      const foundIds = new Set(validDocs.map((d) => d.id));
      const missing = documentIds.filter((id: string) => !foundIds.has(id));
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: `لم يتم العثور على بعض المستندات: ${missing.join(", ")}`,
          },
        },
        { status: 404 },
      );
    }

    if (format !== "zip") {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Batch export requires ZIP" } },
        { status: 400 },
      );
    }

    const { zipBuffer, zipName } = await executeBulkExport(
      validDocs,
      { userId: session.user.id, includeSource, profile },
      "exp_batch",
      `Export_${validDocs.length}_docs_${new Date().toISOString().split("T")[0]}.zip`,
    );

    return new Response(new Uint8Array(zipBuffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": contentDispositionHeader(zipName),
      },
    });
  } catch (error: unknown) {
    return handleRouteError(error, "export/batch/POST", "فشل التصدير الجماعي");
  }
});
