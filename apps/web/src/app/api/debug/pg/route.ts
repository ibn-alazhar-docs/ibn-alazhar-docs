import { NextResponse } from "next/server";
import { execSync } from "child_process";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const out = execSync('ls -la /data && ls -la /data/pgdata || echo "no pgdata"').toString();
    return new NextResponse(out, { headers: { "Content-Type": "text/plain" } });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    const stdout =
      err instanceof Error && "stdout" in err
        ? String((err as { stdout?: Buffer | string }).stdout)
        : "";
    return new NextResponse(`${err.message}\n${stdout}`, { status: 500 });
  }
}
