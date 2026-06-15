import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface SectionProps {
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "article" | "aside";
  padding?: "none" | "sm" | "md" | "lg";
}

const paddingMap = {
  none: "",
  sm: "py-6",
  md: "py-12",
  lg: "py-20",
};

export function Section({
  children,
  className,
  as: Tag = "section",
  padding = "md",
}: SectionProps) {
  return <Tag className={cn(paddingMap[padding], className)}>{children}</Tag>;
}
