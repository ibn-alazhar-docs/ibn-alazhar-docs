// Guest Tools Hub limits — mirrors the arabi.tools principles adopted in
// docs/MERGE_PLAN.md: no account, input stays in place, read-only results,
// 99MB / 1000 pages, queue 4 total / 3 per tool / 1 per IP, results expire
// after 30 minutes and uploaded files are deleted as soon as the job ends.
//
// NOTE: these are guest-hub limits. The authenticated upload path still uses
// MAX_UPLOAD_SIZE_MB (default 50MB) in `@/shared/validators/document` — the
// guest endpoint must enforce THESE limits server-side (see
// docs/IMPLEMENTATION_TOOLS.md) and must not silently reuse the 50MB cap.

export const GUEST_TOOLS_LIMITS = {
  /** Max upload size for a single guest file, in MB (99MB target). */
  maxFileSizeMB: 99,
  /** Max pages for a single guest PDF (1000p target). Images count as 1. */
  maxPages: 1000,
  /** Total concurrent guest jobs across all tools. */
  maxConcurrentJobsTotal: 4,
  /** Max concurrent guest jobs per tool. */
  maxConcurrentJobsPerTool: 3,
  /** Max concurrent guest jobs per IP address. */
  maxConcurrentJobsPerIp: 1,
  /** Minutes a guest result stays available before auto-deletion. */
  resultTtlMinutes: 30,
  /** Uploaded guest files are deleted immediately when the job finishes. */
  deleteFileAfterJob: true,
} as const;

export const GUEST_ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png"] as const;

export type GuestToolStatus = "available" | "sidecar-pending";

export type GuestToolId = "pdf-to-word" | "ocr" | "tashkeel" | "transcription";

export interface GuestTool {
  id: GuestToolId;
  slug: string;
  /** i18n key suffix under the "tools" namespace: tools.items.<id>.* */
  i18nKey: GuestToolId;
  status: GuestToolStatus;
  /** Accepts uploaded files (vs. pasted text) in the guest UI. */
  acceptsFiles: boolean;
  /** Accepts pasted text in the guest UI. */
  acceptsText: boolean;
}

export const GUEST_TOOLS: readonly GuestTool[] = [
  {
    id: "pdf-to-word",
    slug: "pdf-to-word",
    i18nKey: "pdf-to-word",
    status: "available",
    acceptsFiles: true,
    acceptsText: false,
  },
  {
    id: "ocr",
    slug: "ocr",
    i18nKey: "ocr",
    status: "available",
    acceptsFiles: true,
    acceptsText: false,
  },
  {
    id: "tashkeel",
    slug: "tashkeel",
    i18nKey: "tashkeel",
    status: "sidecar-pending",
    acceptsFiles: false,
    acceptsText: true,
  },
  {
    id: "transcription",
    slug: "transcription",
    i18nKey: "transcription",
    status: "sidecar-pending",
    acceptsFiles: true,
    acceptsText: false,
  },
] as const;

export function getGuestTool(id: string): GuestTool | undefined {
  return GUEST_TOOLS.find((tool) => tool.id === id);
}

export interface GuestFileValidation {
  valid: boolean;
  code?: "TOO_LARGE" | "TOO_MANY_PAGES" | "UNSUPPORTED_TYPE" | "MISSING";
  /** Human-readable Arabic fallback; UI prefers i18n keys by `code`. */
  error?: string;
}

/**
 * Validate a guest upload against the 99MB / 1000p guest limits.
 * `pageCount` is optional: pass it when known (e.g. counted in the browser
 * with pdf.js); the guest endpoint must recount server-side regardless.
 */
export function validateGuestFile(
  file: File | null,
  pageCount?: number | null,
): GuestFileValidation {
  if (!file) {
    return { valid: false, code: "MISSING", error: "لم يُرفق أي ملف" };
  }
  const mimeOk = (GUEST_ALLOWED_MIME_TYPES as readonly string[]).includes(file.type);
  const extOk = /\.(pdf|jpe?g|png)$/i.test(file.name);
  if (!mimeOk && !extOk) {
    return {
      valid: false,
      code: "UNSUPPORTED_TYPE",
      error: "نوع الملف غير مدعوم. ارفع ملف PDF أو صورة (JPG/PNG).",
    };
  }
  if (file.size > GUEST_TOOLS_LIMITS.maxFileSizeMB * 1024 * 1024) {
    return {
      valid: false,
      code: "TOO_LARGE",
      error: `الملف أكبر من الحد المسموح للضيوف (${GUEST_TOOLS_LIMITS.maxFileSizeMB}MB).`,
    };
  }
  if (typeof pageCount === "number" && pageCount > GUEST_TOOLS_LIMITS.maxPages) {
    return {
      valid: false,
      code: "TOO_MANY_PAGES",
      error: `عدد الصفحات يتجاوز حد الضيوف (${GUEST_TOOLS_LIMITS.maxPages} صفحة).`,
    };
  }
  return { valid: true };
}
