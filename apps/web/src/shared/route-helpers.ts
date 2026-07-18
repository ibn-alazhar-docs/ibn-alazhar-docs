import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { logger, generateRequestId } from "@/shared/logger";
import { getErrorMessage, getErrorStatusCode } from "@/shared/errors";
import { MAX_FOLDER_DEPTH } from "@/shared/validators/folder";
import { ERROR_CODES } from "@/shared/constants";

export interface RouteErrorContext {
  userId?: string;
  requestId?: string;
  durationMs?: number;
  fileName?: string;
  fileSize?: number;
  documentId?: string;
  jobId?: string;
}

/**
 * Reuse the request id that the middleware already assigned (or a proxy sent)
 * so the id returned to the client matches the one in our structured logs.
 */
async function resolveRequestId(provided?: string): Promise<string> {
  if (provided) return provided;
  try {
    const incoming = (await headers()).get("x-request-id");
    if (incoming) return incoming;
  } catch {
    // headers() is unavailable outside a request scope — fall through.
  }
  return generateRequestId();
}

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
  [ERROR_CODES.UPLOAD_FILE_TOO_LARGE]: {
    code: ERROR_CODES.UPLOAD_FILE_TOO_LARGE,
    message: "الملف أكبر من الحد المسموح. يرجى تقليل الحجم أو تقسيم الملف.",
    status: 400,
  },
  [ERROR_CODES.UPLOAD_UNSUPPORTED_TYPE]: {
    code: ERROR_CODES.UPLOAD_UNSUPPORTED_TYPE,
    message: "نوع الملف غير مدعوم. ارفع ملف PDF أو صورة (JPG/PNG).",
    status: 400,
  },
  [ERROR_CODES.UPLOAD_STORAGE_UNAVAILABLE]: {
    code: ERROR_CODES.UPLOAD_STORAGE_UNAVAILABLE,
    message: "خدمة التخزين غير متاحة حاليًا. حاول مرة أخرى بعد دقيقة.",
    status: 503,
  },
  [ERROR_CODES.UPLOAD_TIMEOUT]: {
    code: ERROR_CODES.UPLOAD_TIMEOUT,
    message: "انتهت مهلة الرفع. يرجى المحاولة مرة أخرى.",
    status: 408,
  },
  [ERROR_CODES.UPLOAD_FAILED]: {
    code: ERROR_CODES.UPLOAD_FAILED,
    message: "تعذر تجهيز الملف للرفع. تأكد من أن المجلد متاح وحاول مرة أخرى.",
    status: 500,
  },
  [ERROR_CODES.UPLOAD_ENQUEUE_FAILED]: {
    code: ERROR_CODES.UPLOAD_ENQUEUE_FAILED,
    message: "تم رفع الملف لكن تعذر بدء المعالجة حاليًا. يمكنك إعادة المحاولة من قائمة الملفات.",
    status: 500,
  },
  [ERROR_CODES.OCR_ENGINE_FAILED]: {
    code: ERROR_CODES.OCR_ENGINE_FAILED,
    message: "تعذر التعرف على النص في هذا الملف. قد يكون الملف تالفًا أو غير مدعوم.",
    status: 422,
  },
  [ERROR_CODES.SEARCH_INDEX_FAILED]: {
    code: ERROR_CODES.SEARCH_INDEX_FAILED,
    message: "اكتملت المعالجة ولكن فشل تحديث البحث. يمكنك إعادة المحاولة لاحقًا.",
    status: 200,
  },
  [ERROR_CODES.EXPORT_GENERATION_FAILED]: {
    code: ERROR_CODES.EXPORT_GENERATION_FAILED,
    message: "تعذر توليد هذا التنسيق. يمكنك إعادة المحاولة أو اختيار تنسيق آخر.",
    status: 422,
  },
  [ERROR_CODES.WEBHOOK_DELIVERY_FAILED]: {
    code: ERROR_CODES.WEBHOOK_DELIVERY_FAILED,
    message: "تعذر توصيل الاختبار إلى الرابط. تأكد من أن الرابط متاح ويستجيب.",
    status: 502,
  },
  [ERROR_CODES.REDIS_UNAVAILABLE]: {
    code: ERROR_CODES.REDIS_UNAVAILABLE,
    message: "خدمة الطابور غير متاحة مؤقتًا. ستُستأنف المعالجة تلقائيًا.",
    status: 503,
  },
  [ERROR_CODES.DB_CONNECTION_FAILED]: {
    code: ERROR_CODES.DB_CONNECTION_FAILED,
    message: "تعذر الاتصال بقاعدة البيانات مؤقتًا. حاول مرة أخرى.",
    status: 503,
  },
};

export async function handleRouteError(
  error: unknown,
  route: string,
  fallbackMessage: string,
  context: RouteErrorContext = {},
) {
  const requestId = await resolveRequestId(context.requestId);
  const code = getErrorMessage(error);
  const mapped = ERROR_MESSAGES[code];

  const childLogger = logger.child({ requestId, userId: context.userId });
  const errObj = error instanceof Error ? error : new Error(String(error));
  childLogger.error(
    {
      route,
      errorCode: code,
      error: errObj.message,
      errorName: errObj.name,
      prismaCode: (error as { code?: string })?.code,
      stack: errObj.stack,
      durationMs: context.durationMs,
      fileName: context.fileName,
      fileSize: context.fileSize,
      documentId: context.documentId,
      jobId: context.jobId,
    },
    `[${route}] Failed:`,
  );

  if (mapped) {
    // `error.message` here is the curated, user-facing domain message (e.g.
    // ConflictError/ValidationError) — never internal identifiers or stack
    // detail. Full internal detail is recorded server-side in the structured
    // log above for observability; the client receives the friendly message.
    const message = error instanceof Error && error.message ? error.message : mapped.message;
    // When the thrown AppError carries a `cause` (e.g. a wrapped filesystem
    // error like EACCES/ENOENT with the failing path), surface it in `detail`
    // so a 500 produced by an unmapped underlying failure is self-diagnosing
    // from the client response and not only the server log.
    let detail: string | undefined;
    const cause = (error as Error & { cause?: Error })?.cause;
    if (cause) {
      const errCode = (cause as NodeJS.ErrnoException).code;
      detail = `${cause.message}${errCode ? ` (${errCode})` : ""}`;
    }
    const body: { error: { code: string; message: string; requestId: string }; detail?: string } = {
      error: { code: mapped.code, message, requestId },
    };
    if (detail) body.detail = detail;
    return NextResponse.json(body, { status: mapped.status });
  }

  const statusCode = getErrorStatusCode(error);
  // Surface the underlying error message in the body so a 500 from an
  // unmapped/raw exception (e.g. a Prisma validation error in /api/upload) is
  // self-diagnosing from the client response instead of only the server log.
  // If the error has a cause (e.g. wrapped filesystem errors), include it.
  let detail = error instanceof Error ? error.message : String(error);
  const cause = (error as Error & { cause?: Error })?.cause;
  if (cause) {
    const errCode = (cause as NodeJS.ErrnoException).code;
    detail = `${detail} [Cause: ${cause.message}${errCode ? ` (${errCode})` : ""}]`;
  }
  return NextResponse.json(
    {
      error: {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: fallbackMessage,
        requestId,
        detail,
      },
    },
    { status: statusCode },
  );
}
