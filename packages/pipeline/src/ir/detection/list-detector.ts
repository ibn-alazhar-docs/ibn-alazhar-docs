import type { ListNode, ListItemNode, InlineNode } from "@ibn-al-azhar-docs/shared";
import { indentationOf, parseInline } from "../utils";

export interface ListDetectionResult {
  node: ListNode;
  consumed: number;
}

const UNORDERED_MARKER = /^[•·\-–—*○▪]\s+/;
const ORDERED_MARKER = /^(\d+)[.)]\s+/;
const ARABIC_ORDERED_MARKER = /^([أ-ي])[.)]\s+/;

export function isListMarker(line: string): boolean {
  const t = line.trim();
  if (!t) return false;
  return UNORDERED_MARKER.test(t) || ORDERED_MARKER.test(t) || ARABIC_ORDERED_MARKER.test(t);
}

function isOrderedMarker(line: string): boolean {
  const t = line.trim();
  return ORDERED_MARKER.test(t) || ARABIC_ORDERED_MARKER.test(t);
}

export function detectList(lines: string[]): ListDetectionResult | null {
  if (lines.length === 0) return null;
  const first = lines[0].trim();
  if (!isListMarker(first)) return null;

  const firstIndent = indentationOf(lines[0]);
  const isOrdered = isOrderedMarker(first);
  const startNumber =
    isOrdered && ORDERED_MARKER.test(first) ? Number(first.match(ORDERED_MARKER)?.[1]) : undefined;

  const items: ListItemNode[] = [];
  let i = 0;
  let current: ListItemNode | null = null;

  while (i < lines.length) {
    const raw = lines[i];
    const trimmed = raw.trim();

    // Empty lines always break a list
    if (!trimmed) {
      break;
    }

    // ATX headings break a list
    if (/^#{1,6}\s/.test(trimmed)) {
      break;
    }

    // Horizontal rules break a list
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      break;
    }

    const indent = indentationOf(raw);

    if (isListMarker(trimmed)) {
      const currentIsOrdered = isOrderedMarker(trimmed);

      // Type change (unordered → ordered or vice versa) breaks the list
      if (currentIsOrdered !== isOrdered && items.length > 0) {
        break;
      }

      const content = stripMarker(trimmed);
      current = { content: parseInlineSafe(content) };
      items.push(current);
      i++;
      continue;
    }

    // Not a list marker and not empty — possible continuation of last item
    if (current && indent > firstIndent) {
      const extra = stripMarker(trimmed);
      appendToItem(current, extra);
      i++;
      continue;
    }

    // Anything else breaks the list
    break;
  }

  if (items.length === 0) return null;

  const node: ListNode = {
    type: "list",
    ordered: isOrdered,
    ...(isOrdered && startNumber ? { startNumber } : {}),
    items,
  };

  return { node, consumed: i };
}

function stripMarker(line: string): string {
  return line
    .replace(UNORDERED_MARKER, "")
    .replace(ORDERED_MARKER, "")
    .replace(ARABIC_ORDERED_MARKER, "")
    .trim();
}

function parseInlineSafe(text: string): InlineNode[] {
  return parseInline(text);
}

function appendToItem(item: ListItemNode, text: string): void {
  const trimmed = text.trim();
  if (!trimmed) return;
  item.content.push({ type: "text", content: ` ${trimmed}` });
}
