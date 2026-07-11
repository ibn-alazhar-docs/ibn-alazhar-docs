import { NextResponse } from "next/server";
import { parseValidatedBody } from "@/shared/validation";
import { withAuth } from "@/middleware/auth-guards";
import { handleRouteError } from "@/shared/route-helpers";
import { checkUserRateLimit, rateLimitResponse } from "@/clients/redis";
import { bulkUntagSchema } from "@/shared/validators/tag";
import { useCases } from "@/core/composition-root";

export const POST = withAuth(async (request, { session }) => {
  const validation = await parseValidatedBody(request, bulkUntagSchema);

  const { documentIds, tagId } = validation;

  const rateLimit = await checkUserRateLimit("documents:bulk-untag", session.user.id);
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.retryAfterMs);
  }

  try {
    const removedCount = await useCases.documentTag.bulkUntagDocuments(
      documentIds,
      tagId,
      session.user.id,
      session.user.role,
    );

    return NextResponse.json({
      success: true,
      removedCount,
      message: `أُزيل الوسم من ${removedCount} مستند`,
    });
  } catch (error: unknown) {
    return handleRouteError(error, "documents/bulk-untag", "تعذرت إزالة الوسم");
  }
});
