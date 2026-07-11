export default function DashboardLoading() {
  return (
    <div className="flex min-h-[60dvh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="size-8 animate-spin rounded-full border-4 border-line border-t-btn-primary" />
        <p className="text-sm text-muted-color">جارٍ التحميل...</p>
      </div>
    </div>
  );
}
