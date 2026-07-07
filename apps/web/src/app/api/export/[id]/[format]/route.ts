import { NextResponse } from "next/server";
import { withAuth } from "@/lib/backend/auth-guards";
import { handleRouteError } from "@/lib/shared/route-helpers";
import { useCases } from "@/core/composition-root";
import { contentDispositionHeader, getContentType } from "@/lib/backend/export/profiles";
import { checkRateLimit, rateLimitResponse } from "@/lib/backend/rate-limit";

export const GET = withAuth(async (request, { session, params }) => {
  try {
    const rateLimitResult = await checkRateLimit("/api/export", request);
    if (!rateLimitResult.allowed) {
      return rateLimitResponse(rateLimitResult.retryAfterMs);
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

    const { buffer, document } = await useCases.exportDocument.execute({
      id,
      format,
      userId: session.user.id,
      userRole: session.user.role,
    });

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": getContentType(format),
        "Content-Disposition": contentDispositionHeader(
          `${document.title}.${format === "searchable-pdf" ? "pdf" : format}`,
        ),
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error: unknown) {
    return handleRouteError(error, "export/[id]/[format]/GET", "تعذر التصدير");
  }
});
