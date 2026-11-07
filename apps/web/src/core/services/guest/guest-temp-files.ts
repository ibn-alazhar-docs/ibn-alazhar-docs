import { mkdir, rm, writeFile, readFile, access } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Ephemeral upload storage for guest jobs (docs/IMPLEMENTATION_TOOLS.md §2.2,
 * "input stays in place" + auto-delete). Guest uploads are NEVER written to the
 * document library or MinIO buckets used by authenticated users: they live in a
 * dedicated, mode-0700 temp directory for the lifetime of the job only, and are
 * removed the moment the job finishes (success, failure, cancel or TTL sweep).
 *
 * WHY a temp file instead of keeping the bytes on the job record: a guest file
 * may be up to 99MB and up to 4 run concurrently; holding them in the record
 * would pin ~400MB of RAM. The pipeline stages (`splitPdfPages`,
 * `extractNativePdfText`, OCR providers) all take a Buffer read from disk, so
 * the file is read back exactly once for the run.
 */

/** 32-hex-char random token — the only shape accepted as a guest job id. */
const GUEST_JOB_ID_PATTERN = /^[0-9a-f]{32}$/;

export function isGuestJobId(value: string): boolean {
  return GUEST_JOB_ID_PATTERN.test(value);
}

export function guestInputRoot(): string {
  return process.env.GUEST_TOOLS_TMP_DIR ?? join(tmpdir(), "ibn-al-azhar-guest-tools");
}

/**
 * Absolute path for a job's upload. The id is validated first so a hostile
 * `..`/absolute id can never escape the guest temp root.
 */
export function guestInputPath(id: string): string {
  if (!isGuestJobId(id)) {
    throw new Error("INVALID_GUEST_JOB_ID");
  }
  return join(guestInputRoot(), `${id}.input`);
}

export async function writeGuestInput(id: string, bytes: Uint8Array): Promise<string> {
  const root = guestInputRoot();
  await mkdir(root, { recursive: true, mode: 0o700 });
  const path = guestInputPath(id);
  await writeFile(path, bytes, { mode: 0o600, flag: "wx" });
  return path;
}

export async function readGuestInput(path: string): Promise<Buffer> {
  return readFile(path);
}

export async function guestInputExists(path: string): Promise<boolean> {
  try {
    await access(path, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/** Idempotent delete — a missing file is not an error (already gone). */
export async function deleteGuestInput(path: string): Promise<void> {
  await rm(path, { force: true }).catch(() => {});
}
