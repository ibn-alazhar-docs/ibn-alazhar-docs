export { generateMarkdown } from "./markdown";
export type { GenerateMdOptions } from "./markdown";
export { generateTxt } from "./txt";
export { generateJson } from "./json";
export { generateDocx, generateEpub, findReferenceRtlDocx } from "./pandoc";
export type { PandocOptions } from "./pandoc";
export {
  embedAmiriFonts,
  findAmiriFonts,
  obfuscateFont,
  readZip,
  writeZip,
  crc32,
  readDocxDocumentXml,
  countOmml,
} from "./embed-fonts";
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
  convertHtmlTablesToMarkdown,
  segmentByScript,
} from "./docx-generator";
export { PdfGenerator, generatePdfFromIR } from "./pdf-from-ir";
export { JsonGenerator, generateJsonFromIR } from "./json-from-ir";
