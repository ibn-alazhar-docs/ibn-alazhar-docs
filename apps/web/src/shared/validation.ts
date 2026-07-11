import type { z } from "zod";
import { ValidationError } from "@/shared/errors";

/**
 * Parse and validate a JSON request body against a Zod schema.
 *
 * Replaces the repeated `request.json()` + `safeParse` + 400 block that was
 * duplicated across ~30 route handlers. On failure it throws `ValidationError`,
 * which `handleRouteError` maps to a 400 with the same
 * `{ error: { code: "VALIDATION_ERROR", message } }` contract (plus a requestId).
 */
export async function parseValidatedBody<T extends z.ZodTypeAny>(
  request: Request,
  schema: T,
): Promise<z.infer<T>> {
  const body = await request.json();
  const result = schema.safeParse(body);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    throw new ValidationError(firstIssue?.message || "بيانات غير صحيحة");
  }
  return result.data;
}
