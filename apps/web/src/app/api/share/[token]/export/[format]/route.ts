import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { loadConfig, downloadFile, fileExists } from "@ibn-al-azhar-docs/pipeline";
import { EXPORT_FORMATS, type ExportFormat } from "@/lib/validators/share";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";
import { contentDispositionHeader } from "@/lib/export/profiles";

async function validateShareAccess(token: string) {
  const share = await prisma.shareLink.findUnique({
    where: { token },
    include: {
      document: {
        select: {
          id: true,
          title: true,
          status: true,
          deletedAt: true,
          outputFormats: true,
          originalName: true,
        },
      },
    },
  });

  if (!share) return { error: "Link not found", status: 404 as const };
  if (share.document.deletedAt) return { error: "Document deleted", status: 404 as const };
  if (share.document.status !== "COMPLETED")
    return { error: "Document not ready", status: 404 as const };
  if (share.expiresAt && new Date() > share.expiresAt)
    return { error: "Link expired", status: 410 as const };

  return { share };
}

function sanitizeFilename(title: string): string {
  return title
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, "_")
    .substring(0, 100);
}

function getContentType(format: ExportFormat): string {
  switch (format) {
    case "md":
      return "text/markdown; charset=utf-8";
    case "txt":
      return "text/plain; charset=utf-8";
    case "json":
      return "application/json; charset=utf-8";
    case "pdf":
    case "searchable-pdf":
      return "application/pdf";
    default:
      return "application/octet-stream";
  }
}

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

  if (!EXPORT_FORMATS.includes(format as ExportFormat)) {
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
  const exportFormat = format as ExportFormat;

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
      const filename = `${sanitizeFilename(share.document.title)}.${exportFormat === "searchable-pdf" ? "pdf" : exportFormat}`;
      return new Response(new Uint8Array(buffer), {
        headers: {
          "Content-Type": getContentType(exportFormat),
          "Content-Disposition": contentDispositionHeader(filename),
        },
      });
    }

    const buffer = await downloadFile(config, outputKey);
    const filename = `${sanitizeFilename(share.document.title)}.${exportFormat === "searchable-pdf" ? "pdf" : exportFormat}`;
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": getContentType(exportFormat),
        "Content-Disposition": contentDispositionHeader(filename),
      },
    });
  } catch (error: unknown) {
    logger.error(error, "[share] Export failed:");
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Download failed" } },
      { status: 500 },
    );
  }
}
