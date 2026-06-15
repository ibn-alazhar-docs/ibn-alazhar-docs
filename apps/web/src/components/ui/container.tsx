import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type ContainerSize = "sm" | "md" | "lg" | "xl" | "full";

interface ContainerProps {
  children: ReactNode;
  size?: ContainerSize;
  className?: string;
  as?: "div" | "section" | "main" | "article" | "header" | "footer";
}

const maxWidth: Record<ContainerSize, string> = {
  sm: "max-w-3xl",
  md: "max-w-5xl",
  lg: "max-w-7xl",
  xl: "max-w-[90rem]",
  full: "max-w-full",
};

export function Container({ children, size = "lg", className, as: Tag = "div" }: ContainerProps) {
  return (
    <Tag className={cn("mx-auto px-4 sm:px-6 lg:px-8", maxWidth[size], className)}>{children}</Tag>
  );
}
