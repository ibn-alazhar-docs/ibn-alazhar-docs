import crypto from "crypto";

/**
 * Encryption-at-rest for sensitive OAuth tokens (Google `access_token` /
 * `refresh_token`) stored in the `Account` table.
 *
 * Uses AES-256-GCM (authenticated encryption). Ciphertext is stored with a
 * stable `enc:v1:` prefix so the Prisma middleware can transparently
 * encrypt-on-write and decrypt-on-read, while remaining BACKWARD COMPATIBLE:
 *  - Existing plaintext tokens (no prefix) are returned as-is on read and are
 *    only re-encrypted on their next write (e.g. an OAuth token refresh).
 *  - If `TOKEN_ENCRYPTION_KEY` is unset, `encryptToken` is a no-op so behaviour
 *    is identical to today (zero regression for current deployments).
 *
 * Key formats accepted via `TOKEN_ENCRYPTION_KEY`:
 *  - 64-char hex (32 raw bytes)
 *  - base64 of 32 bytes
 *  - any other string → derived to 32 bytes via SHA-256
 */

const ALGO = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
export const CIPHERTEXT_PREFIX = "enc:v1:";

function resolveKey(): Buffer | null {
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (!raw) return null;

  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, "hex");
  }
  if (raw.length % 4 === 0) {
    const asBase64 = Buffer.from(raw, "base64");
    if (asBase64.length === 32) {
      return asBase64;
    }
  }
  // Fallback: derive a 32-byte key so any provided secret yields a valid key.
  return crypto.createHash("sha256").update(raw, "utf8").digest();
}

export function encryptToken(plaintext: string): string {
  const key = resolveKey();
  if (!key || plaintext.startsWith(CIPHERTEXT_PREFIX)) {
    return plaintext;
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return CIPHERTEXT_PREFIX + Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptToken(value: string): string {
  if (!value.startsWith(CIPHERTEXT_PREFIX)) {
    return value;
  }

  const key = resolveKey();
  if (!key) {
    // Key was removed since encryption — cannot decrypt; return as-is so the
    // caller fails later at the provider rather than crashing here.
    return value;
  }

  try {
    const raw = Buffer.from(value.slice(CIPHERTEXT_PREFIX.length), "base64");
    const iv = raw.subarray(0, IV_LENGTH);
    const tag = raw.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const encrypted = raw.subarray(IV_LENGTH + TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  } catch {
    // Corrupt or undecryptable value — return as-is rather than throw.
    return value;
  }
}
