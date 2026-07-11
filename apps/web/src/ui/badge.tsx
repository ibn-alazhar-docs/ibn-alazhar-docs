import * as React from "react";
import { cn } from "@/ui/cn";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        variant === "default" &&
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        variant === "secondary" &&
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        variant === "destructive" &&
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        variant === "outline" && "text-foreground border-line",
        variant === "success" &&
          "border-transparent bg-green-500/15 text-green-700 dark:text-green-400",
        variant === "warning" &&
          "border-transparent bg-yellow-500/15 text-yellow-700 dark:text-yellow-400",
        variant === "info" && "border-transparent bg-blue-500/15 text-blue-700 dark:text-blue-400",
        className,
      )}
      {...props}
    />
  );
}
