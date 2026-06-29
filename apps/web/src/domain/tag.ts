import type { DomainTag } from "./types";

export function isTagOwnedBy(tag: DomainTag, userId: string): boolean {
  return tag.userId === userId;
}

export function hasSameName(a: DomainTag, b: DomainTag): boolean {
  return a.name.toLowerCase() === b.name.toLowerCase();
}

export function getTagDisplayName(tag: DomainTag): string {
  return tag.name;
}

export function formatTagColor(color: string): string {
  if (color.startsWith("#")) return color;
  return `#${color}`;
}
