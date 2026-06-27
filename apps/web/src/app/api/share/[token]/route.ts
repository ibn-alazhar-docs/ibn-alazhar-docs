import { NextResponse } from "next/server";
import { loadConfig, downloadFile, fileExists } from "@ibn-al-azhar-docs/pipeline";
import { checkRateLimit } from "@/lib/rate-limit";
import { validateShareAccess } from "@/lib/share-helpers";
import { repos } from "@/core/composition-root";
import { handleRouteError } from "@/lib/route-helpers";

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
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

    const result = await validateShareAccess(token, {
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
    });
    if ("error" in result) {
      return NextResponse.json(
        { error: { code: result.status === 410 ? "EXPIRED" : "NOT_FOUND", message: result.error } },
        { status: result.status },
      );
    }

    const { share } = result;
    const doc = share.document as {
      id: string;
      title: string;
      description: string | null;
      language: string | null;
      isRtl: boolean;
      pageCount: number | null;
      outputFormats: string[];
      createdAt: Date;
    };

    const tags = await repos.tagDocument.findMany({
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
      ? await repos.folder.findFirst({
          documents: { some: { id: share.documentId } },
        })
      : null;

    return NextResponse.json({
      document: {
        id: doc.id,
        title: doc.title,
        description: doc.description,
        language: doc.language,
        isRtl: doc.isRtl,
        pageCount: doc.pageCount,
        createdAt: doc.createdAt.toISOString(),
      },
      content: {
        markdown,
        rawText,
      },
      metadata: {
        tags: tags.map((td) => {
          const tag = td.tag as { name: string; color: string };
          return { name: tag.name, color: tag.color };
        }),
        folder: folder?.name ?? null,
        exportFormats: doc.outputFormats,
      },
    });
  } catch (error: unknown) {
    return handleRouteError(error, "share/[token]", "Failed to load document");
  }
}
