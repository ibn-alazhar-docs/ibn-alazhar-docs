import { prisma } from "@/transport/db";
import { getMetricsViaDriver } from "@ibn-al-azhar-docs/pipeline";

export interface AppMetrics {
  timestamp: string;
  uptime: number;
  memory: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
  };
  database: {
    users: number;
    documents: number;
    folders: number;
    tags: number;
    shareLinks: number;
  };
  workers: {
    ocrQueue: number;
    exportQueue: number;
  };
}

function queueDepth(bucket: { waiting: number; active: number; delayed: number }): number {
  return bucket.waiting + bucket.active + bucket.delayed;
}

export function formatPrometheusLine(
  name: string,
  value: number,
  help: string,
  type: string = "gauge",
): string {
  return `# HELP ${name} ${help}\n# TYPE ${name} ${type}\n${name} ${value}`;
}

export class MetricsUseCases {
  async getDatabaseCounts(): Promise<AppMetrics["database"]> {
    const [users, documents, folders, tags, shareLinks] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.document.count({ where: { deletedAt: null } }),
      prisma.folder.count(),
      prisma.tag.count({ where: { deletedAt: null } }),
      prisma.shareLink.count(),
    ]);
    return { users, documents, folders, tags, shareLinks };
  }

  async getWorkerDepths(): Promise<AppMetrics["workers"]> {
    try {
      const result = await getMetricsViaDriver();
      return {
        ocrQueue: queueDepth(result.ocrQueue),
        exportQueue: queueDepth(result.exportQueue),
      };
    } catch {
      return { ocrQueue: -1, exportQueue: -1 };
    }
  }

  async collectMetrics(): Promise<AppMetrics> {
    const mem = process.memoryUsage();
    const [database, workers] = await Promise.all([
      this.getDatabaseCounts(),
      this.getWorkerDepths(),
    ]);

    return {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        rss: Math.round(mem.rss / 1024 / 1024),
        heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
      },
      database,
      workers,
    };
  }

  async collectPrometheusText(): Promise<string> {
    const mem = process.memoryUsage();
    const uptime = process.uptime();

    const [users, documents, folders, tags, shareLinks] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.document.count({ where: { deletedAt: null } }),
      prisma.folder.count(),
      prisma.tag.count({ where: { deletedAt: null } }),
      prisma.shareLink.count(),
    ]);

    let ocrQueue = -1;
    let exportQueue = -1;
    try {
      const result = await getMetricsViaDriver();
      ocrQueue = queueDepth(result.ocrQueue);
      exportQueue = queueDepth(result.exportQueue);
    } catch {
      // Driver unavailable — report -1
    }

    const lines = [
      formatPrometheusLine("ibn_uptime_seconds", Math.round(uptime), "Process uptime in seconds"),
      formatPrometheusLine("ibn_memory_rss_bytes", mem.rss, "Resident set size in bytes"),
      formatPrometheusLine("ibn_memory_heap_used_bytes", mem.heapUsed, "Heap used in bytes"),
      formatPrometheusLine("ibn_memory_heap_total_bytes", mem.heapTotal, "Heap total in bytes"),
      "",
      formatPrometheusLine("ibn_db_users_total", users, "Total active users"),
      formatPrometheusLine("ibn_db_documents_total", documents, "Total active documents"),
      formatPrometheusLine("ibn_db_folders_total", folders, "Total folders"),
      formatPrometheusLine("ibn_db_tags_total", tags, "Total tags"),
      formatPrometheusLine("ibn_db_share_links_total", shareLinks, "Total share links"),
      "",
      formatPrometheusLine("ibn_queue_ocr_pending", ocrQueue, "OCR queue depth"),
      formatPrometheusLine("ibn_queue_export_pending", exportQueue, "Export queue depth"),
    ];

    return lines.join("\n");
  }
}

export const metricsUseCases = new MetricsUseCases();
