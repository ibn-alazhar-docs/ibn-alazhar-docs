#!/usr/bin/env node
/**
 * E2E Pipeline Test — runs the full pipeline directly without workers/queues.
 * PDF → Split → OCR (Surya) → Cleanup → Markdown/TXT/JSON export
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

async function main() {
  const startTime = Date.now();
  const logFile = "/tmp/e2e-pipeline-test.log";

  function log(msg) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const line = `[${elapsed}s] ${msg}`;
    console.log(line);
    writeFileSync(
      logFile,
      existsSync(logFile) ? readFileSync(logFile, "utf-8") + line + "\n" : line + "\n",
    );
  }

  try {
    // Load pipeline — use relative import for monorepo package
    log("Loading pipeline modules...");
    const pipeline = await import("../packages/pipeline/src/index.ts");
    log("Pipeline loaded.");

    // Override config for faster E2E testing
    process.env.OCR_DPI = process.env.OCR_DPI ?? "150";
    process.env.OCR_TIMEOUT = process.env.OCR_TIMEOUT ?? "3600000";
    process.env.OCR_PROVIDER = process.env.OCR_PROVIDER ?? "surya";
    process.env.OCR_PROVIDERS = process.env.OCR_PROVIDERS ?? "surya";
    const config = pipeline.loadConfig();
    log(
      `Config loaded. OCR provider: ${config.ocr.provider}, DPI: ${config.ocr.dpi}, Timeout: ${process.env.OCR_TIMEOUT}ms`,
    );

    // Read PDF
    const pdfPath = join(
      process.cwd(),
      "test-data/source/لا_أعلم_هويتي_حوار_بين_متشكك_ومتيقن_حسام_الدين_حامد.pdf",
    );
    log(`Reading PDF: ${pdfPath}`);
    const pdfBuffer = readFileSync(pdfPath);
    log(`PDF loaded: ${(pdfBuffer.length / 1024).toFixed(0)} KB`);

    // Validate
    const validation = pipeline.validatePdf(pdfBuffer, "application/pdf", pdfBuffer.length);
    log(`Validation: ${validation.valid ? "PASS" : "FAIL"} ${validation.error || ""}`);
    if (!validation.valid) throw new Error(`Validation failed: ${validation.error}`);

    // Split PDF into pages
    log("Splitting PDF into pages...");
    const splitStart = Date.now();
    const splitResult = await pipeline.splitPdfPages(pdfBuffer, config.ocr.dpi);
    log(
      `Split complete: ${splitResult.pageCount} pages in ${((Date.now() - splitStart) / 1000).toFixed(1)}s`,
    );
    // Create page getters
    const pageGetters = splitResult.pagePaths.map((path) => async () => {
      return readFileSync(path);
    });

    log(
      `Page paths mapped: ${splitResult.pagePaths.length} pages. First path: ${splitResult.pagePaths[0]}`,
    );

    // OCR with Surya
    log(`Starting OCR with ${config.ocr.provider}...`);
    const ocrStart = Date.now();
    const manager = new pipeline.OcrManager(config);
    const ocrResult = await manager.extractPages(config, pageGetters, "لا_أعلم_هويتي.pdf");
    const ocrTime = ((Date.now() - ocrStart) / 1000).toFixed(1);
    log(
      `OCR complete: ${ocrResult.pages.length} pages, confidence: ${ocrResult.confidence.toFixed(3)}, engine: ${ocrResult.engine} in ${ocrTime}s`,
    );
    log(`Total OCR text length: ${ocrResult.text.length} chars`);
    log(`First 200 chars of OCR text: ${ocrResult.text.substring(0, 200)}`);

    // Clean text
    log("Cleaning Arabic text...");
    const cleanStart = Date.now();
    const cleaned = pipeline.cleanArabicText(ocrResult.text);
    const cleanTime = ((Date.now() - cleanStart) / 1000).toFixed(1);
    log(`Cleanup complete: ${cleaned.length} chars in ${cleanTime}s`);
    log(`First 200 chars of cleaned text: ${cleaned.substring(0, 200)}`);

    // Generate outputs
    log("Generating Markdown...");
    const mdResult = pipeline.generateMarkdown(cleaned, { title: "لا أعلم هويتي" });
    log(`Markdown: ${mdResult.markdown.length} chars, ${mdResult.metadata.headingCount} headings`);

    log("Generating TXT...");
    const txtContent = pipeline.generateTxt(mdResult);
    log(`TXT: ${txtContent.length} chars`);

    log("Generating JSON...");
    const jsonContent = pipeline.generateJson(mdResult, "لا_أعلم_هويتي.pdf");
    log(`JSON: ${jsonContent.length} chars`);

    // Save outputs
    const outputDir = join(process.cwd(), "test-data/output/e2e-test");
    mkdirSync(outputDir, { recursive: true });

    writeFileSync(join(outputDir, "output.md"), mdResult.markdown, "utf-8");
    writeFileSync(join(outputDir, "output.txt"), txtContent, "utf-8");
    writeFileSync(join(outputDir, "output.json"), jsonContent, "utf-8");
    log(`Outputs saved to: ${outputDir}`);

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    log("");
    log("========================================");
    log("  E2E PIPELINE TEST: SUCCESS");
    log("========================================");
    log(`  Total time: ${totalTime}s`);
    log(`  Pages: ${splitResult.pageCount}`);
    log(`  OCR engine: ${ocrResult.engine}`);
    log(`  Confidence: ${ocrResult.confidence.toFixed(3)}`);
    log(`  Markdown: ${mdResult.markdown.length} chars`);
    log(`  Headings: ${mdResult.metadata.headingCount}`);
    log(`  Output: ${outputDir}`);
    log("========================================");
  } catch (err) {
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    log("");
    log("========================================");
    log("  E2E PIPELINE TEST: FAILED");
    log("========================================");
    log(`  Error: ${err.message}`);
    log(`  Time: ${totalTime}s`);
    if (err.stack) log(`  Stack: ${err.stack.split("\n").slice(0, 5).join("\n  ")}`);
    log("========================================");
    process.exit(1);
  }
}

main();
