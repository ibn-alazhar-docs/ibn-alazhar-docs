import { repos } from "@/core/composition-root";
import {
  loadConfig,
  getFailedJobsViaDriver,
  enqueueViaDriver,
  JOB_QUEUES,
} from "@ibn-al-azhar-docs/pipeline";
import type { ProcessingJob } from "@ibn-al-azhar-docs/pipeline";

type RequeueResult = { requeued: boolean; reason?: string };

export class AdminQueueUseCases {
  async listFailedJobs() {
    return getFailedJobsViaDriver();
  }

  async requeueJob(jobId: string): Promise<RequeueResult> {
    const config = loadConfig();
    const failed = await getFailedJobsViaDriver();
    const target = failed.find((j) => j.jobId === jobId);
    if (!target) return { requeued: false, reason: "not_found" };

    const data = target.originalData as ProcessingJob;
    if (!data?.documentId) return { requeued: false, reason: "no_document" };

    const document = await repos.document.findFirst(
      { id: data.documentId, deletedAt: null },
      {
        id: true,
        status: true,
        storageKey: true,
        fileName: true,
        mimeType: true,
        fileSize: true,
        userId: true,
      },
    );
    if (!document) return { requeued: false, reason: "document_gone" };

    await repos.document.update(document.id, document.userId, {
      status: "UPLOADED",
      errorCode: null,
      errorMessage: null,
      outputKeys: null,
      outputFormats: [],
      pageCount: null,
      needsReview: false,
    });

    await enqueueViaDriver(JOB_QUEUES.VALIDATION, config, {
      id: document.id,
      documentId: document.id,
      userId: document.userId,
      fileName: document.fileName,
      fileSize: Number(document.fileSize),
      mimeType: document.mimeType,
      storageKey: document.storageKey!,
      status: "pending",
      progress: 0,
      createdAt: new Date().toISOString(),
    });

    return { requeued: true };
  }

  async requeueAll(): Promise<{ requeued: number; total: number }> {
    const failed = await getFailedJobsViaDriver();
    let requeued = 0;
    for (const job of failed) {
      const r = await this.requeueJob(job.jobId);
      if (r.requeued) requeued += 1;
    }
    return { requeued, total: failed.length };
  }
}

export const adminQueueUseCases = new AdminQueueUseCases();
