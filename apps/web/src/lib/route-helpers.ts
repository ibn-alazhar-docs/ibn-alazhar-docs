import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getErrorMessage, getErrorStatusCode } from "@/lib/errors";

const ERROR_MESSAGES: Record<string, { code: string; message: string; status: number }> = {
  NOT_FOUND: { code: "NOT_FOUND", message: "غير موجود", status: 404 },
  FOLDER_NOT_FOUND: { code: "NOT_FOUND", message: "المجلد غير موجود", status: 404 },
  TAG_NOT_FOUND: { code: "NOT_FOUND", message: "الوسم غير موجود", status: 404 },
  TARGET_NOT_FOUND: { code: "NOT_FOUND", message: "المجلد الهدف غير موجود", status: 404 },
  NO_SHARE_LINK: { code: "NOT_FOUND", message: "لا يوجد رابط مشاركة", status: 404 },
  SOME_NOT_FOUND: { code: "NOT_FOUND", message: "بعض العناصر غير موجودة", status: 404 },
  PARENT_DELETED: {
    code: "VALIDATION_ERROR",
    message: "لا يمكن استعادة المجلد لأن المجلد الأب محذوف. يرجى استعادة المجلد الأب أولاً.",
    status: 400,
  },
  CIRCULAR_REFERENCE: {
    code: "VALIDATION_ERROR",
    message: "لا يمكن نقل المجلد إلى نفسه أو مجلد فرعي منه",
    status: 400,
  },
  MAX_DEPTH_REACHED: {
    code: "VALIDATION_ERROR",
    message: "الحد الأقصى لعمق المجلدات هو 10 مستويات",
    status: 400,
  },
  NOT_READY: { code: "VALIDATION_ERROR", message: "الملف جاهز للتصدير بعد", status: 409 },
  CONFLICT: { code: "CONFLICT", message: "تعارض", status: 409 },
  UNAUTHORIZED: { code: "UNAUTHORIZED", message: "يجب تسجيل الدخول", status: 401 },
  FORBIDDEN: { code: "FORBIDDEN", message: "ليس لديك صلاحية للوصول", status: 403 },
  SOME_TAGS_NOT_FOUND: { code: "NOT_FOUND", message: "بعض الأوسمة غير موجودة", status: 404 },
  TAG_NOT_ASSIGNED: { code: "NOT_FOUND", message: "الوسم غير مرتبط بالمستند", status: 404 },
};

export function handleRouteError(error: unknown, route: string, fallbackMessage: string) {
  const code = getErrorMessage(error);
  const mapped = ERROR_MESSAGES[code];

  logger.error(error, `[${route}] Failed:`);

  if (mapped) {
    const message = error instanceof Error && error.message ? error.message : mapped.message;
    return NextResponse.json({ error: { code: mapped.code, message } }, { status: mapped.status });
  }

  const statusCode = getErrorStatusCode(error);
  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message: fallbackMessage } },
    { status: statusCode },
  );
}
