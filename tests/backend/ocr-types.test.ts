import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("node:child_process", () => {
  const execFile = vi.fn();
  return { execFile };
});

import { execFile } from "node:child_process";
import {
  estimateConfidence,
  toOcrPageResult,
  getPythonCommand,
} from "../../packages/pipeline/src/ocr-providers/types";

describe("OCR provider helpers — estimateConfidence", () => {
  it("returns 0.9 for Arabic-dominated text", () => {
    expect(estimateConfidence("الحمد لله رب العالمين")).toBe(0.9);
  });

  it("returns 0.7 for mixed Arabic/Latin text above 40%", () => {
    const text = "الكتاب book صفحة page محتوى content";
    expect(estimateConfidence(text)).toBe(0.7);
  });

  it("returns 0.5 for mostly non-Arabic text", () => {
    expect(estimateConfidence("Hello world this is english text only")).toBe(0.5);
  });

  it("returns 0 for empty text", () => {
    expect(estimateConfidence("   ")).toBe(0);
  });
});

describe("OCR provider helpers — toOcrPageResult", () => {
  it("maps pages and estimates confidence per page", () => {
    const result = toOcrPageResult([
      { number: 1, text: "السلام عليكم" },
      { number: 2, text: "Hello world" },
    ]);
    expect(result).toEqual([
      { number: 1, text: "السلام عليكم", confidence: 0.9 },
      { number: 2, text: "Hello world", confidence: 0.5 },
    ]);
  });
});

describe("OCR provider helpers — getPythonCommand", () => {
  const ORIG_HOME = process.env.HOME;

  beforeEach(() => {
    vi.stubEnv("SURYA_PYTHON_PATH", "");
    vi.stubEnv("HOME", "/home/testuser");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    if (ORIG_HOME === undefined) delete process.env.HOME;
    else process.env.HOME = ORIG_HOME;
  });

  it("prefers SURYA_PYTHON_PATH when set", () => {
    vi.stubEnv("SURYA_PYTHON_PATH", "/opt/venv/bin/python3");
    expect(getPythonCommand()).toBe("/opt/venv/bin/python3");
  });

  it("falls back to python3 when no venv is present", () => {
    // HOME points somewhere without a .venv; accessSync will fail → python3
    expect(getPythonCommand()).toBe("python3");
  });
});
