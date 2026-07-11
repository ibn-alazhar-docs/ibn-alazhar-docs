import type { ReactNode } from "react";
import { cn } from "@/ui/cn";

type TextSize = "xs" | "sm" | "base" | "lg";
type TextWeight = "normal" | "medium" | "bold";
type TextColor = "default" | "muted" | "primary" | "error";

interface TextProps {
  children: ReactNode;
  size?: TextSize;
  weight?: TextWeight;
  color?: TextColor;
  className?: string;
  as?: "p" | "span" | "div" | "label" | "small" | "blockquote" | "pre" | "code";
}

const sizeMap: Record<TextSize, string> = {
  xs: "text-xs",
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
};

const weightMap: Record<TextWeight, string> = {
  normal: "font-normal",
  medium: "font-medium",
  bold: "font-bold",
};

const colorMap: Record<TextColor, string> = {
  default: "text-primary-color",
  muted: "text-muted-color",
  primary: "text-primary-color",
  error: "text-[var(--danger)]",
};

export function Text({
  children,
  size = "base",
  weight = "normal",
  color = "default",
  className,
  as: Tag = "p",
}: TextProps) {
  return (
    <Tag className={cn(sizeMap[size], weightMap[weight], colorMap[color], className)}>
      {children}
    </Tag>
  );
}
