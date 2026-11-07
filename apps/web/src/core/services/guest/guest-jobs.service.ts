import { getClientIp } from "@/clients/redis";
import { logger } from "@/shared/logger";
import { GUEST_TOOLS_LIMITS, getGuestTool, type GuestTool } from "@/shared/tools/guest-limits";
import { type DocumentClassification } from "@ibn-al-azhar-docs/pipeline";
import type { GuestJobView, GuestQueueReason, GuestRejectCode } from "@/domain/guest-tools";
import {
  completeGuestJob,
  dropGuestJob,
  failGuestJob,
  generateGuestJobId,
  getGuestJob,
  guestQueueCounts,
  hashGuestIp,
  markGuestJobProcessing,
  nextFreeSlotMs,
  reserveGuestJob,
  setGuestJobProgress,
  startGuestJobSweeper,
  sweepGuestJobs,
} from "./guest-job-store";
import {
  deleteGuestInput,
  isGuestJobId,
  readGuestInput,
  writeGuestInput,
} from "./guest-temp-files";
import { validateGuestUpload } from "./guest-input-validation";
import {
  GuestAbandonedError,
  processGuestInput,
  processGuestText,
  guestFailureFromError,
  renderGuestDocx,
  renderGuestJson,
  renderGuestTxt,
} from "./guest-tool-processor";

/**
 * Guest Tools use-cases (docs/IMPLEMENTATION_TOOLS.md §7).
 *
 * Account-free by design: no `withAuth`, no session, no user id, and no writes
 * to Document/ConversionJob — the job exists only in the ephemeral store and on
 * the guest temp disk for the duration of the run.
 */

export type GuestServiceResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      status: number;
      code: string;
      message: string;
      retryAfterMs?: number;
    };

export interface GuestJobCreated {
  jobId: string;
  status: "queued";
  tool: string;
  fileName: string;
  pageCount: number;
  expiresAt: string;
  limits: {
    maxFileSizeMB: number;
    maxPages: number;
    resultTtlMinutes: number;
    maxConcurrentJobsPerIp: number;
    maxConcurrentJobsPerTool: number;
    maxConcurrentJobsTotal: number;
  };
}

export type GuestJobRead =
  | { kind: "view"; view: GuestJobView }
  | { kind: "file"; body: Uint8Array; contentType: string; fileName: string };

export type GuestDownloadFormat = "txt" | "json" | "docx";

const REJECT_STATUS: Record<GuestRejectCode, number> = {
  MISSING_FILE: 400,
  INVALID_TOOL: 400,
  UNSUPPORTED_TYPE: 415,
  TOO_LARGE: 413,
  TOO_MANY_PAGES: 413,
  PAGE_COUNT_UNAVAILABLE: 400,
  QUEUE_FULL_PER_IP: 429,
  QUEUE_FULL_PER_TOOL: 429,
  QUEUE_FULL_TOTAL: 429,
};

const QUEUE_FULL_CODES: Record<GuestQueueReason, string> = {
  PER_IP: "GUEST_QUEUE_FULL_PER_IP",
  PER_TOOL: "GUEST_QUEUE_FULL_PER_TOOL",
  TOTAL: "GUEST_QUEUE_FULL_TOTAL",
};

const QUEUE_FULL_MESSAGES: Record<GuestQueueReason, string> = {
  PER_IP: "لديك بالفعل مهمة ضيف نشطة واحدة — انتظر انتهائها.",
  PER_TOOL: "طابور هذه الأداة ممتلئ (3 مهام لكل أداة).",
  TOTAL: "طابور الضيوف ممتلئ (4 مهام إجمالًا).",
};

/**
 * Classification cache: computed once for the mandatory server-side page count
 * and reused by processing so a 99MB PDF is never probed twice. In-memory,
 * cleared when the job ends — nothing persistent, no library row.
 */
const classificationCache = new Map<string, DocumentClassification | null>();
const textCache = new Map<string, string>();
const langCache = new Map<string, "ar" | "en">();
const MAX_GUEST_TEXT_CHARS = 200_000;

