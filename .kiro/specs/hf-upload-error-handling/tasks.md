# Implementation Tasks: Hugging Face Upload Error Handling

## Overview

This document outlines the implementation tasks for enhancing error handling in the Hugging Face upload flow. Tasks are organized by implementation phase and must be completed in order.

---

## Phase 1: Foundation

### Task 1.1: Create service-health.ts with error classification system

**Description:** Create the foundation module containing error types, interfaces, and the error classifier that maps raw errors to service-specific error types with Arabic messages.

**Files to Create:**
- `packages/shared/src/service-health.ts`

**Implementation Details:**
- Create `ServiceErrorType` enum with values: `DATABASE_UNAVAILABLE`, `REDIS_UNAVAILABLE`, `STORAGE_UNAVAILABLE`, `UNKNOWN_ERROR`
- Create `ServiceError` interface with fields: `type`, `message` (Arabic + English), `httpStatus`, `originalError?`
- Implement `ServiceErrorClassifier` class with `classify(error: unknown): ServiceError` method
- Add error detection logic for database errors (connection, timeout, cold start indicators)
- Add error detection logic for Redis errors (Upstash connection, quota exceeded)
- Add error detection logic for storage errors (ENOENT, EACCES, ENOSPC, disk/filesystem)
- Add fallback to `UNKNOWN_ERROR` for unrecognized errors
- Export all types and classes from the module

**Requirements Satisfied:**
- REQ-1.1: Database unavailability error message
- REQ-1.2: Redis unavailability error message
- REQ-1.3: Storage unavailability error message
- REQ-1.4: Unknown service error message
- REQ-1.5: English fallback messages

**Acceptance Criteria:**
- [x] `ServiceErrorType` enum created with all 4 error types
- [~] `ServiceError` interface includes Arabic and English messages
- [~] `ServiceErrorClassifier.classify()` correctly identifies database errors
- [~] `ServiceErrorClassifier.classify()` correctly identifies Redis errors
- [~] `ServiceErrorClassifier.classify()` correctly identifies storage errors
- [~] `ServiceErrorClassifier.classify()` returns `UNKNOWN_ERROR` for unrecognized errors
- [~] All error types map to correct HTTP status codes (503 for service unavailable, 500 for unknown)
- [~] Module compiles without TypeScript errors

---

### Task 1.2: Export service-health module from shared package

**Description:** Export the new service-health module and its types from the shared package index.

**Files to Modify:**
- `packages/shared/src/index.ts`

**Implementation Details:**
- Add export statement: `export * from "./service-health";`
- Ensure TypeScript barrel export is properly configured

**Requirements Satisfied:**
- REQ-16.1: Application-layer implementation (proper module organization)

**Acceptance Criteria:**
- [~] Service-health module exported from shared package
- [~] Imports work correctly from other packages: `import { ServiceErrorClassifier } from "@ibn-al-azhar-docs/shared"`
- [~] TypeScript compilation succeeds

---

## Phase 2: Retry Logic

### Task 2.1: Implement retry strategy interfaces and constants

**Description:** Define retry strategy configuration and create predefined strategies for database and Redis operations.

**Files to Modify:**
- `packages/shared/src/service-health.ts`

**Implementation Details:**
- Create `RetryStrategy` interface with fields: `delays: number[]`, `maxTotalTimeout: number`, `shouldRetry: (error: unknown) => boolean`
- Create `DATABASE_RETRY_STRATEGY` constant with delays [100, 200, 400, 800, 1600, 3200] and 10-second timeout
- Create `REDIS_RETRY_STRATEGY` constant with delays [100, 200, 400, 800, 1600] and 10-second timeout
- Implement `shouldRetry` logic using `ServiceErrorClassifier` to check error types
- Export retry strategies as named constants

**Requirements Satisfied:**
- REQ-2.1: Database retry with exponential backoff
- REQ-2.2: Redis retry with exponential backoff
- REQ-2.5: 10-second maximum retry timeout

**Acceptance Criteria:**
- [~] `RetryStrategy` interface defined with all required fields
- [~] `DATABASE_RETRY_STRATEGY` uses exact delay sequence [100, 200, 400, 800, 1600, 3200]
- [~] `REDIS_RETRY_STRATEGY` uses delay sequence [100, 200, 400, 800, 1600]
- [~] Both strategies have 10-second `maxTotalTimeout`
- [~] `shouldRetry` correctly identifies retryable error types
- [ ] Module compiles without TypeScript errors

