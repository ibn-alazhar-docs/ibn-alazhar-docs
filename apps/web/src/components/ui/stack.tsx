import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type StackGap = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12 | 16;

interface StackProps {
  children: ReactNode;
  gap?: StackGap;
  className?: string;
  as?: "div" | "section" | "main" | "article" | "nav" | "form";
}

const gapValues: Record<StackGap, string> = {
  0: "gap-0",
  1: "gap-1",
  2: "gap-2",
  3: "gap-3",
  4: "gap-4",
  5: "gap-5",
  6: "gap-6",
  8: "gap-8",
  10: "gap-10",
  12: "gap-12",
  16: "gap-16",
};

export function Stack({ children, gap = 4, className, as: Tag = "div" }: StackProps) {
  return <Tag className={cn("flex flex-col", gapValues[gap], className)}>{children}</Tag>;
}
