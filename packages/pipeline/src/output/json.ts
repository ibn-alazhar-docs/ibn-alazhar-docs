import type { CleanedText } from "../types";

export function generateJson(cleanedText: CleanedText, sourceFileName?: string): string {
  return JSON.stringify(
    {
      source: sourceFileName ?? "unknown",
      generatedAt: new Date().toISOString(),
      metadata: cleanedText.metadata,
      content: {
        raw: cleanedText.raw,
        cleaned: cleanedText.cleaned,
      },
      markdown: cleanedText.markdown,
    },
    null,
    2,
  );
}
