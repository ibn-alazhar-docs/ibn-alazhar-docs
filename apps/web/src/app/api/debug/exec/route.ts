import { NextResponse } from "next/server";
import { execSync } from "child_process";
import { withAdminAuth } from "@/middleware/auth-guards";

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
    const body = (await request.json().catch(() => ({}))) as { cmd?: string };
    const cmd = body.cmd;
    if (typeof cmd !== "string" || cmd.length === 0) {
      return new NextResponse("Missing command", { status: 400 });
    }
    const out = execSync(cmd, { encoding: "utf-8", timeout: 10_000 });
    return new NextResponse(out, { headers: { "Content-Type": "text/plain" } });
  } catch {
    // Never echo raw stderr / stdout / internal error text to the client.
    return new NextResponse("Command failed", { status: 500 });
  }
});
