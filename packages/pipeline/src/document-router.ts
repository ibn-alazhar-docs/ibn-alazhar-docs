import { unlink, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getPythonCommand } from "./ocr-providers/types";
import { runPython } from "./utils/python-runner";

export interface DocumentClassification {
  type: "pdf-text" | "pdf-scan" | "image" | "docx" | "txt" | "unknown";
  hasEmbeddedText: boolean;
  pageCount?: number;
  confidence: number;
}

export interface NativeTextResult {
  text: string;
  pageCount: number;
  confidence: number;
}

/**
 * Classify a document by inspecting its magic bytes and structure.
 * Pure detection — no external APIs.
 */
export async function classifyDocument(
  buffer: Buffer,
  mimeType: string,
  fileName: string,
): Promise<DocumentClassification> {
  const lowerName = fileName.toLowerCase();

  if (mimeType === "application/pdf" || lowerName.endsWith(".pdf")) {
    return classifyPdf(buffer);
  }

  if (mimeType.startsWith("image/") || /\.(png|jpg|jpeg|tiff?|bmp|webp)$/i.test(lowerName)) {
    return {
      type: "image",
      hasEmbeddedText: false,
      confidence: 1.0,
    };
  }

  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    lowerName.endsWith(".docx")
  ) {
    return {
      type: "docx",
      hasEmbeddedText: true,
      confidence: 1.0,
    };
  }

  if (
    mimeType === "text/plain" ||
    mimeType === "text/markdown" ||
    lowerName.endsWith(".txt") ||
    lowerName.endsWith(".md")
  ) {
    return {
      type: "txt",
      hasEmbeddedText: true,
      confidence: 1.0,
    };
  }

  return {
    type: "unknown",
    hasEmbeddedText: false,
    confidence: 0.0,
  };
}

async function classifyPdf(buffer: Buffer): Promise<DocumentClassification> {
  const tmpDir = await mkdtemp(join(tmpdir(), "pdf-classify-"));
  const pdfPath = join(tmpDir, "input.pdf");
  const scriptPath = join(tmpDir, "classify.py");

  try {
    await writeFile(pdfPath, buffer);
    await writeFile(scriptPath, `
import sys
try:
    import fitz
    doc = fitz.open(sys.argv[1])
    text_len = sum(len(page.get_text()) for page in doc)
    print(f"pages={len(doc)};text_len={text_len}")
    doc.close()
except Exception as e:
    print(f"error={e}")
    sys.exit(1)
`, "utf-8");

    const result = await runPython({
      args: [scriptPath, pdfPath],
      timeout: 30_000,
    });

    const match = result.stdout.match(/pages=(\d+);text_len=(\d+)/);
    if (!match) {
      return {
        type: "pdf-scan",
        hasEmbeddedText: false,
        pageCount: undefined,
        confidence: 0.5,
      };
    }

    const pageCount = Number(match[1]);
    const textLen = Number(match[2]);

    // Heuristic: if more than ~200 chars of embedded text per page, treat as text-native
    const hasEmbeddedText = textLen > pageCount * 200;

    return {
      type: hasEmbeddedText ? "pdf-text" : "pdf-scan",
      hasEmbeddedText,
      pageCount,
      confidence: hasEmbeddedText ? 0.95 : 0.85,
    };
  } finally {
    await unlink(pdfPath).catch(() => {});
    await unlink(tmpDir).catch(() => {});
  }
}

/**
 * Extract embedded text from a text-native PDF without OCR.
 * Uses PyMuPDF to extract text per page.
 */
export async function extractNativePdfText(
  buffer: Buffer,
  maxPages: number = 2000,
): Promise<NativeTextResult> {
  const tmpDir = await mkdtemp(join(tmpdir(), "pdf-native-"));
  const pdfPath = join(tmpDir, "input.pdf");
  const scriptPath = join(tmpDir, "native_text.py");

  try {
    await writeFile(pdfPath, buffer);
    await writeFile(
      scriptPath,
      `
import sys, json
try:
    import fitz
    doc = fitz.open(sys.argv[1])
    max_pages = int(sys.argv[2]) if len(sys.argv) > 2 else 2000
    pages = []
    for i, page in enumerate(doc):
        if i >= max_pages:
            break
        text = page.get_text()
        pages.append({"number": i + 1, "text": text})
    print(json.dumps({"pages": pages, "pageCount": len(pages)}, ensure_ascii=False))
    doc.close()
except Exception as e:
    print(json.dumps({"error": str(e)}))
    sys.exit(1)
`,
      "utf-8",
    );

    const result = await runPython({
      args: [scriptPath, pdfPath, String(maxPages)],
      timeout: 60_000,
    });

    const parsed = JSON.parse(result.stdout);
    if (parsed.error) {
      throw new Error(`PDF_NATIVE_TEXT_FAILED: ${parsed.error}`);
    }

    const text = parsed.pages
      .map((p: { number: number; text: string }) => `===PAGE_BREAK===\n${p.text}`)
      .join("\n")
      .replace(/^===PAGE_BREAK===\n/, "");

    return {
      text,
      pageCount: parsed.pageCount,
      confidence: 0.95,
    };
  } finally {
    await unlink(pdfPath).catch(() => {});
    await unlink(scriptPath).catch(() => {});
    await unlink(tmpDir).catch(() => {});
  }
}
