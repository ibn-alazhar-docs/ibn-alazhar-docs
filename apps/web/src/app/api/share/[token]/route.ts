import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { loadConfig, downloadFile, fileExists } from "@ibn-al-azhar-docs/pipeline";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";

async function validateShareAccess(token: string) {
  const share = await prisma.shareLink.findUnique({
    where: { token },
    include: {
      document: {
        select: {
          id: true,
          title: true,
          description: true,
          language: true,
          isRtl: true,
          pageCount: true,
          outputFormats: true,
          createdAt: true,
          status: true,
          deletedAt: true,
        },
      },
    },
  });

  if (!share) {
    return { error: "Link not found", status: 404 as const };
  }

  if (share.document.deletedAt) {
    return { error: "Document deleted", status: 404 as const };
  }

  if (share.document.status !== "COMPLETED") {
    return { error: "Document not ready", status: 404 as const };
  }

  if (share.expiresAt && new Date() > share.expiresAt) {
    return { error: "Link expired", status: 410 as const };
  }

  return { share };
}

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
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

  const { token } = await params;

  const result = await validateShareAccess(token);
  if ("error" in result) {
    return NextResponse.json(
      { error: { code: result.status === 410 ? "EXPIRED" : "NOT_FOUND", message: result.error } },
      { status: result.status },
    );
  }

  const { share } = result;

  try {
    const tags = await prisma.tagDocument.findMany({
      where: { documentId: share.documentId },
      include: { tag: { select: { name: true, color: true } } },
    });

    let markdown = "";
    let rawText = "";

    const config = loadConfig();

    // Try to fetch raw OCR text first
    const ocrKey = `${config.paths.ocrResults}/${share.documentId}/text.json`;
    const ocrExists = await fileExists(config, ocrKey);
    if (ocrExists) {
      const ocrBuffer = await downloadFile(config, ocrKey);
      try {
        const ocrData = JSON.parse(ocrBuffer.toString("utf-8"));
        rawText = ocrData.text || "";
      } catch {
        rawText = "";
      }
    }

    const mdKey = `${config.paths.exports}/${share.documentId}/output.md`;
    const mdExists = await fileExists(config, mdKey);
    if (mdExists) {
      const buffer = await downloadFile(config, mdKey);
      markdown = buffer.toString("utf-8");
      if (!rawText) rawText = markdown;
    }

    const folder = share.document
      ? await prisma.folder.findFirst({
          where: { documents: { some: { id: share.documentId } } },
          select: { name: true },
        })
      : null;

    return NextResponse.json({
      document: {
        id: share.document.id,
        title: share.document.title,
        description: share.document.description,
        language: share.document.language,
        isRtl: share.document.isRtl,
        pageCount: share.document.pageCount,
        createdAt: share.document.createdAt.toISOString(),
      },
      content: {
        markdown,
        rawText,
      },
      metadata: {
        tags: tags.map((td) => ({
          name: td.tag.name,
          color: td.tag.color,
        })),
        folder: folder?.name ?? null,
        exportFormats: share.document.outputFormats,
      },
    });
  } catch (error: unknown) {
    logger.error(error, "[share] Access failed:");
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to load document" } },
      { status: 500 },
    );
  }
}
