import { Container } from "@/ui/container";

export default function TagsLoading() {
  return (
    <Container>
      <div className="min-h-[calc(100dvh-4rem)] space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="h-7 w-32 animate-pulse rounded bg-muted" />
            <div className="h-4 w-48 animate-pulse rounded bg-muted" />
          </div>
          <div className="h-9 w-28 animate-pulse rounded-lg bg-muted" />
        </div>
        <div className="flex flex-wrap gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="h-9 animate-pulse rounded-full bg-muted"
              style={{ width: `${60 + (i % 4) * 20}px` }}
            />
          ))}
        </div>
      </div>
    </Container>
  );
}
