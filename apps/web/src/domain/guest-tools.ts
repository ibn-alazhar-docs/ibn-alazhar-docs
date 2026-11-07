// Guest Tools Hub — domain contracts (docs/IMPLEMENTATION_TOOLS.md §7).
//
// Guest jobs are deliberately ephemeral and account-free: they never touch the
// authenticated library (no Document / ConversionJob rows, no userId) and live
// only in the guest job store until their TTL elapses. Types here are pure
// contracts — persistence and pipeline orchestration live in `@/core/services/guest`.

import type { GuestToolId } from "@/shared/tools/guest-limits";

export type GuestJobStatus = "queued" | "processing" | "completed" | "failed";

/** Queue-slot rejection reasons (fair-queue limits, §3.1). */
export type GuestQueueReason = "PER_IP" | "PER_TOOL" | "TOTAL";

/** Server-side rejection codes for POST /api/tools/guest/jobs. */
export type GuestRejectCode =
  | "MISSING_FILE"
  | "INVALID_TOOL"
  | "UNSUPPORTED_TYPE"
  | "TOO_LARGE"
  | "TOO_MANY_PAGES"
  | "PAGE_COUNT_UNAVAILABLE"
  | "QUEUE_FULL_PER_IP"
  | "QUEUE_FULL_PER_TOOL"
  | "QUEUE_FULL_TOTAL";

/** Terminal failure codes reported on a job (never a fake result). */
export type GuestFailureCode = "OCR_UNAVAILABLE" | "PROCESSING_FAILED" | "TIMEOUT" | "CANCELLED";

/**
 * Mirror of the pipeline's `CleanedText` (packages/pipeline/src/types.ts).
 * Kept structurally identical so the guest store can hand it straight back to
 * `generateTxt` / `generateJson` / `generateDocx` without importing the
 * server-only pipeline into the domain layer.
 */
export interface GuestCleanedText {
  raw: string;
  cleaned: string;
  markdown: string;
  metadata: {
    pageCount: number;
    headingCount: number;
    wordCount: number;
    charCount: number;
    confidence: number;
    garbageRatio: number;
    htmlFragmentCount: number;
    paragraphCount: number;
    qualityScore: number;
  };
}

export interface GuestJobResult {
  cleanedText: GuestCleanedText;
  /** Extraction route: native text layer (free) or OCR chain. */
  route: "native" | "ocr";
  /** Engine that produced the text ("native", "tesseract", "gemini", ...). */
  engine: string;
}

export interface GuestJobRecord {
  /** Unguessable random token — the only capability needed to read a result. */
  id: string;
  toolId: GuestToolId;
  /** Hashed client IP: used for queue accounting only, never stored raw. */
  ipKey: string;
  /** Sanitized upload name shown back to the same browser only. */
  fileName: string;
  mimeType: string;
  fileSize: number;
  /** Server-counted page total (images count as 1). Never trusted from the browser. */
  pageCount: number;
  status: GuestJobStatus;
  createdAtMs: number;
  startedAtMs?: number;
  finishedAtMs?: number;
  /**
   * While queued/processing this is the hard processing deadline; once the job
   * reaches a terminal state it becomes `finishedAt + resultTtlMinutes` (30 min).
   */
  expiresAtMs: number;
  /** Absolute path of the ephemeral upload; removed as soon as the job ends. */
  inputPath: string;
  inputDeleted: boolean;
  /** Best-effort real progress (0-100); never a simulated bar. */
  progress: number;
  error?: { code: GuestFailureCode | string; message: string };
  result?: GuestJobResult;
}

/** Public view of a job returned by the GET endpoint — no IPs, no paths. */
export interface GuestJobView {
  jobId: string;
  tool: string;
  status: GuestJobStatus;
  fileName: string;
  pageCount: number;
  progress: number;
  expiresAt: string;
  result?: {
    format: "txt";
    text: string;
    chars: number;
    route: "native" | "ocr";
    engine: string;
    metadata: GuestCleanedText["metadata"];
  };
  error?: { code: string; message: string };
}
