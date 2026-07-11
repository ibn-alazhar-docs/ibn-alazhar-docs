import { NextResponse } from "next/server";
import { execSync } from "child_process";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const out = execSync('ls -la /data && ls -la /data/pgdata || echo "no pgdata"').toString();
    return new NextResponse(out, { headers: { "Content-Type": "text/plain" } });
  } catch (error: any) {
    return new NextResponse(error.message + "\n" + (error.stdout ? error.stdout.toString() : ""), {
      status: 500,
    });
  }
}
