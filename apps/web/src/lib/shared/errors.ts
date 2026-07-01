import { ERROR_CODES } from "./constants";

export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not found") {
    super(message, ERROR_CODES.NOT_FOUND, 404);
    this.name = "NotFoundError";
  }
}

export class ValidationError extends AppError {
  constructor(message = "Validation failed") {
    super(message, ERROR_CODES.VALIDATION_ERROR, 400);
    this.name = "ValidationError";
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflict") {
    super(message, ERROR_CODES.CONFLICT, 409);
    this.name = "ConflictError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "ليس لديك صلاحية للوصول") {
    super(message, ERROR_CODES.FORBIDDEN, 403);
    this.name = "ForbiddenError";
  }
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof AppError) return error.code;
  // Never leak internal error messages to callers — they may reach the client
  if (error instanceof Error) return ERROR_CODES.INTERNAL_ERROR;
  if (typeof error === "string") return ERROR_CODES.INTERNAL_ERROR;
  return ERROR_CODES.INTERNAL_ERROR;
}

export function getErrorStatusCode(error: unknown): number {
  if (error instanceof AppError) return error.statusCode;
  return 500;
}
