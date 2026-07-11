import { timingSafeEqual } from "node:crypto";

/**
 * Constant-time comparison of a request authorization header against the
 * expected bearer token. Avoids leaking the token via timing side-channels.
 */
export function isBearerAuthorized(
  authHeader: string | null,
  expectedToken: string | undefined,
): boolean {
  if (!expectedToken) return false;

  const expected = `Bearer ${expectedToken}`;
  const header = authHeader ?? "";

  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    // Still run a comparison of equal length to keep timing uniform.
    timingSafeEqual(a, a);
    return false;
  }
  return timingSafeEqual(a, b);
}
