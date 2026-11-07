"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { GUEST_TOOLS_LIMITS, validateGuestFile, type GuestTool } from "@/shared/tools/guest-limits";
import { countPdfPages as countPdfPagesWithPdfJs } from "@/lib/pdfjs-config";
import { apiFetch } from "@/shared/api";
import type { GuestJobView } from "@/domain/guest-tools";
import { Badge } from "@/ui/badge";
import { ReadOnlyResult } from "./read-only-result";

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const POLL_INTERVAL_MS = 2_000;
// The submit budget is 10/min by design (OCR is billed per request), so a guest on
// a slow connection can still trip it while a job runs. Polling failures are
// therefore retried with a backoff floor before the job is called failed.
const POLL_BACKOFF_FLOOR_MS = 5_000;
const POLL_MAX_TRANSIENT = 6;

/**
 * Guest tool page body. No account, no session, no library writes:
 * - files are validated client-side against the 99MB / 1000p guest limits
 *   (PDF page count via a lazily-loaded pdf.js — never in the initial bundle),
 * - the job is created on `/api/tools/guest/jobs` and polled by its token, so a
 *   99MB OCR run never holds an HTTP request open,
 * - results are read-only (see ReadOnlyResult),
 * - tools whose backend is an external sidecar degrade gracefully instead of
 *   breaking the page or faking a result.
 */
interface GuestToolClientProps {
  tool: GuestTool;
  name: string;
  tagline: string;
  cta: string;
}

type Phase =
  | { kind: "idle" }
  | { kind: "uploading" }
  | { kind: "running"; jobId: string; status: string; progress: number }
  | { kind: "done"; jobId: string; view: GuestJobView }
  | { kind: "error"; code: string; message: string; retryAfterMs?: number };

/**
 * Guest rejections are machine-coded, so the copy is keyed off the code and the
 * server string is only a fallback for codes the UI has not seen. Queue-full is
 * the one case that must say "wait", not "error" — arabi.tools' fair-queue UX.
 */
function guestErrorText(
  t: ReturnType<typeof useTranslations>,
  phase: Extract<Phase, { kind: "error" }>,
): string {
  switch (phase.code) {
    case "QUEUE_FULL_PER_IP":
    case "QUEUE_FULL_PER_TOOL":
    case "QUEUE_FULL_TOTAL":
    case "GUEST_QUEUE_FULL_PER_IP":
    case "GUEST_QUEUE_FULL_PER_TOOL":
    case "GUEST_QUEUE_FULL_TOTAL":
      return t("guest.queueFull");
    case "TOO_LARGE":
      return t("upload.tooLarge");
    case "TOO_MANY_PAGES":
      return t("upload.tooManyPages");
    case "UNSUPPORTED_TYPE":
      return t("upload.unsupportedType");
    case "OCR_UNAVAILABLE":
    case "STORAGE_UNAVAILABLE":
      return t("guest.backendUnavailable");
    case "NETWORK":
      return t("guest.networkError");
    default:
      return phase.message || t("guest.genericError");
  }
}

