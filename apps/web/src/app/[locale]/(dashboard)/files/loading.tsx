import { SkeletonTable } from "@/ui/skeleton";
import { Container } from "@/ui/container";
import { Section } from "@/ui/section";
import { Card } from "@/ui/card";

export default function FilesLoading() {
  return (
    <Container>
      <Section padding="md">
        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Sidebar — reserves the same w-64 column as the real page */}
          <div className="w-full shrink-0 lg:w-64">
            <Card className="space-y-6 p-4 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto">
              <div className="space-y-2">
                <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-8 animate-pulse rounded-lg bg-muted" />
                ))}
              </div>
              <div className="space-y-2 border-t border-line pt-4">
                <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-7 animate-pulse rounded-full bg-muted" />
                ))}
              </div>
            </Card>
          </div>

          {/* Main content */}
          <div className="min-w-0 flex-1 space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="h-7 w-32 animate-pulse rounded bg-muted" />
                <div className="h-4 w-48 animate-pulse rounded bg-muted" />
              </div>
              <div className="flex gap-2">
                <div className="h-9 w-24 animate-pulse rounded-lg bg-muted" />
                <div className="h-9 w-20 animate-pulse rounded-lg bg-muted" />
              </div>
            </div>
            <SkeletonTable rows={8} />
          </div>
        </div>
      </Section>
    </Container>
  );
}