---

### Task 2.2: Implement RetryExecutor class

**Description:** Create the retry executor that performs operations with exponential backoff and comprehensive logging.

**Files to Modify:**
- `packages/shared/src/service-health.ts`

**Implementation Details:**
- Create `RetryExecutor` class with static method `retryWithBackoff<T>(operation, strategy, context): Promise<T>`
- Implement retry loop with attempt counting
- Add delay between attempts using `setTimeout` with strategy delays
- Track total elapsed time and enforce `maxTotalTimeout`
- Call `strategy.shouldRetry()` to determine if error is retryable
- Import logger from `@ibn-al-azhar-docs/shared` for structured logging
- Log retry attempts at DEBUG level with service name, operation name, attempt number
- Log success after retry at INFO level with duration
- Log exhausted retries at ERROR level with reason (timeout/max_attempts/non_retryable)
- Re-throw original error when retries exhausted

**Requirements Satisfied:**
- REQ-2.1: Database retry implementation
- REQ-2.2: Redis retry implementation
- REQ-2.3: Proceed on retry success
- REQ-2.4: Return error when retries exhausted
- REQ-2.5: 10-second timeout enforcement
- REQ-5.2: Log service connection failures
- REQ-5.3: Log retry attempts

**Acceptance Criteria:**
- [~] `RetryExecutor.retryWithBackoff()` successfully retries on transient failures
- [~] Exponential backoff delays are correctly applied
- [~] Total timeout of 10 seconds is enforced
- [~] Non-retryable errors immediately throw without retry
- [~] Retry attempts logged at DEBUG level with context
- [~] Success after retry logged at INFO level
- [~] Exhausted retries logged at ERROR level with full context
- [~] Original error is re-thrown when retries fail
- [~] TypeScript generics work correctly for return type
- [~] Module compiles without errors

---

## Phase 3: Pre-Upload Validation

### Task 3.1: Implement ServiceHealthValidator class

**Description:** Create the service health validator that performs lightweight checks on database, Redis, and storage before accepting uploads.

**Files to Modify:**
- `packages/shared/src/service-health.ts`

**Implementation Details:**
- Create `ServiceHealthValidator` class with static methods
- Implement `validateDatabase(prisma: PrismaClient): Promise<void>` using `SELECT 1` query
- Implement `validateRedis(redis: Redis): Promise<void>` using `PING` command
- Implement `validateStorage(storagePath: string): Promise<void>` using `fs.access` with `W_OK` flag
- Implement `validateAll(prisma, redis, storagePath): Promise<{ success: boolean; error?: string }>` that runs all checks in parallel
- Use `ServiceErrorClassifier` to convert errors to Arabic messages
- Catch errors and return structured validation results

**Requirements Satisfied:**
- REQ-3.1: Pre-upload database validation
- REQ-3.2: Pre-upload Redis validation
- REQ-3.3: Pre-upload storage validation
- REQ-3.4: Return error when validation fails
- REQ-3.5: Proceed when all services available
- REQ-7.2: 2-second validation timeout (implicit in parallel execution)
- REQ-7.4: Parallel validation for minimal latency

**Acceptance Criteria:**
- [~] `validateDatabase()` performs lightweight `SELECT 1` query
- [~] `validateRedis()` uses `PING` command
- [~] `validateStorage()` checks write permissions with `fs.access`
- [~] `validateAll()` runs all checks in parallel with `Promise.all()`
- [~] Validation failures return Arabic error messages via `ServiceErrorClassifier`
- [~] `validateAll()` returns `{ success: true }` when all services healthy
- [~] `validateAll()` returns `{ success: false, error: string }` when any service fails
- [ ] Module compiles without TypeScript errors

---

### Task 3.2: Create health types module

**Description:** Create TypeScript interfaces for health check responses in a separate types module.

**Files to Create:**
- `packages/shared/src/types/health.ts`

**Implementation Details:**
- Create `ServiceCheckResult` interface with fields: `status: "healthy" | "unhealthy"`, `responseTimeMs: number`
- Create `DetailedHealthResponse` interface with fields: `overall: "healthy" | "unhealthy"`, `timestamp: string`, `services: { database, redis, storage }`
- Export all interfaces

**Requirements Satisfied:**
- REQ-4.2: TypeScript response schema

