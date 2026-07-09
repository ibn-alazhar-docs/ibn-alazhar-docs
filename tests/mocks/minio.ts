import { vi } from "vitest";

export const mockMinioClient = {
  bucketExists: vi.fn<any>().mockResolvedValue(true),
  makeBucket: vi.fn<any>().mockResolvedValue(undefined),
  fPutObject: vi.fn<any>().mockResolvedValue({}),
  putObject: vi.fn<any>().mockResolvedValue({}),
  getObject: vi.fn<any>().mockResolvedValue(null),
  presignedGetObject: vi.fn<any>().mockResolvedValue("http://mocked-url"),
  removeObject: vi.fn<any>().mockResolvedValue(undefined),
  statObject: vi.fn<any>().mockRejectedValue(new Error("Not found")),
  listObjects: vi.fn<any>(),
};

export const Client = vi.fn(() => mockMinioClient);
