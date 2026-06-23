import { NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/lib/auth-guards";
import { bulkTagSchema } from "@/lib/validators/tag";
import { documentUseCases } from "@/core/use-cases/document.use-cases";
import { logger } from "@/lib/logger";
import { getErrorMessage } from "@/lib/errors";

export async function POST(request: Request) {
  try {
    const session = await requireAuth().catch(() => null);
    if (!session) return unauthorizedResponse();

    const body = await request.json();
    const validation = bulkTagSchema.safeParse(body);

    if (!validation.success) {
      const firstError = validation.error.issues[0];
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: firstError?.message || "بيانات غير صالحة" } },
        { status: 400 },
      );
    }

    const { documentIds, tagId } = validation.data;

    try {
      const { taggedCount, skippedCount } = await documentUseCases.bulkTagDocuments(
        documentIds,
        tagId,
        session.user.id,
        session.user.role,
      );

      return NextResponse.json({
        success: true,
        taggedCount,
        skippedCount,
        message: `تم وسم ${taggedCount} مستند`,
      });
    } catch (error: unknown) {
      if (getErrorMessage(error) === "TAG_NOT_FOUND") {
        return NextResponse.json(
          { error: { code: "NOT_FOUND", message: "الوسم غير موجود" } },
          { status: 404 },
        );
      }
      if (getErrorMessage(error) === "SOME_NOT_FOUND") {
        return NextResponse.json(
          { error: { code: "VALIDATION_ERROR", message: "بعض المستندات غير موجودة" } },
          { status: 400 },
        );
      }
      throw error;
    }
  } catch (error: unknown) {
    logger.error(error, "[documents/bulk-tag/POST] Failed:");
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "فشلت عملية الوسم" } },
      { status: 500 },
    );
  }
}
