import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-guards";
import { handleRouteError } from "@/lib/route-helpers";
import { checkUserRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { bulkTagSchema } from "@/lib/validators/tag";
import { useCases } from "@/core/composition-root";

export const POST = withAuth(async (request, { session }) => {
  const body = await request.json();
  const validation = bulkTagSchema.safeParse(body);

  if (!validation.success) {
    const firstError = validation.error.issues[0];
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: firstError?.message || "بيانات غير صالحة" } },
      { status: 400 },
    );
  }

  const { documentIds, tagId } = validation.data;

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
    return handleRouteError(error, "documents/bulk-tag/POST", "فشلت عملية الوسم");
  }
});
