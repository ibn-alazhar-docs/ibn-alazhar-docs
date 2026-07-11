import { PrismaClient } from "@prisma/client";
import { encryptToken, decryptToken } from "./encryption";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// ── Encryption-at-rest for OAuth tokens (opt-in, backward compatible) ────────
// When TOKEN_ENCRYPTION_KEY is set, Account.access_token / refresh_token are
// encrypted on write and decrypted on read. Existing plaintext tokens remain
// readable (no prefix) and are re-encrypted on their next write. When the key
// is unset, this middleware is a pass-through (no behaviour change).
const TOKEN_FIELDS = ["access_token", "refresh_token"] as const;

function encryptTokenFields(target: Record<string, unknown> | undefined): void {
  if (!target) return;
  for (const field of TOKEN_FIELDS) {
    const value = target[field];
    if (typeof value === "string" && value.length > 0) {
      target[field] = encryptToken(value);
    }
  }
}

function decryptTokenFields(result: unknown): unknown {
  if (Array.isArray(result)) {
    return result.map((row) => decryptTokenFields(row));
  }
  if (result && typeof result === "object") {
    const obj = result as Record<string, unknown>;
    let changed = false;
    const out = { ...obj };
    for (const field of TOKEN_FIELDS) {
      const value = obj[field];
      if (typeof value === "string") {
        const decrypted = decryptToken(value);
        if (decrypted !== value) {
          out[field] = decrypted;
          changed = true;
        }
      }
    }
    return changed ? out : obj;
  }
  return result;
}

if (process.env.TOKEN_ENCRYPTION_KEY) {
  prisma.$use(async (params, next) => {
    if (params.model === "Account") {
      const writeAction =
        params.action === "create" ||
        params.action === "update" ||
        params.action.startsWith("upsert");
      if (writeAction && params.args) {
        encryptTokenFields(params.args.data);
        encryptTokenFields(params.args.create);
        encryptTokenFields(params.args.update);
      }
      const result = await next(params);
      return decryptTokenFields(result);
    }
    return next(params);
  });
}

export { PrismaClient };
export type { Prisma } from "@prisma/client";
export { encryptToken, decryptToken } from "./encryption";
