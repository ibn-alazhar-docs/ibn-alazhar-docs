-- Add missing soft-delete columns to align the database with schema.prisma.
-- `ShareLink` and `ConversionJob` declared `deletedAt` in the schema but no
-- migration ever added the column, causing P2022 at runtime (all share/export
-- flows that filter or write `deletedAt` failed with 500).

ALTER TABLE "conversion_jobs" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "share_links" ADD COLUMN "deletedAt" TIMESTAMP(3);
