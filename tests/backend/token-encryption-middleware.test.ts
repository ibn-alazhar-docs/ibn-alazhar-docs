import { describe, it, expect, afterEach } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { attachTokenEncryptionMiddleware } from "../../packages/database/src/token-encryption-middleware";
import { CIPHERTEXT_PREFIX } from "@ibn-al-azhar-docs/database/encryption";

type Middleware = (
  params: unknown,
  next: (params: unknown) => Promise<unknown>,
) => Promise<unknown>;

function captureMiddleware(): { client: PrismaClient; get: () => Middleware | undefined } {
  let captured: Middleware | undefined;
  const client = {
    $use: (handler: Middleware) => {
      captured = handler;
    },
  } as unknown as PrismaClient;
  attachTokenEncryptionMiddleware(client);
  return { client, get: () => captured };
}

describe("token-encryption-middleware — parity", () => {
  const secret = "0".repeat(64);
  const original = process.env.TOKEN_ENCRYPTION_KEY;

  afterEach(() => {
    if (original === undefined) delete process.env.TOKEN_ENCRYPTION_KEY;
    else process.env.TOKEN_ENCRYPTION_KEY = original;
  });

  it("is a no-op when TOKEN_ENCRYPTION_KEY is unset", () => {
    delete process.env.TOKEN_ENCRYPTION_KEY;
    const { get } = captureMiddleware();
    expect(get()).toBeUndefined();
  });

  it("registers the middleware when TOKEN_ENCRYPTION_KEY is set", () => {
    process.env.TOKEN_ENCRYPTION_KEY = secret;
    const { get } = captureMiddleware();
    expect(typeof get()).toBe("function");
  });

  it("encrypts Account write payloads and leaves other models untouched", async () => {
    process.env.TOKEN_ENCRYPTION_KEY = secret;
    const { get } = captureMiddleware();
    const middleware = get();
    expect(middleware).toBeDefined();

    const data: Record<string, unknown> = {
      access_token: "plain-token",
      refresh_token: "",
      other: "plain",
    };
    const next = viNext();
    await middleware!({ model: "Account", action: "create", args: { data } }, next);
    expect(data["access_token"]).toBeTypeOf("string");
    expect((data["access_token"] as string).startsWith(CIPHERTEXT_PREFIX)).toBe(true);
    expect(data["refresh_token"]).toBe("");
    expect(data["other"]).toBe("plain");
    expect(next.calls).toBe(1);

    const userData: Record<string, unknown> = { access_token: "user-token" };
    const userNext = viNext();
    await middleware!({ model: "User", action: "create", args: { data: userData } }, userNext);
    expect(userData["access_token"]).toBe("user-token");
  });

  it("encrypts upsert create/update payloads but not reads", async () => {
    process.env.TOKEN_ENCRYPTION_KEY = secret;
    const { get } = captureMiddleware();
    const middleware = get()!;
    const create: Record<string, unknown> = { access_token: "create-token" };
    const update: Record<string, unknown> = { refresh_token: "update-token" };
    await middleware({ model: "Account", action: "upsert", args: { create, update } }, viNext());
    expect((create["access_token"] as string).startsWith(CIPHERTEXT_PREFIX)).toBe(true);
    expect((update["refresh_token"] as string).startsWith(CIPHERTEXT_PREFIX)).toBe(true);

    const readData: Record<string, unknown> = { access_token: "read-token" };
    await middleware(
      { model: "Account", action: "findUnique", args: { data: readData } },
      viNext(),
    );
    expect(readData["access_token"]).toBe("read-token");
  });

  it("decrypts Account read results (single and array), plaintext passes through", async () => {
    process.env.TOKEN_ENCRYPTION_KEY = secret;
    const { get } = captureMiddleware();
    const middleware = get()!;
    const { encryptToken } = await import("@ibn-al-azhar-docs/database/encryption");
    const cipher = encryptToken("plain-secret");

    const single = await middleware(
      { model: "Account", action: "findFirst", args: {} },
      async () => ({ access_token: cipher, refresh_token: "legacy-plain" }),
    );
    expect(single).toMatchObject({ access_token: "plain-secret", refresh_token: "legacy-plain" });

    const list = await middleware({ model: "Account", action: "findMany", args: {} }, async () => [
      { access_token: cipher },
      { access_token: "legacy-plain" },
    ]);
    expect(list).toEqual([{ access_token: "plain-secret" }, { access_token: "legacy-plain" }]);
  });
});

function viNext(result: unknown = null) {
  const fn = async (_params: unknown) => {
    (fn as unknown as { calls: number }).calls += 1;
    return result;
  };
  (fn as unknown as { calls: number }).calls = 0;
  return fn as typeof fn & { calls: number };
}
