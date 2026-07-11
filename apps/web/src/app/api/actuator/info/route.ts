import { NextResponse } from "next/server";
import { isBearerAuthorized } from "@/shared/security";

export async function GET(request: Request) {
  const expectedToken = process.env.ACTUATOR_BEARER_TOKEN || process.env.PROMETHEUS_BEARER_TOKEN;
  // Fail-open when no bearer token is configured (e.g. local/dev): the endpoint
  // stays reachable. In production, set ACTUATOR_BEARER_TOKEN (or
  // PROMETHEUS_BEARER_TOKEN) to enforce authentication and close the info-disclosure finding.
  if (expectedToken && !isBearerAuthorized(request.headers.get("authorization"), expectedToken)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  return NextResponse.json(
    {
      app: {
        name: "ibn-al-azhar-docs",
        version: process.env.npm_package_version || "0.0.0",
        description: "Arabic-first document processing platform for Azhar students",
      },
      build: {
        version: process.env.SENTRY_RELEASE || process.env.VERCEL_GIT_COMMIT_SHA || "dev",
        timestamp: new Date().toISOString(),
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
