import type { CleanedText } from "../types";

export function generateTxt(cleanedText: CleanedText, includeMetadata: boolean = false): string {
  const parts: string[] = [];

  if (includeMetadata) {
    parts.push("=".repeat(60));
    parts.push(`Ibn Al-Azhar Docs — OCR Export`);
    parts.push(`Generated: ${new Date().toISOString()}`);
    parts.push(`Pages: ${cleanedText.metadata.pageCount}`);
    parts.push(`Words: ${cleanedText.metadata.wordCount}`);
    parts.push(`Confidence: ${(cleanedText.metadata.confidence * 100).toFixed(1)}%`);
    parts.push("=".repeat(60));
    parts.push("");
  }

  const plainText = cleanedText.markdown
    .replace(/^---\n[\s\S]*?\n---\n/gm, "")
    .replace(/^### /gm, "")
    .replace(/^## /gm, "")
    .replace(/^# /gm, "")
    .replace(/^- /gm, "• ")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  parts.push(plainText);
  return parts.join("\n");
}
