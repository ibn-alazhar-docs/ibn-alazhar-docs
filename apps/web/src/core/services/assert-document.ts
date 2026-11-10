import { NotFoundError } from "@/shared/errors";

// Shared plain not-found guard for document lookups (same shape everywhere:
// NotFoundError with its default "Not found" message).
export function assertDocument<T>(document: T | null): asserts document is T {
  if (!document) throw new NotFoundError();
}
