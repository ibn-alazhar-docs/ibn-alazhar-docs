import type { ReactNode } from "react";
import { cn } from "@/ui/cn";

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;
type HeadingColor = "default" | "primary" | "gold";

interface HeadingProps {
  children: ReactNode;
  level?: HeadingLevel;
  color?: HeadingColor;
  className?: string;
}

const tagMap: Record<HeadingLevel, "h1" | "h2" | "h3" | "h4" | "h5" | "h6"> = {
  1: "h1",
  2: "h2",
  3: "h3",
  4: "h4",
  5: "h5",
  6: "h6",
};

const styles: Record<HeadingLevel, string> = {
  1: "text-4xl leading-tight",
  2: "text-3xl leading-snug",
  3: "text-2xl leading-snug",
  4: "text-xl leading-normal",
  5: "text-lg leading-normal",
  6: "text-base leading-normal",
};

const colorMap: Record<HeadingColor, string> = {
  default: "text-primary-color",
  primary: "text-primary-color",
  gold: "text-gold",
};

export function Heading({ children, level = 1, color = "default", className }: HeadingProps) {
  const Tag = tagMap[level];
  return (
    <Tag className={cn("font-bold", styles[level], colorMap[color], className)}>{children}</Tag>
  );
}
