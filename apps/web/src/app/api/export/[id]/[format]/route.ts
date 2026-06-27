import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-guards";
import { handleRouteError } from "@/lib/route-helpers";
import { exportDocumentUseCase } from "@/core/use-cases/export-document.use-case";
import { contentDispositionHeader } from "@/lib/export/profiles";
import { checkRateLimit } from "@/lib/rate-limit";

export const GET = withAuth(async (request, { session, params }) => {
  try {
    const rateLimitResult = await checkRateLimit("/api/export", request);
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

    const id = params.id!;
    const format = params.format!;

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
    return handleRouteError(error, "export/[id]/[format]/GET", "فشل التصدير");
  }
});
