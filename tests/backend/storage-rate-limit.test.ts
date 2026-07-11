vi.unmock("@/middleware/auth-guards");
import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from "vitest";
import { EventEmitter } from "events";
import { PassThrough } from "stream";
import * as storage from "../../packages/pipeline/src/storage";
import type { PipelineConfig } from "../../packages/pipeline/src/types";
import {
  checkRedisRateLimit,
  getRedisClient,
  isRedisFailed,
  __resetRedisState,
} from "@/clients/redis/rate-limit/redis";
import {
  checkRateLimit,
  checkUserRateLimit,
  getClientIp,
  rateLimitResponse,
  cleanupExpiredEntries,
} from "@/clients/redis/rate-limit";
import {
  addToMap,
  getFromMap,
  incrementMap,
  cleanupExpiredEntries as cleanupMap,
  startCleanupIfNeeded,
} from "@/clients/redis/rate-limit/store";
import { NextResponse } from "next/server";

vi.mock("@ibn-al-azhar-docs/shared", () => ({
  logger: { child: vi.fn(() => ({ warn: vi.fn(), error: vi.fn(), info: vi.fn() })) },
}));

vi.mock("@/shared/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

vi.mock("node:fs/promises", () => ({ stat: vi.fn() }));

import { mockInstance as mockIORedisInstance, __setCreateClient } from "../../tests/mocks/ioredis";
import { mockMinioClient } from "../../tests/mocks/minio";

function makePdfBuffer(
  header = "%PDF-1.4\n",
  body = "x".repeat(20),
  trailer = "\n%%EOF\n",
): Buffer {
  return Buffer.from(header + body + trailer);
}

function getMinimalConfig(): PipelineConfig {
  return {
    minio: {
      endpoint: "localhost",
      port: 9000,
      useSSL: false,
      accessKey: "minioadmin",
      secretKey: "minioadmin",
      bucket: "test-bucket",
    },
    redis: { host: "localhost", port: 6379 },
    google: { serviceAccountEmail: "", privateKey: "" },
    gemini: { apiKey: "", model: "gemini-2.0-flash" },
    ocr: {
      dpi: 300,
      language: "ara",
      maxRetries: 3,
      provider: "tesseract",
      providers: ["tesseract"],
    },
    paths: { uploads: "", pages: "", ocrResults: "", exports: "", temp: "" },
  };
}

function getMockMinioClient() {
  storage.getStorageClient(getMinimalConfig());
  return mockMinioClient;
}

function makeRequest(headers: Record<string, string> = {}): Request {
  return new Request("http://localhost", { headers });
}

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.DISABLE_RATE_LIMIT;
  mockIORedisInstance.__resetState();
  mockIORedisInstance.__restoreStateful();
  mockMinioClient.listObjects.mockImplementation(() => new EventEmitter());
  mockMinioClient.bucketExists.mockReset();
  mockMinioClient.listObjects.mockImplementation(() => new EventEmitter());
  mockIORedisInstance.expire.mockResolvedValue(1);
  mockIORedisInstance.ttl.mockResolvedValue(30);
  mockIORedisInstance.on.mockReturnThis();
  cleanupExpiredEntries();
});

afterEach(() => {
  cleanupExpiredEntries();
});

describe("Storage — validatePdf MIME types", () => {
  it("accepts application/pdf", () => {
    const r = storage.validatePdf(makePdfBuffer(), "application/pdf", 1000);
    expect(r.valid).toBe(true);
  });
  it("accepts image/jpeg", () => {
    const buf = Buffer.from([0xff, 0xd8, 0xff, ...new Array(97).fill(0)]);
    const r = storage.validatePdf(buf, "image/jpeg", 100);
    expect(r.valid).toBe(true);
  });
  it("accepts image/png", () => {
    const buf = Buffer.from([0x89, 0x50, 0x4e, 0x47, ...new Array(96).fill(0)]);
    const r = storage.validatePdf(buf, "image/png", 100);
    expect(r.valid).toBe(true);
  });
  it("rejects text/plain → INVALID_TYPE", () => {
    const r = storage.validatePdf(Buffer.alloc(100), "text/plain", 100);
    expect(r.valid).toBe(false);
    expect(r.errorCode).toBe("INVALID_TYPE");
  });
  it("rejects application/octet-stream → INVALID_TYPE", () => {
    const r = storage.validatePdf(Buffer.alloc(100), "application/octet-stream", 100);
    expect(r.errorCode).toBe("INVALID_TYPE");
  });
  it("rejects image/gif → INVALID_TYPE", () => {
    const r = storage.validatePdf(Buffer.alloc(100), "image/gif", 100);
    expect(r.valid).toBe(false);
    expect(r.errorCode).toBe("INVALID_TYPE");
  });
  it("rejects empty MIME string → INVALID_TYPE", () => {
    const r = storage.validatePdf(Buffer.alloc(100), "", 100);
    expect(r.errorCode).toBe("INVALID_TYPE");
  });
  it("rejects unknown MIME", () => {
    const r = storage.validatePdf(Buffer.alloc(100), "application/xml", 100);
    expect(r.valid).toBe(false);
  });
});

