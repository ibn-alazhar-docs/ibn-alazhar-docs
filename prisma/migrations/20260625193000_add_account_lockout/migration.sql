-- Account lockout fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS "failedLoginAttempts" integer NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "lockedAt" timestamp(3) without time zone;
