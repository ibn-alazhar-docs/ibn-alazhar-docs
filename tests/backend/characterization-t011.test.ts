import { afterEach, describe, expect, it, vi } from "vitest";
import { getQueueDriver, PgQueueDriver, RedisQueueDriver } from "@ibn-al-azhar-docs/pipeline/queue";
import { validateQueueConfig } from "@ibn-al-azhar-docs/pipeline/queue/validate-config";
import { ownedWhere } from "@/core/authorization";
import type { AuthSession } from "@/domain/types";

const student: AuthSession = {
  user: { id: "u1", email: "s@x.com", name: "S", role: "STUDENT", image: null },
  expires: new Date(Date.now() + 1e9).toISOString(),
};
const teacher: AuthSession = {
  ...student,
  user: { ...student.user, role: "TEACHER" },
};
const admin: AuthSession = {
  ...student,
  user: { ...student.user, role: "ADMIN" },
};

function restoreEnv(key: string, value: string | undefined): void {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

describe("characterization T011 — queue driver (default redis, PG only when =pg)", () => {
  const saved = { ...process.env };
  afterEach(() => {
    restoreEnv("QUEUE_DRIVER", saved.QUEUE_DRIVER);
    restoreEnv("DATABASE_URL", saved.DATABASE_URL);
    restoreEnv("DATABASE_URL_DIRECT", saved.DATABASE_URL_DIRECT);
  });

  it.each([
    ["unset", undefined, RedisQueueDriver],
    ["redis", "redis", RedisQueueDriver],
    ["pg", "pg", PgQueueDriver],
    ["PG (uppercase)", "PG", RedisQueueDriver],
    ["postgres", "postgres", RedisQueueDriver],
    ["empty string", "", RedisQueueDriver],
  ] as const)("QUEUE_DRIVER=%s returns the expected driver class", (_label, value, cls) => {
    restoreEnv("QUEUE_DRIVER", value);
    expect(getQueueDriver()).toBeInstanceOf(cls);
  });

  it("validateQueueConfig is a no-op for the default (redis) setup", () => {
    delete process.env.QUEUE_DRIVER;
    delete process.env.DATABASE_URL;
    delete process.env.DATABASE_URL_DIRECT;
    expect(() => validateQueueConfig()).not.toThrow();
  });
});

describe("characterization T011 — ownedWhere (deletedAt + ADMIN/userId rules)", () => {
  it("scopes TEACHER queries by userId like STUDENT", () => {
    expect(ownedWhere({ status: "READY" }, teacher)).toMatchObject({
      status: "READY",
      userId: "u1",
      deletedAt: null,
    });
  });

  it("strips a userId already present in baseWhere for ADMIN", () => {
    const where = ownedWhere({ userId: "someone-else", status: "READY" }, admin);
    expect(where).not.toHaveProperty("userId");
    expect(where).toMatchObject({ status: "READY", deletedAt: null });
  });

  it("does not mutate baseWhere", () => {
    const base = { status: "READY" };
    ownedWhere(base, student);
    expect(base).toEqual({ status: "READY" });
  });
});

describe("characterization T011 — upload limits (50MB fallback documented as-is)", () => {
  const saved = process.env.MAX_UPLOAD_SIZE_MB;
  afterEach(() => {
    restoreEnv("MAX_UPLOAD_SIZE_MB", saved);
    vi.resetModules();
  });

  it("pins the 50MB fallback exactly when MAX_UPLOAD_SIZE_MB is unset", async () => {
    delete process.env.MAX_UPLOAD_SIZE_MB;
    vi.resetModules();
    const mod = await import("@/shared/validators/document");
    expect(mod.MAX_UPLOAD_SIZE_MB).toBe(50);
    const atLimit = { type: "application/pdf", size: 50 * 1024 * 1024 } as unknown as File;
    const overLimit = { type: "application/pdf", size: 50 * 1024 * 1024 + 1 } as unknown as File;
    expect(mod.validateUploadFile(atLimit).valid).toBe(true);
    expect(mod.validateUploadFile(overLimit).valid).toBe(false);
  });
});
