import { NextResponse } from "next/server";
import crypto from "crypto";

const CSRF_COOKIE_NAME = "csrf_token";

export const dynamic = "force-dynamic";

/**
 * Issues (or rotates) the CSRF double-submit cookie and returns the token.
 * The cookie is NOT httpOnly so the SPA can read it and echo it back as the
 * X-CSRF-Token header on mutating requests. Without the header (and a matching
 * cookie), the middleware rejects state-changing requests with 403.
 */
export async function GET() {
  const token = crypto.randomBytes(32).toString("hex");
  const response = NextResponse.json({ csrfToken: token });
  response.cookies.set(CSRF_COOKIE_NAME, token, {
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    httpOnly: false,
    path: "/",
  });
  return response;
}
