-- AlterTable: Add IR fields to documents table
ALTER TABLE "documents" ADD COLUMN "documentIR" JSONB,
ADD COLUMN "irVersion" VARCHAR(50),
ADD COLUMN "irGeneratedAt" TIMESTAMPTZ;
