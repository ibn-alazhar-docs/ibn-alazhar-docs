import type * as PdfJs from "pdfjs-dist";

/**
 * pdf.js needs two things served from our own origin: the worker script, and the JBIG2 /
 * OpenJPEG WASM decoders for images embedded in scanned PDFs. Without the decoders the
 * worker cannot render JBIG2 or JPX pages, which covers most Arabic scans, and the failure
 * only surfaces at render time rather than at upload time.
 * The decoder files are vendored into `public/pdfjs-wasm/` from `pdfjs-dist/wasm/`
 * (their LICENSE_* files are copied alongside them) and must be bumped together with the
 * `pdfjs-dist` version.
 */
export const PDFJS_WORKER_PATH = "/pdf.worker.min.mjs";
export const PDFJS_WASM_PATH = "/pdfjs-wasm/";

function originUrl(path: string): string {
  return new URL(path, window.location.origin).href;
}

/** `workerSrc` is a global, so it is set once per imported pdf.js module. Absolute URLs,
 *  because the HuggingFace Spaces proxy rewrites relative ones. */
export function applyPdfJsPaths(lib: typeof PdfJs): void {
  if (typeof window === "undefined") return;
  lib.GlobalWorkerOptions.workerSrc = originUrl(PDFJS_WORKER_PATH);
}

/**
 * `wasmUrl` is NOT a `GlobalWorkerOptions` field — it is a per-`getDocument` parameter, and
 * pdf.js defaults it to the bare string "wasm", which it resolves against the *worker's*
 * URL. Since the worker is served from `/pdf.worker.min.mjs`, that default points at
 * `/wasm/` and misses our vendored decoders, so it must be passed on every document.
 */
export function pdfJsAssetParams(): { wasmUrl: string } {
  if (typeof window === "undefined") return { wasmUrl: PDFJS_WASM_PATH };
  return { wasmUrl: originUrl(PDFJS_WASM_PATH) };
}

/** `pdfjs-dist` is large, so browser-only callers reach it through this lazy entry. */
export async function loadPdfJs(): Promise<typeof PdfJs> {
  const lib = await import("pdfjs-dist");
  applyPdfJsPaths(lib);
  return lib;
}

export async function countPdfPages(data: ArrayBuffer): Promise<number> {
  const lib = await loadPdfJs();
  const task = lib.getDocument({ data, ...pdfJsAssetParams() });
  try {
    const pdf = await task.promise;
    return pdf.numPages;
  } finally {
    // destroy() on the loading task (not cleanup() on the proxy) also releases the worker.
    await task.destroy();
  }
}
