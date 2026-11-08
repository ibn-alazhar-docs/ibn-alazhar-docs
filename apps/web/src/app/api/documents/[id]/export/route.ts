import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/middleware/auth-guards";
import { handleRouteError } from "@/shared/route-helpers";
import { checkUserRateLimit, rateLimitResponse } from "@/clients/redis";
import { useCases } from "@/core/composition-root";

export const POST = withAuth(async (request, { session, params }) => {
  const id = params.id!;

  const rateLimitResult = await checkUserRateLimit("documents:export", session.user.id);
  if (!rateLimitResult.allowed) {
    return rateLimitResponse(rateLimitResult.retryAfterMs);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "طلب غير صالح: JSON غير سليم" } },
      { status: 400 },
    );
  }

  const exportSchema = z
    .object({
      format: z.enum(["md", "txt", "docx", "epub", "json", "pdf", "searchable-pdf"], {
        message: "الصيغة يجب أن تكون md أو txt أو docx أو epub أو json أو pdf أو searchable-pdf",
      }),
      options: z
        .object({
          destination: z.enum(["local", "drive"]).optional(),
          profile: z.enum(["research", "archive", "plain", "developer"]).optional(),
          // تُمرَّر فعليًا إلى مولّد الـ PDF؛ بلا هذا كانت الواجهة تعرض حجم خط
          // وعلامة مائية ثم تسقطهما الطبقة التالية (`.strip()`).
          fontSize: z.coerce.number().min(8).max(72).optional(),
          watermark: z.string().max(120).optional(),
        })
        .optional(),
    })
    .strip();

  const validation = exportSchema.safeParse(body);
  if (!validation.success) {
    const firstError = validation.error.issues[0];
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: firstError?.message || "بيانات غير صالحة",
        },
      },
      { status: 400 },
    );
  }

  const { format, options } = validation.data;

  try {
    const result = await useCases.documentExportJob.enqueueExport(
      id,
      session.user.id,
      format,
      options,
    );

    if (!result.ok) {
      return NextResponse.json(
        { error: { code: result.code, message: result.message } },
        { status: result.status },
      );
    }

    return NextResponse.json({ success: true, jobId: result.jobId, message: result.message });
  } catch (error: unknown) {
    return handleRouteError(error, "documents/export/POST", "تعذر إنشاء التصدير. حاول مرة أخرى.");
  }
});