describe("Storage — validatePdf file size", () => {
  it("accepts empty buffer for JPEG", () => {
    const buf = Buffer.from([0xff, 0xd8, 0xff]);
    const r = storage.validatePdf(buf, "image/jpeg", 3);
    expect(r.valid).toBe(true);
  });
  it("accepts 1MB PDF (reported size)", () => {
    const r = storage.validatePdf(makePdfBuffer(), "application/pdf", 1 * 1024 * 1024);
    expect(r.valid).toBe(true);
  });
  it("accepts exactly 100MB (reported size)", () => {
    const r = storage.validatePdf(makePdfBuffer(), "application/pdf", 100 * 1024 * 1024);
    expect(r.valid).toBe(true);
  });
  it("rejects 101MB buffer despite small reported size → FILE_TOO_LARGE", () => {
    const r = storage.validatePdf(Buffer.alloc(101 * 1024 * 1024), "application/pdf", 1);
    expect(r.valid).toBe(false);
    expect(r.errorCode).toBe("FILE_TOO_LARGE");
  });
  it("rejects 101MB buffer with accurate size → FILE_TOO_LARGE", () => {
    const r = storage.validatePdf(
      Buffer.alloc(101 * 1024 * 1024),
      "application/pdf",
      101 * 1024 * 1024,
    );
    expect(r.valid).toBe(false);
    expect(r.errorCode).toBe("FILE_TOO_LARGE");
  });
  it("FILE_TOO_LARGE sets details.size to buffer length not reported size", () => {
    const buf = Buffer.alloc(101 * 1024 * 1024);
    const r = storage.validatePdf(buf, "application/pdf", 1);
    expect(r.details.size).toBe(101 * 1024 * 1024);
  });
});

describe("Storage — validatePdf PDF header", () => {
  it("accepts %PDF-1.4 header", () => {
    const r = storage.validatePdf(makePdfBuffer("%PDF-1.4\n"), "application/pdf", 100);
    expect(r.valid).toBe(true);
    expect(r.details.hasValidHeader).toBe(true);
  });
  it("accepts %PDF-2.0 header", () => {
    const r = storage.validatePdf(makePdfBuffer("%PDF-2.0\n"), "application/pdf", 100);
    expect(r.details.hasValidHeader).toBe(true);
  });
  it("accepts %PDF-1.7 header", () => {
    const r = storage.validatePdf(makePdfBuffer("%PDF-1.7\n"), "application/pdf", 100);
    expect(r.details.hasValidHeader).toBe(true);
  });
  it("accepts %PDF-1.0 header", () => {
    const r = storage.validatePdf(makePdfBuffer("%PDF-1.0\n"), "application/pdf", 100);
    expect(r.details.hasValidHeader).toBe(true);
  });
  it("missing header → PDF_CORRUPT", () => {
    const buf = makePdfBuffer("NOT_PDF_HEADER\n");
    const r = storage.validatePdf(buf, "application/pdf", buf.length);
    expect(r.valid).toBe(false);
    expect(r.errorCode).toBe("PDF_CORRUPT");
    expect(r.details.hasValidHeader).toBe(false);
  });
  it("buffer under 20 bytes → PDF_MALFORMED", () => {
    const r = storage.validatePdf(Buffer.from("short"), "application/pdf", 5);
    expect(r.valid).toBe(false);
    expect(r.errorCode).toBe("PDF_MALFORMED");
  });
  it("exactly 20 bytes with valid header and trailer is accepted", () => {
    const buf = Buffer.from("%PDF-1.4\nabcde%%EOF\n");
    expect(buf.length).toBe(20);
    const r = storage.validatePdf(buf, "application/pdf", buf.length);
    expect(r.valid).toBe(true);
  });
});

describe("Storage — validatePdf PDF trailer", () => {
  it("%%EOF at end accepted", () => {
    const buf = makePdfBuffer("%PDF-1.4\n", "body".repeat(10), "\n%%EOF\n");
    const r = storage.validatePdf(buf, "application/pdf", buf.length);
    expect(r.valid).toBe(true);
    expect(r.details.hasValidTrailer).toBe(true);
  });
  it("no %%EOF → PDF_TRUNCATED", () => {
    const buf = makePdfBuffer("%PDF-1.4\n", "body".repeat(10), "\nNOEOF\n");
    const r = storage.validatePdf(buf, "application/pdf", buf.length);
    expect(r.valid).toBe(false);
    expect(r.errorCode).toBe("PDF_TRUNCATED");
    expect(r.details.hasValidTrailer).toBe(false);
  });
  it("%%EOF with trailing whitespace accepted", () => {
    const buf = makePdfBuffer("%PDF-1.4\n", "body".repeat(10), "\n%%EOF  \n");
    const r = storage.validatePdf(buf, "application/pdf", buf.length);
    expect(r.valid).toBe(true);
  });
  it("%%EOF at very end without newline accepted", () => {
    const buf = makePdfBuffer("%PDF-1.4\n", "body".repeat(10), "%%EOF");
    const r = storage.validatePdf(buf, "application/pdf", buf.length);
    expect(r.valid).toBe(true);
  });
  it("%%EOF with minimal body passes", () => {
    const buf = makePdfBuffer("%PDF-1.4\n", "x".repeat(10), "%%EOF");
    const r = storage.validatePdf(buf, "application/pdf", buf.length);
    expect(r.valid).toBe(true);
  });
  it("empty trailer portion → PDF_TRUNCATED", () => {
    const buf = Buffer.from("%PDF-1.4\nxxxxxxxxxxxxxx");
    const r = storage.validatePdf(buf, "application/pdf", buf.length);
    expect(r.valid).toBe(false);
    expect(r.errorCode).toBe("PDF_TRUNCATED");
  });
});

