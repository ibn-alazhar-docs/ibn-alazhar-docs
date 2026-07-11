import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { error: { code: "NOT_FOUND", message: "Unknown actuator endpoint" } },
    { status: 404 },
  );
}
