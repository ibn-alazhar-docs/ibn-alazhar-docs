import { NextResponse } from "next/server";
import { execFileSync } from "child_process";
import { withAdminAuth } from "@/middleware/auth-guards";
import { DEBUG_DIAGNOSTICS, DEBUG_PROBE_NAMES } from "@/shared/debug-diagnostics";

export const dynamic = "force-dynamic";

// Debug endpoints are privileged. They are disabled entirely in production
// unless explicitly opted-in via DEBUG_API_ENABLED=true, and always require an
// admin session. Raw command stderr / stdout is never returned to the client.
function debugEnabled(): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  return process.env.DEBUG_API_ENABLED === "true";
}

export const POST = withAdminAuth(async (request) => {
  if (!debugEnabled()) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as { probe?: unknown };
    const name = typeof body.probe === "string" ? body.probe : "";
    const probe = DEBUG_DIAGNOSTICS.get(name);
    if (!probe) {
      return NextResponse.json(
        {
          error: {
            code: "UNKNOWN_PROBE",
            message: "غير معروف: اختر أحد فحوصات التشخيص",
            probes: DEBUG_PROBE_NAMES,
          },
        },
        { status: 400 },
      );
    }

    // No `shell: true` and a constant argv: the request supplies a key, never a
    // command line, so there is nothing here for an injected `;` or backtick to act on.
    const [program, ...args] = probe.argv;
    if (!program) return new NextResponse("Probe failed", { status: 500 });
    const out = execFileSync(program, args, { encoding: "utf-8", timeout: 10_000 });
    return new NextResponse(out, { headers: { "Content-Type": "text/plain" } });
  } catch {
    // Never echo raw stderr / stdout / internal error text to the client.
    return new NextResponse("Probe failed", { status: 500 });
  }
});
