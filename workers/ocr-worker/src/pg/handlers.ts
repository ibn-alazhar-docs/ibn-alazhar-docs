import {
  JOB_QUEUES,
  type PipelineConfig,
  type ClaimedJob,
} from "@ibn-al-azhar-docs/pipeline";
import { createPgHandlerWrapper } from "@ibn-al-azhar-docs/pipeline/queue/pg-handler-factory";

import { processValidationStage } from "../stages/validate";
import { processSplittingStage } from "../stages/split";
import { processOcrStage } from "../stages/ocr";
import { processCleaningStage } from "../stages/clean";
import { processGenerationStage } from "../stages/generate";

/** Stable worker identity for the PG-driven OCR worker. */
export const OCR_WORKER_ID = `pg-ocr-worker-${process.pid}`;

type StageFn = (job: ProcessingJob, config: PipelineConfig) => Promise<void>;

/**
 * Builds the PG-mode handler map for all five OCR pipeline stages. Must be
 * called with the loaded config; each handler is created via the shared
 * `createPgHandlerWrapper` to avoid duplicating retry/classification logic.
 */
export function buildOcrPgHandlers(
  config: PipelineConfig,
): Partial<Record<string, (job: ClaimedJob) => Promise<void>>> {
  const wrapper = createPgHandlerWrapper({
    config,
    queueName: "pipeline-ocr",
    logger: console,
  });

  return {
    [JOB_QUEUES.VALIDATION]: (cj) => wrapper(cj, processValidationStage),
    [JOB_QUEUES.SPLITTING]: (cj) => wrapper(cj, processSplittingStage),
    [JOB_QUEUES.OCR]: (cj) => wrapper(cj, processOcrStage),
    [JOB_QUEUES.CLEANING]: (cj) => wrapper(cj, processCleaningStage),
    [JOB_QUEUES.GENERATION]: (cj) => wrapper(cj, processGenerationStage),
  };
}
