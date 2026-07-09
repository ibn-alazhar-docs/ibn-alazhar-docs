import { SkeletonTable } from "@/ui/skeleton";

export default function UsersLoading() {
  return (
    <div className="space-y-6 p-6">
      <div className="space-y-1">
        <div className="h-7 w-32 animate-pulse rounded bg-muted" />
        <div className="h-4 w-48 animate-pulse rounded bg-muted" />
      </div>
      <SkeletonTable rows={5} />
    </div>
  );
}
