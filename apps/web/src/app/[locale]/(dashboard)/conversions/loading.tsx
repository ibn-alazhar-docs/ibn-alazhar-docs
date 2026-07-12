import { SkeletonTable } from "@/ui/skeleton";
import { Container } from "@/ui/container";

export default function ConversionsLoading() {
  return (
    <Container>
      <div className="min-h-[calc(100dvh-4rem)] space-y-6 p-6">
        <div className="space-y-1">
          <div className="h-7 w-40 animate-pulse rounded bg-muted" />
          <div className="h-4 w-56 animate-pulse rounded bg-muted" />
        </div>
        <SkeletonTable rows={6} />
      </div>
    </Container>
  );
}
