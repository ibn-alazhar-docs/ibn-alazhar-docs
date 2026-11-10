import { Container } from "@/ui/container";
import { Section } from "@/ui/section";
import { Card } from "@/ui/card";

export default function FilesLoading() {
  return (
    <div className="page-content-transition min-h-[calc(100dvh-4rem)]">
      <Container>
        <Section padding="md">
          <div className="flex flex-col gap-6 lg:flex-row">
            {/* Sidebar — reserves the same w-64 column as the real page */}
            <div className="w-full shrink-0 lg:w-64">
              <div className="mb-3 h-9 animate-pulse rounded-lg bg-muted lg:hidden" />
              <Card className="space-y-4 p-3 sm:space-y-6 sm:p-4 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto">
                <div className="space-y-2">
                  <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-8 animate-pulse rounded-lg bg-muted" />
                  ))}
                </div>
                <div className="space-y-2 border-t border-line pt-3 sm:pt-4">
                  <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-7 animate-pulse rounded-full bg-muted" />
                  ))}
                </div>
              </Card>
            </div>

            {/* Main content */}
            <div className="min-w-0 flex-1 space-y-6">
              <div className="space-y-2">
                <div className="h-8 w-32 animate-pulse rounded bg-muted" />
                <div className="h-5 w-64 animate-pulse rounded bg-muted" />
              </div>

              <Card className="h-40 animate-pulse p-4 sm:p-6" />

              <div className="min-h-[280px]">
                <div className="mb-4 flex items-center justify-between">
                  <div className="h-6 w-32 animate-pulse rounded bg-muted" />
                </div>
                <Card className="overflow-x-auto">
                  <div className="min-h-[220px] p-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex gap-4 border-b border-line py-4 last:border-0">
                        <div className="h-4 w-4 animate-pulse rounded bg-muted" />
                        <div className="h-4 flex-1 animate-pulse rounded bg-muted" />
                        <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                        <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </Section>
      </Container>
    </div>
  );
}