**Acceptance Criteria:**
- [~] `ServiceCheckResult` interface created with correct fields
- [~] `DetailedHealthResponse` interface created with nested services object
- [~] All interfaces use strict TypeScript types (no `any`)
- [ ] Module compiles without errors

---

### Task 3.3: Export health types from shared package

**Description:** Export the health types module from the shared package index.

**Files to Modify:**
- `packages/shared/src/index.ts`

**Implementation Details:**
- Add export statement: `export * from "./types/health";`

**Requirements Satisfied:**
- REQ-4.2: Type availability across packages

**Acceptance Criteria:**
- [~] Health types exported from shared package
- [~] Imports work: `import { DetailedHealthResponse } from "@ibn-al-azhar-docs/shared"`
- [ ] TypeScript compilation succeeds

---

## Phase 4: Enhanced Health Check

### Task 4.1: Create detailed health check endpoint

**Description:** Create a new API route that provides detailed service health status with individual checks and response times.

**Files to Create:**
- `apps/web/src/app/api/health/detailed/route.ts`

**Implementation Details:**
- Import `prisma` from transport layer
- Import `redis` from transport layer
- Import logger from shared package
- Import health types: `ServiceCheckResult`, `DetailedHealthResponse`
- Implement `checkDatabase(): Promise<ServiceCheckResult>` with 2-second timeout using `Promise.race()`
- Implement `checkRedis(): Promise<ServiceCheckResult>` with 2-second timeout
- Implement `checkStorage(): Promise<ServiceCheckResult>` with 2-second timeout
- Use `SELECT 1` for database check (lightweight)
- Use `PING` for Redis check (minimal quota usage)
- Use `fs.access()` for storage check (no side effects)
- Track response times with `Date.now()` deltas
- Log unhealthy services at WARN level
- Implement GET handler that runs all checks in parallel
- Return HTTP 200 when all services healthy, HTTP 503 when any unhealthy
- Add `Cache-Control: no-store` header
- Include timestamp in ISO 8601 format
- Handle unexpected errors with 503 status

**Requirements Satisfied:**
- REQ-4.1: Database connectivity check with response time
- REQ-4.2: Redis connectivity check with response time
- REQ-4.3: Storage availability check with response time
- REQ-4.4: Overall health status (healthy only when ALL healthy)
- REQ-4.5: HTTP 200 when all healthy
- REQ-4.6: HTTP 503 when any unhealthy
- REQ-7.4: Parallel checks for minimal latency
- REQ-8.1: 5-second total completion (2s per check in parallel)
- REQ-8.2: Minimal resource consumption
- REQ-8.3: No side effects (read-only operations)
- REQ-15.2: Minimize Redis command usage

**Acceptance Criteria:**
- [~] Endpoint created at `/api/health/detailed`
- [~] GET handler implemented
- [~] `checkDatabase()` uses lightweight `SELECT 1` with 2s timeout
- [~] `checkRedis()` uses `PING` with 2s timeout
- [~] `checkStorage()` uses `fs.access()` with 2s timeout
- [~] All checks run in parallel with `Promise.all()`
- [~] Response includes individual service status and response times
- [~] Returns HTTP 200 when all services healthy
- [~] Returns HTTP 503 when any service unhealthy
- [~] Response includes ISO 8601 timestamp
- [~] `Cache-Control: no-store` header included
- [~] Unhealthy services logged at WARN level
- [~] Unexpected errors return 503 status
- [ ] Module compiles without TypeScript errors

---

## Phase 5: Upload Enhancement

### Task 5.1: Enhance upload use case with retry logic

**Description:** Wrap database and Redis operations in the upload use case with retry logic and add comprehensive logging.

**Files to Modify:**
- `apps/web/src/core/services/upload-document.use-case.ts` (or equivalent upload service file)

**Implementation Details:**
- Import `RetryExecutor`, `DATABASE_RETRY_STRATEGY`, `REDIS_RETRY_STRATEGY` from shared package
- Import logger from shared package
- Wrap all `prisma.*` operations with `RetryExecutor.retryWithBackoff()` using `DATABASE_RETRY_STRATEGY`
- Wrap all `redis.*` operations with `RetryExecutor.retryWithBackoff()` using `REDIS_RETRY_STRATEGY`
- Add log at start of upload with user ID, filename, file size, MIME type (REQ-5.1)
- Add log on completion with status and duration (REQ-5.4)
- Add error logging with full context when operations fail (REQ-5.2, REQ-5.5)
- Implement mid-upload failure rollback (attempt to delete partial uploads)
- Mark failed uploads in database if rollback not possible (REQ-11.3)

