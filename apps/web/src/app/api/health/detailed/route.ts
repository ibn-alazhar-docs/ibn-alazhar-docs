import { NextResponse } from "next/server";
import { healthUseCases } from "@/core/services/health.use-cases";
import { logger } from "@/shared/logger";

export async function GET() {
  const start = Date.now();
  try {
    const { response, status } = await healthUseCases.getDetailed();
    return NextResponse.json(response, {
      status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    logger.error(
      { error, duration: Date.now() - start },
      "Detailed health check failed unexpectedly",
    );
    return NextResponse.json(
      {
        overall: "unhealthy",
        timestamp: new Date().toISOString(),
        error: "Health check failed",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
