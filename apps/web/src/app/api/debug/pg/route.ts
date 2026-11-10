import { NextResponse } from "next/server";
import { withAdminAuth } from "@/middleware/auth-guards";
import {
  findAmiriFonts,
  findReferenceRtlDocx,
  getStorageDriver,
} from "@ibn-al-azhar-docs/pipeline";

export const dynamic = "force-dynamic";

// Debug endpoints are privileged. They are disabled entirely in production
// unless explicitly opted-in via DEBUG_API_ENABLED=true, and always require an
// admin session.
function debugEnabled(): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  return process.env.DEBUG_API_ENABLED === "true";
}

/**
 * Deployment readiness for the paths that silently degrade rather than fail.
 *
 * This used to `execSync("ls -la /data")`, which told nothing about the things
 * that actually break a deploy: the Arabic DOCX export falls back to an
 * unstyled document when `reference_rtl.docx` is missing, font embedding
 * no-ops when Amiri cannot be found, and storage reverts to non-durable
 * `local` when `STORAGE_DRIVER` is unset. All three resolve to a value
 * instead of throwing, so only an explicit probe surfaces them.
 *
 * Reports booleans, drivers and resolved paths only — never a connection
 * string, key or any other secret value.
 */
export const GET = withAdminAuth(async () => {
  if (!debugEnabled()) {
    return new NextResponse("Not found", { status: 404 });
  }

  const rtlDocx = findReferenceRtlDocx();
  const fonts = findAmiriFonts();

  return NextResponse.json(
    {
      queue: {
        driver: process.env.QUEUE_DRIVER ?? "redis",
        databaseUrlConfigured: Boolean(process.env.DATABASE_URL),
        databaseUrlDirectConfigured: Boolean(process.env.DATABASE_URL_DIRECT),
        redisUrlConfigured: Boolean(process.env.REDIS_URL),
      },
      storage: {
        driver: getStorageDriver(),
        localDir: process.env.STORAGE_LOCAL_DIR ?? "/data",
        s3BucketConfigured: Boolean(process.env.S3_BUCKET),
        s3CredentialsConfigured: Boolean(
          process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY,
        ),
      },
      arabicExport: {
        // Both false on a deploy that lost the vendored assets: exports still
        // succeed, but without RTL styling or embedded Amiri.
        referenceRtlDocx: rtlDocx ?? null,
        amiriRegular: fonts.regular ?? null,
        amiriBold: fonts.bold ?? null,
      },
      ocr: {
        provider: process.env.OCR_PROVIDER ?? "unset",
        geminiKeyConfigured: Boolean(process.env.GEMINI_API_KEY),
      },
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
});
