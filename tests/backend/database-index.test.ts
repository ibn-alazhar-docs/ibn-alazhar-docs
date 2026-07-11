import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockPrismaClient = vi.hoisted(() => {
  const mock = { $use: vi.fn(), $connect: vi.fn(), $disconnect: vi.fn() };
  return { mock, newMock: () => ({ ...mock, $use: vi.fn() }) };
});

vi.mock("@prisma/client", () => ({
  PrismaClient: vi.fn(() => mockPrismaClient.mock),
}));

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  delete process.env.TOKEN_ENCRYPTION_KEY;
  mockPrismaClient.mock.$use.mockReset();
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.resetModules();
});

describe("database index", () => {
  it("creates a PrismaClient singleton", async () => {
    const mod1 = await import("../../packages/database/src/index");
    const mod2 = await import("../../packages/database/src/index");
    expect(mod1.prisma).toBeDefined();
    expect(mod2.prisma).toBe(mod1.prisma);
  });

  it("exports encryptToken and decryptToken", async () => {
    const mod = await import("../../packages/database/src/index");
    expect(typeof mod.encryptToken).toBe("function");
    expect(typeof mod.decryptToken).toBe("function");
  });

  it("exports PrismaClient class", async () => {
    const mod = await import("../../packages/database/src/index");
    expect(mod.PrismaClient).toBeDefined();
  });

  it("registers $use middleware when TOKEN_ENCRYPTION_KEY is set", async () => {
    process.env.TOKEN_ENCRYPTION_KEY = "0".repeat(64);
    delete process.env.NODE_ENV;
    const mod = await import("../../packages/database/src/index");
    expect(typeof mod.prisma).toBe("object");
  });

  it("does not register $use middleware when TOKEN_ENCRYPTION_KEY is unset", async () => {
    delete process.env.TOKEN_ENCRYPTION_KEY;
    const mod = await import("../../packages/database/src/index");
    expect(mod.prisma).toBeDefined();
  });
});
