import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/middleware/auth-guards";
import { handleRouteError } from "@/shared/route-helpers";
import { checkUserRateLimit, rateLimitResponse } from "@/clients/redis";
import { useCases } from "@/core/composition-root";

const statusQuerySchema = z
  .object({
    format: z.enum(["md", "txt", "docx", "epub", "json", "pdf", "searchable-pdf"]),
  })
  .strip();

export const GET = withAuth(async (request, { session, params }) => {
  const id = params.id!;

  const rateLimitResult = await checkUserRateLimit("documents:export:status", session.user.id);
  if (!rateLimitResult.allowed) {
    return rateLimitResponse(rateLimitResult.retryAfterMs);
  }

  const { searchParams } = new URL(request.url);
  const validation = statusQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!validation.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "format query parameter required" } },
      { status: 400 },
    );
  }

  const { format } = validation.data;

  try {
    const document = await useCases.documentCrud.getDocumentById(id, session.user.id);
    const outputKeys = (document.outputKeys as Record<string, string>) || {};
    const outputKey = outputKeys[format];

    if (outputKey) {
      return NextResponse.json(
        { status: "ready", format, ready: true, downloadUrl: `/api/export/${id}/${format}` },
        { headers: { "Cache-Control": "private, no-store" } },
      );
    }

    // فشل نهائي مسجَّل على المستند (معالج التصدير يسجّل errorCode ثم يُسقط المحاولة).
    // بلا هذا الفرع يظل العميل يسأل عن حالة «قيد المعالجة» إلى الأبد.
    if (document.errorCode || document.status === "FAILED") {
      return NextResponse.json(
        {
          status: "failed",
          format,
          ready: false,
          errorCode: document.errorCode,
          message: document.errorMessage ?? "تعذّر إنشاء الملف",
        },
        { headers: { "Cache-Control": "private, no-store" } },
      );
    }

    // "PDF مطابق للأصل" يولّده طور التوليد لا طابور التصدير: إن اكتمل المستند
    // بلا ملفه فلا شيء قيد الانتظار، والانتظار كان لا ينتهي.
    if (format === "searchable-pdf" && document.status === "COMPLETED") {
      return NextResponse.json(
        {
          status: "failed",
          format,
          ready: false,
          errorCode: "SEARCHABLE_PDF_UNAVAILABLE",
          message: "لم يُنشأ ملف PDF المطابق للأصل لهذا المستند.",
        },
        { headers: { "Cache-Control": "private, no-store" } },
      );
    }

    return NextResponse.json(
      { status: "processing", format, ready: false },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error: unknown) {
    return handleRouteError(error, "documents/export/status/GET", "حدث خطأ");
  }
});
