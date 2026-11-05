import { NextResponse } from "next/server";
import { withAuth } from "@/middleware/auth-guards";
import { handleRouteError } from "@/shared/route-helpers";
import { useCases } from "@/core/composition-root";
import { loadConfig, getLatestAuditSession } from "@ibn-al-azhar-docs/pipeline";

export const GET = withAuth(async (_request, { session, params }) => {
  const id = params.id!;

  try {
    await useCases.documentCrud.getDocumentById(id, session.user.id, session.user.role);

    const config = loadConfig();
    const auditSession = await getLatestAuditSession(config, id);

    if (!auditSession) {
      return NextResponse.json(
        { success: false, message: "لا توجد جلسة تدقيق نشطة" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      session: {
        ...auditSession.meta,
        sourceText: auditSession.sourceText,
        convertedMarkdown: auditSession.convertedMarkdown,
      },
    });
  } catch (error: unknown) {
    return handleRouteError(error, "documents/[id]/audit/latest/GET", "تعذر جلب آخر جلسة تدقيق");
  }
});
