import { NextResponse } from "next/server";
import { parseValidatedBody } from "@/shared/validation";
import { z } from "zod";
import { withAuth } from "@/middleware/auth-guards";
import { handleRouteError } from "@/shared/route-helpers";
import { checkUserRateLimit, rateLimitResponse } from "@/clients/redis";
import { useCases } from "@/core/composition-root";
import { auditLog, AUDIT_ACTIONS } from "@/middleware/audit";

const bulkExportSchema = z
  .object({
    documentIds: z.array(z.string().min(1)).min(1).max(50),
    format: z.enum(["md", "txt", "docx", "epub", "json", "pdf", "searchable-pdf"]),
    options: z
      .object({
        profile: z.enum(["research", "archive", "plain", "developer"]).optional(),
      })
      .optional(),
  })
  .strip();

export const POST = withAuth(async (request, { session }) => {
  const parsed = await parseValidatedBody(request, bulkExportSchema);

  const { documentIds, format, options } = parsed;

  const rateLimit = await checkUserRateLimit("export:bulk", session.user.id);
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.retryAfterMs);
  }

  try {
    const result = await useCases.export.exportByBatch(
      documentIds,
      {
        format,
        includeSource: false,
        profile: options?.profile || "plain",
      },
      {
        user: {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          image: session.user.image,
          role: session.user.role,
        },
      },
    );

    await auditLog({
      userId: session.user.id,
      action: AUDIT_ACTIONS.EXPORT_BULK,
      entity: "document",
      entityId: documentIds.join(","),
      metadata: { format, count: documentIds.length },
      ipAddress:
        request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? undefined,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });

    return NextResponse.json({
      success: true,
      ...result,
      message: `بدأ التصدير لـ ${documentIds.length} مستند`,
    });
  } catch (error: unknown) {
    return handleRouteError(error, "documents/bulk-export/POST", "حدث خطأ");
  }
});
