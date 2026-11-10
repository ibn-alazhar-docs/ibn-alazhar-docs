import { NextResponse } from "next/server";
import { metricsUseCases } from "@/core/services/metrics.use-cases";
import { isBearerAuthorized } from "@/shared/security";

export const runtime = "nodejs";

export const GET = async (request: Request) => {
  try {
    const expectedToken = process.env.PROMETHEUS_BEARER_TOKEN;

    if (!isBearerAuthorized(request.headers.get("authorization"), expectedToken)) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const text = await metricsUseCases.collectPrometheusText();
    return new NextResponse(text, {
      headers: {
        "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new NextResponse("# HELP ibn_error Metrics collection failed\nibn_error 1\n", {
      status: 500,
      headers: { "Content-Type": "text/plain; version=0.0.4; charset=utf-8" },
    });
  }
};