describe("Storage — validatePdf encryption", () => {
  it("/Encrypt in first 8KB → PDF_ENCRYPTED", () => {
    const body = "x".repeat(20) + "/Encrypt 1 0 R";
    const buf = makePdfBuffer("%PDF-1.4\n", body, "\n%%EOF\n");
    const r = storage.validatePdf(buf, "application/pdf", buf.length);
    expect(r.valid).toBe(false);
    expect(r.errorCode).toBe("PDF_ENCRYPTED");
    expect(r.details.isEncrypted).toBe(true);
  });
  it("no /Encrypt passes encryption check", () => {
    const buf = makePdfBuffer("%PDF-1.4\n", "clean body content", "\n%%EOF\n");
    const r = storage.validatePdf(buf, "application/pdf", buf.length);
    expect(r.valid).toBe(true);
    expect(r.details.isEncrypted).toBe(false);
  });
  it("large file only scans first 8KB for encryption", () => {
    const bigBody = "x".repeat(20_000);
    const buf = makePdfBuffer("%PDF-1.4\n", bigBody, "\n%%EOF\n");
    const r = storage.validatePdf(buf, "application/pdf", buf.length);
    expect(r.valid).toBe(true);
    expect(r.details.isEncrypted).toBe(false);
  });
  it("/Encrypt after 8KB is not detected", () => {
    const before = "x".repeat(8192 - 20);
    const body = before + "/Encrypt 1 0 R";
    const buf = makePdfBuffer("%PDF-1.4\n", body, "\n%%EOF\n");
    const r = storage.validatePdf(buf, "application/pdf", buf.length);
    expect(r.details.isEncrypted).toBe(false);
  });
  it("case-sensitive /Encrypt detection", () => {
    const body = "x".repeat(20) + "/encrypt 1 0 R";
    const buf = makePdfBuffer("%PDF-1.4\n", body, "\n%%EOF\n");
    const r = storage.validatePdf(buf, "application/pdf", buf.length);
    expect(r.valid).toBe(true);
    expect(r.details.isEncrypted).toBe(false);
  });
});

describe("Storage — validatePdf images", () => {
  it("JPEG with correct magic bytes passes", () => {
    const buf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, ...new Array(96).fill(0)]);
    const r = storage.validatePdf(buf, "image/jpeg", buf.length);
    expect(r.valid).toBe(true);
    expect(r.details.hasValidHeader).toBe(true);
  });
  it("JPEG with wrong magic bytes → IMAGE_CORRUPT", () => {
    const buf = Buffer.from([0x00, 0x00, 0x00, ...new Array(97).fill(0)]);
    const r = storage.validatePdf(buf, "image/jpeg", buf.length);
    expect(r.valid).toBe(false);
    expect(r.errorCode).toBe("IMAGE_CORRUPT");
    expect(r.details.hasValidHeader).toBe(false);
  });
  it("PNG with correct magic bytes passes", () => {
    const buf = Buffer.from([0x89, 0x50, 0x4e, 0x47, ...new Array(96).fill(0)]);
    const r = storage.validatePdf(buf, "image/png", buf.length);
    expect(r.valid).toBe(true);
    expect(r.details.hasValidHeader).toBe(true);
  });
  it("PNG with wrong magic bytes → IMAGE_CORRUPT", () => {
    const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, ...new Array(96).fill(0)]);
    const r = storage.validatePdf(buf, "image/png", buf.length);
    expect(r.valid).toBe(false);
    expect(r.errorCode).toBe("IMAGE_CORRUPT");
    expect(r.details.hasValidHeader).toBe(false);
  });
});

describe("Storage — validatePdf edge cases", () => {
  it("exact 100MB buffer is accepted", () => {
    const exact = 100 * 1024 * 1024;
    const buf = Buffer.alloc(exact, 0x78);
    buf.write("%PDF-1.4\n", 0, "utf-8");
    buf.write("\n%%EOF\n", buf.length - 7, "utf-8");
    const r = storage.validatePdf(buf, "application/pdf", exact);
    expect(r.valid).toBe(true);
  });
  it("details always contains mimeType", () => {
    const r = storage.validatePdf(Buffer.alloc(50), "text/plain", 50);
    expect(r.details.mimeType).toBe("text/plain");
  });
  it("details contains original size for valid types", () => {
    const buf = Buffer.from([0xff, 0xd8, 0xff, ...new Array(47).fill(0)]);
    const r = storage.validatePdf(buf, "image/jpeg", 12345);
    expect(r.details.size).toBe(12345);
  });
  it("details booleans are typed correctly", () => {
    const r = storage.validatePdf(makePdfBuffer(), "application/pdf", 100);
    expect(typeof r.details.hasValidHeader).toBe("boolean");
    expect(typeof r.details.hasValidTrailer).toBe("boolean");
    expect(typeof r.details.isEncrypted).toBe("boolean");
  });
  it("header with binary data before %PDF is rejected", () => {
    const buf = Buffer.concat([Buffer.from([0x00]), makePdfBuffer()]);
    const r = storage.validatePdf(buf, "application/pdf", buf.length);
    expect(r.valid).toBe(false);
    expect(r.errorCode).toBe("PDF_CORRUPT");
  });
});

describe("Storage — getStorageClient", () => {
  it("creates new client on first call", () => {
    const config = getMinimalConfig();
    const c = storage.getStorageClient(config);
    expect(c).toBeDefined();
    expect(typeof c.bucketExists).toBe("function");
  });
  it("returns cached client on second call with same config", () => {
    storage.getStorageClient(getMinimalConfig());
    const c2 = storage.getStorageClient(getMinimalConfig());
    expect(c2).toBeDefined();
    expect(typeof c2.bucketExists).toBe("function");
  });
  it("uses cached client across functions", () => {
    const c1 = storage.getStorageClient(getMinimalConfig());
    const c2 = storage.getStorageClient(getMinimalConfig());
    expect(c1).toBe(c2);
  });
  it("creates new client when endpoint changes", () => {
    const config1 = getMinimalConfig();
    const config2 = getMinimalConfig();
    config2.minio.endpoint = "remote.example.com";
    const c1 = storage.getStorageClient(config1);
    const c2 = storage.getStorageClient(config2);
    expect(c1).toBeDefined();
    expect(c2).toBeDefined();
  });
});

