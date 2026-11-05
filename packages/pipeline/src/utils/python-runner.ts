import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getPythonCommand } from "../ocr-providers/types";

export interface RunPythonOptions {
  /** Command-line args passed after the script path. */
  args: string[];
  /** Working directory for the child process. Defaults to the temp dir. */
  cwd?: string;
  /** Additional environment variables merged into the current env. */
  env?: Record<string, string>;
  /** Timeout in milliseconds. Defaults to 30 minutes. */
  timeout?: number;
  /** Max stdout/stderr buffer in bytes. Defaults to 50 MB. */
  maxBuffer?: number;
  /** If true, the temp directory is NOT auto-deleted on success. */
  keepTempDir?: boolean;
}

export interface RunPythonResult {
  stdout: string;
  stderr: string;
  tempDir: string;
}

/**
 * Execute a Python script in an isolated temp directory and return stdout/stderr.
 * The temp directory is deleted on failure; on success it is deleted unless
 * keepTempDir is true.
 */
export async function runPython(options: RunPythonOptions): Promise<RunPythonResult> {
  const tempDir = await mkdtemp(join(tmpdir(), "pipeline-python-"));
  const python = getPythonCommand();

  try {
    const result = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
      const proc = execFile(
        python,
        options.args,
        {
          timeout: options.timeout ?? 1_800_000,
          maxBuffer: options.maxBuffer ?? 50 * 1024 * 1024,
          encoding: "utf-8",
          cwd: options.cwd ?? tempDir,
          env: {
            ...process.env,
            ...options.env,
            PYTHONIOENCODING: "utf-8",
          },
        },
        (err, stdout, stderr) => {
          if (err) {
            const detail = stderr?.trim() || stdout?.trim() || err.message;
            reject(new Error(detail));
            return;
          }
          resolve({ stdout: stdout.trim(), stderr: stderr.trim() });
        },
      );
      proc.on("error", reject);
    });

    if (!options.keepTempDir) {
      await rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }

    return { stdout: result.stdout, stderr: result.stderr, tempDir };
  } catch (err) {
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
    throw err;
  }
}
