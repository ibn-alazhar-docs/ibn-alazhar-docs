import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { loadConfig, downloadFile, fileExists } from "@ibn-al-azhar-docs/pipeline";
import { EXPORT_FORMATS, type ExportFormat } from "@/lib/validators/share";
import { logger } from "@/lib/logger";

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

function contentDispositionHeader(filename: string): string {
  const asciiSafe =
    filename
      .replace(/[^\x20-\x7E]/g, "_")
      .replace(/\s+/g, "_")
      .trim() || "download";
  const encoded = encodeURIComponent(filename)
    .replace(/'/g, "%27")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29")
    .replace(/\*/g, "%2A");
  return `attachment; filename="${asciiSafe}"; filename*=UTF-8''${encoded}`;
}

function getContentType(format: ExportFormat): string {
  switch (format) {
    case "md":
      return "text/markdown; charset=utf-8";
    case "txt":
      return "text/plain; charset=utf-8";
    case "json":
      return "application/json; charset=utf-8";
    default:
      return "application/octet-stream";
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string; format: string }> },
) {
  const { token, format } = await params;

  if (!EXPORT_FORMATS.includes(format as ExportFormat)) {
    return NextResponse.json({ error: "Unsupported format" }, { status: 400 });
  }

  const result = await validateShareAccess(token);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const { share } = result;
  const exportFormat = format as ExportFormat;

  try {
    const config = loadConfig();

    const outputKey = `${config.paths.exports}/${share.documentId}/output.${exportFormat}`;
    const exists = await fileExists(config, outputKey);

    if (!exists) {
      const altKey = `${config.paths.exports}/${share.documentId}/export.${exportFormat}`;
      const altExists = await fileExists(config, altKey);
      if (!altExists) {
        return NextResponse.json({ error: "Export not ready" }, { status: 404 });
      }
      const buffer = await downloadFile(config, altKey);
      const filename = `${sanitizeFilename(share.document.title)}.${exportFormat}`;
      return new Response(new Uint8Array(buffer), {
        headers: {
          "Content-Type": getContentType(exportFormat),
          "Content-Disposition": contentDispositionHeader(filename),
        },
      });
    }

    const buffer = await downloadFile(config, outputKey);
    const filename = `${sanitizeFilename(share.document.title)}.${exportFormat}`;
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": getContentType(exportFormat),
        "Content-Disposition": contentDispositionHeader(filename),
      },
    });
  } catch (error: unknown) {
    logger.error(error, "[share] Export failed:");
    return NextResponse.json({ error: "Download failed" }, { status: 500 });
  }
}
