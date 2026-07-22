import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { CleanedText } from "../types";

const execFileAsync = promisify(execFile);

type DocxInput = CleanedText | { markdown?: string; cleaned?: string };

async function pandocConvert(markdownText: string, format: string): Promise<Buffer> {
  const tempDir = await mkdtemp(path.join(tmpdir(), `pandoc-${format}-`));
  try {
    const mdPath = path.join(tempDir, "input.md");
    const outPath = path.join(tempDir, `output.${format}`);

    await writeFile(mdPath, markdownText, "utf8");

    await execFileAsync(
      "pandoc",
      [mdPath, "-o", outPath, "-M", "dir=rtl", "-M", "title=Document"],
      { timeout: 30000 },
    ).catch((err: unknown) => {
      const code = (err as { code?: string }).code;
      const msg = err instanceof Error ? err.message : String(err);
      // A missing pandoc binary is a permanent, non-retryable environment fault.
      // Throw a marker the failure classifier maps to EXPORT_GENERATION_FAILED
      // so BullMQ does NOT waste 3 retries on a broken install.
      if (code === "ENOENT" || /spawn .* ENOENT/.test(msg)) {
        throw new Error(`EXPORT_PANDOC_MISSING: pandoc binary not found (${msg})`);
      }
      throw new Error(`EXPORT_FORMAT_FAILED: ${msg}`);
    });

    return await readFile(outPath);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

export async function generateDocx(input: DocxInput): Promise<Buffer> {
  const markdownText = input.markdown || input.cleaned || "";
  return pandocConvert(markdownText, "docx");
}

export async function generateEpub(input: DocxInput): Promise<Buffer> {
  const markdownText = input.markdown || input.cleaned || "";
  return pandocConvert(markdownText, "epub");
}
