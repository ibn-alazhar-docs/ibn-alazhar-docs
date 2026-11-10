import { NextResponse } from "next/server";
import { metricsUseCases } from "@/core/services/metrics.use-cases";
import { withAdminAuth } from "@/middleware/auth-guards";

export const GET = withAdminAuth(async () => {
  try {
    const metrics = await metricsUseCases.collectMetrics();
    return NextResponse.json(metrics, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to collect metrics" } },
      { status: 500 },
    );
  }
});
