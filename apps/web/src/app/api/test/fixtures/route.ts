import { NextResponse } from "next/server";
import { testFixturesUseCases } from "@/core/services/test-fixtures.use-cases";

export async function GET(request: Request) {
  const apiKey = process.env.TEST_API_KEY;
  if (!apiKey || request.headers.get("x-api-key") !== apiKey) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Invalid API Key" } },
      { status: 401 },
    );
  }

  try {
    const fixtures = await testFixturesUseCases.getFixtures();
    return NextResponse.json(fixtures);
  } catch (error) {
    console.error("Failed to fetch fixtures:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch fixtures" } },
      { status: 500 },
    );
  }
}
