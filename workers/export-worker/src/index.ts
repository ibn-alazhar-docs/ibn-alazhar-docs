import { closeQueueConnections } from "@ibn-al-azhar-docs/pipeline";
import { PrismaClient } from "@prisma/client";
import { startHealthServer } from "../../shared/health-server";
import { logger } from "../../shared/logger";

import { registerExportHandler } from "./export-handler";

const prisma = new PrismaClient();

async function main() {
  logger.info("[export-worker] Starting...");

  startHealthServer("export-worker", 9091);

  const shutdown = async () => {
    logger.info("[export-worker] Shutting down...");
    await closeQueueConnections();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  registerExportHandler();

  logger.info("[export-worker] All workers registered. Waiting for jobs...");
}

main().catch((err) => {
  logger.error(err, "[export-worker] Fatal error:");
  process.exit(1);
});
