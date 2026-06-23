import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-guards";
import { handleRouteError } from "@/lib/route-helpers";
import { mergeTagsSchema } from "@/lib/validators/tag";
import { tagUseCases } from "@/core/use-cases/tag.use-cases";

export const POST = withAuth(async (request, { session }) => {
  try {
    const body = await request.json();
    const validation = mergeTagsSchema.safeParse(body);
    if (!validation.success) {
      const firstError = validation.error.issues[0];
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: firstError?.message || "بيانات غير صحيحة" } },
        { status: 400 },
      );
    }

    const result = await tagUseCases.mergeTags(
      validation.data.sourceTagId,
      validation.data.targetTagId,
      session,
    );

    return NextResponse.json({
      success: true,
      affectedDocuments: result.affectedDocuments,
      message: `تم دمج الوسم بنجاح. تم نقل ${result.affectedDocuments} مستند`,
    });
  } catch (error: unknown) {
    return handleRouteError(error, "tags/merge/POST", "فشل دمج الوسوم");
  }
});
