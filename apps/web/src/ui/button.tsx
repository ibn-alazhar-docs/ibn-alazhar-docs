import * as React from "react";
import { cn } from "@/ui/cn";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "default"
    | "destructive"
    | "destructive-outline"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  size?: "default" | "sm" | "lg" | "icon";
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", asChild = false, ...props }, ref) => {
    const classNameComputed = cn(
      "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:pointer-events-none cursor-pointer",
      variant === "default" && "bg-primary text-primary-foreground hover:bg-primary/90",
      variant === "destructive" &&
        "bg-destructive text-destructive-foreground hover:bg-destructive/90",
      variant === "destructive-outline" &&
        "border border-danger/40 bg-transparent text-danger hover:bg-danger hover:text-white",
      variant === "outline" && "border border-line bg-background hover:bg-muted/50",
      variant === "secondary" && "bg-secondary text-secondary-foreground hover:bg-secondary/80",
      variant === "ghost" && "hover:bg-muted/50",
      variant === "link" && "text-primary underline-offset-4 hover:underline",
      size === "default" && "h-11 px-4 py-2",
      size === "sm" && "h-9 px-3",
      size === "lg" && "h-12 px-8",
      size === "icon" && "h-11 w-11",
      className,
    );

    if (asChild) {
      const child = React.Children.only(props.children) as React.ReactElement<{
        className?: string;
        children?: React.ReactNode;
        [key: string]: unknown;
      }>;
      return React.cloneElement(child, {
        className: cn(classNameComputed, child.props.className),
        ...props,
        children: child.props.children,
      });
    }

    return <button className={classNameComputed} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";
