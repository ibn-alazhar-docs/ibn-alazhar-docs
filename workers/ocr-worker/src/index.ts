import {
  loadConfig,
  setupDlq,
  closeQueueConnections,
  type FailedJob,
} from "@ibn-al-azhar-docs/pipeline";
import { prisma } from "@ibn-al-azhar-docs/database";
import { startHealthServer, logger } from "@ibn-al-azhar-docs/shared";

import { registerValidationStage } from "./stages/validate";
import { registerSplittingStage } from "./stages/split";
import { registerOcrStage } from "./stages/ocr";
import { registerCleaningStage } from "./stages/clean";
import { registerGenerationStage } from "./stages/generate";

const config = loadConfig();

async function main() {
  logger.info("[ocr-worker] Starting...");

  startHealthServer("ocr-worker", 9090);

  await setupDlq(config, async (failed: FailedJob) => {
    logger.error({ error: failed.error }, `[dlq] Job ${failed.jobId} failed permanently`);
  });

  const shutdown = async () => {
    logger.info("[ocr-worker] Shutting down...");
    await closeQueueConnections();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  registerValidationStage(config);
  registerSplittingStage(config);
  registerOcrStage(config);
  registerCleaningStage(config);
  registerGenerationStage(config);

  logger.info("[ocr-worker] All workers registered. Waiting for jobs...");
}

main().catch((err) => {
  logger.error(err, "[ocr-worker] Fatal error:");
  process.exit(1);
});