**Requirements Satisfied:**
- REQ-2.1: Database operations with retry
- REQ-2.2: Redis operations with retry
- REQ-2.3: Proceed on retry success
- REQ-2.4: Return error when retries exhausted
- REQ-5.1: Log upload attempts
- REQ-5.2: Log service failures
- REQ-5.3: Log retry attempts (via RetryExecutor)
- REQ-5.4: Log upload completion
- REQ-5.5: Log errors returned to user
- REQ-11.1: Rollback on mid-upload failure
- REQ-11.2: Log mid-upload failures
- REQ-11.3: Mark failed uploads

**Acceptance Criteria:**
- [~] All database operations wrapped with `RetryExecutor.retryWithBackoff()`
- [~] All Redis operations wrapped with retry logic
- [~] Upload attempt logged at start with file metadata
- [~] Upload completion logged with status and duration
- [~] Service failures logged with error details
- [~] Mid-upload failures trigger rollback attempt
- [~] Failed uploads marked in database if rollback fails
- [~] No sensitive data (file contents, tokens) logged
- [ ] TypeScript compilation succeeds
- [~] Existing tests pass

---

### Task 5.2: Add pre-upload validation to upload route

**Description:** Integrate service health validation into the upload API route to check services before accepting files.

**Files to Modify:**
- `apps/web/src/app/api/upload/route.ts` (or equivalent upload route handler)

**Implementation Details:**
- Import `ServiceHealthValidator` from shared package
- Import `prisma` and `redis` instances
- Get storage path from environment variable or constant
- Call `ServiceHealthValidator.validateAll(prisma, redis, storagePath)` before accepting file
- Return HTTP 503 with Arabic error message if validation fails (REQ-3.4)
- Include English fallback in response metadata (REQ-1.5)
- Proceed with file upload only if validation succeeds (REQ-3.5)
- Add logging for validation failures

**Requirements Satisfied:**
- REQ-3.1: Database validation before upload
- REQ-3.2: Redis validation before upload
- REQ-3.3: Storage validation before upload
- REQ-3.4: Return error if validation fails
- REQ-3.5: Proceed only when all services available
- REQ-7.2: Fast validation (2 seconds)
- REQ-17.1: Maintain backward compatibility
- REQ-17.2: Preserve API schema

**Acceptance Criteria:**
- [~] `ServiceHealthValidator.validateAll()` called before accepting file
- [~] HTTP 503 returned when validation fails
- [~] Error response includes Arabic message
- [~] Error response includes English fallback in metadata
- [~] File upload proceeds only when validation passes
- [~] Validation failures logged appropriately
- [~] Existing API contract maintained (no breaking changes)
- [ ] TypeScript compilation succeeds

---

### Task 5.3: Update error responses with proper error classification

**Description:** Replace generic error handling in upload route with service-specific error messages using ServiceErrorClassifier.

**Files to Modify:**
- `apps/web/src/app/api/upload/route.ts` (or equivalent upload route handler)

**Implementation Details:**
- Import `ServiceErrorClassifier` from shared package
- Wrap upload logic in try-catch block
- Use `ServiceErrorClassifier.classify(error)` to map errors
- Return appropriate HTTP status from classified error
- Return Arabic message as primary error message (REQ-6.1)
- Include English message in response metadata (REQ-1.5, REQ-6.2)
- Log error with full context using logger (REQ-5.5)

**Requirements Satisfied:**
- REQ-1.1: Database error message
- REQ-1.2: Redis error message
- REQ-1.3: Storage error message
- REQ-1.4: Unknown error message
- REQ-1.5: English fallback
- REQ-5.5: Log errors returned to user
- REQ-6.1: Arabic as primary language
- REQ-6.2: English for developer debugging
- REQ-6.3: Clear, actionable Arabic messages

**Acceptance Criteria:**
- [~] All upload errors classified with `ServiceErrorClassifier`
- [~] Correct HTTP status returned based on error type
- [~] Arabic message returned as primary error
- [~] English message included in metadata
- [~] Errors logged with full context (error code, messages, user ID, operation)
- [ ] TypeScript compilation succeeds
- [~] Existing error handling improved (no regression)

---

## Phase 6: Testing

### Task 6.1: Write unit tests for error classifier

**Description:** Create unit tests for the ServiceErrorClassifier to verify correct error type identification and message generation.

