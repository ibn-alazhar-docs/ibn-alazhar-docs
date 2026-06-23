import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-guards";
import { normalizeStage } from "@/lib/conversion-status-utils";
import { handleRouteError } from "@/lib/route-helpers";
import { conversionUseCases } from "@/core/use-cases/conversion.use-cases";

export const GET = withAuth(async (_request, { session, params }) => {
  try {
    const id = params.id;
    if (!id)
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Missing id" } },
        { status: 400 },
      );

    const document = await conversionUseCases.getJobStatus(id, session);
    const normalized = normalizeStage(document.status);

    if (normalized === "completed") {
      return NextResponse.json({
        jobId: id,
        status: "completed",
        progress: 100,
        outputs: { md: true, txt: true, json: true },
        readyForExport: true,
      });
    }

    if (normalized === "failed") {
      return NextResponse.json({
        jobId: id,
        status: "failed",
        progress: 0,
        outputs: null,
        readyForExport: false,
      });
    }

    const { loadConfig, getJobStatus } = await import("@ibn-al-azhar-docs/pipeline");
    const config = loadConfig();
    const queueStatus = await getJobStatus(config, id);

    if (queueStatus) {
      return NextResponse.json({
        jobId: id,
        status: queueStatus.stage,
        progress: queueStatus.progress,
        outputs: null,
        readyForExport: false,
      });
    }

    return NextResponse.json({
      jobId: id,
      status: normalized,
      progress: 0,
      outputs: null,
      readyForExport: false,
    });
  } catch (error: unknown) {
    return handleRouteError(error, "conversion/status", "فشل التحقق من حالة التحويل");
  }
});
