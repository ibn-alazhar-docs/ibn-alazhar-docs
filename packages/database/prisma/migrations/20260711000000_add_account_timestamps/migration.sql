-- Add the missing createdAt / updatedAt timestamp columns to the Account model.
-- These were added to schema.prisma but never captured in a migration, causing
-- "The column accounts.createdAt does not exist" at runtime (pipeline generate stage).
-- Safe: only adds columns, preserves search infrastructure (searchvector / normalize_arabic).
ALTER TABLE "accounts" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "accounts" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
