import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth-guards";
import { handleRouteError } from "@/lib/route-helpers";
import { checkUserRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { useCases } from "@/core/composition-root";

const statusQuerySchema = z
  .object({
    format: z.enum(["md", "txt", "docx", "epub", "json", "pdf", "searchable-pdf"]),
  })
  .strip();

export const GET = withAuth(async (request, { session, params }) => {
  const id = params.id!;

  const rateLimitResult = await checkUserRateLimit("documents:export:status", session.user.id);
  if (!rateLimitResult.allowed) {
    return rateLimitResponse(rateLimitResult.retryAfterMs);
  }

  const { searchParams } = new URL(request.url);
  const validation = statusQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!validation.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "format query parameter required" } },
      { status: 400 },
    );
  }

  const { format } = validation.data;

  try {
    const document = await useCases.documentCrud.getDocumentById(id, session.user.id);
    const outputKeys = (document.outputKeys as Record<string, string>) || {};
    const outputKey = outputKeys[format];

    if (!outputKey) {
      return NextResponse.json({
        status: "processing",
        format,
        ready: false,
      });
    }

    return NextResponse.json({
      status: "ready",
      format,
      ready: true,
      downloadUrl: `/api/export/${id}/${format}`,
    });
  } catch (error: unknown) {
    return handleRouteError(error, "documents/export/status/GET", "حدث خطأ داخلي");
  }
});
