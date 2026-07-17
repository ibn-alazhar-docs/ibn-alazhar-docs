export { generateMarkdown } from "./markdown";
export type { GenerateMdOptions } from "./markdown";
export { generateTxt } from "./txt";
export { generateJson } from "./json";
export { generateDocx, generateEpub } from "./pandoc";
export { generatePdf } from "./pdf";

// IR-based format generators (structure-preserving export pipeline)
export type { FormatGenerator, GeneratorOptions } from "./generator-base";
export { MarkdownGenerator, generateMarkdownFromIR } from "./markdown-generator";
export { TxtGenerator, generateTxtFromIR } from "./txt-from-ir";
export {
  DocxGenerator,
  EpubGenerator,
  generateDocxFromIR,
  generateEpubFromIR,
} from "./docx-generator";
export { PdfGenerator, generatePdfFromIR } from "./pdf-from-ir";
export { JsonGenerator, generateJsonFromIR } from "./json-from-ir";

// IR conversion
export { MarkdownIRConverter, convertMarkdownToIR } from "../ir/gemini-ir-converter";
export type { IRConverter } from "../ir/converter-base";
export { buildMetadata } from "../ir/converter-base";
export * from "../ir/detection/heading-detector";
export * from "../ir/detection/list-detector";
export * from "../ir/detection/paragraph-detector";
export * from "../ir/utils";
