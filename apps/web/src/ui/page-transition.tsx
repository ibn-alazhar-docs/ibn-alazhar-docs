import type { ReactNode } from "react";
import { ViewTransition } from "react";

interface PageTransitionProps {
  children: ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  return (
    <ViewTransition enter="fade-in" exit="fade-out" default="none">
      {children}
    </ViewTransition>
  );
}
