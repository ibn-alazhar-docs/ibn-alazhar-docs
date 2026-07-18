"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { STAGE_ORDER, normalizeStage, type Stage } from "@/shared/conversion-status-utils";

interface ConversionStatusProps {
  jobId: string;
  onComplete?: (jobId: string) => void;
}

export function ConversionStatus({ jobId, onComplete }: ConversionStatusProps) {
  const t = useTranslations("pipeline.status");
  const [stage, setStage] = useState<Stage>("pending");
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 3;

  useEffect(() => {
    if (!jobId) return;

    let fallbackInterval: NodeJS.Timeout | undefined;
    let eventSource: EventSource | undefined;
    let closed = false;

    const cleanup = () => {
      closed = true;
      if (eventSource) {
        eventSource.close();
        eventSource = undefined;
      }
      if (fallbackInterval) {
        clearInterval(fallbackInterval);
        fallbackInterval = undefined;
      }
    };

    const startSSE = () => {
      if (closed) return;

      console.log(`[sse] connecting for jobId=${jobId} (attempt ${retryCountRef.current + 1})`);
      eventSource = new EventSource(`/api/stream?jobId=${encodeURIComponent(jobId)}`, {
        withCredentials: true,
      });

      eventSource.onopen = () => {
        console.log("[sse] connected");
        retryCountRef.current = 0;
        setErrorMsg(null);
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("[sse] message:", data.type, data.stage, data.progress);
          if (data.type === "progress" && data.stage) {
            setStage(normalizeStage(data.stage));
            setProgress(typeof data.progress === "number" ? data.progress : 0);
          }
          if (data.type === "complete") {
            const finalStage = normalizeStage(data.status ?? "completed");
            setStage(finalStage);
            setProgress(100);
            cleanup();
            onComplete?.(jobId);
          }
          if (data.type === "timeout") {
            console.warn("[sse] server timeout:", data.message);
            cleanup();
            setErrorMsg(data.message || "انتهت مهلة الاتصال");
          }
          if (data.type === "warning") {
            console.warn("[sse] server warning:", data.message);
          }
        } catch (parseErr) {
          console.warn("[sse] failed to parse message:", parseErr);
        }
      };

      eventSource.onerror = () => {
        console.warn(`[sse] error (attempt ${retryCountRef.current + 1})`);
        if (closed) return;
        eventSource?.close();
        eventSource = undefined;

        if (retryCountRef.current < MAX_RETRIES) {
          retryCountRef.current++;
          const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 10000);
          console.log(`[sse] retrying in ${delay}ms...`);
          setTimeout(() => startSSE(), delay);
          return;
        }

        console.log("[sse] max retries reached, starting fallback polling");
        startFallbackPolling();
      };
    };

    const startFallbackPolling = () => {
      if (closed || fallbackInterval) return;

      fallbackInterval = setInterval(async () => {
        try {
          const res = await fetch(`/api/conversion/${encodeURIComponent(jobId)}/status`, {
            credentials: "include",
          });

          console.log("[poll] status:", res.status);

          if (res.status === 401 || res.status === 403 || res.status === 429) {
            cleanup();
            setErrorMsg(res.status === 401 ? "يجب تسجيل الدخول" : "تم تجاوز الحد المسموح");
            return;
          }

          if (res.ok) {
            const data = await res.json();
            console.log("[poll] data:", data.status, data.progress);
            setStage(normalizeStage(data.status));
            setProgress(typeof data.progress === "number" ? data.progress : 0);
            const s = normalizeStage(data.status);
            if (s === "completed" || s === "failed") {
              cleanup();
              if (s === "completed") {
                onComplete?.(jobId);
              }
            }
          }
        } catch (pollErr) {
          console.warn("[poll] error:", pollErr);
        }
      }, 3000);
    };

    startSSE();

    return cleanup;
  }, [jobId, onComplete]);

  const currentIdx = STAGE_ORDER.indexOf(stage);
  const isCompleted = stage === "completed";
  const isFailed = stage === "failed";

  const barWidth = isCompleted
    ? 100
    : isFailed
      ? 100
      : progress > 0
        ? Math.max(5, Math.min(progress, 99))
        : Math.max(5, (currentIdx / (STAGE_ORDER.length - 1)) * 100);

  return (
    <div className="space-y-4">
      {/* Progress Bar */}
      <div className="h-3 bg-badge rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${isFailed ? "bg-danger" : "bg-success"}`}
          style={{ width: `${barWidth}%` }}
        />
      </div>

      {/* Status Text */}
      <div className="text-center">
        <p
          className={`text-lg font-bold tracking-tight ${isFailed ? "text-danger" : "premium-gradient-text"}`}
        >
          {isFailed ? t("failed") : isCompleted ? t("completed") : t(stage)}
        </p>
        {errorMsg && <p className="mt-2 text-xs text-danger">{errorMsg}</p>}
        {!isCompleted && !isFailed && !errorMsg && (
          <div className="mt-2 flex flex-col items-center gap-1">
            <span className="text-sm font-semibold text-primary-color bg-[var(--surface)] px-2 py-0.5 rounded-full border border-[var(--border-subtle)]">
              {progress > 0 ? `${Math.round(progress)}%` : "0%"}
            </span>
            {stage === "ocr" && (
              <p className="text-[11px] text-muted-color animate-pulse mt-1">
                (قد تستغرق هذه الخطوة بضع دقائق حسب حجم الملف)
              </p>
            )}
            {stage === "pending" && progress === 0 && (
              <p className="text-[11px] text-muted-color animate-pulse mt-1">
                (في انتظار بدء المعالجة...)
              </p>
            )}
          </div>
        )}
      </div>

      {/* Stage Timeline */}
      <div className="space-y-2">
        {STAGE_ORDER.map((s, i) => {
          const isActive = i === currentIdx;
          const isDone = isCompleted || i < currentIdx;

          return (
            <div key={s} className="flex items-center gap-3">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  isDone
                    ? "bg-success text-btn-primary-text"
                    : isActive
                      ? "bg-success-bg text-success border-2 border-success"
                      : "bg-badge text-muted-color"
                }`}
              >
                {isDone ? "✓" : isActive ? "●" : i + 1}
              </div>
              <span
                className={`text-sm ${
                  isDone
                    ? "text-muted-color"
                    : isActive
                      ? "text-success font-medium"
                      : "text-very-muted"
                }`}
              >
                {t(s)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
