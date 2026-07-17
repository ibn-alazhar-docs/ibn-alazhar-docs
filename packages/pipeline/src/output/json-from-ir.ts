import type { DocumentIR } from "@ibn-al-azhar-docs/shared";
import { FormatGenerator, GeneratorOptions } from "./generator-base";

/**
 * JSON export of the full IR plus provenance metadata. This is the canonical
 * debuggable artifact and preserves the complete structure (Requirement 1.5,
 * 5.5). When the original OCR markdown is supplied, it is embedded for
 * round-trip fidelity.
 */
export class JsonGenerator implements FormatGenerator {
  generate(
    ir: DocumentIR,
    options?: GeneratorOptions & { sourceFileName?: string; markdown?: string },
  ): Buffer {
    const payload = {
      source: options?.sourceFileName ?? "unknown",
      generatedAt: new Date().toISOString(),
      irVersion: ir.version,
      metadata: ir.metadata,
      content: ir.content,
      ...(options?.markdown ? { markdown: options.markdown } : {}),
    };
    return Buffer.from(JSON.stringify(payload, null, 2), "utf-8");
  }

  getMimeType(): string {
    return "application/json";
  }

  getExtension(): string {
    return ".json";
  }
}

export function generateJsonFromIR(
  ir: DocumentIR,
  options?: GeneratorOptions & { sourceFileName?: string; markdown?: string },
): Buffer {
  return new JsonGenerator().generate(ir, options);
}
