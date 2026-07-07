import { NextResponse } from "next/server";
import { withAuth } from "@/lib/backend/auth-guards";
import { checkUserRateLimit, rateLimitResponse } from "@/lib/backend/rate-limit";
import { moveFolderSchema } from "@/lib/shared/validators/folder";
import { useCases } from "@/core/composition-root";
import { handleRouteError } from "@/lib/shared/route-helpers";

export const POST = withAuth(async (request, { session, params }) => {
  const id = params.id;
  if (!id)
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "معرف المجلد مطلوب" } },
      { status: 400 },
    );

  try {
    const body = await request.json();
    const validation = moveFolderSchema.safeParse(body);

    if (!validation.success) {
      const firstError = validation.error.issues[0];
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: firstError?.message || "بيانات غير صحيحة" } },
        { status: 400 },
      );
    }

    const { parentId } = validation.data;

    const rateLimit = await checkUserRateLimit("folders:move", session.user.id);
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.retryAfterMs);
    }

    const updated = await useCases.folder.moveFolder(id, session.user.id, parentId);
    return NextResponse.json({ folder: updated });
  } catch (error: unknown) {
    return handleRouteError(error, "folders/[id]/move/POST", "تعذر نقل المجلد");
  }
});
