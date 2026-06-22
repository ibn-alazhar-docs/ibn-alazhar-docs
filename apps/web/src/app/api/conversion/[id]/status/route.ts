import { NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse, ownedWhere } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

const DOC_STATUS_MAP: Record<string, string> = {
  UPLOADED: "pending",
  VALIDATING: "validating",
  SPLITTING: "splitting",
  OCR_PROCESSING: "ocr",
  CLEANING: "cleaning",
  GENERATING: "generating",
  COMPLETED: "completed",
  FAILED: "failed",
};

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth().catch(() => null);
  if (!session) {
    return unauthorizedResponse();
  }

  const { id } = await params;

  const document = await prisma.document.findFirst({
    where: ownedWhere({ id }, session),
    select: { id: true, status: true },
  });

  if (!document) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "المستند غير موجود" } },
      { status: 404 },
    );
  }

  const normalized = DOC_STATUS_MAP[document.status] ?? "pending";

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

  try {
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
    logger.error(error, "[conversion/status] Failed:");
    return NextResponse.json({
      jobId: id,
      status: normalized,
      progress: 0,
      outputs: null,
      readyForExport: false,
    });
  }
}
