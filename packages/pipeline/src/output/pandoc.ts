import { execFile } from "child_process";
import { promisify } from "util";
import { mkdtemp, writeFile, readFile, rm } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
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
    );

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
