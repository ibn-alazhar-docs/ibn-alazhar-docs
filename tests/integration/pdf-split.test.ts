import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";

const SCRIPT = join(process.cwd(), "packages/pipeline/scripts/split-pdf.py");

function pythonReady(): boolean {
  try {
    execFileSync("python3", ["-c", "import pypdfium2, PIL, cv2"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

const hasPy = pythonReady();

// Generates a low-resolution, slightly-rotated single-page PDF using PIL/OpenCV.
function makeLowResPdf(outPath: string, w = 200, h = 260, rotate = 3): void {
  execFileSync(
    "python3",
    [
      "-c",
      `
import sys, numpy as np, cv2
from PIL import Image
w=int(sys.argv[1]); h=int(sys.argv[2]); rot=float(sys.argv[3]); out=sys.argv[4]
img=np.ones((h,w),np.uint8)*255
cv2.putText(img,"Arabic OCR",(10,40),cv2.FONT_HERSHEY_SIMPLEX,0.5,0,1)
cv2.putText(img,"12345",(10,80),cv2.FONT_HERSHEY_SIMPLEX,0.5,0,1)
M=cv2.getRotationMatrix2D((w/2,h/2),rot,1.0)
img=cv2.warpAffine(img,M,(w,h),borderMode=cv2.BORDER_REPLICATE)
Image.fromarray(img).convert("L").save(out, save_all=True)
`,
      String(w),
      String(h),
      String(rotate),
      outPath,
    ],
    { stdio: "ignore" },
  );
}

describe.skipIf(!hasPy)("split-pdf.py — low-quality preprocessing & error handling", () => {
  let workDir: string;

  beforeAll(() => {
    workDir = mkdtempSync(join(tmpdir(), "pdf-split-test-"));
  });

  it("upscales genuinely low-res pages in auto pre-process mode", () => {
    const pdfPath = join(workDir, "low.pdf");
    makeLowResPdf(pdfPath);
    const outDir = join(workDir, "out_auto");

    const stdout = execFileSync("python3", [SCRIPT, pdfPath, outDir, "300", "2000"], {
      env: { ...process.env, OCR_PREPROCESS: "auto", PYTHONIOENCODING: "utf-8" },
      encoding: "utf8",
    });
    const result = JSON.parse(stdout) as {
      pages: { number: number; width: number; height: number }[];
      pageCount: number;
    };
    expect(result.error).toBeUndefined();
    expect(result.pageCount).toBe(1);
    // Auto mode targets >=1400px on the short side for OCR quality.
    expect(Math.min(result.pages[0]!.width, result.pages[0]!.height)).toBeGreaterThanOrEqual(1400);
  });

  it("emits a structured error for corrupt PDFs instead of a raw trace", () => {
    const pdfPath = join(workDir, "corrupt.pdf");
    writeFileSync(pdfPath, "%PDF-1.4\n%%EOF\nTRAILING GARBAGE", "utf8");
    const outDir = join(workDir, "out_bad");

    let stdout = "";
    try {
      stdout = execFileSync("python3", [SCRIPT, pdfPath, outDir, "300", "2000"], {
        env: { ...process.env, OCR_PREPROCESS: "auto", PYTHONIOENCODING: "utf-8" },
        encoding: "utf8",
      });
    } catch (err) {
      stdout = (err as { stdout?: string }).stdout ?? "";
    }
    const result = JSON.parse(stdout) as { error?: string };
    expect(result.error).toBeDefined();
    expect(result.error).toMatch(/^PDF_INVALID:/);
  });

  it("rejects documents that exceed the page cap up-front", () => {
    const pdfPath = join(workDir, "four.pdf");
    const frames = Array.from({ length: 4 }, () =>
      (() => {
        const f = join(workDir, `f_${Math.random()}.png`);
        execFileSync(
          "python3",
          [
            "-c",
            "import numpy as np\nfrom PIL import Image\nimport sys\nImage.fromarray(np.ones((100,100),np.uint8)*255).save(sys.argv[1])",
            f,
          ],
          { stdio: "ignore" },
        );
        return f;
      })(),
    );
    execFileSync(
      "python3",
      [
        "-c",
        "import sys\nfrom PIL import Image\nImage.open(sys.argv[1]).save(sys.argv[2], save_all=True, append_images=[Image.open(p) for p in sys.argv[3:]])",
        frames[0]!,
        pdfPath,
        ...frames.slice(1),
      ],
      { stdio: "ignore" },
    );

    let stdout = "";
    try {
      stdout = execFileSync("python3", [SCRIPT, pdfPath, join(workDir, "out_cap"), "300", "3"], {
        env: { ...process.env, OCR_PREPROCESS: "0", PYTHONIOENCODING: "utf-8" },
        encoding: "utf8",
      });
    } catch (err) {
      stdout = (err as { stdout?: string }).stdout ?? "";
    }
    const result = JSON.parse(stdout) as { error?: string };
    expect(result.error).toMatch(/^PDF_EXCEEDS_MAX_PAGES:/);

    for (const f of frames) rmSync(f, { force: true });
  });

  // Keep the temp dir tidy.
  afterAll(() => {
    rmSync(workDir, { recursive: true, force: true });
  });
});
