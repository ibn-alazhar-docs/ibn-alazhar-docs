import { LoadingShell } from "@/ui/loading-shell";

export default function AnalyticsLoading() {
  return (
    <LoadingShell area="content">
      <div className="flex flex-col items-center gap-4">
        <div className="size-8 animate-spin rounded-full border-4 border-line border-t-btn-primary" />
        <p className="text-sm text-muted-color">جارٍ تحميل التحليلات...</p>
      </div>
    </LoadingShell>
  );
}
