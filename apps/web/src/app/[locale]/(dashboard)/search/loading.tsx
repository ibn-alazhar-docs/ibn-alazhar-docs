import { Container } from "@/ui/container";
import { Card } from "@/ui/card";

export default function SearchLoading() {
  return (
    <Container>
      <div className="space-y-6 p-6">
        <div className="space-y-1">
          <div className="h-7 w-32 animate-pulse rounded bg-muted" />
          <div className="h-4 w-64 animate-pulse rounded bg-muted" />
        </div>
        <div className="flex flex-col gap-6 md:flex-row">
          {/* Sidebar — visible at all breakpoints to match the real page */}
          <div className="w-full shrink-0 md:w-64">
            <Card className="space-y-3 p-4">
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-8 animate-pulse rounded-lg bg-muted" />
              ))}
            </Card>
          </div>

          {/* Main content */}
          <div className="min-w-0 flex-1 space-y-6">
            <Card className="p-4">
              <div className="h-12 w-full animate-pulse rounded-xl bg-muted" />
            </Card>

            {/* Empty-state placeholder — matches the real no-query layout */}
            <div className="py-12 text-center">
              <div className="mx-auto mb-4 h-12 w-12 animate-pulse rounded-full bg-muted" />
              <div className="mx-auto h-4 w-64 animate-pulse rounded bg-muted" />
            </div>
          </div>
        </div>
      </div>
    </Container>
  );
}
