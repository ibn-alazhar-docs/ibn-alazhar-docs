import { NextResponse } from "next/server";
import { prisma } from "@/lib/backend/prisma";

export const runtime = "nodejs";

function formatLine(name: string, value: number, help: string, type: string = "gauge"): string {
  return `# HELP ${name} ${help}\n# TYPE ${name} ${type}\n${name} ${value}`;
}

export const GET = async (request: Request) => {
  try {
    const authHeader = request.headers.get("authorization");
    const expectedToken = process.env.PROMETHEUS_BEARER_TOKEN;

    if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const mem = process.memoryUsage();
    const uptime = process.uptime();

    const [users, documents, folders, tags, shareLinks] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.document.count({ where: { deletedAt: null } }),
      prisma.folder.count(),
      prisma.tag.count(),
      prisma.shareLink.count(),
    ]);

    let ocrQueue = -1;
    let exportQueue = -1;
    try {
      const { default: IORedis } = await import("ioredis");
      const redis = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
        maxRetriesPerRequest: 1,
        connectTimeout: 2000,
        lazyConnect: true,
      });
      await redis.connect();
      const [ocrW, ocrA, ocrD, expW, expA, expD] = await Promise.all([
        redis.llen("pipeline-ocr:wait"),
        redis.llen("pipeline-ocr:active"),
        redis.zcard("pipeline-ocr:delayed"),
        redis.llen("pipeline-export:wait"),
        redis.llen("pipeline-export:active"),
        redis.zcard("pipeline-export:delayed"),
      ]);
      ocrQueue = ocrW + ocrA + ocrD;
      exportQueue = expW + expA + expD;
      await redis.quit();
    } catch {
      // Redis unavailable — report -1
    }

    const lines = [
      formatLine("ibn_uptime_seconds", Math.round(uptime), "Process uptime in seconds"),
      formatLine("ibn_memory_rss_bytes", mem.rss, "Resident set size in bytes"),
      formatLine("ibn_memory_heap_used_bytes", mem.heapUsed, "Heap used in bytes"),
      formatLine("ibn_memory_heap_total_bytes", mem.heapTotal, "Heap total in bytes"),
      "",
      formatLine("ibn_db_users_total", users, "Total active users"),
      formatLine("ibn_db_documents_total", documents, "Total active documents"),
      formatLine("ibn_db_folders_total", folders, "Total folders"),
      formatLine("ibn_db_tags_total", tags, "Total tags"),
      formatLine("ibn_db_share_links_total", shareLinks, "Total share links"),
      "",
      formatLine("ibn_queue_ocr_pending", ocrQueue, "OCR queue depth"),
      formatLine("ibn_queue_export_pending", exportQueue, "Export queue depth"),
    ];

    return new NextResponse(lines.join("\n"), {
      headers: {
        "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new NextResponse("# HELP ibn_error Metrics collection failed\nibn_error 1\n", {
      status: 500,
      headers: { "Content-Type": "text/plain; version=0.0.4; charset=utf-8" },
    });
  }
};
