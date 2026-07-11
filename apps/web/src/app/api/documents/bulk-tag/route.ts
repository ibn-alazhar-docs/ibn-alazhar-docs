import { NextResponse } from "next/server";
import { parseValidatedBody } from "@/shared/validation";
import { withAuth } from "@/middleware/auth-guards";
import { handleRouteError } from "@/shared/route-helpers";
import { checkUserRateLimit, rateLimitResponse } from "@/clients/redis";
import { bulkTagSchema } from "@/shared/validators/tag";
import { useCases } from "@/core/composition-root";

export const POST = withAuth(async (request, { session }) => {
  const validation = await parseValidatedBody(request, bulkTagSchema);

  const { documentIds, tagId } = validation;

  const rateLimit = await checkUserRateLimit("documents:bulk-tag", session.user.id);
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.retryAfterMs);
  }

  try {
    const { taggedCount, skippedCount } = await useCases.documentTag.bulkTagDocuments(
      documentIds,
      tagId,
      session.user.id,
      session.user.role,
    );

    return NextResponse.json({
      success: true,
      taggedCount,
      skippedCount,
      message: `تم وسم ${taggedCount} مستند`,
    });
  } catch (error: unknown) {
    return handleRouteError(error, "documents/bulk-tag/POST", "تعذر الوسم");
  }
});
