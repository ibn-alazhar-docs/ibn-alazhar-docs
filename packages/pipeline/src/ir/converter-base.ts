import type { DocumentIR } from "@ibn-al-azhar-docs/shared";

export interface IRConverter {
  convert(source: string, metadata: Partial<DocumentIR["metadata"]>): DocumentIR;
}

export interface RawBlock {
  text: string;
  fontSize?: number;
  fontWeight?: number;
  indentation: number;
}

/**
 * Build a minimal DocumentIR metadata block with sensible defaults.
 */
export function buildMetadata(
  partial: Partial<DocumentIR["metadata"]> = {},
): DocumentIR["metadata"] {
  return {
    ocrProvider: partial.ocrProvider ?? "gemini",
    pageCount: partial.pageCount ?? 1,
    language: partial.language ?? "ar",
    confidence: partial.confidence ?? 1.0,
    processedAt: partial.processedAt ?? new Date().toISOString(),
  };
}