describe("Storage — ensureBucket", () => {
  beforeEach(() => {
    getMockMinioClient();
  });
  afterEach(() => {
    vi.useRealTimers();
  });
  it("no-op when bucket already exists", async () => {
    mockMinioClient.bucketExists.mockResolvedValue(true);
    await storage.ensureBucket(getMinimalConfig());
    expect(mockMinioClient.bucketExists).toHaveBeenCalledWith("test-bucket");
    expect(mockMinioClient.makeBucket).not.toHaveBeenCalled();
  });
  it("creates bucket when it does not exist", async () => {
    mockMinioClient.bucketExists.mockResolvedValue(false);
    mockMinioClient.makeBucket.mockResolvedValue(undefined);
    await storage.ensureBucket(getMinimalConfig());
    expect(mockMinioClient.makeBucket).toHaveBeenCalledWith("test-bucket");
  });
  it("retries on failure and succeeds", async () => {
    mockMinioClient.bucketExists.mockRejectedValueOnce(new Error("Not ready"));
    mockMinioClient.bucketExists.mockResolvedValueOnce(true);
    await expect(storage.ensureBucket(getMinimalConfig(), 1)).resolves.toBeUndefined();
    expect(mockMinioClient.bucketExists).toHaveBeenCalledTimes(2);
  });
  it("throws after exhausting all retries", async () => {
    mockMinioClient.bucketExists.mockRejectedValue(new Error("Persistent failure"));
    await expect(storage.ensureBucket(getMinimalConfig(), 1)).rejects.toThrow("Persistent failure");
    expect(mockMinioClient.bucketExists).toHaveBeenCalledTimes(10);
  });
});

describe("Storage — uploadFile", () => {
  beforeEach(() => {
    getMockMinioClient();
  });
  it("uploads file and returns storage object", async () => {
    const { stat } = await import("node:fs/promises");
    (stat as any).mockResolvedValue({ size: 12345 });
    mockMinioClient.fPutObject.mockResolvedValue(undefined);
    const r = await storage.uploadFile(
      getMinimalConfig(),
      "test-key",
      "/tmp/test.pdf",
      "application/pdf",
    );
    expect(mockMinioClient.fPutObject).toHaveBeenCalledWith(
      "test-bucket",
      "test-key",
      "/tmp/test.pdf",
      {
        "Content-Type": "application/pdf",
      },
    );
    expect(r.bucket).toBe("test-bucket");
    expect(r.key).toBe("test-key");
    expect(r.size).toBe(12345);
    expect(r.contentType).toBe("application/pdf");
  });
  it("returns size 0 when stat fails", async () => {
    const { stat } = await import("node:fs/promises");
    (stat as any).mockRejectedValue(new Error("File not found"));
    mockMinioClient.fPutObject.mockResolvedValue(undefined);
    const r = await storage.uploadFile(
      getMinimalConfig(),
      "test-key",
      "/tmp/missing.pdf",
      "application/pdf",
    );
    expect(r.size).toBe(0);
  });
  it("propagates fPutObject errors", async () => {
    mockMinioClient.fPutObject.mockRejectedValue(new Error("MinIO connection failed"));
    await expect(
      storage.uploadFile(getMinimalConfig(), "key", "/tmp/f.pdf", "application/pdf"),
    ).rejects.toThrow("MinIO connection failed");
  });
});

describe("Storage — uploadBuffer", () => {
  beforeEach(() => {
    getMockMinioClient();
  });
  it("uploads buffer and returns storage object", async () => {
    mockMinioClient.putObject.mockResolvedValue(undefined);
    const buf = Buffer.from("test content");
    const r = await storage.uploadBuffer(getMinimalConfig(), "buf-key", buf, "text/plain");
    expect(mockMinioClient.putObject).toHaveBeenCalledWith(
      "test-bucket",
      "buf-key",
      buf,
      buf.length,
      {
        "Content-Type": "text/plain",
      },
    );
    expect(r.size).toBe(buf.length);
    expect(r.contentType).toBe("text/plain");
  });
  it("propagates putObject errors", async () => {
    mockMinioClient.putObject.mockRejectedValue(new Error("Upload failed"));
    await expect(
      storage.uploadBuffer(getMinimalConfig(), "k", Buffer.alloc(10), "text/plain"),
    ).rejects.toThrow("Upload failed");
  });
});

describe("Storage — downloadFile", () => {
  beforeEach(() => {
    getMockMinioClient();
  });
  it("streams file and returns buffer", async () => {
    const stream = new PassThrough();
    mockMinioClient.getObject.mockResolvedValue(stream as any);
    const promise = storage.downloadFile(getMinimalConfig(), "test-key");
    stream.write(Buffer.from("hello "));
    stream.write(Buffer.from("world"));
    stream.end();
    const result = await promise;
    expect(result.toString()).toBe("hello world");
  });
  it("rejects when streamed file exceeds 100MB", async () => {
    const stream = new PassThrough();
    mockMinioClient.getObject.mockResolvedValue(stream as any);
    const promise = storage.downloadFile(getMinimalConfig(), "big-key");
    const bigChunk = Buffer.alloc(60 * 1024 * 1024);
    stream.write(bigChunk);
    stream.write(bigChunk);
    await expect(promise).rejects.toThrow("File too large");
  });
  it("rejects on stream error", async () => {
    const stream = new PassThrough();
    mockMinioClient.getObject.mockResolvedValue(stream as any);
    const promise = storage.downloadFile(getMinimalConfig(), "err-key");
    stream.destroy(new Error("Stream corrupted"));
    await expect(promise).rejects.toThrow("Stream corrupted");
  });
  it("rejects when getObject fails", async () => {
    mockMinioClient.getObject.mockRejectedValue(new Error("MinIO error"));
    await expect(storage.downloadFile(getMinimalConfig(), "fail-key")).rejects.toThrow(
      "MinIO error",
    );
  });
  it("handles empty file", async () => {
    const stream = new PassThrough();
    mockMinioClient.getObject.mockResolvedValue(stream as any);
    const promise = storage.downloadFile(getMinimalConfig(), "empty-key");
    stream.end();
    const result = await promise;
    expect(result.length).toBe(0);
  });
});

