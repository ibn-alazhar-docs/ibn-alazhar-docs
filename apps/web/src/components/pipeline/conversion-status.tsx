"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { STAGE_ORDER, normalizeStage, type Stage } from "@/lib/shared/conversion-status-utils";

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
        // Ignore parse errors
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
          // Ignore
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
          className={`h-full transition-all duration-500 ${isFailed ? "bg-[var(--danger)]" : "bg-[var(--success)]"}`}
          style={{ width: `${barWidth}%` }}
        />
      </div>

      {/* Status Text */}
      <div className="text-center">
        <p
          className={`text-lg font-medium ${isFailed ? "text-[var(--danger)]" : "text-[var(--success)]"}`}
        >
          {isFailed ? "Failed" : isCompleted ? "Done" : t(stage)}
        </p>
        {!isCompleted && !isFailed && (
          <p className="text-sm text-muted-color mt-1">
            {progress > 0 && `${Math.round(progress)}%`}
          </p>
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
                    ? "bg-[var(--success)] text-[var(--btn-primary-text)]"
                    : isActive
                      ? "bg-[var(--success-bg)] text-[var(--success)] border-2 border-[var(--success)]"
                      : "bg-[var(--badge-bg)] text-[var(--text-muted)]"
                }`}
              >
                {isDone ? "✓" : isActive ? "●" : i + 1}
              </div>
              <span
                className={`text-sm ${
                  isDone
                    ? "text-muted-color"
                    : isActive
                      ? "text-[var(--success)] font-medium"
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