export function isGuestToolProcessable(tool: GuestTool | undefined): tool is GuestTool {
  // Only live tools are wired to the pipeline; sidecar-pending tools (tashkeel,
  // transcription) must degrade in the UI, never be faked here.
  return Boolean(tool && tool.status === "available" && (tool.acceptsFiles || tool.acceptsText));
}

/** Clamp the Retry-After hint between 5s and the blocking jobs' own deadlines. */
function retryAfterFor(reason: GuestQueueReason, toolId: string, ipKey: string): number {
  const scope = reason === "PER_IP" ? { ipKey } : reason === "PER_TOOL" ? { toolId } : {};
  const soonest = nextFreeSlotMs(scope);
  if (soonest === null) return 30_000;
  return Math.max(5_000, Math.min(soonest, 300_000));
}

/** Parse the multipart body (file + tool id). */
export interface GuestJobFormInput {
  file: File | null;
  toolId: string | null;
  text: string | null;
  lang: "ar" | "en";
}

export async function parseGuestJobRequest(
  request: Request,
): Promise<GuestJobFormInput | { invalid: true }> {
  try {
    const form = await request.formData();
    const fileField = form.get("file");
    const toolField = form.get("tool");
    const textField = form.get("text");
    const langField = form.get("lang");
    return {
      file: fileField instanceof File ? fileField : null,
      toolId: typeof toolField === "string" ? toolField : null,
      text: typeof textField === "string" ? textField : null,
      lang: langField === "en" ? "en" : "ar",
    };
  } catch (err) {
    logger.warn(err, "Guest job request is not valid multipart form data");
    return { invalid: true };
  }
}

/**
 * POST /api/tools/guest/jobs — validate server-side, reserve a queue slot,
 * store the upload ephemerally, and start processing without blocking the
 * response (the client polls for the result).
 */
