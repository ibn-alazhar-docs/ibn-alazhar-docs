import { NextResponse } from "next/server";
import fs from "fs";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const log = fs.readFileSync('/data/app/pg.log', 'utf8');
    return new NextResponse(log, { headers: { 'Content-Type': 'text/plain' } });
  } catch (error: any) {
    return new NextResponse(error.message, { status: 500 });
  }
}
