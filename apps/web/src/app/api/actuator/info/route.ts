import { NextResponse } from "next/server";

export async function GET() {
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
