import { NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/lib/auth-guards";
import { createFolderSchema } from "@/lib/validators/folder";
import { logger } from "@/lib/logger";
import { folderUseCases } from "@/core/use-cases/folder.use-cases";
import { getErrorMessage } from "@/lib/types";

export async function GET(request: Request) {
  try {
    const session = await requireAuth().catch(() => null);
    if (!session) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get("parentId");

    const folders = await folderUseCases.getFolders(session.user.id, session.user.role, parentId);

    return NextResponse.json({ folders });
  } catch (error: unknown) {
    logger.error(error, "[folders/GET] Failed:");
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "فشل الحصول على المجلدات" } },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAuth().catch(() => null);
    if (!session) return unauthorizedResponse();

    const body = await request.json();
    const validation = createFolderSchema.safeParse(body);

    if (!validation.success) {
      const firstError = validation.error.issues[0];
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: firstError?.message || "بيانات غير صحيحة" } },
        { status: 400 },
      );
    }

    try {
      const folder = await folderUseCases.createFolder(session.user.id, validation.data);
      return NextResponse.json({ folder }, { status: 201 });
    } catch (error: unknown) {
      if (getErrorMessage(error) === "NOT_FOUND") {
        return NextResponse.json(
          { error: { code: "NOT_FOUND", message: "المجلد الأصل غير موجود" } },
          { status: 404 },
        );
      }
      throw error;
    }
  } catch (error: unknown) {
    logger.error(error, "[folders/POST] Failed:");
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "فشل إنشاء المجلد" } },
      { status: 500 },
    );
  }
}