export async function createGuestJob(
  request: Request,
): Promise<GuestServiceResult<GuestJobCreated>> {
  const declared = Number(request.headers.get("content-length") ?? 0);
  const maxBytes = GUEST_TOOLS_LIMITS.maxFileSizeMB * 1024 * 1024;
  // Cheap pre-check so an obviously oversized body is never buffered.
  if (declared > maxBytes + 1024 * 1024) {
    return {
      ok: false,
      status: REJECT_STATUS.TOO_LARGE,
      code: "TOO_LARGE",
      message: `حجم الطلب يتجاوز حد الضيوف (${GUEST_TOOLS_LIMITS.maxFileSizeMB}MB)`,
    };
  }

  const parsed = await parseGuestJobRequest(request);
  if ("invalid" in parsed) {
    return {
      ok: false,
      status: 400,
      code: "INVALID_FORM",
      message: "يجب إرسال الطلب كبيانات نموذج متعددة الأجزاء (multipart/form-data)",
    };
  }

  const tool = getGuestTool(parsed.toolId ?? "");
  if (!isGuestToolProcessable(tool)) {
    return {
      ok: false,
      status: REJECT_STATUS.INVALID_TOOL,
      code: "INVALID_TOOL",
      message: "أداة غير معروفة أو غير موصولة بخط المعالجة بعد",
    };
  }

  if (tool.acceptsText && !tool.acceptsFiles) {
    // Text-only tools (tashkeel) never accept a file upload: a file here is the
    // wrong input kind for the tool, not a missing text payload — keep the
    // historical INVALID_TOOL contract covered by guest-tools-api.test.ts.
    if (parsed.file) {
      return {
        ok: false,
        status: REJECT_STATUS.INVALID_TOOL,
        code: "INVALID_TOOL",
        message: "هذه الأداة تقبل نصًا لاصقًا فقط، لا ملفًا",
      };
    }
    const rawText = parsed.text ?? "";
    if (!rawText.trim()) {
      return {
        ok: false,
        status: 400,
        code: "MISSING_TEXT",
        message: "ألصق النص الذي تريد تشكيله",
      };
    }
    if (rawText.length > MAX_GUEST_TEXT_CHARS) {
      return {
        ok: false,
        status: 413,
        code: "TOO_LARGE",
        message: `النص يتجاوز حد ${MAX_GUEST_TEXT_CHARS} حرفًا`,
      };
    }
    const ip = getClientIp(request);
    const ipKey = hashGuestIp(ip);
    const id = generateGuestJobId();
    const reservation = reserveGuestJob({
      id,
      toolId: tool.id,
      ipKey,
      fileName: "text.txt",
      mimeType: "text/plain",
      fileSize: new TextEncoder().encode(rawText).byteLength,
      pageCount: 1,
    });
    if (!reservation.ok) {
      return {
        ok: false,
        status: 429,
        code: QUEUE_FULL_CODES[reservation.reason],
        message: QUEUE_FULL_MESSAGES[reservation.reason],
        retryAfterMs: retryAfterFor(reservation.reason, tool.id, ipKey),
      };
    }
    textCache.set(id, rawText);
    void runGuestJob(id);
    return {
      ok: true,
      data: {
        jobId: id,
        status: "queued",
        tool: tool.id,
        fileName: "text.txt",
        pageCount: 1,
        expiresAt: new Date(reservation.job.expiresAtMs).toISOString(),
        limits: {
          maxFileSizeMB: GUEST_TOOLS_LIMITS.maxFileSizeMB,
          maxPages: GUEST_TOOLS_LIMITS.maxPages,
          resultTtlMinutes: GUEST_TOOLS_LIMITS.resultTtlMinutes,
          maxConcurrentJobsPerIp: GUEST_TOOLS_LIMITS.maxConcurrentJobsPerIp,
          maxConcurrentJobsPerTool: GUEST_TOOLS_LIMITS.maxConcurrentJobsPerTool,
          maxConcurrentJobsTotal: GUEST_TOOLS_LIMITS.maxConcurrentJobsTotal,
        },
      },
    };
  }

  const validated = await validateGuestUpload(parsed.file);
  if (!validated.ok) {
    return {
      ok: false,
      status: REJECT_STATUS[validated.code] ?? 400,
      code: validated.code,
      message: validated.message,
    };
  }

  const ip = getClientIp(request);
  const ipKey = hashGuestIp(ip);
  const id = generateGuestJobId();
  const reservation = reserveGuestJob({
    id,
    toolId: tool.id,
    ipKey,
    fileName: validated.fileName,
    mimeType: validated.mimeType,
    fileSize: validated.bytes.byteLength,
    pageCount: validated.pageCount,
  });
  if (!reservation.ok) {
    return {
      ok: false,
      status: 429,
      code: QUEUE_FULL_CODES[reservation.reason],
      message: QUEUE_FULL_MESSAGES[reservation.reason],
      retryAfterMs: retryAfterFor(reservation.reason, tool.id, ipKey),
    };
  }

  classificationCache.set(id, validated.classification);
  langCache.set(id, parsed.lang);
  try {
    await writeGuestInput(id, validated.bytes);
  } catch (err) {
    classificationCache.delete(id);
    await dropGuestJob(id);
    logger.error(err, "Guest job upload could not be stored");
    return {
      ok: false,
      status: 503,
      code: "STORAGE_UNAVAILABLE",
      message: "تعذّر تخزين الملف مؤقتًا — حاول مجددًا بعد قليل",
    };
  }

  // Fire-and-forget: the response is the job token, never the result.
  void runGuestJob(id);

  return {
    ok: true,
    data: {
      jobId: id,
      status: "queued",
      tool: tool.id,
      fileName: validated.fileName,
      pageCount: validated.pageCount,
      expiresAt: new Date(reservation.job.expiresAtMs).toISOString(),
      limits: {
        maxFileSizeMB: GUEST_TOOLS_LIMITS.maxFileSizeMB,
        maxPages: GUEST_TOOLS_LIMITS.maxPages,
        resultTtlMinutes: GUEST_TOOLS_LIMITS.resultTtlMinutes,
        maxConcurrentJobsPerIp: GUEST_TOOLS_LIMITS.maxConcurrentJobsPerIp,
        maxConcurrentJobsPerTool: GUEST_TOOLS_LIMITS.maxConcurrentJobsPerTool,
        maxConcurrentJobsTotal: GUEST_TOOLS_LIMITS.maxConcurrentJobsTotal,
      },
    },
  };
}

