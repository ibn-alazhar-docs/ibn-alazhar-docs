import { NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/lib/auth-guards";
import { bulkUntagSchema } from "@/lib/validators/tag";
import { documentUseCases } from "@/core/use-cases/document.use-cases";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  try {
    const session = await requireAuth().catch(() => null);
    if (!session) return unauthorizedResponse();

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

    try {
      const removedCount = await documentUseCases.bulkUntagDocuments(
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
      if ((error as Error).message === "TAG_NOT_FOUND") {
        return NextResponse.json(
          { error: { code: "NOT_FOUND", message: "الوسم غير موجود" } },
          { status: 404 },
        );
      }
      if ((error as Error).message === "SOME_NOT_FOUND") {
        return NextResponse.json(
          { error: { code: "VALIDATION_ERROR", message: "بعض المستندات غير موجودة" } },
          { status: 400 },
        );
      }
      throw error;
    }
  } catch (error: unknown) {
    logger.error(error, "[documents/bulk-untag/POST] Failed:");
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "فشلت عملية إزالة الوسم" } },
      { status: 500 },
    );
  }
}
