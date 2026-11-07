/**
 * Fixed registry of shell diagnostics for `/api/debug/exec`.
 *
 * The endpoint used to pass the request body straight to `execSync`, which turned
 * an admin session — or the `x-api-key` path in `withAdminAuth`, enabled whenever
 * `NODE_ENV !== "production"` — into remote code execution on the host. Only
 * names listed here are accepted, and each probe's argv is a constant executed
 * without a shell, so no part of a request can ever become a command.
 *
 * A Map rather than a plain object because `.get()` cannot return an inherited
 * property: `constructor` or `toString` as a probe name resolves to undefined
 * instead of a function that has no `argv`.
 */

export interface DebugDiagnostic {
  /** What it checks, shown to the caller so the registry is self-describing. */
  readonly description: string;
  /** argv[0] is the program, the rest its arguments. Never parsed by a shell. */
  readonly argv: readonly string[];
}

export const DEBUG_DIAGNOSTICS: ReadonlyMap<string, DebugDiagnostic> = new Map([
  [
    "pandoc-version",
    {
      description: "pandoc present and its version (DOCX/EPUB export path)",
      argv: ["pandoc", "--version"],
    },
  ],
  [
    "amiri-font",
    {
      description: "which Amiri file fontconfig resolves (DOCX font embedding path)",
      argv: ["fc-match", "Amiri"],
    },
  ],
  [
    "python-version",
    {
      description: "python3 present and its version (PDF split / sidecar paths)",
      argv: ["python3", "--version"],
    },
  ],
  [
    "tesseract-version",
    {
      description: "tesseract present and its version (local OCR fallback)",
      argv: ["tesseract", "--version"],
    },
  ],
  ["pg-isready", { description: "local PostgreSQL accepting connections", argv: ["pg_isready"] }],
  [
    "data-dir",
    {
      description: "contents of the local storage directory (/data in the image)",
      argv: ["ls", "-la", "/data"],
    },
  ],
]);

export const DEBUG_PROBE_NAMES: readonly string[] = [...DEBUG_DIAGNOSTICS.keys()];
