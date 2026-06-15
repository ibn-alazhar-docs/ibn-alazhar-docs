"use client";

import { ThemeProvider } from "@/components/theme/theme-provider";
import { DirectionProvider } from "@/components/locale/direction-provider";
import type { ReactNode } from "react";

export function ThemeWrapper({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <DirectionProvider>{children}</DirectionProvider>
    </ThemeProvider>
  );
}
