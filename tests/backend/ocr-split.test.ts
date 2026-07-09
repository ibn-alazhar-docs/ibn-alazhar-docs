import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { rm } from "fs/promises";

vi.mock("node:child_process", () => {
  const execFile = vi.fn();
  return { execFile };
});

import { execFile } from "node:child_process";
import { splitPdfPages, MAX_PDF_PAGES } from "@ibn-al-azhar-docs/pipeline";

type ExecCb = (err: Error | null, stdout: string, stderr: string) => void;

function mockExec(stdout: string, err: Error | null = null, stderr = ""): void {
  (
    execFile as unknown as {
      mockImplementation: (
        fn: (cmd: string, args: string[], opts: unknown, cb: ExecCb) => { on: () => void },
      ) => void;
    }
  ).mockImplementation((_cmd, _args, _opts, cb: ExecCb) => {
    cb(err, stdout, stderr);
    return { on: () => {} };
  });
}

describe("splitPdfPages — success & error paths", () => {
  let createdTempDir: string | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    if (createdTempDir) {
      await rm(createdTempDir, { recursive: true, force: true }).catch(() => {});
      createdTempDir = null;
    }
  });

  it("returns parsed pages on success", async () => {
    const out = JSON.stringify({
      pages: [
        { number: 1, path: "/tmp/p1.png", width: 100, height: 100 },
        { number: 2, path: "/tmp/p2.png", width: 100, height: 100 },
      ],
      pageCount: 2,
    });
    mockExec(out);

    const res = await splitPdfPages(Buffer.from("%PDF-1.4"), 300);
    createdTempDir = res.tempDir;
    expect(res.pageCount).toBe(2);
    expect(res.pagePaths).toHaveLength(2);
  });

  it("throws PDF_SPLIT_PARSE_FAILED on non-JSON output", async () => {
    mockExec("not json at all");
    await expect(splitPdfPages(Buffer.from("%PDF-1.4"), 300)).rejects.toThrow(
      /PDF_SPLIT_PARSE_FAILED/,
    );
  });

  it("surfaces structured errors from the Python script as PDF_SPLIT_FAILED", async () => {
    mockExec(JSON.stringify({ error: "PDF_ENCRYPTED: password-protected" }));
    await expect(splitPdfPages(Buffer.from("%PDF-1.4"), 300)).rejects.toThrow(
      /PDF_SPLIT_FAILED: PDF_ENCRYPTED: password-protected/,
    );
  });

  it("rejects documents exceeding the page cap", async () => {
    mockExec(
      JSON.stringify({
        pages: [{ number: 1, path: "/tmp/p.png", width: 1, height: 1 }],
        pageCount: MAX_PDF_PAGES + 1,
      }),
    );
    await expect(splitPdfPages(Buffer.from("%PDF-1.4"), 300)).rejects.toThrow(
      /PDF_EXCEEDS_MAX_PAGES/,
    );
  });

  it("throws PDF_SPLIT_PARSE_FAILED when required fields are missing", async () => {
    mockExec(JSON.stringify({ pages: [] })); // no pageCount
    await expect(splitPdfPages(Buffer.from("%PDF-1.4"), 300)).rejects.toThrow(
      /PDF_SPLIT_PARSE_FAILED/,
    );
  });
});
