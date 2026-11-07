import { NextResponse } from "next/server";
import { checkRateLimit, rateLimitResponse } from "@/clients/redis";
import { createGuestJob, guestQueueSnapshot } from "@/core/services/guest/guest-jobs.service";
import { handleRouteError } from "@/shared/route-helpers";
import { guestServiceFailureResponse } from "@/shared/guest-route-response";

/**
 * Guest Tools Hub job creation (docs/IMPLEMENTATION_TOOLS.md §7).
 *
 * Deliberately NOT wrapped in `withAuth` and never touching the authenticated
 * library: identity is the IP (queue accounting) plus the unguessable job token.
 * CSRF still applies — the global middleware covers every non-`/api/auth`
 * mutating route, so a cross-origin POST is rejected before this handler runs.
 */

export const runtime = "nodejs";

const RATE_LIMIT_PATH = "/api/tools/guest/jobs";

export async function POST(request: Request) {
  const limited = await checkRateLimit(RATE_LIMIT_PATH, request);
  if (!limited.allowed) return rateLimitResponse(limited.retryAfterMs);

  try {
    const result = await createGuestJob(request);
    if (!result.ok) return guestServiceFailureResponse(result);
    // 202: the job is queued, not done. The token is the whole response contract.
    return NextResponse.json({ job: result.data }, { status: 202 });
  } catch (error) {
    return handleRouteError(error, "POST /api/tools/guest/jobs", "تعذّر إنشاء مهمة الضيوف");
  }
}

/** Queue depth for the hub page — counts only, no file names, IPs, or job ids. */
export async function GET(request: Request) {
  const limited = await checkRateLimit(RATE_LIMIT_PATH, request);
  if (!limited.allowed) return rateLimitResponse(limited.retryAfterMs);

  try {
    return NextResponse.json({ queue: guestQueueSnapshot() });
  } catch (error) {
    return handleRouteError(error, "GET /api/tools/guest/jobs", "تعذّر قراءة حالة الطابور");
  }
}
