import type { ReactNode } from "react";
import { ViewTransition } from "react";

interface PageTransitionProps {
  children: ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  return (
    <ViewTransition name="page-content" enter="fade-in" exit="fade-out" default="none">
      <div className="min-h-[calc(100dvh-4rem)]">{children}</div>
    </ViewTransition>
  );
}
