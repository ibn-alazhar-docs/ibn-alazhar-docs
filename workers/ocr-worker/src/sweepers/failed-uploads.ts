import { prisma } from "@ibn-al-azhar-docs/database";
import { logger } from "@ibn-al-azhar-docs/shared";
import { enqueueValidation, type ProcessingJob } from "@ibn-al-azhar-docs/pipeline";

export type FailedUploadsSweeperOptions = {
  intervalMs?: number;
  windowMs?: number;
};

export function createFailedUploadsSweeper({
  intervalMs = 60_000,
  windowMs = 60_000,
}: FailedUploadsSweeperOptions = {}) {
  const sweep = async () => {
    try {
      const cutoff = new Date(Date.now() - windowMs);
      const failed = await prisma.document.findMany({
        where: {
          status: "FAILED",
          errorCode: "UPLOAD_ENQUEUE_FAILED",
          updatedAt: { gt: cutoff },
          deletedAt: null,
        },
        select: {
          id: true,
          fileName: true,
          fileSize: true,
          mimeType: true,
          storageKey: true,
          userId: true,
        },
      });

      for (const doc of failed) {
        const job: ProcessingJob = {
          id: doc.id,
          documentId: doc.id,
          userId: doc.userId,
          fileName: doc.fileName,
          fileSize: Number(doc.fileSize),
          mimeType: doc.mimeType,
          storageKey: doc.storageKey ?? "",
          status: "pending",
          progress: 0,
          createdAt: new Date().toISOString(),
        };

        try {
          await enqueueValidation(job);
          await prisma.document
            .update({
              where: { id: doc.id },
              data: { status: "UPLOADED", errorCode: null, errorMessage: null },
            })
            .catch(() => {});
          logger.info({ documentId: doc.id }, "[sweeper] Re-enqueued failed upload");
        } catch {
          // Redis still down — leave FAILED for the next sweep interval.
        }
      }
    } catch (err) {
      logger.warn(
        { error: err instanceof Error ? err.message : String(err) },
        "[sweeper] Failed-upload re-enqueue failed",
      );
    }
  };

  sweep().catch(() => {});
  const timer = setInterval(sweep, intervalMs);

  return {
    stop: () => clearInterval(timer),
  };
}
