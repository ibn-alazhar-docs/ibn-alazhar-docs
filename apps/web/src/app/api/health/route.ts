import { NextResponse } from "next/server";
import { healthUseCases } from "@/core/services/health.use-cases";

export async function GET(): Promise<NextResponse> {
  const { response, status } = await healthUseCases.getHealth();
  return NextResponse.json(response, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
