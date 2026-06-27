import { NextResponse } from "next/server";
import { loadConfig, downloadFile, fileExists } from "@ibn-al-azhar-docs/pipeline";
import { SHARE_EXPORT_FORMATS, type ShareExportFormat } from "@/lib/validators/share";
import { checkRateLimit } from "@/lib/rate-limit";
import { contentDispositionHeader, sanitizeTitle, getContentType } from "@/lib/export/profiles";
import { validateShareAccess } from "@/lib/share-helpers";
import { handleRouteError } from "@/lib/route-helpers";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string; format: string }> },
) {
  const rateLimitResult = await checkRateLimit("/api/share", request);
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: { code: "RATE_LIMITED", message: "Too many requests" } },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((rateLimitResult.retryAfterMs ?? 60_000) / 1000)),
        },
      },
    );
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

  try {
    const config = loadConfig();

    const outputKey = `${config.paths.exports}/${share.documentId}/${exportFormat === "searchable-pdf" ? "searchable.pdf" : `output.${exportFormat}`}`;
    const exists = await fileExists(config, outputKey);

    if (!exists) {
      const altKey = `${config.paths.exports}/${share.documentId}/${exportFormat === "searchable-pdf" ? "searchable.pdf" : `export.${exportFormat}`}`;
      const altExists = await fileExists(config, altKey);
      if (!altExists) {
        return NextResponse.json(
          { error: { code: "NOT_FOUND", message: "Export not ready" } },
          { status: 404 },
        );
      }
      const buffer = await downloadFile(config, altKey);
      const filename = `${sanitizeTitle(doc.title)}.${exportFormat === "searchable-pdf" ? "pdf" : exportFormat}`;
      return new Response(new Uint8Array(buffer), {
        headers: {
          "Content-Type": getContentType(exportFormat),
          "Content-Disposition": contentDispositionHeader(filename),
        },
      });
    }

    const buffer = await downloadFile(config, outputKey);
    const filename = `${sanitizeTitle(doc.title)}.${exportFormat === "searchable-pdf" ? "pdf" : exportFormat}`;
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": getContentType(exportFormat),
        "Content-Disposition": contentDispositionHeader(filename),
      },
    });
  } catch (error: unknown) {
    return handleRouteError(error, "share/[token]/export/[format]", "Download failed");
  }
}