**Files to Create:**
- `packages/shared/src/service-health.test.ts`

**Implementation Details:**
- Test database error detection (connection errors, timeout, cold start indicators)
- Test Redis error detection (Upstash errors, quota exceeded)
- Test storage error detection (ENOENT, EACCES, ENOSPC)
- Test unknown error fallback
- Verify correct HTTP status codes
- Verify Arabic and English messages
- Use Vitest as test framework

**Requirements Satisfied:**
- REQ-1.1 through REQ-1.5 (verification)

**Acceptance Criteria:**
- [~] Test cases for all database error patterns
- [~] Test cases for all Redis error patterns
- [~] Test cases for all storage error patterns
- [~] Test case for unknown error fallback
- [~] HTTP status codes verified for all error types
- [~] Arabic and English messages verified
- [~] All tests pass: `pnpm test`
- [~] No test warnings or errors

---

### Task 6.2: Write unit tests for RetryExecutor

**Description:** Create unit tests for the RetryExecutor to verify retry behavior, backoff delays, and timeout enforcement.

**Files to Modify:**
- `packages/shared/src/service-health.test.ts`

**Implementation Details:**
- Test successful operation (no retry needed)
- Test transient failure with successful retry
- Test exhausted retries (all attempts fail)
- Test non-retryable errors (immediate throw)
- Test timeout enforcement (10-second limit)
- Verify exponential backoff delays
- Mock logger to verify log calls
- Use fake timers to control delays

**Requirements Satisfied:**
- REQ-2.1 through REQ-2.5 (verification)

**Acceptance Criteria:**
- [~] Test: successful operation returns result without retry
- [~] Test: transient failure retries and succeeds
- [~] Test: exhausted retries throws original error
- [~] Test: non-retryable error throws immediately
- [~] Test: timeout enforced at 10 seconds
- [~] Test: exponential backoff delays applied correctly
- [~] Test: retry attempts logged at DEBUG level
- [~] Test: success after retry logged at INFO level
- [~] Test: exhausted retries logged at ERROR level
- [ ] All tests pass: `pnpm test`

---

### Task 6.3: Write integration tests for health check endpoint

**Description:** Create integration tests for the detailed health check endpoint to verify correct status reporting and response format.

**Files to Create:**
- `tests/api/health-detailed.test.ts`

**Implementation Details:**
- Test all services healthy (expect HTTP 200)
- Test database unhealthy (expect HTTP 503)
- Test Redis unhealthy (expect HTTP 503)
- Test storage unhealthy (expect HTTP 503)
- Test multiple services unhealthy (expect HTTP 503)
- Verify response schema matches `DetailedHealthResponse`
- Verify response times included for each service
- Verify timestamp in ISO 8601 format
- Verify `Cache-Control: no-store` header
- Use test database/Redis instances or mocks

**Requirements Satisfied:**
- REQ-4.1 through REQ-4.6 (verification)
- REQ-8.1 through REQ-8.3 (verification)

**Acceptance Criteria:**
- [~] Test: all healthy returns HTTP 200
- [~] Test: database unhealthy returns HTTP 503
- [~] Test: Redis unhealthy returns HTTP 503
- [~] Test: storage unhealthy returns HTTP 503
- [~] Test: response includes all required fields
- [~] Test: response times are reasonable numbers
- [~] Test: timestamp in correct ISO 8601 format
- [~] Test: Cache-Control header present
- [~] All tests pass: `pnpm test:integration`
- [ ] No test warnings or errors

---

### Task 6.4: Write integration tests for enhanced upload flow

**Description:** Create integration tests for the upload flow with pre-upload validation, retry logic, and error handling.

**Files to Create/Modify:**
- `tests/api/upload-enhanced.test.ts`

**Implementation Details:**
- Test successful upload when all services healthy
- Test upload rejected when database unavailable (pre-upload validation)
- Test upload rejected when Redis unavailable (pre-upload validation)
- Test upload rejected when storage unavailable (pre-upload validation)
- Test retry success (database recovers during retry)
- Test retry exhaustion (returns error after all attempts)
- Test mid-upload failure rollback
- Verify correct error messages (Arabic + English)
- Verify correct HTTP status codes
- Verify logging output
- Use test database/Redis instances

**Requirements Satisfied:**
- REQ-2.1 through REQ-2.5 (verification)
- REQ-3.1 through REQ-3.5 (verification)
- REQ-11.1 through REQ-11.3 (verification)