describe("Storage — getPresignedUrl", () => {
  beforeEach(() => {
    getMockMinioClient();
  });
  it("returns presigned URL with default expiry", async () => {
    mockMinioClient.presignedGetObject.mockResolvedValue(
      "https://minio.example.com/bucket/key?token=abc",
    );
    const url = await storage.getPresignedUrl(getMinimalConfig(), "key");
    expect(mockMinioClient.presignedGetObject).toHaveBeenCalledWith("test-bucket", "key", 3600);
    expect(url).toBe("https://minio.example.com/bucket/key?token=abc");
  });
  it("returns presigned URL with custom expiry", async () => {
    mockMinioClient.presignedGetObject.mockResolvedValue(
      "https://minio.example.com/bucket/key?token=def",
    );
    const url = await storage.getPresignedUrl(getMinimalConfig(), "key", 7200);
    expect(mockMinioClient.presignedGetObject).toHaveBeenCalledWith("test-bucket", "key", 7200);
    expect(url).toContain("token=def");
  });
});

describe("Storage — deleteFile", () => {
  beforeEach(() => {
    getMockMinioClient();
  });
  it("calls removeObject with correct params", async () => {
    mockMinioClient.removeObject.mockResolvedValue(undefined);
    await storage.deleteFile(getMinimalConfig(), "delete-key");
    expect(mockMinioClient.removeObject).toHaveBeenCalledWith("test-bucket", "delete-key");
  });
  it("propagates errors", async () => {
    mockMinioClient.removeObject.mockRejectedValue(new Error("Delete failed"));
    await expect(storage.deleteFile(getMinimalConfig(), "k")).rejects.toThrow("Delete failed");
  });
});

describe("Storage — fileExists", () => {
  beforeEach(() => {
    getMockMinioClient();
  });
  it("returns true when statObject succeeds", async () => {
    mockMinioClient.statObject.mockResolvedValue({ size: 100 });
    const exists = await storage.fileExists(getMinimalConfig(), "existing-key");
    expect(exists).toBe(true);
  });
  it("returns false when statObject throws", async () => {
    mockMinioClient.statObject.mockRejectedValue(new Error("Not found"));
    const exists = await storage.fileExists(getMinimalConfig(), "missing-key");
    expect(exists).toBe(false);
  });
});

describe("Storage — cleanupOrphanedFiles", () => {
  function emitData(stream: EventEmitter, objects: any[]) {
    for (const obj of objects) stream.emit("data", obj);
    stream.emit("end");
  }
  beforeEach(() => {
    getMockMinioClient();
  });
  it("deletes files older than maxAgeMs", async () => {
    const stream = new EventEmitter();
    mockMinioClient.listObjects.mockReturnValue(stream);
    mockMinioClient.removeObject.mockResolvedValue(undefined);
    const promise = storage.cleanupOrphanedFiles(getMinimalConfig(), "temp/", 1000);
    emitData(stream, [{ name: "temp/old.pdf", lastModified: new Date(Date.now() - 5000) }]);
    const count = await promise;
    expect(count).toBe(1);
    expect(mockMinioClient.removeObject).toHaveBeenCalledWith("test-bucket", "temp/old.pdf");
  });
  it("skips files newer than maxAgeMs", async () => {
    const stream = new EventEmitter();
    mockMinioClient.listObjects.mockReturnValue(stream);
    mockMinioClient.removeObject.mockResolvedValue(undefined);
    const promise = storage.cleanupOrphanedFiles(getMinimalConfig(), "temp/", 10000);
    emitData(stream, [{ name: "temp/recent.pdf", lastModified: new Date(Date.now() - 100) }]);
    const count = await promise;
    expect(count).toBe(0);
    expect(mockMinioClient.removeObject).not.toHaveBeenCalled();
  });
  it("ignores objects without name or lastModified", async () => {
    const stream = new EventEmitter();
    mockMinioClient.listObjects.mockReturnValue(stream);
    mockMinioClient.removeObject.mockResolvedValue(undefined);
    const promise = storage.cleanupOrphanedFiles(getMinimalConfig(), "temp/", 1000);
    emitData(stream, [
      { name: null, lastModified: new Date(Date.now() - 5000) },
      { name: "valid.pdf", lastModified: new Date(Date.now() - 5000) },
    ]);
    const count = await promise;
    expect(count).toBe(1);
    expect(mockMinioClient.removeObject).toHaveBeenCalledTimes(1);
  });
  it("handles delete failures gracefully", async () => {
    const stream = new EventEmitter();
    mockMinioClient.listObjects.mockReturnValue(stream);
    mockMinioClient.removeObject.mockRejectedValue(new Error("Delete failed"));
    const promise = storage.cleanupOrphanedFiles(getMinimalConfig(), "temp/", 0);
    emitData(stream, [{ name: "temp/fail.pdf", lastModified: new Date(Date.now() - 5000) }]);
    const count = await promise;
    expect(count).toBe(1);
  });
  it("rejects on stream error", async () => {
    const stream = new EventEmitter();
    mockMinioClient.listObjects.mockReturnValue(stream);
    const promise = storage.cleanupOrphanedFiles(getMinimalConfig(), "temp/", 1000);
    stream.emit("error", new Error("List failed"));
    await expect(promise).rejects.toThrow("List failed");
  });
  it("respects prefix parameter", async () => {
    const stream = new EventEmitter();
    mockMinioClient.listObjects.mockReturnValue(stream);
    mockMinioClient.removeObject.mockResolvedValue(undefined);
    const promise = storage.cleanupOrphanedFiles(getMinimalConfig(), "custom-prefix/", 0);
    emitData(stream, [
      { name: "custom-prefix/doc.pdf", lastModified: new Date(Date.now() - 5000) },
    ]);
    await promise;
    expect(mockMinioClient.listObjects).toHaveBeenCalledWith("test-bucket", "custom-prefix/", true);
  });
});