/**
 * Run the pipeline for one guest job, then delete the upload immediately —
 * whatever the outcome (§2.4 "حذف الملف فور انتهاء المهمة").
 */
export async function runGuestJob(id: string): Promise<void> {
  startGuestJobSweeper();
  markGuestJobProcessing(id);
  const job = getGuestJob(id);
  if (!job) {
    classificationCache.delete(id);
    textCache.delete(id);
    return;
  }

  try {
    const cachedText = textCache.get(id);
    if (cachedText !== undefined) {
      setGuestJobProgress(id, 35);
      const result = await processGuestText(cachedText);
      setGuestJobProgress(id, 95);
      completeGuestJob(id, result);
      return;
    }
    const bytes = new Uint8Array(await readGuestInput(job.inputPath));
    const result = await processGuestInput({
      bytes,
      mimeType: job.mimeType as never,
      fileName: job.fileName,
      pageCount: job.pageCount,
      classification: classificationCache.get(id) ?? null,
      toolId: job.toolId,
      lang: langCache.get(id) ?? "ar",
      onProgress: (progress) => {
        // Cooperative cancellation. Both the 15-minute sweeper and a user DELETE
        // free the queue slot while this run is still burning CPU and provider
        // quota, so each progress tick re-checks the record; if it is gone or no
        // longer active, the chain is abandoned instead of running to completion
        // for a guest who can no longer read the result.
        const live = getGuestJob(id);
        if (!live || live.status !== "processing") throw new GuestAbandonedError(id);
        setGuestJobProgress(id, progress);
      },
    });
    completeGuestJob(id, result);
  } catch (err) {
    if (err instanceof GuestAbandonedError) {
      // The sweeper already wrote TIMEOUT, or DELETE already dropped the record.
      // A completion here is not a failure to report — it is a cancelled run.
      logger.info({ jobId: err.jobId }, "Guest job abandoned mid-run; skipping terminal write");
    } else {
      const failureInfo =
        err instanceof Error && err.message.includes("GEMINI_API_KEY_MISSING")
          ? {
              code: "GEMINI_API_KEY_MISSING",
              message: "خدمة التشكيل غير متاحة مؤقتًا (مفتاح Gemini مفقود)",
            }
          : guestFailureFromError(err);
      failGuestJob(id, failureInfo.code, failureInfo.message);
      logger.warn({ code: failureInfo.code }, "Guest job failed");
    }
  } finally {
    classificationCache.delete(id);
    textCache.delete(id);
    const current = getGuestJob(id);
    if (job.mimeType === "text/plain") {
      if (current) current.inputDeleted = true;
    } else {
      await deleteGuestInput(job.inputPath);
      if (current) current.inputDeleted = true;
    }
  }
}

function buildView(id: string, status: string, extra: Partial<GuestJobView>): GuestJobView {
  const job = getGuestJob(id);
  return {
    jobId: id,
    tool: job?.toolId ?? "unknown",
    status: status as GuestJobView["status"],
    fileName: job?.fileName ?? "",
    pageCount: job?.pageCount ?? 0,
    progress: job?.progress ?? 0,
    expiresAt: new Date(job?.expiresAtMs ?? Date.now()).toISOString(),
    ...extra,
  };
}

/**
 * GET /api/tools/guest/jobs/[id] — poll for status, or fetch the result in a
 * downloadable format. Access is the unguessable token itself (same capability
 * model as /api/share/[token]); per-IP request limits come from the middleware.
 */
