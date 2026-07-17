import type { DocumentIR } from "@ibn-al-azhar-docs/shared";

export interface GeneratorOptions {
  fileName?: string;
  title?: string;
  [key: string]: unknown;
}

export interface FormatGenerator {
  generate(ir: DocumentIR, options?: GeneratorOptions): Promise<Buffer> | Buffer;
  getMimeType(): string;
  getExtension(): string;
}
