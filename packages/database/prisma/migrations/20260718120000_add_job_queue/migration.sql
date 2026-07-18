-- CreateTable
CREATE TABLE "job_queue" (
    "id" BIGSERIAL NOT NULL,
    "queue" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "runAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "lastError" TEXT,
    "leaseToken" TEXT,
    "lockedBy" TEXT,
    "lockedAt" TIMESTAMP(3),
    "heartbeatAt" TIMESTAMP(3),
    "deadLetterState" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_queue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (regular, non-concurrent — table is new and small)
CREATE UNIQUE INDEX "job_queue_queue_idempotencyKey_key" ON "job_queue"("queue", "idempotencyKey");

-- CreateIndex (regular B-tree for claim ordering)
CREATE INDEX "job_queue_queue_status_runAt_priority_idx" ON "job_queue"("queue", "status", "runAt", "priority");

-- CHECK constraints (Prisma does not support CHECK in schema for these cases)
ALTER TABLE "job_queue" ADD CONSTRAINT "job_queue_status_check"
  CHECK (status IN ('pending', 'reserved', 'done', 'failed', 'dead'));

ALTER TABLE "job_queue" ADD CONSTRAINT "job_queue_attempts_check"
  CHECK (attempts >= 0);

ALTER TABLE "job_queue" ADD CONSTRAINT "job_queue_max_attempts_check"
  CHECK ("maxAttempts" >= 1);

ALTER TABLE "job_queue" ADD CONSTRAINT "job_queue_queue_name_check"
  CHECK (queue IN ('pipeline-validation', 'pipeline-splitting', 'pipeline-ocr', 'pipeline-cleaning', 'pipeline-generation', 'pipeline-export'));
