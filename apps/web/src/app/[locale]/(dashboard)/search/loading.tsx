export default function SearchLoading() {
  return (
    <div className="space-y-6 p-6">
      <div className="space-y-1">
        <div className="h-7 w-32 animate-pulse rounded bg-muted" />
        <div className="h-4 w-64 animate-pulse rounded bg-muted" />
      </div>
      <div className="h-12 w-full animate-pulse rounded-xl bg-muted" />
      <div className="flex gap-6">
        <div className="hidden md:block w-64 space-y-4">
          <div className="h-5 w-20 animate-pulse rounded bg-muted" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-8 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
        <div className="flex-1 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-line bg-card p-4 space-y-2">
              <div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
              <div className="flex gap-2">
                <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
                <div className="h-5 w-12 animate-pulse rounded-full bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
