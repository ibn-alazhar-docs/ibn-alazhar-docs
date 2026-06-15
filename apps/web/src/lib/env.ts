/* eslint-disable no-console */
const REQUIRED_ENV_VARS = [
  "DATABASE_URL",
  "AUTH_SECRET",
  "REDIS_URL",
  "S3_ENDPOINT",
  "S3_ACCESS_KEY_ID",
  "S3_SECRET_ACCESS_KEY",
  "S3_BUCKET",
] as const;

const OPTIONAL_ENV_VARS = [
  "NODE_ENV",
  "APP_URL",
  "APP_NAME",
  "OCR_PROVIDER",
  "GOOGLE_SERVICE_ACCOUNT_EMAIL",
  "GOOGLE_PRIVATE_KEY",
] as const;

export function validateEnv(): { valid: boolean; missing: string[]; warnings: string[] } {
  const missing: string[] = [];
  const warnings: string[] = [];

  for (const key of REQUIRED_ENV_VARS) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  for (const key of OPTIONAL_ENV_VARS) {
    if (!process.env[key]) {
      warnings.push(key);
    }
  }

  if (process.env.AUTH_SECRET === "change-me-in-production") {
    warnings.push("AUTH_SECRET is using default value — change in production!");
  }

  return {
    valid: missing.length === 0,
    missing,
    warnings,
  };
}

export function failFastEnvCheck(): void {
  const result = validateEnv();

  if (!result.valid) {
    console.error("FATAL: Missing required environment variables:");
    for (const key of result.missing) {
      console.error(`   - ${key}`);
    }
    console.error("\nServer cannot start without these variables.");
    console.error("See .env.example for reference.");
    process.exit(1);
  }

  if (result.warnings.length > 0) {
    console.warn("Warnings (optional vars missing or defaults):");
    for (const key of result.warnings) {
      console.warn(`   - ${key}`);
    }
  }

  console.log("Environment validation passed");
}
