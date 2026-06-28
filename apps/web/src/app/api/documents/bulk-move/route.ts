import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth-guards";
import { handleRouteError } from "@/lib/route-helpers";
import { useCases } from "@/core/composition-root";

const bulkMoveSchema = z
  .object({
    documentIds: z.array(z.string().min(1)).min(1).max(50),
    folderId: z.string().nullable(),
  })
  .strip();

const MAX_BULK_SIZE = 50;

export const POST = withAuth(async (request, { session }) => {
  const body = await request.json();
  const parsed = bulkMoveSchema.safeParse(body);

  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: firstError?.message || "بيانات غير صحيحة" } },
      { status: 400 },
    );
  }

  const { documentIds, folderId } = parsed.data;

  if (documentIds.length > MAX_BULK_SIZE) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: `الحد الأقصى ${MAX_BULK_SIZE} مستند في المرة` } },
      { status: 400 },
    );
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
    return handleRouteError(error, "documents/bulk-move/POST", "حدث خطأ داخلي");
  }
});
