import { detectDocumentType } from "../analyze";
import {
  DEFAULT_OPTIONS,
  EXAM_OPTIONS,
  type CleanOptions,
} from "../constants";

export { analyzeText } from "../analyze";

export interface CleanArabicTextOptions extends CleanOptions {
  confidence?: number;
}

export {
  normalizeUnicode,
  normalizeArabicLetters,
  removeTashkeel,
  removeTatweel,
} from "./unicode";

export { normalizeDigits } from "./numbers";

export { normalizeWhitespace } from "./whitespace";

export {
  removeBrokenHtml,
  removeAsciiNoise,
  normalizeArabicPunctuation,
  finalCleanup,
} from "./html";

export {
  similarity,
  collapseRepeatedParagraphs,
  reconstructArabicLines,
  detectArabicHeadings,
  detectPostReconstructionHeadings,
  removePageNoise,
  removeRepeatedTokens,
  removeGarbageSymbols,
  removeIsolatedFragments,
  collapseRepeatedWords,
} from "./structure";

export async function enhanceArabicText(text: string): Promise<string> {
  const { mkdtemp, writeFile, rm } = await import("node:fs/promises");
  const { join, dirname } = await import("node:path");
  const { tmpdir } = await import("node:os");
  const { fileURLToPath } = await import("node:url");
  const { runPython } = await import("../utils/python-runner");

  const tempDir = await mkdtemp(join(tmpdir(), "diacritics-"));
  const inputPath = join(tempDir, "input.json");
  const scriptPath = join(
    dirname(fileURLToPath(import.meta.url)),
    "..",
    "..",
    "scripts",
    "diacritics.py",
  );

  try {
    await writeFile(inputPath, JSON.stringify({ texts: [text] }));

    const result = await runPython({
      args: [scriptPath, inputPath],
      timeout: 300_000,
      cwd: tempDir,
    });

    const parsed = JSON.parse(result.stdout);
    if (parsed.error) {
      throw new Error(`DIACRITICS_SCRIPT_ERROR: ${parsed.error}`);
    }

    const enhanced = parsed.results?.[0] || text;

    return enhanced;
  } catch {
    return text;
  } finally {
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

export function cleanArabicText(raw: string, options?: CleanArabicTextOptions): string {
  let text = raw;

  const shouldAutoDetect = !options || JSON.stringify(options) === JSON.stringify(DEFAULT_OPTIONS);
  let opts: CleanOptions;

  if (shouldAutoDetect) {
    const docType = detectDocumentType(raw);
    opts =
      docType === "exam" ? { ...EXAM_OPTIONS, ...options } : { ...DEFAULT_OPTIONS, ...options };
  } else {
    opts = { ...DEFAULT_OPTIONS, ...options };
  }

  const confidence = options?.confidence;

  if (opts.normalizeUnicode) {
    text = normalizeUnicode(text);
  }

  if (opts.normalizeArabic) {
    text = normalizeArabicLetters(text);
  }

  if (opts.removeTashkeel) text = removeTashkeel(text);
  if (opts.removeTatweel) text = removeTatweel(text);

  if (opts.normalizeDigits) {
    text = normalizeDigits(text);
  }

  if (opts.normalizeWhitespace) {
    text = normalizeWhitespace(text);
  }

  if (opts.removeBrokenHtml) text = removeBrokenHtml(text);
  if (opts.removeAsciiNoise) text = removeAsciiNoise(text);
  if (opts.removeRepeatedTokens) text = removeRepeatedTokens(text);
  if (opts.removeGarbageSymbols) text = removeGarbageSymbols(text, confidence);
  if (opts.normalizePunctuation) text = normalizeArabicPunctuation(text);
  if (opts.removeIsolatedFragments) text = removeIsolatedFragments(text, confidence);
  if (opts.collapseRepeatedWords) text = collapseRepeatedWords(text);
  if (opts.detectHeadings) text = detectArabicHeadings(text);
  if (opts.reconstructLines) {
    text = reconstructArabicLines(text);
    text = detectPostReconstructionHeadings(text);
  }
  if (opts.removePageNoise) text = removePageNoise(text);
  if (opts.collapseRepeatedParagraphs) text = collapseRepeatedParagraphs(text);
  if (opts.finalCleanup) text = finalCleanup(text);

  return text;
}
