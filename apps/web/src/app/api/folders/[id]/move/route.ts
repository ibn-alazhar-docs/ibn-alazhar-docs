import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-guards";
import { moveFolderSchema } from "@/lib/validators/folder";
import { folderUseCases } from "@/core/use-cases/folder.use-cases";
import { handleRouteError } from "@/lib/route-helpers";

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
    const updated = await folderUseCases.moveFolder(id, session.user.id, parentId);
    return NextResponse.json({ folder: updated });
  } catch (error: unknown) {
    return handleRouteError(error, "folders/[id]/move/POST", "فشل نقل المجلد");
  }
});
