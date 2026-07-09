import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expectedToken = process.env.ACTUATOR_BEARER_TOKEN || process.env.PROMETHEUS_BEARER_TOKEN;

  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const mem = process.memoryUsage();
  const lines = [
    `# HELP process_uptime_seconds Process uptime in seconds`,
    `# TYPE process_uptime_seconds gauge`,
    `process_uptime_seconds ${process.uptime()}`,
    `# HELP process_memory_rss_bytes Resident Set Size in bytes`,
    `# TYPE process_memory_rss_bytes gauge`,
    `process_memory_rss_bytes ${mem.rss}`,
    `# HELP process_memory_heap_total_bytes Total heap size in bytes`,
    `# TYPE process_memory_heap_total_bytes gauge`,
    `process_memory_heap_total_bytes ${mem.heapTotal}`,
    `# HELP process_memory_heap_used_bytes Used heap size in bytes`,
    `# TYPE process_memory_heap_used_bytes gauge`,
    `process_memory_heap_used_bytes ${mem.heapUsed}`,
    `# HELP up Application is up`,
    `# TYPE up gauge`,
    `up 1`,
  ];
  return new NextResponse(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; version=0.0.4" },
  });
}
