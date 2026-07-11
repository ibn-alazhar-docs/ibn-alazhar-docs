import { NextResponse } from "next/server";
import { parseValidatedBody } from "@/shared/validation";
import { z } from "zod";
import { withAuth } from "@/middleware/auth-guards";
import { handleRouteError } from "@/shared/route-helpers";
import { checkUserRateLimit, rateLimitResponse } from "@/clients/redis";
import { useCases } from "@/core/composition-root";

const bulkMoveSchema = z
  .object({
    documentIds: z.array(z.string().min(1)).min(1).max(50),
    folderId: z.string().nullable(),
  })
  .strip();

export const POST = withAuth(async (request, { session }) => {
  const parsed = await parseValidatedBody(request, bulkMoveSchema);

  const { documentIds, folderId } = parsed;

  const rateLimit = await checkUserRateLimit("documents:bulk-move", session.user.id);
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.retryAfterMs);
  }

  try {
    const moved = await useCases.documentMove.bulkMoveDocuments(
      documentIds,
      session.user.id,
      folderId,
    );
    return NextResponse.json({
      success: true,
      moved,
      folderId,
      message: `تم نقل ${moved} مستند${moved > 1 ? "ات" : ""}`,
    });
  } catch (error: unknown) {
    return handleRouteError(error, "documents/bulk-move/POST", "حدث خطأ");
  }
});
