import type { ReactNode } from "react";
import { cn } from "@/ui/cn";

type StackGap = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12 | 16;
type StackAlign = "start" | "center" | "end" | "stretch" | "baseline";
type StackJustify = "start" | "center" | "end" | "between" | "around";

interface StackProps {
  children: ReactNode;
  gap?: StackGap;
  direction?: "row" | "col";
  align?: StackAlign;
  justify?: StackJustify;
  wrap?: boolean;
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

const alignValues: Record<StackAlign, string> = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
  baseline: "items-baseline",
};

const justifyValues: Record<StackJustify, string> = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
  around: "justify-around",
};

export function Stack({
  children,
  gap = 4,
  direction = "col",
  align,
  justify,
  wrap = false,
  className,
  as: Tag = "div",
}: StackProps) {
  return (
    <Tag
      className={cn(
        "flex",
        direction === "col" ? "flex-col" : "flex-row",
        gapValues[gap],
        align && alignValues[align],
        justify && justifyValues[justify],
        wrap && "flex-wrap",
        className,
      )}
    >
      {children}
    </Tag>
  );
}
