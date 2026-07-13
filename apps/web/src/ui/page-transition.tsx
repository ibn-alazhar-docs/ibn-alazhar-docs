import type { ReactNode } from "react";


interface PageTransitionProps {
  children: ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  return (
    <div className="page-content-transition min-h-[calc(100dvh-4rem)]">
      {children}
    </div>
  );
}
