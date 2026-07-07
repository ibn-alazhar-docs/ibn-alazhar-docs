import { NextResponse } from "next/server";
import { withAuth } from "@/lib/backend/auth-guards";
import { checkUserRateLimit, rateLimitResponse } from "@/lib/backend/rate-limit";
import { useCases } from "@/core/composition-root";
import { handleRouteError } from "@/lib/shared/route-helpers";

export const POST = withAuth(async (_request, { session, params }) => {
  const id = params.id;
  if (!id)
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "معرف المجلد مطلوب" } },
      { status: 400 },
    );

  const rateLimit = await checkUserRateLimit("folders:empty", session.user.id);
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.retryAfterMs);
  }

  try {
    const result = await useCases.folder.emptyFolder(id, session.user.id);
    return NextResponse.json({
      message: "فُرّغ المجلد",
      documentsMoved: result.documentsMoved,
      foldersMoved: result.foldersMoved,
    });
  } catch (error: unknown) {
    return handleRouteError(error, "folders/[id]/empty/POST", "تعذر تفريغ المجلد");
  }
});
