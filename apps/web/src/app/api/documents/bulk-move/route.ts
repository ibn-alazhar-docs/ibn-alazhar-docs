import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, unauthorizedResponse } from "@/lib/auth-guards";
import { documentUseCases } from "@/core/use-cases/document.use-cases";
import { logger } from "@/lib/logger";

const bulkMoveSchema = z.object({
  documentIds: z.array(z.string().min(1)).min(1).max(100),
  folderId: z.string().nullable(),
});

const MAX_BULK_SIZE = 50;

export async function POST(request: Request) {
  const session = await requireAuth().catch(() => null);
  if (!session) {
    return unauthorizedResponse();
  }

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
    const moved = await documentUseCases.bulkMoveDocuments(documentIds, session.user.id, folderId);
    return NextResponse.json({
      success: true,
      moved,
      folderId,
      message: `تم نقل ${moved} مستند${moved > 1 ? "ات" : ""}`,
    });
  } catch (error: unknown) {
    if ((error as Error).message === "SOME_NOT_FOUND") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "بعض المستندات غير موجودة" } },
        { status: 400 },
      );
    }
    if ((error as Error).message === "FOLDER_NOT_FOUND") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "المجلد غير موجود" } },
        { status: 404 },
      );
    }
    logger.error(error, "[documents/bulk-move/POST] Failed:");
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "حدث خطأ داخلي" } },
      { status: 500 },
    );
  }
}