**Acceptance Criteria:**
- [~] Test: successful upload when services healthy
- [~] Test: upload rejected during pre-upload validation failures
- [~] Test: retry succeeds when service recovers
- [~] Test: retry exhaustion returns appropriate error
- [~] Test: mid-upload failure triggers rollback
- [~] Test: error messages in Arabic and English
- [~] Test: correct HTTP status codes returned
- [ ] All tests pass: `pnpm test:integration`
- [ ] No test warnings or errors

---

### Task 6.5: Manual testing with simulated failures

**Description:** Perform manual testing with simulated service failures to verify real-world behavior.

**Testing Scenarios:**
1. Simulate database cold start (connection refused)
2. Simulate Redis connection failure
3. Simulate storage permission denied
4. Test concurrent uploads during service recovery
5. Verify error messages displayed correctly in UI
6. Verify health check endpoint shows accurate status

**Requirements Satisfied:**
- All requirements (manual verification)

**Acceptance Criteria:**
- [~] Database cold start handled gracefully with retry
- [~] Redis failure returns appropriate error message
- [~] Storage failure returns appropriate error message
- [~] Concurrent uploads handled correctly
- [~] Arabic error messages displayed in UI
- [~] Health check endpoint reflects actual service status
- [~] Logs contain appropriate detail for debugging
- [~] No crashes or unhandled rejections

---

### Task 6.6: Run full test suite and quality checks

**Description:** Run the complete test suite and quality checks to ensure no regressions.

**Commands to Run:**
```bash
pnpm check              # TypeScript, ESLint, Prettier
pnpm test               # Unit tests
pnpm test:integration   # Integration tests
pnpm ci:all             # Full CI baseline
```

**Requirements Satisfied:**
- REQ-17.1: Backward compatibility verification

**Acceptance Criteria:**
- [~] `pnpm check` passes without errors
- [~] `pnpm test` passes all unit tests
- [~] `pnpm test:integration` passes all integration tests
- [~] `pnpm ci:all` passes complete baseline
- [~] No ESLint warnings (zero-warning policy)
- [~] No TypeScript errors
- [~] No Prettier formatting issues
- [~] No new security vulnerabilities detected

---

## Summary

**Total Tasks:** 18 tasks across 6 phases

**Critical Path:**
1. Phase 1: Foundation (Tasks 1.1-1.2)
2. Phase 2: Retry Logic (Tasks 2.1-2.2)
3. Phase 3: Pre-Upload Validation (Tasks 3.1-3.3)
4. Phase 4: Health Check (Task 4.1)
5. Phase 5: Upload Enhancement (Tasks 5.1-5.3)
6. Phase 6: Testing (Tasks 6.1-6.6)

**Estimated Effort:** Medium to Large feature implementation

**Dependencies:**
- Existing logger in `packages/shared/src/logger.ts`
- Existing Prisma client and Redis instance in transport layer
- Existing upload use case and route handler
- Vitest and testing infrastructure

**Risk Areas:**
- Retry logic timing and timeout handling
- Mid-upload failure rollback completeness
- Integration with existing upload flow
- Testing simulated service failures

---

## Checklist Template

Use this template to track progress:

- [ ] Phase 1: Foundation
  - [~] Task 1.1: Create service-health.ts with error classification
  - [~] Task 1.2: Export service-health module

- [ ] Phase 2: Retry Logic
  - [~] Task 2.1: Implement retry strategies
  - [~] Task 2.2: Implement RetryExecutor

- [ ] Phase 3: Pre-Upload Validation
  - [~] Task 3.1: Implement ServiceHealthValidator
  - [~] Task 3.2: Create health types
  - [~] Task 3.3: Export health types

- [ ] Phase 4: Enhanced Health Check
  - [~] Task 4.1: Create detailed health check endpoint

- [ ] Phase 5: Upload Enhancement
  - [~] Task 5.1: Enhance upload use case with retry
  - [~] Task 5.2: Add pre-upload validation
  - [~] Task 5.3: Update error responses

- [ ] Phase 6: Testing
  - [~] Task 6.1: Unit tests for error classifier
  - [~] Task 6.2: Unit tests for RetryExecutor
  - [~] Task 6.3: Integration tests for health check
  - [~] Task 6.4: Integration tests for upload flow
  - [~] Task 6.5: Manual testing
  - [~] Task 6.6: Full test suite and quality checks
