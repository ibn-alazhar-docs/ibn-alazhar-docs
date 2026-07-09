"use client";

import { ThemeProvider } from "@/ui/theme/theme-provider";
import { DirectionProvider } from "@/ui/locale/direction-provider";
import type { ReactNode } from "react";

export function ThemeWrapper({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <DirectionProvider>{children}</DirectionProvider>
    </ThemeProvider>
  );
}
