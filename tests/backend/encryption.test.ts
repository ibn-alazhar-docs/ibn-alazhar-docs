import { describe, it, expect } from "vitest";
import {
  encryptToken,
  decryptToken,
  CIPHERTEXT_PREFIX,
} from "@ibn-al-azhar-docs/database/encryption";

const SECRET = "0".repeat(64); // 32-byte key as 64 hex chars

describe("OAuth token encryption-at-rest", () => {
  const original = process.env.TOKEN_ENCRYPTION_KEY;
  afterEach(() => {
    if (original === undefined) delete process.env.TOKEN_ENCRYPTION_KEY;
    else process.env.TOKEN_ENCRYPTION_KEY = original;
  });

  it("round-trips a token with a configured key", () => {
    process.env.TOKEN_ENCRYPTION_KEY = SECRET;
    const plaintext = "ya29.oauth-access-token-secret";
    const ciphertext = encryptToken(plaintext);
    expect(ciphertext).not.toBe(plaintext);
    expect(ciphertext.startsWith(CIPHERTEXT_PREFIX)).toBe(true);
    expect(decryptToken(ciphertext)).toBe(plaintext);
  });

  it("is a no-op when TOKEN_ENCRYPTION_KEY is unset (backward compatible)", () => {
    delete process.env.TOKEN_ENCRYPTION_KEY;
    const plaintext = "plain-secret";
    expect(encryptToken(plaintext)).toBe(plaintext);
    expect(decryptToken(plaintext)).toBe(plaintext);
  });

  it("returns non-prefixed values unchanged (legacy plaintext tokens)", () => {
    process.env.TOKEN_ENCRYPTION_KEY = SECRET;
    const legacy = "existing-plaintext-token";
    expect(decryptToken(legacy)).toBe(legacy);
  });

  it("does not double-encrypt an already-encrypted value", () => {
    process.env.TOKEN_ENCRYPTION_KEY = SECRET;
    const ciphertext = encryptToken("secret");
    expect(encryptToken(ciphertext)).toBe(ciphertext);
  });

  it("produces different ciphertexts for the same plaintext (random IV)", () => {
    process.env.TOKEN_ENCRYPTION_KEY = SECRET;
    const a = encryptToken("same");
    const b = encryptToken("same");
    expect(a).not.toBe(b);
    expect(decryptToken(a)).toBe(decryptToken(b));
  });

  it("fails open (returns input) on tampered ciphertext", () => {
    process.env.TOKEN_ENCRYPTION_KEY = SECRET;
    const ciphertext = encryptToken("secret");
    const tampered = ciphertext.slice(0, -2) + (ciphertext.endsWith("A") ? "B" : "A");
    expect(decryptToken(tampered)).toBe(tampered);
  });
});
