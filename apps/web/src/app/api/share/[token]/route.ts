import { NextResponse } from "next/server";
import { checkRateLimit, rateLimitResponse } from "@/clients/redis";
import { useCases } from "@/core/composition-root";
import { handleRouteError } from "@/shared/route-helpers";
import { logger } from "@ibn-al-azhar-docs/shared";

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const rateLimitResult = await checkRateLimit("/api/share", request);
    if (!rateLimitResult.allowed) {
      return rateLimitResponse(rateLimitResult.retryAfterMs);
    }

    const { token } = await params;

    const result = await useCases.shareAccess.getPublicContent(token, {
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

    const { share, tags, markdown, rawText, folderName } = result;
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

    return NextResponse.json(
      {
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
          folder: folderName,
          exportFormats: doc.outputFormats,
        },
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error: unknown) {
    // SECURITY FIX: Use structured logger instead of console.error
    logger.error({ error, token: "***" }, "Public share route error");
    return handleRouteError(error, "share/[token]", "Failed to load document");
  }
}
