export default function AnalyticsLoading() {
  return (
    <div className="page-content-transition min-h-[calc(100dvh-4rem)]">
      <div className="animate-pulse space-y-6 p-6">
        <div className="flex min-h-[52px] items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-40 rounded-lg bg-[var(--hover-bg)]" />
            <div className="h-4 w-56 rounded bg-[var(--hover-bg)]" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-28 rounded-lg bg-[var(--hover-bg)]" />
            <div className="h-9 w-9 rounded-lg bg-[var(--hover-bg)]" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="min-h-[132px] rounded-xl border border-line bg-card p-5 shadow-[var(--shadow-sm)]"
            >
              <div className="mb-3 flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-[var(--hover-bg)]" />
                <div className="h-3 w-24 rounded bg-[var(--hover-bg)]" />
              </div>
              <div className="h-8 w-20 rounded bg-[var(--hover-bg)]" />
              <div className="mt-2 h-4 w-28 rounded bg-[var(--hover-bg)]" />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="min-h-[320px] rounded-xl border border-line bg-card p-6 shadow-[var(--shadow-sm)]"
            >
              <div className="mb-6 h-5 w-40 rounded bg-[var(--hover-bg)]" />
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((__, j) => (
                  <div key={j} className="h-5 rounded-full bg-[var(--hover-bg)]" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
