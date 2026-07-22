import {
  JOB_QUEUES,
  type PipelineConfig,
  type ClaimedJob,
} from "@ibn-al-azhar-docs/pipeline";
import { createPgHandlerWrapper } from "@ibn-al-azhar-docs/pipeline/queue/pg-handler-factory";

import { processExportStage } from "../export-handler";

/** Stable worker identity for the PG-driven export worker. */
export const EXPORT_WORKER_ID = `pg-export-worker-${process.pid}`;

/**
 * Builds the PG-mode handler map for the export queue. Must be called with the
 * loaded config; the returned handler uses the shared `createPgHandlerWrapper`
 * so the retry/classification logic stays identical to the OCR worker.
 */
export function buildExportPgHandlers(
  config: PipelineConfig,
): Partial<Record<string, (job: ClaimedJob) => Promise<void>>> {
  const wrapper = createPgHandlerWrapper({
    config,
    queueName: JOB_QUEUES.EXPORT,
    logger: console,
  });

  return {
    [JOB_QUEUES.EXPORT]: (cj) => wrapper(cj, processExportStage),
  };
}
