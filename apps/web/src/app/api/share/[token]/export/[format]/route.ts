import { NextResponse } from "next/server";
import { SHARE_EXPORT_FORMATS, type ShareExportFormat } from "@/lib/validators/share";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { contentDispositionHeader, sanitizeTitle, getContentType } from "@/lib/export/profiles";
import { validateShareAccess } from "@/lib/share-helpers";
import { repos } from "@/core/composition-root";
import { handleRouteError } from "@/lib/route-helpers";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string; format: string }> },
) {
  try {
    const rateLimitResult = await checkRateLimit("/api/share", request);
    if (!rateLimitResult.allowed) {
      return rateLimitResponse(rateLimitResult.retryAfterMs);
    }

    const { token, format } = await params;

    if (!SHARE_EXPORT_FORMATS.includes(format as ShareExportFormat)) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Unsupported format" } },
        { status: 400 },
      );
    }

    const result = await validateShareAccess(token);
    if ("error" in result) {
      return NextResponse.json(
        { error: { code: result.status === 410 ? "EXPIRED" : "NOT_FOUND", message: result.error } },
        { status: result.status },
      );
    }

    const { share } = result;
    const doc = share.document as { title: string };
    const exportFormat = format as ShareExportFormat;

    const outputKey = repos.storage.exportOutputKey(share.documentId, exportFormat);
    const exists = await repos.storage.fileExists(outputKey);

    if (!exists) {
      const altKey = repos.storage.exportCacheKey(share.documentId, exportFormat);
      const altExists = await repos.storage.fileExists(altKey);
      if (!altExists) {
        return NextResponse.json(
          { error: { code: "NOT_FOUND", message: "Export not ready" } },
          { status: 404 },
        );
      }
      const buffer = await repos.storage.downloadFile(altKey);
      const filename = `${sanitizeTitle(doc.title)}.${exportFormat === "searchable-pdf" ? "pdf" : exportFormat}`;
      return new Response(new Uint8Array(buffer), {
        headers: {
          "Content-Type": getContentType(exportFormat),
          "Content-Disposition": contentDispositionHeader(filename),
          "Cache-Control": "private, no-store",
        },
      });
    }

    const buffer = await repos.storage.downloadFile(outputKey);
    const filename = `${sanitizeTitle(doc.title)}.${exportFormat === "searchable-pdf" ? "pdf" : exportFormat}`;
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": getContentType(exportFormat),
        "Content-Disposition": contentDispositionHeader(filename),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error: unknown) {
    return handleRouteError(error, "share/[token]/export/[format]", "Download failed");
  }
}
