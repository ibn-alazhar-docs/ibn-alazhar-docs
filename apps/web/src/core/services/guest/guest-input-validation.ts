import { classifyDocument, type DocumentClassification } from "@ibn-al-azhar-docs/pipeline";
import {
  GUEST_ALLOWED_MIME_TYPES,
  GUEST_TOOLS_LIMITS,
  validateGuestFile,
} from "@/shared/tools/guest-limits";
import type { GuestRejectCode } from "@/domain/guest-tools";

/**
 * Server-side validation of a guest upload (docs/IMPLEMENTATION_TOOLS.md §7).
 *
 * The browser checks (GuestToolClient) are only a courtesy — everything is
 * re-checked here against the guest limits in §3.1, including a real page count.
 * Deliberately NOT reused: `validatePdf()` from the pipeline, whose size cap
 * follows `MAX_UPLOAD_SIZE_MB` (the authenticated 50MB path). §3.3 states guest
 * limits are separate on purpose, so the guest path enforces its own 99MB cap
 * and its own magic-byte sniffing.
 */

export type GuestInputMime = (typeof GUEST_ALLOWED_MIME_TYPES)[number];

export type GuestValidationOutcome =
  | {
      ok: true;
      bytes: Uint8Array;
      mimeType: GuestInputMime;
      /** Server-counted pages (1 for an image). Never the browser's number. */
      pageCount: number;
      /** Pipeline classification kept so processing does not re-probe the file. */
      classification: DocumentClassification | null;
      fileName: string;
    }
  | { ok: false; code: GuestRejectCode; message: string };

const PDF_MAGIC = "%PDF-";
const JPEG_MAGIC = [0xff, 0xd8, 0xff];
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47];
const RIFF_MAGIC = "RIFF";
const WAVE_MAGIC = "WAVE";
const ID3_MAGIC = "ID3";
const OGG_MAGIC = "OggS";
const FTYP_MAGIC = "ftyp";

function failure(code: GuestRejectCode, message: string): GuestValidationOutcome {
  return { ok: false, code, message };
}

/** Upload name is echoed back to the same browser only — strip paths/control chars. */
export function sanitizeGuestFileName(name: string): string {
  const base = (name ?? "").split(/[\\/]/).pop() ?? "";
  const clean = base
    .replace(/[^\p{L}\p{N}.\-_ ]/gu, "")
    .trim()
    .slice(0, 120);
  return clean.length > 0 ? clean : "upload";
}

function sniffMime(bytes: Uint8Array): GuestInputMime | null {
  const head = new TextDecoder("utf-8").decode(bytes.subarray(0, 12));
  if (head.startsWith(PDF_MAGIC)) return "application/pdf";
  if (JPEG_MAGIC.every((b, i) => bytes[i] === b)) return "image/jpeg";
  if (PNG_MAGIC.every((b, i) => bytes[i] === b)) return "image/png";
  // صوت: WAV = RIFF....WAVE، MP3 = ID3، M4A = ....ftyp، OGG/Opus = OggS
  if (head.startsWith(RIFF_MAGIC) && head.includes(WAVE_MAGIC)) return "audio/wav";
  if (head.startsWith(ID3_MAGIC)) return "audio/mpeg";
  if (head.slice(4, 8) === FTYP_MAGIC) return "audio/mp4";
  if (head.startsWith(OGG_MAGIC)) return "audio/ogg";
  if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3)
    return "audio/webm";
  // إطار MP3 بلا ID3 (frame sync 0xFF 0xF0 mask)
  if (bytes.length >= 2 && bytes[0] === 0xff && (bytes[1]! & 0xf0) === 0xf0) {
    return "audio/mpeg";
  }
  return null;
}

