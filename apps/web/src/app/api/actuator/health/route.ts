import { NextResponse } from "next/server";
import { healthUseCases } from "@/core/services/health.use-cases";

export async function GET() {
  const { response, status } = await healthUseCases.getActuatorHealth();
  return NextResponse.json(response, { status, headers: { "Cache-Control": "no-store" } });
}
