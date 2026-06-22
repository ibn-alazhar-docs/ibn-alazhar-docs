"use client";

import { useTranslations } from "next-intl";
import { ConversionStatus } from "@/components/pipeline/conversion-status";

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
          <div key={job.jobId} className="bg-card rounded-xl border border-line p-6">
            <div className="mb-4 flex items-center justify-between">
              <h4 className="ms-4 truncate font-medium text-primary-color">{job.fileName}</h4>
              <span className="shrink-0 font-mono text-xs text-very-muted">
                {job.jobId.slice(0, 8)}...
              </span>
            </div>
            <ConversionStatus jobId={job.jobId} onComplete={onMarkComplete} />
            {completedIds.includes(job.jobId) && (
              <div className="mt-4 border-t border-line pt-4">
                <a
                  href={`/${locale}/preview/${job.jobId}`}
                  className="inline-block rounded-lg bg-[var(--success)] px-4 py-2 text-sm font-medium text-[var(--btn-primary-text)] transition-colors hover:opacity-90"
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
