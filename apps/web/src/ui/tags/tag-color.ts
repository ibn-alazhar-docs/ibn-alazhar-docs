import type React from "react";

/**
 * Shared tag-color inline styles (U08 parity extraction).
 * Values are byte-identical to the previous inline styles:
 * - chip container: background `${color}20`, text `color`, border `${color}40`
 * - dot / swatch: background `color`
 */
export function tagChipStyle(color: string): React.CSSProperties {
  return {
    backgroundColor: `${color}20`,
    color: color,
    borderColor: `${color}40`,
  };
}

export function tagDotStyle(color: string): React.CSSProperties {
  return { backgroundColor: color };
}
