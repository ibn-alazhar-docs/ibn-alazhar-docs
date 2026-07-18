"use client";

import { useTranslations } from "next-intl";
import { ConversionStatus } from "@/ui/pipeline/conversion-status";

export interface ActiveJob {
  jobId: string;
  fileName: string;
}

interface ActiveJobsProps {
  jobs: ActiveJob[];
  completedIds: string[];
  locale: string;
  onMarkComplete: (jobId: string) => void;
}

export function ActiveJobs({ jobs, completedIds, locale, onMarkComplete }: ActiveJobsProps) {
  const tDocs = useTranslations("documents");
  const tPreview = useTranslations("pipeline.preview");

  if (jobs.length === 0) return null;

  return (
    <div>
      <h3 className="text-lg font-semibold text-primary-color">{tDocs("activeJobs")}</h3>
      <div className="mt-4 space-y-4">
        {jobs.map((job) => (
          <div
            key={job.jobId}
            className="glass-panel rounded-xl p-6 relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[var(--success-bg)] to-transparent opacity-0 group-hover:opacity-10 transition-opacity duration-1000" />
            <div className="mb-4 flex items-center justify-between gap-4 relative z-10">
              <h4 className="truncate font-medium text-primary-color">{job.fileName}</h4>
              <span className="shrink-0 font-mono text-xs text-very-muted bg-[var(--surface)] px-2 py-1 rounded-md border border-[var(--border-subtle)]">
                {job.jobId?.slice(0, 8)}
              </span>
            </div>
            <div className="relative z-10">
              <ConversionStatus jobId={job.jobId} onComplete={onMarkComplete} />
            </div>
            {completedIds.includes(job.jobId) && (
              <div className="mt-4 border-t border-[var(--border-subtle)] pt-4 flex justify-end relative z-10">
                <a
                  href={`/${locale}/preview/${job.jobId}`}
                  className="inline-block rounded-lg bg-[var(--success)] px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--btn-shadow)] transition-all hover:hover-lift hover:opacity-90 pulse-glow"
                >
                  {tPreview("previewAndExport")}
                </a>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
