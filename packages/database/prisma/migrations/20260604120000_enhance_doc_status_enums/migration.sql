-- Enhance DocStatus enum with granular statuses
-- and add outputFormats field to Document model

-- Step 1: Migrate existing data FIRST (before enum changes)
-- Move any READY documents to a temporary status
UPDATE "documents" SET "status" = 'UPLOADED' WHERE "status" IN ('PROCESSING', 'READY');

-- Step 2: Create new enum type with all values
CREATE TYPE "DocStatus_new" AS ENUM ('UPLOADED', 'VALIDATING', 'SPLITTING', 'OCR_PROCESSING', 'CLEANING', 'GENERATING', 'COMPLETED', 'FAILED', 'ARCHIVED');

-- Step 3: Alter column to use new enum type
ALTER TABLE "documents" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "documents" ALTER COLUMN "status" TYPE "DocStatus_new" USING "status"::text::"DocStatus_new";
ALTER TABLE "documents" ALTER COLUMN "status" SET DEFAULT 'UPLOADED';

-- Step 4: Drop old enum type
DROP TYPE "DocStatus";

-- Step 5: Rename new enum type
ALTER TYPE "DocStatus_new" RENAME TO "DocStatus";

-- Step 6: Add outputFormats field
ALTER TABLE "documents" ADD COLUMN "outputFormats" TEXT[] DEFAULT ARRAY[]::TEXT[];
