import { NextResponse } from "next/server";
import { logger, generateRequestId } from "@/lib/shared/logger";
import { getErrorMessage, getErrorStatusCode } from "@/lib/shared/errors";
import { MAX_FOLDER_DEPTH } from "@/lib/shared/validators/folder";
import { ERROR_CODES } from "@/lib/shared/constants";

const ERROR_MESSAGES: Record<string, { code: string; message: string; status: number }> = {
  [ERROR_CODES.NOT_FOUND]: { code: ERROR_CODES.NOT_FOUND, message: "غير موجود", status: 404 },
  [ERROR_CODES.FOLDER_NOT_FOUND]: {
    code: ERROR_CODES.NOT_FOUND,
    message: "المجلد غير موجود",
    status: 404,
  },
  [ERROR_CODES.TAG_NOT_FOUND]: {
    code: ERROR_CODES.NOT_FOUND,
    message: "الوسم غير موجود",
    status: 404,
  },
  [ERROR_CODES.TARGET_NOT_FOUND]: {
    code: ERROR_CODES.NOT_FOUND,
    message: "المجلد الهدف غير موجود",
    status: 404,
  },
  [ERROR_CODES.NO_SHARE_LINK]: {
    code: ERROR_CODES.NOT_FOUND,
    message: "لا يوجد رابط مشاركة",
    status: 404,
  },
  [ERROR_CODES.SOME_NOT_FOUND]: {
    code: ERROR_CODES.NOT_FOUND,
    message: "بعض العناصر غير موجودة",
    status: 404,
  },
  [ERROR_CODES.VALIDATION_ERROR]: {
    code: ERROR_CODES.VALIDATION_ERROR,
    message: "بيانات غير صحيحة",
    status: 400,
  },
  [ERROR_CODES.PARENT_DELETED]: {
    code: ERROR_CODES.VALIDATION_ERROR,
    message: "لا يمكن استعادة المجلد لأن المجلد الأب محذوف. استعد المجلد الأب أولاً.",
    status: 400,
  },
  [ERROR_CODES.CIRCULAR_REFERENCE]: {
    code: ERROR_CODES.VALIDATION_ERROR,
    message: "لا يمكن نقل المجلد إلى نفسه أو مجلد فرعي منه",
    status: 400,
  },
  [ERROR_CODES.MAX_DEPTH_REACHED]: {
    code: ERROR_CODES.VALIDATION_ERROR,
    message: `الحد الأقصى لعمق المجلدات هو ${MAX_FOLDER_DEPTH} مستويات`,
    status: 400,
  },
  [ERROR_CODES.NOT_READY]: {
    code: ERROR_CODES.VALIDATION_ERROR,
    message: "الملف جاهز للتصدير بعد",
    status: 409,
  },
  [ERROR_CODES.CONFLICT]: { code: ERROR_CODES.CONFLICT, message: "تعارض", status: 409 },
  [ERROR_CODES.UNAUTHORIZED]: {
    code: ERROR_CODES.UNAUTHORIZED,
    message: "يجب تسجيل الدخول",
    status: 401,
  },
  [ERROR_CODES.FORBIDDEN]: {
    code: ERROR_CODES.FORBIDDEN,
    message: "ليس لديك صلاحية للوصول",
    status: 403,
  },
  [ERROR_CODES.SOME_TAGS_NOT_FOUND]: {
    code: ERROR_CODES.NOT_FOUND,
    message: "بعض الأوسمة غير موجودة",
    status: 404,
  },
  [ERROR_CODES.TAG_NOT_ASSIGNED]: {
    code: ERROR_CODES.NOT_FOUND,
    message: "الوسم غير مرتبط بالمستند",
    status: 404,
  },
  [ERROR_CODES.AUTH_ERROR]: {
    code: ERROR_CODES.AUTH_ERROR,
    message: "يجب ربط حساب Google لرفع الملفات",
    status: 400,
  },
};

export function handleRouteError(error: unknown, route: string, fallbackMessage: string) {
  const requestId = generateRequestId();
  const code = getErrorMessage(error);
  const mapped = ERROR_MESSAGES[code];

  logger.error({ requestId, route, error, errorCode: code }, `[${route}] Failed:`);

  if (mapped) {
    const message = error instanceof Error && error.message ? error.message : mapped.message;
    return NextResponse.json(
      { error: { code: mapped.code, message, requestId } },
      { status: mapped.status },
    );
  }

  const statusCode = getErrorStatusCode(error);
  return NextResponse.json(
    { error: { code: ERROR_CODES.INTERNAL_ERROR, message: fallbackMessage, requestId } },
    { status: statusCode },
  );
}
