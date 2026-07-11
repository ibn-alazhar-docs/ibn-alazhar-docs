import { NextResponse } from "next/server";
import { parseValidatedBody } from "@/shared/validation";
import { withAuth } from "@/middleware/auth-guards";
import { checkUserRateLimit, rateLimitResponse } from "@/clients/redis";
import { moveFolderSchema } from "@/shared/validators/folder";
import { useCases } from "@/core/composition-root";
import { handleRouteError } from "@/shared/route-helpers";

export const POST = withAuth(async (request, { session, params }) => {
  const id = params.id;
  if (!id)
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "معرف المجلد مطلوب" } },
      { status: 400 },
    );

  try {
    const validation = await parseValidatedBody(request, moveFolderSchema);

    const { parentId } = validation;

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
