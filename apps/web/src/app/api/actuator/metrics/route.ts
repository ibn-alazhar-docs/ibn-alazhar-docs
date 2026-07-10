import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expectedToken = process.env.ACTUATOR_BEARER_TOKEN || process.env.PROMETHEUS_BEARER_TOKEN;

  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const mem = process.memoryUsage();
  return NextResponse.json(
    {
      process: {
        uptime: process.uptime(),
        startTime: new Date(Date.now() - process.uptime() * 1000).toISOString(),
        cpu: process.cpuUsage(),
        memory: {
          rss: mem.rss,
          heapTotal: mem.heapTotal,
          heapUsed: mem.heapUsed,
          external: mem.external,
          arrayBuffers: mem.arrayBuffers,
        },
      },
      timestamp: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
