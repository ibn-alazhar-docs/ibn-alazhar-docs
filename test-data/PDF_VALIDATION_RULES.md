# PDF Validation Rules

## Purpose

Define fail-early validation rules for uploaded documents before they enter the processing pipeline.

---

## Validation Checks

| Check                | Method                                    | Error Code       | Severity |
| -------------------- | ----------------------------------------- | ---------------- | -------- |
| MIME type            | `Set.has(allowedMimeTypes)`               | `INVALID_TYPE`   | Reject   |
| File size            | `fileSize > 100MB`                        | `FILE_TOO_LARGE` | Reject   |
| PDF header signature | Regex `^%PDF-\d+\.\d+` on first 20 bytes  | `PDF_CORRUPT`    | Reject   |
| PDF trailer (%%EOF)  | Regex `%%EOF\s*$` on last 20 bytes        | `PDF_TRUNCATED`  | Reject   |
| Encryption detection | Regex `/Encrypt\s+\d+\s+\d+\s+R/` in body | `PDF_ENCRYPTED`  | Reject   |
| Minimum size         | `buffer.length < 20` for PDFs             | `PDF_MALFORMED`  | Reject   |

### Implementation (`packages/pipeline/src/storage.ts`)

```typescript
const PDF_HEADER_PATTERN = /^%PDF-\d+\.\d+/;
const PDF_TRAILER_PATTERN = /%%EOF\s*$/;
const PDF_ENCRYPT_PATTERN = /\/Encrypt\s+\d+\s+\d+\s+R/;
const MAX_FILE_SIZE = 100 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);
```

---

## Validation Flow

```
Upload Request
  ├─ MIME type check ──→ reject if not in allowed set
  ├─ File size check ───→ reject if > 100MB
  └─ PDF-specific checks (only for application/pdf)
       ├─ Header signature ──→ reject if missing/invalid
       ├─ Trailer (%%EOF) ───→ reject if missing (truncated)
       ├─ Encryption flag ───→ reject if password-protected
       └─ Minimum size ──────→ reject if < 20 bytes
```

---

## Error Messages

| Error Code       | User-Facing Message                                 |
| ---------------- | --------------------------------------------------- |
| `INVALID_TYPE`   | Unsupported file format                             |
| `FILE_TOO_LARGE` | File exceeds maximum size of 100MB                  |
| `PDF_CORRUPT`    | File appears corrupted or not a PDF                 |
| `PDF_TRUNCATED`  | PDF is incomplete or truncated                      |
| `PDF_ENCRYPTED`  | PDF is password-protected — remove encryption first |
| `PDF_MALFORMED`  | File is too small to be a valid PDF                 |

---

## Safe Rejection

- Rejection happens **before** MinIO upload — no orphan storage blobs
- Rejection generates an `errorCode` + `error` message (not a raw throw)
- The validation result object includes `details` for debugging:

```typescript
interface PdfValidationResult {
  valid: boolean;
  error?: string;
  errorCode?: string;
  details: {
    hasValidHeader: boolean;
    hasValidTrailer: boolean;
    isEncrypted: boolean;
    mimeType: string;
    size: number;
  };
}
```

---

## Scope

- PDF checks are **lightweight** buffer scans — no full PDF parsing required
- Non-PDF files (JPEG, PNG) skip PDF-specific checks entirely
- Future enhancement: add `pdfinfo` or `qpdf` for deeper validation when available
