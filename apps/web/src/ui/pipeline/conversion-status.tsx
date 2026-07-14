"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    const eventSource = new EventSource(`/api/stream?jobId=${jobId}`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "progress" && data.stage) {
          setStage(normalizeStage(data.stage));
          setProgress(typeof data.progress === "number" ? data.progress : 0);
        }
        if (data.type === "complete") {
          const finalStage = normalizeStage(data.status ?? "completed");
          setStage(finalStage);
          setProgress(100);
          onComplete?.(jobId);
        }
      } catch {
        // Safe to swallow: error handled gracefully by UI state parse errors
      }
    };

    let fallbackInterval: NodeJS.Timeout | undefined;

    eventSource.onerror = () => {
      if (fallbackInterval) return; // Prevent multiple intervals (DDoS protection)

      fallbackInterval = setInterval(async () => {
        try {
          const res = await fetch(`/api/conversion/${jobId}/status`);
          if (res.ok) {
            const data = await res.json();
            setStage(normalizeStage(data.status));
            setProgress(typeof data.progress === "number" ? data.progress : 0);
            const s = normalizeStage(data.status);
            if (s === "completed" || s === "failed") {
              if (fallbackInterval) clearInterval(fallbackInterval);
              if (s === "completed") {
                onComplete?.(jobId); // Fix UI hang
              }
            }
          }
        } catch {
          // Safe to swallow: error handled gracefully by UI state
        }
      }, 3000);
    };

    return () => {
      eventSource.close();
      if (fallbackInterval) clearInterval(fallbackInterval);
    };
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
        {!isCompleted && !isFailed && (
          <div className="mt-2 flex flex-col items-center gap-1">
            <span className="text-sm font-semibold text-primary-color bg-[var(--surface)] px-2 py-0.5 rounded-full border border-[var(--border-subtle)]">
              {progress > 0 ? `${Math.round(progress)}%` : "0%"}
            </span>
            {stage === "ocr" && (
              <p className="text-[11px] text-muted-color animate-pulse mt-1">
                (قد تستغرق هذه الخطوة بضع دقائق حسب حجم الملف)
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
