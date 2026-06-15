import { describe, it, expect } from "vitest";
import { validatePdf } from "../../packages/pipeline/src/storage";

function makePdfBuffer(
  header = "%PDF-1.4\n",
  body = "x".repeat(20),
  trailer = "\n%%EOF\n",
): Buffer {
  return Buffer.from(header + body + trailer);
}

describe("validatePdf — MIME type acceptance", () => {
  it("accepts application/pdf", () => {
    const result = validatePdf(makePdfBuffer(), "application/pdf", 1000);
    expect(result.valid).toBe(true);
  });

  it("accepts image/jpeg", () => {
    const buf = Buffer.alloc(100, 0xff);
    const result = validatePdf(buf, "image/jpeg", 100);
    expect(result.valid).toBe(true);
  });

  it("accepts image/png", () => {
    const buf = Buffer.alloc(100, 0x89);
    const result = validatePdf(buf, "image/png", 100);
    expect(result.valid).toBe(true);
  });

  it("rejects text/plain → INVALID_TYPE", () => {
    const result = validatePdf(Buffer.alloc(100), "text/plain", 100);
    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe("INVALID_TYPE");
  });

  it("rejects application/octet-stream → INVALID_TYPE", () => {
    const result = validatePdf(Buffer.alloc(100), "application/octet-stream", 100);
    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe("INVALID_TYPE");
  });

  it("rejects image/gif → INVALID_TYPE", () => {
    const result = validatePdf(Buffer.alloc(100), "image/gif", 100);
    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe("INVALID_TYPE");
  });

  it("rejects empty string MIME → INVALID_TYPE", () => {
    const result = validatePdf(Buffer.alloc(100), "", 100);
    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe("INVALID_TYPE");
  });
});

describe("validatePdf — file size", () => {
  it("accepts 0 bytes", () => {
    const result = validatePdf(Buffer.alloc(0), "image/jpeg", 0);
    expect(result.valid).toBe(true);
  });

  it("accepts 1MB", () => {
    const size = 1 * 1024 * 1024;
    const result = validatePdf(Buffer.alloc(100), "image/jpeg", size);
    expect(result.valid).toBe(true);
  });

  it("accepts exactly 100MB", () => {
    const size = 100 * 1024 * 1024;
    const result = validatePdf(makePdfBuffer(), "application/pdf", size);
    expect(result.valid).toBe(true);
  });

  it("rejects 101MB → FILE_TOO_LARGE", () => {
    const size = 101 * 1024 * 1024;
    const result = validatePdf(Buffer.alloc(100), "application/pdf", size);
    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe("FILE_TOO_LARGE");
  });
});

describe("validatePdf — PDF header", () => {
  it("accepts %PDF-1.4", () => {
    const buf = makePdfBuffer("%PDF-1.4\n");
    const result = validatePdf(buf, "application/pdf", buf.length);
    expect(result.valid).toBe(true);
    expect(result.details.hasValidHeader).toBe(true);
  });

  it("accepts %PDF-2.0", () => {
    const buf = makePdfBuffer("%PDF-2.0\n");
    const result = validatePdf(buf, "application/pdf", buf.length);
    expect(result.valid).toBe(true);
    expect(result.details.hasValidHeader).toBe(true);
  });

  it("accepts %PDF-1.7", () => {
    const buf = makePdfBuffer("%PDF-1.7\n");
    const result = validatePdf(buf, "application/pdf", buf.length);
    expect(result.valid).toBe(true);
    expect(result.details.hasValidHeader).toBe(true);
  });

  it("missing header → PDF_CORRUPT", () => {
    const buf = makePdfBuffer("NOT_PDF_HEADER\n");
    const result = validatePdf(buf, "application/pdf", buf.length);
    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe("PDF_CORRUPT");
    expect(result.details.hasValidHeader).toBe(false);
  });

  it("buffer < 20 bytes → PDF_MALFORMED", () => {
    const buf = Buffer.from("short");
    const result = validatePdf(buf, "application/pdf", buf.length);
    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe("PDF_MALFORMED");
  });
});

describe("validatePdf — PDF trailer", () => {
  it("%%EOF at end accepted", () => {
    const buf = makePdfBuffer("%PDF-1.4\n", "body".repeat(10), "\n%%EOF\n");
    const result = validatePdf(buf, "application/pdf", buf.length);
    expect(result.valid).toBe(true);
    expect(result.details.hasValidTrailer).toBe(true);
  });

  it("no %%EOF → PDF_TRUNCATED", () => {
    const buf = makePdfBuffer("%PDF-1.4\n", "body".repeat(10), "\nNOEOF\n");
    const result = validatePdf(buf, "application/pdf", buf.length);
    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe("PDF_TRUNCATED");
    expect(result.details.hasValidTrailer).toBe(false);
  });

  it("%%EOF with trailing whitespace accepted", () => {
    const buf = makePdfBuffer("%PDF-1.4\n", "body".repeat(10), "\n%%EOF  \n");
    const result = validatePdf(buf, "application/pdf", buf.length);
    expect(result.valid).toBe(true);
    expect(result.details.hasValidTrailer).toBe(true);
  });

  it("%%EOF at very end without newline accepted", () => {
    const buf = makePdfBuffer("%PDF-1.4\n", "body".repeat(10), "%%EOF");
    const result = validatePdf(buf, "application/pdf", buf.length);
    expect(result.valid).toBe(true);
    expect(result.details.hasValidTrailer).toBe(true);
  });
});

