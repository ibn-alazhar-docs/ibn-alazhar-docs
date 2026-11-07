import { NextResponse } from "next/server";
import { checkRateLimit, rateLimitResponse } from "@/clients/redis";
import {
  deleteGuestJob,
  readGuestJob,
  type GuestDownloadFormat,
} from "@/core/services/guest/guest-jobs.service";
import { contentDisposition, guestServiceFailureResponse } from "@/shared/guest-route-response";
import { handleRouteError } from "@/shared/route-helpers";

/**
 * Reading and deleting one guest job. The job id (32 hex chars) is the only
 * capability — the same model as `/api/share/[token]` — so there is no session
 * or ownership check here, and an unknown or expired id is a plain 404.
 */

export const runtime = "nodejs";

const FORMATS: readonly GuestDownloadFormat[] = ["txt", "json", "docx"];

function requestedFormat(request: Request): GuestDownloadFormat | undefined {
  const raw = new URL(request.url).searchParams.get("format") ?? undefined;
  return FORMATS.find((format) => format === raw);
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const limited = await checkRateLimit("/api/tools/guest/jobs/[id]", request);
  if (!limited.allowed) return rateLimitResponse(limited.retryAfterMs);

  try {
    const { id } = await params;
    const result = await readGuestJob(id, requestedFormat(request));
    if (!result.ok) return guestServiceFailureResponse(result);

    if (result.data.kind === "file") {
      return new NextResponse(result.data.body as unknown as BodyInit, {
        status: 200,
        headers: {
          "Content-Type": result.data.contentType,
          "Content-Disposition": contentDisposition("attachment", result.data.fileName),
          "Cache-Control": "no-store",
        },
      });
    }

    return NextResponse.json(result.data.view, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleRouteError(error, "GET /api/tools/guest/jobs/[id]", "تعذّر قراءة مهمة الضيوف");
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const limited = await checkRateLimit("/api/tools/guest/jobs/[id]", request);
  if (!limited.allowed) return rateLimitResponse(limited.retryAfterMs);

  try {
    const { id } = await params;
    const result = await deleteGuestJob(id);
    if (!result.ok) return guestServiceFailureResponse(result);
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return handleRouteError(error, "DELETE /api/tools/guest/jobs/[id]", "تعذّر حذف مهمة الضيوف");
  }
}
