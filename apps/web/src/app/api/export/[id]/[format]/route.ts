import { NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse, ownedWhere } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; format: string }> },
) {
  const session = await requireAuth().catch(() => null);
  if (!session) {
    return unauthorizedResponse();
  }

  const { id, format } = await params;

  const validFormats = ["md", "txt", "json", "docx"] as const;
  if (!validFormats.includes(format as "md" | "txt" | "json" | "docx")) {
    return NextResponse.json({ error: "Unsupported format" }, { status: 400 });
  }

  // Verify document ownership
  const document = await prisma.document.findFirst({
    where: ownedWhere({ id, deletedAt: null }, session),
  });

  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  try {
    const { loadConfig, downloadFile, fileExists } = await import("@ibn-al-azhar-docs/pipeline");

    const config = loadConfig();
    const outputKey = `${config.paths.exports}/${id}/output.${format}`;

    const exists = await fileExists(config, outputKey);
    if (!exists) {
      // Try export-specific key
      const exportKey = `${config.paths.exports}/${id}/export.${format}`;
      const exportExists = await fileExists(config, exportKey);
      if (!exportExists) {
        return NextResponse.json(
          { error: "Export not ready" },
          { status: 404 },
        );
      }
      const buffer = await downloadFile(config, exportKey);
      return new Response(new Uint8Array(buffer), {
        headers: {
          "Content-Type":
            format === "json"
              ? "application/json"
              : format === "md"
                ? "text/markdown"
                : "text/plain",
          "Content-Disposition": contentDispositionHeader(`${document.title}.${format}`),
        },
      });
    }

    const buffer = await downloadFile(config, outputKey);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          format === "json" ? "application/json" : format === "md" ? "text/markdown" : "text/plain",
        "Content-Disposition": contentDispositionHeader(`${document.title}.${format}`),
      },
    });
  } catch (error: unknown) {
    logger.error(error, "[export] Failed:");
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
