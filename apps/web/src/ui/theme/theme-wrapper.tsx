"use client";

import { ThemeProvider } from "@/ui/theme/theme-provider";
import type { ReactNode } from "react";

export function ThemeWrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}