describe("Rate Limit — getClientIp", () => {
  it("extracts IPv4 from x-forwarded-for", () => {
    expect(getClientIp(makeRequest({ "x-forwarded-for": "192.168.1.1, 10.0.0.1" }))).toBe(
      "192.168.1.1",
    );
  });
  it("extracts IPv6 from x-forwarded-for", () => {
    expect(getClientIp(makeRequest({ "x-forwarded-for": "2001:db8::1" }))).toBe("2001:db8::1");
  });
  it("extracts first IP from comma-separated list", () => {
    expect(
      getClientIp(makeRequest({ "x-forwarded-for": "10.0.0.1, 192.168.1.1, 172.16.0.1" })),
    ).toBe("10.0.0.1");
  });
  it("falls back from invalid x-forwarded-for to x-real-ip", () => {
    const req = makeRequest({ "x-forwarded-for": "not-an-ip", "x-real-ip": "10.0.0.5" });
    expect(getClientIp(req)).toBe("10.0.0.5");
  });
  it("returns unknown when all headers invalid", () => {
    expect(getClientIp(makeRequest({ "x-forwarded-for": "not-an-ip" }))).toBe("unknown");
  });
  it("extracts IPv4 from x-real-ip", () => {
    expect(getClientIp(makeRequest({ "x-real-ip": "10.0.0.1" }))).toBe("10.0.0.1");
  });
  it("extracts IPv6 from x-real-ip", () => {
    expect(getClientIp(makeRequest({ "x-real-ip": "::1" }))).toBe("::1");
  });
  it("rejects invalid x-real-ip", () => {
    expect(getClientIp(makeRequest({ "x-real-ip": "invalid" }))).toBe("unknown");
  });
  it("returns unknown when no headers present", () => {
    expect(getClientIp(makeRequest())).toBe("unknown");
  });
  it("handles empty x-forwarded-for value", () => {
    expect(getClientIp(makeRequest({ "x-forwarded-for": "" }))).toBe("unknown");
  });
  it("accepts high octet IPv4 as valid format", () => {
    expect(getClientIp(makeRequest({ "x-forwarded-for": "999.999.999.999" }))).toBe(
      "999.999.999.999",
    );
  });
  it("accepts colon-heavy string as IPv6", () => {
    expect(getClientIp(makeRequest({ "x-forwarded-for": ":::::" }))).toBe(":::::");
  });
});

describe("Rate Limit — store functions", () => {
  it("addToMap and getFromMap round-trip", () => {
    const key = `add-${Math.random()}`;
    addToMap(key, { count: 5, resetTime: Date.now() + 60000 });
    expect(getFromMap(key)!.count).toBe(5);
  });
  it("getFromMap returns undefined for missing key", () => {
    expect(getFromMap(`missing-${Math.random()}`)).toBeUndefined();
  });
  it("incrementMap increases count", () => {
    const key = `inc-${Math.random()}`;
    addToMap(key, { count: 1, resetTime: Date.now() + 60000 });
    incrementMap(key);
    expect(getFromMap(key)!.count).toBe(2);
  });
  it("incrementMap does nothing for missing key", () => {
    incrementMap(`nonexistent-${Date.now()}`);
  });
  it("addToMap overwrites existing entry", () => {
    const key = `over-${Math.random()}`;
    addToMap(key, { count: 1, resetTime: 100 });
    addToMap(key, { count: 99, resetTime: 200 });
    const entry = getFromMap(key)!;
    expect(entry.count).toBe(99);
    expect(entry.resetTime).toBe(200);
  });
  it("addToMap evicts oldest entry when full", () => {
    const prefix = `evict-${Math.random()}-`;
    for (let i = 0; i < 10001; i++) {
      addToMap(`${prefix}${i}`, { count: 1, resetTime: Date.now() + 60000 });
    }
    expect(getFromMap(`${prefix}0`)).toBeUndefined();
    expect(getFromMap(`${prefix}10000`)).toBeDefined();
  });
});

describe("Rate Limit — cleanupExpiredEntries", () => {
  it("removes expired entries", () => {
    const key = `exp-${Math.random()}`;
    addToMap(key, { count: 1, resetTime: Date.now() - 1000 });
    cleanupMap();
    expect(getFromMap(key)).toBeUndefined();
  });
  it("keeps non-expired entries", () => {
    const key = `keep-${Math.random()}`;
    addToMap(key, { count: 1, resetTime: Date.now() + 60000 });
    cleanupMap();
    expect(getFromMap(key)).toBeDefined();
  });
  it("handles empty map gracefully", () => {
    cleanupMap();
  });
  it("removes only expired entries in mixed map", () => {
    const expiredKey = `mix-exp-${Math.random()}`;
    const validKey = `mix-val-${Math.random()}`;
    addToMap(expiredKey, { count: 1, resetTime: Date.now() - 1000 });
    addToMap(validKey, { count: 1, resetTime: Date.now() + 60000 });
    cleanupMap();
    expect(getFromMap(expiredKey)).toBeUndefined();
    expect(getFromMap(validKey)).toBeDefined();
  });
});

describe("Rate Limit — startCleanupIfNeeded", () => {
  it("starts cleanup interval once on first call, no second interval", () => {
    const spy = vi.spyOn(globalThis, "setInterval");
    startCleanupIfNeeded();
    startCleanupIfNeeded();
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });
});