describe("validatePdf — encryption", () => {
  it("/Encrypt in first 8KB → PDF_ENCRYPTED", () => {
    const body = "x".repeat(20);
    const buf = makePdfBuffer("%PDF-1.4\n", body + "/Encrypt 1 0 R", "\n%%EOF\n");
    const result = validatePdf(buf, "application/pdf", buf.length);
    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe("PDF_ENCRYPTED");
    expect(result.details.isEncrypted).toBe(true);
  });

  it("no /Encrypt passes encryption check", () => {
    const buf = makePdfBuffer("%PDF-1.4\n", "clean body content", "\n%%EOF\n");
    const result = validatePdf(buf, "application/pdf", buf.length);
    expect(result.valid).toBe(true);
    expect(result.details.isEncrypted).toBe(false);
  });

  it("large file only scans first 8KB for encryption", () => {
    const bigBody = "x".repeat(20_000);
    const buf = makePdfBuffer("%PDF-1.4\n", bigBody, "\n%%EOF\n");
    const result = validatePdf(buf, "application/pdf", buf.length);
    expect(result.valid).toBe(true);
    expect(result.details.isEncrypted).toBe(false);
  });
});

describe("validatePdf — images skip PDF checks", () => {
  it("JPEG passes without PDF validation", () => {
    const buf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, ...new Array(96).fill(0)]);
    const result = validatePdf(buf, "image/jpeg", buf.length);
    expect(result.valid).toBe(true);
    expect(result.details.hasValidHeader).toBe(true);
    expect(result.details.hasValidTrailer).toBe(true);
  });

  it("PNG passes without PDF validation", () => {
    const buf = Buffer.from([0x89, 0x50, 0x4e, 0x47, ...new Array(96).fill(0)]);
    const result = validatePdf(buf, "image/png", buf.length);
    expect(result.valid).toBe(true);
    expect(result.details.hasValidHeader).toBe(true);
    expect(result.details.hasValidTrailer).toBe(true);
  });

  it("non-image non-PDF fails with INVALID_TYPE", () => {
    const buf = Buffer.alloc(100, 0);
    const result = validatePdf(buf, "text/plain", 100);
    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe("INVALID_TYPE");
  });
});

describe("validatePdf — error codes", () => {
  it("returns INVALID_TYPE for unsupported MIME", () => {
    const result = validatePdf(Buffer.alloc(50), "text/html", 50);
    expect(result.errorCode).toBe("INVALID_TYPE");
  });

  it("returns FILE_TOO_LARGE for oversized file", () => {
    const result = validatePdf(Buffer.alloc(50), "application/pdf", 200 * 1024 * 1024);
    expect(result.errorCode).toBe("FILE_TOO_LARGE");
  });

  it("returns PDF_CORRUPT for bad header", () => {
    const buf = makePdfBuffer("garbage_data_here!!\n");
    const result = validatePdf(buf, "application/pdf", buf.length);
    expect(result.errorCode).toBe("PDF_CORRUPT");
  });

  it("returns PDF_TRUNCATED for missing trailer", () => {
    const buf = makePdfBuffer("%PDF-1.4\n", "x".repeat(20), "\nNOTEOF\n");
    const result = validatePdf(buf, "application/pdf", buf.length);
    expect(result.errorCode).toBe("PDF_TRUNCATED");
  });
});

describe("validatePdf — details shape", () => {
  it("always has mimeType in details", () => {
    const result = validatePdf(Buffer.alloc(50), "image/jpeg", 50);
    expect(result.details.mimeType).toBe("image/jpeg");
  });

  it("always has size in details", () => {
    const result = validatePdf(Buffer.alloc(50), "image/jpeg", 12345);
    expect(result.details.size).toBe(12345);
  });

  it("always has hasValidHeader in details", () => {
    const result = validatePdf(Buffer.alloc(50), "image/jpeg", 50);
    expect(typeof result.details.hasValidHeader).toBe("boolean");
  });
});

describe("validatePdf — edge cases", () => {
  it("exact 100MB is accepted", () => {
    const exact = 100 * 1024 * 1024;
    const result = validatePdf(makePdfBuffer(), "application/pdf", exact);
    expect(result.valid).toBe(true);
  });

  it("buffer exactly 20 bytes with valid header and trailer", () => {
    const buf = Buffer.from("%PDF-1.4\nabcde%%EOF\n");
    expect(buf.length).toBe(20);
    const result = validatePdf(buf, "application/pdf", buf.length);
    expect(result.valid).toBe(true);
    expect(result.details.hasValidHeader).toBe(true);
    expect(result.details.hasValidTrailer).toBe(true);
  });
});