/**
 * Server-side PDF page count via the pipeline's existing mechanism:
 * `classifyDocument()` reads the page count with PyMuPDF — the same probe the
 * split stage uses for routing (workers/ocr-worker/src/stages/split.ts), and
 * cheaper than rendering pages with `splitPdfPages()`.
 * Returns null when the count could not be established (no Python runtime,
 * unreadable PDF) — the caller must then reject the job, because §7 makes the
 * server count mandatory and "unknown" must never mean "unlimited".
 */
export async function countGuestPages(
  bytes: Uint8Array,
  mimeType: GuestInputMime,
  fileName: string,
): Promise<{ pageCount: number | null; classification: DocumentClassification | null }> {
  if (mimeType !== "application/pdf") {
    // An image upload is exactly one page.
    return { pageCount: 1, classification: null };
  }
  try {
    const classification = await classifyDocument(Buffer.from(bytes), mimeType, fileName);
    const pageCount =
      typeof classification.pageCount === "number" && classification.pageCount > 0
        ? classification.pageCount
        : null;
    return { pageCount, classification };
  } catch {
    return { pageCount: null, classification: null };
  }
}

export async function validateGuestUpload(file: File | null): Promise<GuestValidationOutcome> {
  const name = sanitizeGuestFileName(file?.name ?? "");

  // 1. Shared client/server checks (presence, allowed type, declared size).
  const shared = validateGuestFile(file);
  if (!shared.valid) {
    return failure(
      shared.code === "MISSING" ? "MISSING_FILE" : (shared.code ?? "UNSUPPORTED_TYPE"),
      shared.error ?? "ملف غير صالح",
    );
  }

  // 2. Real bytes — never trust a declared size or a Content-Length header.
  const bytes = new Uint8Array(await file!.arrayBuffer());
  const maxBytes = GUEST_TOOLS_LIMITS.maxFileSizeMB * 1024 * 1024;
  if (bytes.byteLength === 0) {
    return failure("MISSING_FILE", "الملف فارغ");
  }
  if (bytes.byteLength > maxBytes) {
    return failure(
      "TOO_LARGE",
      `حجم الملف يتجاوز حد الضيوف (${GUEST_TOOLS_LIMITS.maxFileSizeMB}MB)`,
    );
  }

  // 3. Magic bytes must agree with the declared type (blocks renamed/bogus MIME).
  const sniffed = sniffMime(bytes);
  if (!sniffed) {
    return failure(
      "UNSUPPORTED_TYPE",
      "محتوى الملف غير مدعوم (PDF أو JPG/PNG أو صوت MP3/WAV/M4A/OGG فقط)",
    );
  }
  const declaredRaw = (file!.type || "").toLowerCase();
  const declared =
    declaredRaw === "audio/x-wav"
      ? "audio/wav"
      : declaredRaw === "audio/x-m4a"
        ? "audio/mp4"
        : declaredRaw;
  if (declared && !(GUEST_ALLOWED_MIME_TYPES as readonly string[]).includes(declared)) {
    return failure("UNSUPPORTED_TYPE", "نوع الملف غير مدعوم");
  }
  if (declared && declared !== sniffed) {
    return failure("UNSUPPORTED_TYPE", "نوع الملف لا يطابق محتواه");
  }

  // 4. Mandatory server page count (browser count is ignored).
  const { pageCount, classification } = await countGuestPages(bytes, sniffed, name);
  if (pageCount === null) {
    return failure(
      "PAGE_COUNT_UNAVAILABLE",
      "تعذّر عدّ صفحات الملف على الخادم — لا يمكن قبول مهمة ضيف بلا تأكيد الحد",
    );
  }
  if (pageCount > GUEST_TOOLS_LIMITS.maxPages) {
    return failure(
      "TOO_MANY_PAGES",
      `عدد الصفحات (${pageCount}) يتجاوز حد الضيوف (${GUEST_TOOLS_LIMITS.maxPages} صفحة)`,
    );
  }

  return { ok: true, bytes, mimeType: sniffed, pageCount, classification, fileName: name };
}