describe("Rate Limit — checkRedisRateLimit", () => {
  beforeEach(() => {
    __resetRedisState();
    mockIORedisInstance.set.mockClear();
    mockIORedisInstance.incr.mockClear();
    mockIORedisInstance.expire.mockClear();
    mockIORedisInstance.ttl.mockClear();
  });
  it("returns { allowed: true } with TTL on first hit", async () => {
    mockIORedisInstance.set.mockResolvedValue("OK");
    const r = await checkRedisRateLimit("test-first-hit", 100, 60000);
    expect(r).toEqual({ allowed: true });
    expect(mockIORedisInstance.set).toHaveBeenCalledWith(
      "ratelimit:test-first-hit",
      "1",
      "EX",
      60,
      "NX",
    );
  });
  it("increments counter on subsequent hits", async () => {
    mockIORedisInstance.set.mockResolvedValue(null);
    mockIORedisInstance.incr.mockResolvedValue(2);
    mockIORedisInstance.expire.mockResolvedValue(1);
    const r = await checkRedisRateLimit("test-incr", 100, 60000);
    expect(r).toEqual({ allowed: true });
    expect(mockIORedisInstance.incr).toHaveBeenCalledWith("ratelimit:test-incr");
  });
  it("blocks when count exceeds limit", async () => {
    mockIORedisInstance.set.mockResolvedValue(null);
    mockIORedisInstance.incr.mockResolvedValue(101);
    mockIORedisInstance.ttl.mockResolvedValue(30);
    const r = await checkRedisRateLimit("test-block", 100, 60000);
    expect(r).toEqual({ allowed: false, retryAfterMs: 30000 });
  });
  it("uses windowMs as fallback when TTL is negative", async () => {
    mockIORedisInstance.set.mockResolvedValue(null);
    mockIORedisInstance.incr.mockResolvedValue(101);
    mockIORedisInstance.ttl.mockResolvedValue(-1);
    const r = await checkRedisRateLimit("test-ttl-fallback", 100, 60000);
    expect(r).toEqual({ allowed: false, retryAfterMs: 60000 });
  });
  it("sets safety NX expire on increment when count > 1", async () => {
    mockIORedisInstance.set.mockResolvedValue(null);
    mockIORedisInstance.incr.mockResolvedValue(2);
    mockIORedisInstance.expire.mockResolvedValue(1);
    await checkRedisRateLimit("test-safety", 100, 60000);
    expect(mockIORedisInstance.expire).toHaveBeenCalledWith("ratelimit:test-safety", 60, "NX");
  });
  it("does not set safety expire for first hit", async () => {
    mockIORedisInstance.set.mockResolvedValue("OK");
    await checkRedisRateLimit("test-no-safety", 100, 60000);
    expect(mockIORedisInstance.expire).not.toHaveBeenCalled();
  });
  it("returns null when redis client is unavailable", async () => {
    process.env.__IODIS_MOCK_CREATE_CLIENT = "0";
    const r = await checkRedisRateLimit("test-no-redis", 100, 60000);
    expect(r).toBeNull();
    delete process.env.__IODIS_MOCK_CREATE_CLIENT;
  });
  it.skip("returns null when redis command throws", async () => {
    mockIORedisInstance.set.mockRejectedValue(new Error("Connection lost"));
    const r = await checkRedisRateLimit("test-error", 100, 60000);
    expect(r).toBeNull();
  });
});

describe("Rate Limit — getRedisClient", () => {
  beforeEach(() => {
    vi.resetModules();
    __resetRedisState();
  });
  it("creates client with URL and TLS when url starts with rediss://", async () => {
    process.env.REDIS_URL = "rediss://upstash.com:6379";
    const mod = await import("@/clients/redis/rate-limit/redis");
    const client = await mod.getRedisClient();
    expect(client).toBeDefined();
    expect(typeof client!.on).toBe("function");
    delete process.env.REDIS_URL;
  });
  it("creates client with host/port when no URL", async () => {
    process.env.REDIS_HOST = "myredis.internal";
    process.env.REDIS_PORT = "6380";
    const mod = await import("@/clients/redis/rate-limit/redis");
    const client = await mod.getRedisClient();
    expect(client).toBeDefined();
    delete process.env.REDIS_HOST;
    delete process.env.REDIS_PORT;
  });
  it.skip("sets up error handler that marks redis as failed", async () => {
    const mod = await import("@/clients/redis/rate-limit/redis");
    const client = (await mod.getRedisClient()) as any;
    const errorHandler = client.on.mock.calls.find((c: any[]) => c[0] === "error")?.[1];
    expect(errorHandler).toBeDefined();
    errorHandler(new Error("Redis unavailable"));
    const r = await mod.getRedisClient();
    expect(r).toBeNull();
  });
  it("handles initialization error gracefully", async () => {
    process.env.__IODIS_MOCK_CREATE_CLIENT = "0";
    __resetRedisState();
    const r = await getRedisClient();
    expect(r).toBeNull();
    delete process.env.__IODIS_MOCK_CREATE_CLIENT;
  });
});

