import { LoadingShell } from "@/ui/loading-shell";

export default function LocaleLoading() {
  return (
    <LoadingShell>
      <div className="size-8 animate-spin rounded-full border-4 border-line border-t-btn-primary" />
    </LoadingShell>
  );
}
