import { prisma } from "@ibn-al-azhar-docs/database";
import { logger } from "@ibn-al-azhar-docs/shared";
import { sendAlert } from "@ibn-al-azhar-docs/pipeline";

const PROCESSING_STAGES = [
  "VALIDATING",
  "SPLITTING",
  "OCR_PROCESSING",
  "CLEANING",
  "GENERATING",
] as const;

export type StuckDocumentsSweeperOptions = {
  intervalMs?: number;
  staleAfterMs?: number;
};

export function createStuckDocumentsSweeper({
  intervalMs = 5 * 60 * 1000,
  staleAfterMs = 30 * 60 * 1000,
}: StuckDocumentsSweeperOptions = {}) {
  const sweep = async () => {
    try {
      const cutoff = new Date(Date.now() - staleAfterMs);
      const stuck = await prisma.document.findMany({
        where: {
          status: { in: [...PROCESSING_STAGES] },
          updatedAt: { lt: cutoff },
          deletedAt: null,
        },
        select: { id: true, status: true },
      });

      for (const doc of stuck) {
        await prisma.document
          .update({
            where: { id: doc.id },
            data: {
              status: "FAILED",
              errorCode: "RETRY_EXHAUSTED",
              errorMessage: "Recovered by stuck-job sweeper",
            },
          })
          .catch(() => {});
      }

      if (stuck.length > 0) {
        logger.info(`[sweeper] Recovered ${stuck.length} stuck document(s)`);
        sendAlert({
          severity: "warning",
          code: "RETRY_EXHAUSTED",
          message: `[sweeper] Recovered ${stuck.length} document(s) stuck in processing`,
          context: {
            ids: stuck.map((d) => d.id),
            stages: stuck.map((d) => d.status),
          },
        });
      }
    } catch (err) {
      logger.warn(
        { error: err instanceof Error ? err.message : String(err) },
        "[sweeper] Failed",
      );
    }
  };

  // Run once immediately, then schedule
  sweep().catch(() => {});
  const timer = setInterval(sweep, intervalMs);

  return {
    stop: () => clearInterval(timer),
  };
}