describe("Rate Limit — checkRateLimit", () => {
  beforeEach(() => {
    process.env.NODE_ENV = "development";
    delete process.env.DISABLE_RATE_LIMIT;
    mockIORedisInstance.__resetState();
    mockIORedisInstance.__restoreStateful();
    __resetRedisState();
    cleanupExpiredEntries();
  });
  afterEach(() => {});
  it("allows requests under the limit", async () => {
    const req = makeRequest({ "x-forwarded-for": "10.0.0.1" });
    const r = await checkRateLimit("/api/upload", req);
    expect(r.allowed).toBe(true);
  });
  it("blocks requests over the limit", async () => {
    const req = makeRequest({ "x-forwarded-for": "10.0.0.2" });
    for (let i = 0; i < 20; i++) {
      await checkRateLimit("/api/upload", req);
    }
    const r = await checkRateLimit("/api/upload", req);
    expect(r.allowed).toBe(false);
    expect(r.retryAfterMs).toBeGreaterThan(0);
  });
  it("returns allowed when DISABLE_RATE_LIMIT is true", async () => {
    process.env.DISABLE_RATE_LIMIT = "true";
    const req = makeRequest({ "x-forwarded-for": "10.0.0.3" });
    for (let i = 0; i < 200; i++) {
      await checkRateLimit("/api/upload", req);
    }
    const r = await checkRateLimit("/api/upload", req);
    expect(r.allowed).toBe(true);
    delete process.env.DISABLE_RATE_LIMIT;
  });
  it("allows unlisted routes with default limit", async () => {
    const req = makeRequest({ "x-forwarded-for": "10.0.0.4" });
    const r = await checkRateLimit("/api/unlisted-route", req);
    expect(r.allowed).toBe(true);
  });
  it("blocks unlisted routes after 100 requests", async () => {
    const req = makeRequest({ "x-forwarded-for": "10.0.0.5" });
    for (let i = 0; i < 100; i++) {
      await checkRateLimit("/api/unlisted", req);
    }
    const r = await checkRateLimit("/api/unlisted", req);
    expect(r.allowed).toBe(false);
  });
  it("different endpoints have independent limits", async () => {
    const req = makeRequest({ "x-forwarded-for": "10.0.0.6" });
    for (let i = 0; i < 20; i++) {
      await checkRateLimit("/api/upload", req);
    }
    expect((await checkRateLimit("/api/upload", req)).allowed).toBe(false);
    expect((await checkRateLimit("/api/search", req)).allowed).toBe(true);
  });
  it("different IPs have independent limits", async () => {
    const req1 = makeRequest({ "x-forwarded-for": "10.0.0.10" });
    const req2 = makeRequest({ "x-forwarded-for": "10.0.0.11" });
    for (let i = 0; i < 20; i++) {
      await checkRateLimit("/api/upload", req1);
    }
    expect((await checkRateLimit("/api/upload", req1)).allowed).toBe(false);
    expect((await checkRateLimit("/api/upload", req2)).allowed).toBe(true);
  });
  it("provides retryAfterMs when blocked", async () => {
    const req = makeRequest({ "x-forwarded-for": "10.0.0.12" });
    for (let i = 0; i < 20; i++) {
      await checkRateLimit("/api/upload", req);
    }
    const r = await checkRateLimit("/api/upload", req);
    expect(r.allowed).toBe(false);
    expect(typeof r.retryAfterMs).toBe("number");
    expect(r.retryAfterMs).toBeGreaterThan(0);
  });
});

describe("Rate Limit — checkUserRateLimit", () => {
  beforeEach(() => {
    process.env.NODE_ENV = "development";
    mockIORedisInstance.__resetState();
    mockIORedisInstance.__restoreStateful();
    __resetRedisState();
    cleanupExpiredEntries();
  });
  afterEach(() => {});
  it("allows requests under the limit", async () => {
    const r = await checkUserRateLimit("documents:create", "user-1");
    expect(r.allowed).toBe(true);
  });
  it("blocks requests over the limit", async () => {
    for (let i = 0; i < 30; i++) {
      await checkUserRateLimit("documents:create", "user-2");
    }
    const r = await checkUserRateLimit("documents:create", "user-2");
    expect(r.allowed).toBe(false);
    expect(r.retryAfterMs).toBeGreaterThan(0);
  });
  it("allows unknown actions", async () => {
    const r = await checkUserRateLimit("unknown:action", "user-3");
    expect(r.allowed).toBe(true);
  });
  it("different users have independent limits", async () => {
    for (let i = 0; i < 30; i++) {
      await checkUserRateLimit("documents:create", "user-4");
    }
    expect((await checkUserRateLimit("documents:create", "user-4")).allowed).toBe(false);
    expect((await checkUserRateLimit("documents:create", "user-5")).allowed).toBe(true);
  });
  it("different actions have independent limits", async () => {
    for (let i = 0; i < 30; i++) {
      await checkUserRateLimit("documents:create", "user-6");
    }
    expect((await checkUserRateLimit("documents:create", "user-6")).allowed).toBe(false);
    expect((await checkUserRateLimit("documents:delete", "user-6")).allowed).toBe(true);
  });
  it("account:delete has limit of 3 per minute", async () => {
    expect((await checkUserRateLimit("account:delete", "user-7")).allowed).toBe(true);
    expect((await checkUserRateLimit("account:delete", "user-7")).allowed).toBe(true);
    expect((await checkUserRateLimit("account:delete", "user-7")).allowed).toBe(true);
    expect((await checkUserRateLimit("account:delete", "user-7")).allowed).toBe(false);
  });
  it("returns allowed when DISABLE_RATE_LIMIT is true", async () => {
    process.env.DISABLE_RATE_LIMIT = "true";
    for (let i = 0; i < 100; i++) {
      await checkUserRateLimit("documents:create", "user-8");
    }
    const r = await checkUserRateLimit("documents:create", "user-8");
    expect(r.allowed).toBe(true);
    delete process.env.DISABLE_RATE_LIMIT;
  });
});

describe("Rate Limit — rateLimitResponse", () => {
  let mockJson: any;
  beforeEach(() => {
    mockJson = vi.mocked(NextResponse.json);
    mockJson.mockClear();
  });
  it("returns 429 status", () => {
    rateLimitResponse();
    expect(mockJson).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ status: 429 }),
    );
  });
  it("returns Arabic error message with code RATE_LIMITED", () => {
    rateLimitResponse();
    const data = mockJson.mock.calls[0][0];
    expect(data.error.message).toBe("تجاوزت الحد الأقصى للطلبات");
    expect(data.error.code).toBe("RATE_LIMITED");
  });
  it("sets Retry-After header from parameter (5000ms → 5s)", () => {
    rateLimitResponse(5000);
    const init = mockJson.mock.calls[0][1];
    expect(init.headers["Retry-After"]).toBe("5");
  });
  it("defaults Retry-After to 60 seconds", () => {
    rateLimitResponse();
    const init = mockJson.mock.calls[0][1];
    expect(init.headers["Retry-After"]).toBe("60");
  });
  it("handles retryAfterMs of 0", () => {
    rateLimitResponse(0);
    const init = mockJson.mock.calls[0][1];
    expect(init.headers["Retry-After"]).toBe("0");
  });
});
