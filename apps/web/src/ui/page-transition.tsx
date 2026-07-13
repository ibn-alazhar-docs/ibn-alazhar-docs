import type { ReactNode } from "react";


interface PageTransitionProps {
  children: ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  return (
    <div style={{ viewTransitionName: "page-content" }} className="min-h-[calc(100dvh-4rem)]">
      {children}
    </div>
  );
}
