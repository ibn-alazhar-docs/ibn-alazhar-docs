import { NextResponse } from "next/server";
import { parseValidatedBody } from "@/shared/validation";
import { z } from "zod";
import { withAuth } from "@/middleware/auth-guards";
import { handleRouteError } from "@/shared/route-helpers";
import { checkUserRateLimit, rateLimitResponse } from "@/clients/redis";
import { useCases } from "@/core/composition-root";

const moveSchema = z
  .object({
    folderId: z.string().nullable(),
  })
  .strip();

export const PATCH = withAuth(async (request, { session, params }) => {
  const id = params.id!;
  const validation = await parseValidatedBody(request, moveSchema);

  const { folderId } = validation;

  const rateLimit = await checkUserRateLimit("documents:move", session.user.id);
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.retryAfterMs);
  }

  try {
    const updated = await useCases.documentMove.moveDocument(id, session.user.id, folderId);
    return NextResponse.json({
      success: true,
      document: updated,
    });
  } catch (error: unknown) {
    return handleRouteError(error, "documents/move/PATCH", "حدث خطأ");
  }
});
