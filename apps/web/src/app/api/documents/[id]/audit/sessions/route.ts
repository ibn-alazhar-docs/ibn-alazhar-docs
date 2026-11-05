import { NextResponse } from "next/server";
import { withAuth } from "@/middleware/auth-guards";
import { handleRouteError } from "@/shared/route-helpers";
import { useCases } from "@/core/composition-root";
import { loadConfig, listAuditSessions } from "@ibn-al-azhar-docs/pipeline";

export const GET = withAuth(async (_request, { session, params }) => {
  const id = params.id!;

  try {
    await useCases.documentCrud.getDocumentById(id, session.user.id, session.user.role);

    const config = loadConfig();
    const sessions = await listAuditSessions(config, id);

    return NextResponse.json({ success: true, sessions });
  } catch (error: unknown) {
    return handleRouteError(error, "documents/[id]/audit/sessions/GET", "تعذر سرد جلسات التدقيق");
  }
});
