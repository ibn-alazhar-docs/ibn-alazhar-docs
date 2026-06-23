import { NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/lib/auth-guards";
import { logger } from "@/lib/logger";
import { exportDocumentUseCase } from "@/core/use-cases/export-document.use-case";
import { getErrorMessage } from "@/lib/types";
import { contentDispositionHeader } from "@/lib/export/profiles";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; format: string }> },
) {
  const session = await requireAuth().catch(() => null);
  if (!session) {
    return unauthorizedResponse();
  }

  const { id, format } = await params;

  const validFormats = ["md", "txt", "json", "docx", "epub", "pdf", "searchable-pdf"] as const;
  if (
    !validFormats.includes(
      format as "md" | "txt" | "json" | "docx" | "epub" | "pdf" | "searchable-pdf",
    )
  ) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Unsupported format" } },
      { status: 400 },
    );
  }

  try {
    const { buffer, document } = await exportDocumentUseCase.execute({
      id,
      format,
      userId: session.user.id,
    });

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          format === "json"
            ? "application/json"
            : format === "md"
              ? "text/markdown"
              : format === "docx"
                ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                : format === "epub"
                  ? "application/epub+zip"
                  : format === "pdf" || format === "searchable-pdf"
                    ? "application/pdf"
                    : "text/plain",
        "Content-Disposition": contentDispositionHeader(
          `${document.title}.${format === "searchable-pdf" ? "pdf" : format}`,
        ),
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (getErrorMessage(error) === "NOT_FOUND") {
        return NextResponse.json(
          { error: { code: "NOT_FOUND", message: "Document not found" } },
          { status: 404 },
        );
      }
      if (getErrorMessage(error) === "NOT_READY") {
        return NextResponse.json(
          { error: { code: "NOT_FOUND", message: "Export not ready" } },
          { status: 404 },
        );
      }
    }
    logger.error(error, "[export] Failed:");
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Export failed" } },
      { status: 500 },
    );
  }
}
