"use client";

import { useParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { PreviewToolbar } from "@/components/pipeline/preview-toolbar";
import { PreviewView } from "@/components/pipeline/preview-view";
import { ExportModal } from "@/components/pipeline/export-modal";
import { ShareModal } from "@/components/pipeline/share-modal";
import { Share2 } from "lucide-react";

interface JobInfo {
  fileName: string;
  status: string;
}

export default function PreviewPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations("pipeline.preview");
  const tExportModal = useTranslations("pipeline.exportModal");
  const tShareModal = useTranslations("shareModal");
  const tApp = useTranslations("app");
  const id = params.id as string;

  const [jobInfo, setJobInfo] = useState<JobInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  useEffect(() => {
    async function loadJob() {
      try {
        const res = await fetch(`/api/conversion/${id}/status`);
        if (res.ok) {
          const data = await res.json();
          setJobInfo({
            fileName: data.fileName ?? "document",
            status: data.status,
          });
        } else {
          setJobInfo({ fileName: "document", status: "unknown" });
        }
      } catch {
        setJobInfo({ fileName: "document", status: "unknown" });
      } finally {
        setLoading(false);
      }
    }
    loadJob();
  }, [id]);

  function handleBack() {
    router.push("/files");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="animate-spin text-4xl">
            <svg
              className="w-10 h-10 mx-auto text-muted-color"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </div>
          <p className="text-muted-color">{t("loadingPreview")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-badge flex flex-col">
      {/* Toolbar */}
      <PreviewToolbar jobId={id} fileName={jobInfo?.fileName ?? "document"} onBack={handleBack} />

      {/* Preview Content */}
      <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        <div className="bg-card rounded-xl border border-line p-6 sm:p-10 shadow-sm">
          <PreviewView jobId={id} />
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-line bg-card py-4 px-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <span className="text-xs text-very-muted">
            {tApp("name")} — {t("previewDocument")}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-badge border border-line text-primary-color rounded-md hover:bg-line transition-colors"
            >
              <Share2 className="h-3.5 w-3.5" />
              {tShareModal("title")}
            </button>
            <button
              onClick={() => setIsExportModalOpen(true)}
              className="px-3 py-1.5 text-xs font-medium bg-[var(--success)] text-[var(--btn-primary-text)] rounded-md hover:opacity-90 transition-colors"
            >
              {tExportModal("button")}
            </button>
          </div>
        </div>
      </div>

      <ExportModal
        documentId={id}
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />

      <ShareModal
        documentId={id}
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
      />
    </div>
  );
}
