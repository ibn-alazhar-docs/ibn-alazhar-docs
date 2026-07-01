"use client";

import { cn } from "@/lib/frontend/cn";

interface TagChipProps {
  id: string;
  name: string;
  color: string;
  onClick?: () => void;
  onRemove?: () => void;
  size?: "sm" | "md";
  selected?: boolean;
  className?: string;
}

export function TagChip({
  name,
  color,
  onClick,
  onRemove,
  size = "sm",
  selected = false,
  className,
}: TagChipProps) {
  const sizeClasses = size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-3 py-1";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium transition-colors",
        sizeClasses,
        onClick && "cursor-pointer hover:opacity-80",
        selected && "ring-2 ring-offset-1 ring-primary-color",
        className,
      )}
      style={{
        backgroundColor: `${color}20`,
        color: color,
        borderColor: `${color}40`,
      }}
      onClick={onClick}
    >
      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
      {name}
      {onRemove && (
        <button
          type="button"
          className="ms-0.5 hover:opacity-60 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          ✕
        </button>
      )}
    </span>
  );
}