export function GuestToolClient({ tool, name, tagline, cta }: GuestToolClientProps) {
  const t = useTranslations("tools");
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [counting, setCounting] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });

  // The poll must survive re-renders and stop on unmount or a new submission.
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // `pollJob` reschedules from inside its own await, so a timer set after the
  // component unmounted would keep a dead page polling until the job deadline.
  const aliveRef = useRef(true);
  // Consecutive transient poll failures tolerated before giving up. Polling is the
  // only path by which a guest ever sees a result, so one blip must not read as
  // "your job failed" while the server is still producing it.
  const transientPolls = useRef(0);
  useEffect(
    () => () => {
      aliveRef.current = false;
      if (pollTimer.current) clearTimeout(pollTimer.current);
    },
    [],
  );

  function stopPolling() {
    if (pollTimer.current) {
      clearTimeout(pollTimer.current);
      pollTimer.current = null;
    }
  }

  function schedulePoll(jobId: string, delayMs: number) {
    if (!aliveRef.current) return;
    pollTimer.current = setTimeout(() => void pollJob(jobId), delayMs);
  }

  const errorMessage = (key: string | null): string | null => {
    if (!key) return null;
    if (key === "TOO_LARGE") return t("upload.tooLarge");
    if (key === "TOO_MANY_PAGES") return t("upload.tooManyPages");
    if (key === "UNSUPPORTED_TYPE") return t("upload.unsupportedType");
    return null;
  };

  async function countPdfPages(selected: File): Promise<number | null> {
    try {
      return await countPdfPagesWithPdfJs(await selected.arrayBuffer());
    } catch {
      return null; // page count is enforced again server-side; never block on it
    }
  }

  async function handleFile(selected: File | null) {
    stopPolling();
    setPhase({ kind: "idle" });
    setPageCount(null);
    setErrorKey(null);
    if (!selected) {
      setFile(null);
      return;
    }
    const initial = validateGuestFile(selected);
    if (!initial.valid) {
      setFile(null);
      setErrorKey(initial.code ?? "UNSUPPORTED_TYPE");
      return;
    }
    setFile(selected);
    const isPdf = selected.type === "application/pdf" || /\.pdf$/i.test(selected.name);
    if (isPdf) {
      setCounting(true);
      const pages = await countPdfPages(selected);
      setCounting(false);
      if (pages !== null) {
        setPageCount(pages);
        const withPages = validateGuestFile(selected, pages);
        if (!withPages.valid) {
          setFile(null);
          setErrorKey(withPages.code ?? "TOO_MANY_PAGES");
        }
      }
    }
  }

  async function pollJob(jobId: string) {
    if (!aliveRef.current) return;
    try {
      const res = await apiFetch(`/api/tools/guest/jobs/${jobId}`);
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        const code = String(body?.error?.code ?? "GUEST_JOB_READ_FAILED");
        // A 429 means the request budget ran out, not that the job died; obey the
        // server's Retry-After and keep waiting.
        if (res.status === 429 && transientPolls.current < POLL_MAX_TRANSIENT) {
          transientPolls.current += 1;
          const wait = Number(res.headers.get("Retry-After")) * 1000;
          schedulePoll(jobId, Number.isFinite(wait) && wait > 0 ? wait : POLL_BACKOFF_FLOOR_MS);
          return;
        }
        if (transientPolls.current < POLL_MAX_TRANSIENT) {
          transientPolls.current += 1;
          schedulePoll(jobId, POLL_BACKOFF_FLOOR_MS * 2 ** transientPolls.current);
          return;
        }
        setPhase({ kind: "error", code, message: String(body?.error?.message ?? "") });
        return;
      }
      transientPolls.current = 0;
      const view = body as GuestJobView;
      if (view.status === "completed") {
        stopPolling();
        setPhase({ kind: "done", jobId, view });
        return;
      }
      if (view.status === "failed") {
        stopPolling();
        setPhase({
          kind: "error",
          code: view.error?.code ?? "PROCESSING_FAILED",
          message: view.error?.message ?? "",
        });
        return;
      }
      setPhase({ kind: "running", jobId, status: view.status, progress: view.progress });
      schedulePoll(jobId, POLL_INTERVAL_MS);
    } catch {
      // Network blip: back off and retry rather than reporting a failure the
      // server never produced.
      if (transientPolls.current < POLL_MAX_TRANSIENT) {
        transientPolls.current += 1;
        schedulePoll(jobId, POLL_BACKOFF_FLOOR_MS * 2 ** transientPolls.current);
        return;
      }
      stopPolling();
      setPhase({ kind: "error", code: "NETWORK", message: "" });
    }
  }

  async function submitText() {
    if (!text.trim()) return;
    stopPolling();
    setPhase({ kind: "uploading" });
    const form = new FormData();
    form.append("text", text);
    form.append("tool", tool.id);
    try {
      const res = await apiFetch("/api/tools/guest/jobs", { method: "POST", body: form });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setPhase({
          kind: "error",
          code: String(body?.error?.code ?? "GUEST_JOB_CREATE_FAILED"),
          message: String(body?.error?.message ?? ""),
          retryAfterMs: res.headers.get("Retry-After")
            ? Number(res.headers.get("Retry-After")) * 1000
            : undefined,
        });
        return;
      }
      const jobId = String(body?.job?.jobId ?? "");
      if (!jobId) {
        setPhase({ kind: "error", code: "GUEST_JOB_CREATE_FAILED", message: "" });
        return;
      }
      transientPolls.current = 0;
      setPhase({ kind: "running", jobId, status: "queued", progress: 0 });
      schedulePoll(jobId, POLL_INTERVAL_MS);
    } catch {
      setPhase({ kind: "error", code: "NETWORK", message: "" });
    }
  }

  async function submit() {
    if (!file) return;
    stopPolling();
    setPhase({ kind: "uploading" });
    const form = new FormData();
    form.append("file", file);
    form.append("tool", tool.id);
    try {
      const res = await apiFetch("/api/tools/guest/jobs", { method: "POST", body: form });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setPhase({
          kind: "error",
          code: String(body?.error?.code ?? "GUEST_JOB_CREATE_FAILED"),
          message: String(body?.error?.message ?? ""),
          retryAfterMs: res.headers.get("Retry-After")
            ? Number(res.headers.get("Retry-After")) * 1000
            : undefined,
        });
        return;
      }
      const jobId = String(body?.job?.jobId ?? "");
      if (!jobId) {
        setPhase({ kind: "error", code: "GUEST_JOB_CREATE_FAILED", message: "" });
        return;
      }
      transientPolls.current = 0;
      setPhase({ kind: "running", jobId, status: "queued", progress: 0 });
      schedulePoll(jobId, POLL_INTERVAL_MS);
    } catch {
      setPhase({ kind: "error", code: "NETWORK", message: "" });
    }
  }

  const err = errorMessage(errorKey);
  const isSidecar = tool.status === "sidecar-pending";

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <Link
        href="/tools"
        className="text-sm font-medium text-muted-color no-underline transition-colors hover:text-primary-color"
      >
        {t("back")}
      </Link>

      <header>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-extrabold text-primary-color sm:text-3xl">{name}</h1>
          <Badge variant="success">{t("noAccountBadge")}</Badge>
        </div>
        <p className="text-sm leading-relaxed text-secondary-color sm:text-base">{tagline}</p>
      </header>

      {isSidecar ? (
        <section className="rounded-brand-lg border border-gold-border bg-gold-bg p-5 text-sm leading-relaxed text-gold">
          {t("guest.sidecarPending")}
        </section>
      ) : tool.acceptsText && !tool.acceptsFiles ? (
        <section className="rounded-brand-lg border border-line bg-card p-5">
          <label htmlFor="guest-text" className="mb-2 block text-sm font-semibold">
            {t("upload.label")}
          </label>
          <textarea
            id="guest-text"
            value={text}
            onChange={(e) => {
              stopPolling();
              setPhase({ kind: "idle" });
              setText(e.target.value);
            }}
            rows={8}
            dir="auto"
            className="block w-full rounded-brand-md border border-line p-4 text-sm"
          />
          <button
            type="button"
            disabled={!text.trim() || phase.kind === "uploading" || phase.kind === "running"}
            onClick={() => void submitText()}
            className="landing-btn-primary mt-4 w-full rounded-brand-md px-4 py-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50"
          >
            {phase.kind === "uploading" ? t("guest.uploading") : cta}
          </button>
          {phase.kind === "running" && (
            <p className="mt-3 text-sm text-secondary-color">
              {phase.status === "queued" ? t("guest.statusQueued") : t("guest.statusProcessing")}
            </p>
          )}
          {phase.kind === "error" && (
            <p
              className="mt-4 rounded-brand-md bg-danger-bg p-4 text-sm font-medium leading-relaxed text-danger"
              role="alert"
            >
              {guestErrorText(t, phase)}
            </p>
          )}
        </section>
      ) : (
        <section className="rounded-brand-lg border border-line bg-card p-5">
          <label htmlFor="guest-file" className="mb-2 block text-sm font-semibold">
            {t("upload.label")}
          </label>
          <input
            id="guest-file"
            type="file"
            accept={
              tool.id === "transcription"
                ? ".mp3,.wav,.m4a,.ogg,audio/mpeg,audio/wav,audio/mp4,audio/ogg"
                : ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
            }
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            className="block w-full rounded-brand-md border border-dashed border-line p-4 text-sm"
          />
          <p className="mt-2 text-xs leading-relaxed text-secondary-color">
            {t("upload.limitsHint")}
          </p>

          {counting && (
            <p className="mt-3 text-sm text-secondary-color">{t("upload.countingPages")}</p>
          )}
          {file && !err && (
            <p className="mt-3 text-sm text-secondary-color">
              {t("upload.selectedFile", { name: file.name, size: formatBytes(file.size) })}
              {pageCount !== null && ` · ${t("upload.pagesDetected", { count: pageCount })}`}
            </p>
          )}
          {err && (
            <p
              role="alert"
              className="mt-3 rounded-brand-md bg-danger-bg p-3 text-sm font-medium text-danger"
            >
              {err}
            </p>
          )}

          <div className="mt-4 rounded-brand-md bg-hover p-4">
            <h2 className="mb-1 text-sm font-bold">{t("guest.queueTitle")}</h2>
            <p className="text-sm leading-relaxed text-secondary-color">
              {t("guest.queueBody")} ({GUEST_TOOLS_LIMITS.maxFileSizeMB}MB /{" "}
              {GUEST_TOOLS_LIMITS.maxPages}p)
            </p>
          </div>

          <button
            type="button"
            disabled={!file || counting || phase.kind === "uploading" || phase.kind === "running"}
            onClick={() => void submit()}
            className="landing-btn-primary mt-4 w-full rounded-brand-md px-4 py-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50"
          >
            {phase.kind === "uploading" ? t("guest.uploading") : cta}
          </button>
          {phase.kind === "running" && (
            <div className="mt-3 rounded-brand-md bg-hover p-4">
              <p className="text-sm font-medium">
                {phase.status === "queued" ? t("guest.statusQueued") : t("guest.statusProcessing")}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-secondary-color">
                {t("guest.runningHint")}
              </p>
              <div
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={phase.progress}
                className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-black/10"
              >
                <div
                  className="h-full rounded-full bg-primary-color transition-[width] duration-700"
                  style={{ width: `${Math.max(4, Math.min(100, phase.progress))}%` }}
                />
              </div>
            </div>
          )}
          {phase.kind === "error" && (
            <div className="mt-4" role="alert">
              <p className="rounded-brand-md bg-danger-bg p-4 text-sm font-medium leading-relaxed text-danger">
                {guestErrorText(t, phase)}
              </p>
              {phase.retryAfterMs !== undefined && (
                <p className="mt-2 text-xs text-secondary-color">
                  {t("guest.retryInSeconds", {
                    seconds: Math.max(1, Math.round(phase.retryAfterMs / 1000)),
                  })}
                </p>
              )}
              <button
                type="button"
                onClick={() => void submit()}
                className="mt-2 text-sm font-semibold text-primary-color underline-offset-4 hover:underline"
              >
                {t("guest.retry")}
              </button>
            </div>
          )}
        </section>
      )}

      <p className="text-xs leading-relaxed text-secondary-color">{t("guest.readOnlyNote")}</p>

      <ReadOnlyResult
        text={phase.kind === "done" ? (phase.view.result?.text ?? null) : null}
        downloads={
          phase.kind === "done"
            ? {
                jobId: phase.jobId,
                route: phase.view.result?.route,
                engine: phase.view.result?.engine,
                docxAvailable: true,
              }
            : null
        }
      />
    </div>
  );
}
