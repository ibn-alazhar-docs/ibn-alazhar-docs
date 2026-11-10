import { NextResponse } from "next/server";
import { SHARE_EXPORT_FORMATS, type ShareExportFormat } from "@/shared/validators/share";
import { checkRateLimit, rateLimitResponse } from "@/clients/redis";
import { useCases } from "@/core/composition-root";
import { handleRouteError } from "@/shared/route-helpers";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string; format: string }> },
) {
  try {
    const rateLimitResult = await checkRateLimit("/api/share", request);
    if (!rateLimitResult.allowed) {
      return rateLimitResponse(rateLimitResult.retryAfterMs);
    }

    const { token, format } = await params;

    if (!SHARE_EXPORT_FORMATS.includes(format as ShareExportFormat)) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Unsupported format" } },
        { status: 400 },
      );
    }

    const result = await useCases.shareAccess.getExportFile(token, format);
    if ("error" in result) {
      return NextResponse.json(
        { error: { code: result.status === 410 ? "EXPIRED" : "NOT_FOUND", message: result.error } },
        { status: result.status },
      );
    }

    return new Response(new Uint8Array(result.buffer), {
      headers: {
        "Content-Type": result.contentType,
        "Content-Disposition": result.disposition,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error: unknown) {
    return handleRouteError(error, "share/[token]/export/[format]", "Download failed");
  }
}
