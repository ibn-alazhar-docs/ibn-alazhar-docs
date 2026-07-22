export function normalizeWhitespace(text: string): string {
  text = text.replace(/\r\n/g, "\n");
  text = text.replace(/\r/g, "\n");
  text = text.replace(/[ \t]+/g, " ");
  text = text.replace(/\n{3,}/g, "\n\n");
  text = text
    .split("\n")
    .map((l) => l.trim())
    .join("\n");
  return text.trim();
}