export async function readGuestJob(
  id: string,
  format?: GuestDownloadFormat,
): Promise<GuestServiceResult<GuestJobRead>> {
  if (!isGuestJobId(id)) {
    return {
      ok: false,
      status: 404,
      code: "GUEST_JOB_NOT_FOUND",
      message: "مهمة الضيوف غير موجودة",
    };
  }

  // Lazy TTL enforcement: a read is enough to expire an overdue job.
  await sweepGuestJobs();
  startGuestJobSweeper();

  const job = getGuestJob(id);
  if (!job) {
    return {
      ok: false,
      status: 404,
      code: "GUEST_JOB_NOT_FOUND",
      message: "مهمة الضيوف غير موجودة أو انتهت صلاحيتها (تُحذف النتائج بعد 30 دقيقة)",
    };
  }

  if (!format) {
    const view = buildView(job.id, job.status, {});
    if (job.status === "completed" && job.result) {
      const text = renderGuestTxt(job.result);
      view.result = {
        format: "txt",
        text,
        chars: text.length,
        route: job.result.route,
        engine: job.result.engine,
        metadata: job.result.cleanedText.metadata,
      };
    }
    if (job.error) view.error = job.error;
    return { ok: true, data: { kind: "view", view } };
  }

  if (job.status !== "completed" || !job.result) {
    return {
      ok: false,
      status: 409,
      code: "GUEST_JOB_NOT_READY",
      message: "النتيجة غير جاهزة بعد",
    };
  }

  const baseName = `guest-${job.toolId}-${job.id.slice(0, 8)}`;
  if (format === "txt") {
    return {
      ok: true,
      data: {
        kind: "file",
        body: new TextEncoder().encode(renderGuestTxt(job.result)),
        contentType: "text/plain; charset=utf-8",
        fileName: `${baseName}.txt`,
      },
    };
  }
  if (format === "json") {
    return {
      ok: true,
      data: {
        kind: "file",
        body: new TextEncoder().encode(renderGuestJson(job.result, job.fileName)),
        contentType: "application/json; charset=utf-8",
        fileName: `${baseName}.json`,
      },
    };
  }
  try {
    const body = await renderGuestDocx(job.result);
    return {
      ok: true,
      data: {
        kind: "file",
        body,
        contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        fileName: `${baseName}.docx`,
      },
    };
  } catch (err) {
    const failureInfo = guestFailureFromError(err);
    if (failureInfo.code === "DOCX_UNAVAILABLE") {
      logger.warn(err, "Guest DOCX export unavailable");
      return {
        ok: false,
        status: 503,
        code: "DOCX_UNAVAILABLE",
        message: "تنزيل DOCX غير متاح حاليًا — TXT/JSON يعملان",
      };
    }
    throw err;
  }
}

/**
 * DELETE /api/tools/guest/jobs/[id] — immediate user-initiated deletion,
 * before the 30-minute TTL: result and upload are both removed right now.
 */
export async function deleteGuestJob(id: string): Promise<GuestServiceResult<{ deleted: true }>> {
  if (!isGuestJobId(id)) {
    return {
      ok: false,
      status: 404,
      code: "GUEST_JOB_NOT_FOUND",
      message: "مهمة الضيوف غير موجودة",
    };
  }
  classificationCache.delete(id);
  textCache.delete(id);
  langCache.delete(id);
  const removed = await dropGuestJob(id);
  if (!removed) {
    return {
      ok: false,
      status: 404,
      code: "GUEST_JOB_NOT_FOUND",
      message: "مهمة الضيوف غير موجودة أو حُذفت بالفعل",
    };
  }
  return { ok: true, data: { deleted: true } };
}

/** Diagnostics for the hub page (queue depth) — no IPs, no file names, no ids. */
export function guestQueueSnapshot(now = Date.now()): {
  active: number;
  perTool: Record<string, number>;
} {
  const counts = guestQueueCounts(now);
  return { active: counts.total, perTool: counts.perTool };
}
