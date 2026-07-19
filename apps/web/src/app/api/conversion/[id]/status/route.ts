import { NextResponse } from "next/server";
import { withAuth } from "@/middleware/auth-guards";
import { normalizeStage } from "@/shared/conversion-status-utils";
import { handleRouteError } from "@/shared/route-helpers";
import { useCases } from "@/core/composition-root";

const NO_STORE = { headers: { "Cache-Control": "private, no-store" } } as const;

export const GET = withAuth(async (_request, { session, params }) => {
  try {
    const id = params.id;
    if (!id)
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Missing id" } },
        { status: 400 },
      );

    const document = await useCases.conversion.getJobStatus(id, session);
    const normalized = normalizeStage(document.status);

    if (normalized === "completed") {
      return NextResponse.json(
        {
          jobId: id,
          status: "completed",
          progress: 100,
          outputs: { md: true, txt: true, json: true },
          readyForExport: true,
        },
        NO_STORE,
      );
    }

    if (normalized === "failed") {
      return NextResponse.json(
        {
          jobId: id,
          status: "failed",
          progress: 0,
          outputs: null,
          readyForExport: false,
        },
        NO_STORE,
      );
    }

    let queueStatus = null;
    try {
      const { getJobStatusViaDriver } = await import("@ibn-al-azhar-docs/pipeline");
      queueStatus = await getJobStatusViaDriver(id);
    } catch {
      // Pipeline config may fail on environments without full S3/Redis setup (e.g. HF Spaces)
      // Fall through to DB status
    }

    if (queueStatus) {
      return NextResponse.json(
        {
          jobId: id,
          status: queueStatus.stage,
          progress: queueStatus.progress,
          outputs: null,
          readyForExport: false,
        },
        NO_STORE,
      );
    }

    return NextResponse.json(
      {
        jobId: id,
        status: normalized,
        progress: 0,
        outputs: null,
        readyForExport: false,
      },
      NO_STORE,
    );
  } catch (error: unknown) {
    return handleRouteError(error, "conversion/status", "تعذر التحقق من حالة التحويل");
  }
});
