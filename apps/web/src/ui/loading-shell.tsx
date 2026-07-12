import type { ReactNode } from "react";
import { Container } from "@/ui/container";
import { cn } from "@/ui/cn";

interface LoadingShellProps {
  children: ReactNode;
  className?: string;
  area?: "full" | "content";
}

// Wraps loading UI in the same horizontal container as real pages and reserves a
// stable height so swapping the spinner/skeleton for real content never shifts layout.
// - "full": top-level segments with no chrome (root / locale / auth)
// - "content": dashboard content area (under the persistent h-16 header)
export function LoadingShell({ children, className, area = "full" }: LoadingShellProps) {
  return (
    <Container>
      <div
        className={cn(
          area === "content" ? "min-h-[calc(100dvh-4rem)]" : "min-h-[100dvh]",
          "flex items-center justify-center py-6",
          className,
        )}
      >
        {children}
      </div>
    </Container>
  );
}
