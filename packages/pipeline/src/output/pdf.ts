import { createRequire } from "module";
import * as path from "path";
import * as fs from "fs";
import { fileURLToPath } from "url";

const localRequire = createRequire(import.meta.url);
const PdfPrinter = localRequire("pdfmake/js/Printer").default;
import type { TDocumentDefinitions, Content } from "pdfmake/interfaces";
import type { CleanedText } from "../types";

function findCairoWoff(filename: string): string {
  // Resolve the font reliably regardless of pnpm/node_modules layout.
  try {
    const pkgJson = localRequire.resolve("@fontsource/cairo/package.json");
    const candidate = path.join(path.dirname(pkgJson), "files", filename);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  } catch {
    // fall through to filesystem walk
  }

  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  let dir = currentDir;
  while (dir !== path.parse(dir).root) {
    const candidate = path.join(dir, "node_modules", "@fontsource", "cairo", "files", filename);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
    // Handle pnpm layout virtual store candidate
    const pnpmCandidate = path.join(
      dir,
      "node_modules",
      ".pnpm",
      "@fontsource+cairo@5.2.7",
      "node_modules",
      "@fontsource",
      "cairo",
      "files",
      filename,
    );
    if (fs.existsSync(pnpmCandidate)) {
      return pnpmCandidate;
    }
    dir = path.dirname(dir);
  }
  return path.join(currentDir, "../../../../node_modules/@fontsource/cairo/files", filename);
}

export async function generatePdf(
  cleanedText: CleanedText,
  options: { fontSize?: number; watermark?: string; pageRange?: string } = {},
): Promise<Buffer> {
  const fonts = {
    Cairo: {
      normal: findCairoWoff("cairo-arabic-400-normal.woff"),
      bold: findCairoWoff("cairo-arabic-700-normal.woff"),
      italics: findCairoWoff("cairo-arabic-400-normal.woff"),
      bolditalics: findCairoWoff("cairo-arabic-700-normal.woff"),
    },
  };

  const Printer = PdfPrinter as unknown as new (
    fonts: Record<string, Record<string, string>>,
    vfs?: unknown,
    urlResolver?: { resolve: () => void; resolved: () => Promise<unknown> },
    vfsCache?: unknown,
  ) => {
    createPdfKitDocument: (docDefinition: TDocumentDefinitions) => {
      on: (event: string, callback: (chunk: Buffer) => void) => void;
      end: () => void;
    };
  };
  const urlResolver = {
    resolve: () => {},
    resolved: () => Promise.resolve(),
  };
  const printer = new Printer(fonts, undefined, urlResolver);

  const markdownText = cleanedText.markdown || cleanedText.cleaned;
  const blocks = markdownText.split("\n\n").filter(Boolean);

  const content: Content[] = [];

  for (const block of blocks) {
    if (!block.trim()) continue;

    if (block.trim().startsWith("#")) {
      const level = block.match(/^#+/)?.[0]?.length ?? 1;
      const cleanText = block.replace(/^#+\s*/, "");
      const fontSize = 24 - level * 2;

      content.push({
        text: cleanText,
        fontSize: Math.max(12, fontSize),
        bold: true,
        margin: [0, 10, 0, 5],
        alignment: "right",
      });
    } else {
      content.push({
        text: block,
        fontSize: options.fontSize || 14,
        margin: [0, 0, 0, 10],
        alignment: "right",
      });
    }
  }

  const docDefinition: TDocumentDefinitions = {
    content: (content.length > 0 ? content : [{ text: "" }]) as Content,
    defaultStyle: {
      font: "Cairo",
      fontSize: options.fontSize || 14,
      alignment: "right",
    },
  };

  if (options.watermark) {
    docDefinition.watermark = {
      text: options.watermark,
      color: "gray",
      opacity: 0.3,
      bold: true,
      italics: false,
    };
  }

  const pdfDoc = await printer.createPdfKitDocument(docDefinition);

  return new Promise((resolve, reject) => {
    try {
      const chunks: Buffer[] = [];
      pdfDoc.on("data", (chunk: Buffer) => chunks.push(chunk));
      pdfDoc.on("end", () => resolve(Buffer.concat(chunks)));
      pdfDoc.end();
    } catch (err) {
      reject(err);
    }
  });
}
