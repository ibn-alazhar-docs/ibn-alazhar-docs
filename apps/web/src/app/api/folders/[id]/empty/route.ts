import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-guards";
import { checkUserRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { useCases } from "@/core/composition-root";
import { handleRouteError } from "@/lib/route-helpers";

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
      message: "تم تفريغ المجلد بنجاح",
      documentsMoved: result.documentsMoved,
      foldersMoved: result.foldersMoved,
    });
  } catch (error: unknown) {
    return handleRouteError(error, "folders/[id]/empty/POST", "فشل تفريغ المجلد");
  }
});
