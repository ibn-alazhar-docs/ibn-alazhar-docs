import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-guards";
import { handleRouteError } from "@/lib/route-helpers";
import { checkUserRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { bulkUntagSchema } from "@/lib/validators/tag";
import { useCases } from "@/core/composition-root";

export const POST = withAuth(async (request, { session }) => {
  const body = await request.json();
  const validation = bulkUntagSchema.safeParse(body);

  if (!validation.success) {
    const firstError = validation.error.issues[0];
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: firstError?.message || "بيانات غير صالحة" } },
      { status: 400 },
    );
  }

  const { documentIds, tagId } = validation.data;

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
      message: `تم إزالة الوسم من ${removedCount} مستند`,
    });
  } catch (error: unknown) {
    return handleRouteError(error, "documents/bulk-untag", "فشلت عملية إزالة الوسم");
  }
});
