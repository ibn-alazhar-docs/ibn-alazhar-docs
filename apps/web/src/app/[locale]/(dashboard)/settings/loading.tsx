import { Container } from "@/ui/container";

export default function SettingsLoading() {
  return (
    <Container>
      <div className="min-h-[calc(100dvh-4rem)] space-y-6 p-6">
        <div className="space-y-1">
          <div className="h-7 w-32 animate-pulse rounded bg-muted" />
          <div className="h-4 w-48 animate-pulse rounded bg-muted" />
        </div>
        <div className="max-w-2xl space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-line bg-card p-4 space-y-3">
              <div className="h-4 w-1/4 animate-pulse rounded bg-muted" />
              <div className="h-10 w-full animate-pulse rounded-lg bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </Container>
  );
}
