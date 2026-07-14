# Design Document: Hugging Face Upload Error Handling

## 1. Architecture Overview

### 1.1 System Context

The application runs on Hugging Face Spaces as a single-container Docker deployment with three external service dependencies:

- **Neon PostgreSQL** (free tier): Primary data store with cold start behavior (up to 5 minutes wake-up time)
- **Upstash Redis** (free tier): Caching and rate limiting with 10K commands/day limit
- **Local Filesystem Storage**: Docker container local storage for uploaded files

### 1.2 Service Dependency Map

```
┌─────────────────────────────────────────────────────────────────┐
│                         Upload Flow                             │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│              Pre-Upload Service Validation                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  Database    │  │    Redis     │  │   Storage    │         │
│  │  Validator   │  │  Validator   │  │  Validator   │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                UploadDocumentUseCase                            │
│  - Storage bucket validation with retry                         │
│  - Temp file write                                              │
│  - Storage upload with retry                                    │
│  - Database record creation with retry                          │
│  - Queue job enqueue with retry                                 │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Error Propagation                           │
│  Service Layer → Use Case → Route Handler → Client             │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 Component Responsibilities

#### ServiceHealthValidator
- **Location**: `packages/shared/src/service-health.ts`
- **Purpose**: Pre-upload validation of all required services
- **Methods**:
  - `validateDatabase()`: Check database connectivity
  - `validateRedis()`: Check Redis connectivity
  - `validateStorage()`: Check storage availability
  - `validateAll()`: Run all checks in parallel

#### ServiceErrorClassifier
- **Location**: `packages/shared/src/service-health.ts`
- **Purpose**: Map raw errors to specific error types with Arabic messages
- **Methods**:
  - `classifyError(error: unknown): ServiceError`
  - `getErrorMessage(type: ServiceErrorType): { ar: string; en: string }`
  - `getHttpStatus(type: ServiceErrorType): number`

#### RetryExecutor
- **Location**: `packages/shared/src/service-health.ts`
- **Purpose**: Execute operations with exponential backoff retry
- **Methods**:
  - `retryWithBackoff<T>(operation, strategy): Promise<T>`
  - `shouldRetry(error): boolean`
  - `logAttempt(context)`

#### UploadDocumentUseCase (Enhanced)
- **Location**: `apps/web/src/core/services/upload-document.use-case.ts`
- **Enhancements**:
  - Wrap database operations with retry logic
  - Wrap Redis operations with retry logic
  - Add detailed logging at each stage
  - Handle mid-upload failures with rollback

#### Health Check Endpoint (New)
- **Location**: `apps/web/src/app/api/health/detailed/route.ts`
- **Purpose**: Provide detailed service health status
- **Response**: Individual service health with response times

## 2. Error Classification System

### 2.1 Service Error Types

```typescript
export enum ServiceErrorType {
  DATABASE_UNAVAILABLE = "DATABASE_UNAVAILABLE",
  REDIS_UNAVAILABLE = "REDIS_UNAVAILABLE",
  STORAGE_UNAVAILABLE = "STORAGE_UNAVAILABLE",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

export interface ServiceError {
  type: ServiceErrorType;
  message: { ar: string; en: string };
  httpStatus: number;
  originalError?: Error;
}
```

### 2.2 Error Classification Rules

**Database Errors** (Requirement 1.1):
- Neon connection refused
- Connection timeout
- Cold start indicators: "connection pool exhausted", "database is starting"
- Message: "قاعدة البيانات غير متاحة حالياً. يرجى المحاولة مرة أخرى"
- HTTP Status: 503

**Redis Errors** (Requirement 1.2):
- Upstash connection errors
- Command quota exceeded
- Timeout errors
- Message: "خدمة التخزين المؤقت غير متاحة. يرجى المحاولة مرة أخرى"
- HTTP Status: 503

**Storage Errors** (Requirement 1.3):
- Filesystem permission denied
- Disk space errors
- Write failures
- Message: "نظام التخزين غير متاح. يرجى الاتصال بالدعم الفني"
- HTTP Status: 503

**Unknown Errors** (Requirement 1.4):
- Any unrecognized error
- Message: "حدث خطأ في الخدمة. يرجى المحاولة لاحقاً"
- HTTP Status: 500

### 2.3 Implementation

```typescript
// packages/shared/src/service-health.ts

export class ServiceErrorClassifier {
  static classify(error: unknown): ServiceError {
    const err = error instanceof Error ? error : new Error(String(error));
    const message = err.message.toLowerCase();

    // Database errors
    if (
      message.includes("connection") &&
      (message.includes("database") ||
        message.includes("postgres") ||
        message.includes("neon"))
    ) {
      return {
        type: ServiceErrorType.DATABASE_UNAVAILABLE,
        message: {
          ar: "قاعدة البيانات غير متاحة حالياً. يرجى المحاولة مرة أخرى",
          en: "Database is currently unavailable. Please try again.",
        },
        httpStatus: 503,
        originalError: err,
      };
    }

    // Redis errors
    if (
      message.includes("redis") ||
      message.includes("upstash") ||
      message.includes("command quota")
    ) {
      return {
        type: ServiceErrorType.REDIS_UNAVAILABLE,
        message: {
          ar: "خدمة التخزين المؤقت غير متاحة. يرجى المحاولة مرة أخرى",
          en: "Cache service is unavailable. Please try again.",
        },
        httpStatus: 503,
        originalError: err,
      };
    }

    // Storage errors
    if (
      message.includes("enoent") ||
      message.includes("eacces") ||
      message.includes("enospc") ||
      message.includes("disk") ||
      message.includes("storage") ||
      message.includes("filesystem")
    ) {
      return {
        type: ServiceErrorType.STORAGE_UNAVAILABLE,
        message: {
          ar: "نظام التخزين غير متاح. يرجى الاتصال بالدعم الفني",
          en: "Storage system is unavailable. Please contact technical support.",
        },
        httpStatus: 503,
        originalError: err,
      };
    }

    // Unknown errors (fallback)
    return {
      type: ServiceErrorType.UNKNOWN_ERROR,
      message: {
        ar: "حدث خطأ في الخدمة. يرجى المحاولة لاحقاً",
        en: "A service error occurred. Please try again later.",
      },
      httpStatus: 500,
      originalError: err,
    };
  }
}
```

## 3. Retry Strategy Design

### 3.1 Retry Configuration (Requirements 2.1, 2.2, 2.5)

```typescript
export interface RetryStrategy {
  delays: number[]; // Array of milliseconds between retries
  maxTotalTimeout: number; // Maximum total time including all retries
  shouldRetry: (error: unknown) => boolean;
}

export const DATABASE_RETRY_STRATEGY: RetryStrategy = {
  delays: [100, 200, 400, 800, 1600, 3200], // 6 attempts, max ~6.1s
  maxTotalTimeout: 10000, // 10 seconds total
  shouldRetry: (error: unknown) => {
    const serviceError = ServiceErrorClassifier.classify(error);
    return serviceError.type === ServiceErrorType.DATABASE_UNAVAILABLE;
  },
};

export const REDIS_RETRY_STRATEGY: RetryStrategy = {
  delays: [100, 200, 400, 800, 1600], // 5 attempts, max ~3.1s
  maxTotalTimeout: 10000, // 10 seconds total
  shouldRetry: (error: unknown) => {
    const serviceError = ServiceErrorClassifier.classify(error);
    return serviceError.type === ServiceErrorType.REDIS_UNAVAILABLE;
  },
};
```

### 3.2 RetryExecutor Implementation (Requirements 2.3, 2.4, 5.3)

```typescript
// packages/shared/src/service-health.ts

import { logger } from "./logger";

export class RetryExecutor {
  static async retryWithBackoff<T>(
    operation: () => Promise<T>,
    strategy: RetryStrategy,
    context: { serviceName: string; operationName: string },
  ): Promise<T> {
    const startTime = Date.now();
    let lastError: unknown;

    for (let attempt = 0; attempt < strategy.delays.length + 1; attempt++) {
      try {
        // Log attempt (Requirement 5.3)
        if (attempt > 0) {
          logger.debug({
            service: context.serviceName,
            operation: context.operationName,
            attempt,
            totalAttempts: strategy.delays.length + 1,
          }, "Retrying operation");
        }

        // Execute operation
        const result = await operation();

        // Log success after retry (Requirement 2.3)
        if (attempt > 0) {
          logger.info({
            service: context.serviceName,
            operation: context.operationName,
            attempt,
            duration: Date.now() - startTime,
          }, "Operation succeeded after retry");
        }

        return result;
      } catch (error) {
        lastError = error;

        // Log failure (Requirement 5.2)
        logger.warn({
          service: context.serviceName,
          operation: context.operationName,
          attempt,
          error: error instanceof Error ? error.message : String(error),
        }, "Operation failed");

        // Check if we should retry
        const elapsedTime = Date.now() - startTime;
        const isLastAttempt = attempt >= strategy.delays.length;
        const timeoutExceeded = elapsedTime >= strategy.maxTotalTimeout;

        if (isLastAttempt || timeoutExceeded || !strategy.shouldRetry(error)) {
          // Log exhausted retries (Requirement 2.4, 5.2)
          logger.error({
            service: context.serviceName,
            operation: context.operationName,
            totalAttempts: attempt + 1,
            duration: elapsedTime,
            reason: timeoutExceeded ? "timeout" : isLastAttempt ? "max_attempts" : "non_retryable",
          }, "Retry attempts exhausted");
          
          throw error;
        }

        // Wait before next attempt
        const delay = strategy.delays[attempt];
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // Should never reach here, but TypeScript needs it
    throw lastError;
  }
}
```

### 3.3 Background Retry Continuation (Requirement 13.4)

The retry logic continues in the background even after user timeout. If a subsequent request arrives:
- The database may have finished waking up from cold start
- A new retry sequence begins with fresh timeout
- Previous failed attempts do not block new requests

## 4. Pre-Upload Validation

### 4.1 ServiceHealthValidator Implementation (Requirements 3.1-3.5, 7.2, 7.3)

```typescript
// packages/shared/src/service-health.ts

export class ServiceHealthValidator {
  /**
   * Validate database connectivity (Requirement 3.1)
   * Uses lightweight SELECT 1 query
   */
  static async validateDatabase(prisma: PrismaClient): Promise<void> {
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (error) {
      const serviceError = ServiceErrorClassifier.classify(error);
      throw new Error(serviceError.message.ar);
    }
  }

  /**
   * Validate Redis connectivity (Requirement 3.2)
   * Uses PING command
   */
  static async validateRedis(redis: Redis): Promise<void> {
    try {
      await redis.ping();
    } catch (error) {
      const serviceError = ServiceErrorClassifier.classify(error);
      throw new Error(serviceError.message.ar);
    }
  }

  /**
   * Validate storage availability (Requirement 3.3)
   * Uses fs.access to check write permissions
   */
  static async validateStorage(storagePath: string): Promise<void> {
    try {
      const { access, constants } = await import("node:fs/promises");
      await access(storagePath, constants.W_OK);
    } catch (error) {
      const serviceError = ServiceErrorClassifier.classify(error);
      throw new Error(serviceError.message.ar);
    }
  }

  /**
   * Validate all services in parallel (Requirements 3.4, 7.4)
   * Returns error instead of accepting file when validation fails
   */
  static async validateAll(
    prisma: PrismaClient,
    redis: Redis,
    storagePath: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Run all validations in parallel (Requirement 7.4)
      await Promise.all([
        this.validateDatabase(prisma),
        this.validateRedis(redis),
        this.validateStorage(storagePath),
      ]);

      return { success: true };
    } catch (error) {
      // Return error instead of accepting file (Requirement 3.4)
      return {
        success: false,
        error: error instanceof Error ? error.message : "حدث خطأ في الخدمة",
      };
    }
  }
}
```

### 4.2 Integration with Upload Flow (Requirements 3.1-3.5)

The upload route handler will call `ServiceHealthValidator.validateAll()` before accepting the file upload:

```typescript
// apps/web/src/app/api/upload/route.ts (pseudocode)

export async function POST(request: Request) {
  // Pre-upload validation (Requirement 3)
  const validation = await ServiceHealthValidator.validateAll(
    prisma,
    redis,
    STORAGE_PATH,
  );

  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error },
      { status: 503 },
    );
  }

  // Proceed with upload...
}
```

## 5. Enhanced Health Check Endpoint

### 5.1 Detailed Health Check Endpoint (Requirements 4.1-4.6, 8.1-8.3)

```typescript
// apps/web/src/app/api/health/detailed/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/transport/db";
import { redis } from "@/transport/redis";
import { logger } from "@/shared/logger";

interface ServiceCheckResult {
  status: "healthy" | "unhealthy";
  responseTimeMs: number;
}

interface DetailedHealthResponse {
  overall: "healthy" | "unhealthy";
  timestamp: string;
  services: {
    database: ServiceCheckResult;
    redis: ServiceCheckResult;
    storage: ServiceCheckResult;
  };
}

/**
 * Check database connectivity (Requirement 4.1)
 * Uses lightweight SELECT 1 query
 * Times out after 2 seconds (Requirement 8.2)
 */
async function checkDatabase(): Promise<ServiceCheckResult> {
  const start = Date.now();
  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error("timeout")), 2000)
      ),
    ]);
    
    return {
      status: "healthy",
      responseTimeMs: Date.now() - start,
    };
  } catch (error) {
    logger.warn({ error }, "Health check: Database unhealthy");
    return {
      status: "unhealthy",
      responseTimeMs: Date.now() - start,
    };
  }
}

/**
 * Check Redis connectivity (Requirement 4.2)
 * Uses PING command
 * Times out after 2 seconds (Requirement 8.2)
 */
async function checkRedis(): Promise<ServiceCheckResult> {
  const start = Date.now();
  try {
    await Promise.race([
      redis.ping(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error("timeout")), 2000)
      ),
    ]);
    
    return {
      status: "healthy",
      responseTimeMs: Date.now() - start,
    };
  } catch (error) {
    logger.warn({ error }, "Health check: Redis unhealthy");
    return {
      status: "unhealthy",
      responseTimeMs: Date.now() - start,
    };
  }
}

/**
 * Check storage availability (Requirement 4.3)
 * Uses fs.access for lightweight check
 * Times out after 2 seconds (Requirement 8.2)
 */
async function checkStorage(): Promise<ServiceCheckResult> {
  const start = Date.now();
  try {
    const storagePath = process.env.STORAGE_LOCAL_DIR || "/data";
    const { access, constants } = await import("node:fs/promises");
    
    await Promise.race([
      access(storagePath, constants.W_OK),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error("timeout")), 2000)
      ),
    ]);
    
    return {
      status: "healthy",
      responseTimeMs: Date.now() - start,
    };
  } catch (error) {
    logger.warn({ error }, "Health check: Storage unhealthy");
    return {
      status: "unhealthy",
      responseTimeMs: Date.now() - start,
    };
  }
}

/**
 * Enhanced health check endpoint
 * Requirements 4.1-4.6, 8.1-8.3
 */
export async function GET() {
  const start = Date.now();

  try {
    // Run all checks in parallel (Requirement 7.4, 8.2)
    const [database, redis, storage] = await Promise.all([
      checkDatabase(),
      checkRedis(),
      checkStorage(),
    ]);

    // Determine overall health (Requirements 4.4, 4.5, 4.6)
    const allHealthy = 
      database.status === "healthy" &&
      redis.status === "healthy" &&
      storage.status === "healthy";

    const response: DetailedHealthResponse = {
      overall: allHealthy ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      services: { database, redis, storage },
    };

    // Return HTTP 200 when ALL healthy, HTTP 503 when ANY unhealthy
    // (Requirements 4.5, 4.6)
    return NextResponse.json(response, {
      status: allHealthy ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    logger.error({ error, duration: Date.now() - start }, "Health check failed");
    
    // Return 503 on unexpected error
    return NextResponse.json(
      {
        overall: "unhealthy",
        timestamp: new Date().toISOString(),
        error: "Health check failed",
      },
      { status: 503 },
    );
  }
}
```

### 5.2 TypeScript Response Schema (Requirement 4.2)

```typescript
// packages/shared/src/types/health.ts

export interface ServiceCheckResult {
  status: "healthy" | "unhealthy";
  responseTimeMs: number;
}

export interface DetailedHealthResponse {
  overall: "healthy" | "unhealthy";
  timestamp: string;
  services: {
    database: ServiceCheckResult;
    redis: ServiceCheckResult;
    storage: ServiceCheckResult;
  };
}
```

## 6. Logging Strategy

### 6.1 Logger Instance (Requirements 5.1-5.5, 9.1-9.5)

The application uses the existing pino logger from `packages/shared/src/logger.ts`:

```typescript
import { logger } from "@ibn-al-azhar-docs/shared";

// The logger is already configured with:
// - ISO 8601 timestamps (Requirement 9.1)
// - Appropriate log levels (Requirement 9.4)
// - Structured JSON output
```

### 6.2 Log Formats (Requirements 5.1-5.5, 9.1-9.5)

**Upload Attempt Log** (Requirement 5.1):
```typescript
logger.info({
  operation: "upload_document",
  userId: userId || "anonymous",
  filename: file.name,
  fileSize: file.size,
  mimeType: file.type,
}, "Upload attempt started");
```

**Service Connection Failure** (Requirement 5.2):
```typescript
logger.error({
  service: "database" | "redis" | "storage",
  error: error.message,
  errorType: serviceError.type,
  stack: error.stack,
}, "Service connection failed");
```

**Retry Attempt** (Requirement 5.3):
```typescript
logger.debug({
  service: serviceName,
  operation: operationName,
  attempt: attemptNumber,
  delayMs: delayDuration,
  totalAttempts: maxAttempts,
}, "Retrying operation");
```

**Upload Completion** (Requirement 5.4):
```typescript
logger.info({
  operation: "upload_document",
  status: "success" | "failure",
  durationMs: Date.now() - startTime,
  documentId: result?.id,
}, "Upload completed");
```

**Error Returned to User** (Requirement 5.5):
```typescript
logger.error({
  errorCode: serviceError.type,
  errorMessageAr: serviceError.message.ar,
  errorMessageEn: serviceError.message.en,
  httpStatus: serviceError.httpStatus,
  userId: userId || "anonymous",
  operation: "upload_document",
}, "Error returned to user");
```

### 6.3 Sensitive Data Handling (Requirement 9.5)

**Never log:**
- File contents
- Authentication tokens
- User passwords
- Personal identification numbers
- Credit card information

**Safe to log:**
- Filenames
- File sizes
- MIME types
- User IDs (non-PII identifiers)
- Error messages
- Operation names
- Timestamps

## 7. Implementation Approach

### 7.1 Files to Create

1. **`packages/shared/src/service-health.ts`**
   - `ServiceErrorType` enum
   - `ServiceError` interface
   - `ServiceErrorClassifier` class
   - `RetryStrategy` interface
   - `DATABASE_RETRY_STRATEGY` constant
   - `REDIS_RETRY_STRATEGY` constant
   - `RetryExecutor` class
   - `ServiceHealthValidator` class

2. **`packages/shared/src/types/health.ts`**
   - `ServiceCheckResult` interface
   - `DetailedHealthResponse` interface

3. **`apps/web/src/app/api/health/detailed/route.ts`**
   - New detailed health check endpoint
   - Individual service check functions
   - GET handler with parallel checks

### 7.2 Files to Modify

1. **`apps/web/src/core/services/upload-document.use-case.ts`**
   - Import `RetryExecutor` and retry strategies
   - Wrap database operations with `RetryExecutor.retryWithBackoff()`
   - Wrap Redis operations with retry logic
   - Add comprehensive logging at each stage
   - Implement mid-upload failure rollback

2. **`apps/web/src/app/api/upload/route.ts`** (or equivalent upload endpoint)
   - Import `ServiceHealthValidator`
   - Add pre-upload validation call
   - Return error if validation fails
   - Log upload attempts and completions

3. **`packages/shared/src/index.ts`**
   - Export new service-health module types and classes
   - Export health check types

### 7.3 Integration Points

**Database Operations** (Requirement 2.1):
```typescript
// Wrap all database operations with retry
await RetryExecutor.retryWithBackoff(
  async () => await prisma.document.create({ data }),
  DATABASE_RETRY_STRATEGY,
  { serviceName: "database", operationName: "create_document" },
);
```

**Redis Operations** (Requirement 2.2):
```typescript
// Wrap all Redis operations with retry
await RetryExecutor.retryWithBackoff(
  async () => await redis.set(key, value),
  REDIS_RETRY_STRATEGY,
  { serviceName: "redis", operationName: "cache_set" },
);
```

**Upload Route** (Requirements 3.1-3.5):
```typescript
// Pre-upload validation
const validation = await ServiceHealthValidator.validateAll(
  prisma,
  redis,
  storagePath,
);

if (!validation.success) {
  return NextResponse.json(
    { error: validation.error },
    { status: 503 },
  );
}
```

**Error Handling** (Requirements 1.1-1.5):
```typescript
try {
  // Upload logic...
} catch (error) {
  const serviceError = ServiceErrorClassifier.classify(error);
  
  logger.error({
    errorCode: serviceError.type,
    errorMessageAr: serviceError.message.ar,
    errorMessageEn: serviceError.message.en,
  }, "Upload failed");
  
  return NextResponse.json(
    {
      error: serviceError.message.ar,
      errorEn: serviceError.message.en, // Developer reference
    },
    { status: serviceError.httpStatus },
  );
}
```

### 7.4 Implementation Order

1. **Phase 1: Foundation**
   - Create `service-health.ts` with error classification
   - Add TypeScript types and interfaces
   - Write unit tests for error classifier

2. **Phase 2: Retry Logic**
   - Implement `RetryExecutor` class
   - Add retry strategies for database and Redis
   - Write unit tests for retry logic

3. **Phase 3: Pre-Upload Validation**
   - Implement `ServiceHealthValidator` class
   - Integrate validation into upload route
   - Write integration tests for validation

4. **Phase 4: Enhanced Health Check**
   - Create `/api/health/detailed` endpoint
   - Implement individual service checks
   - Write integration tests for health endpoint

5. **Phase 5: Upload Use Case Enhancement**
   - Wrap database operations with retry
   - Wrap Redis operations with retry
   - Add comprehensive logging
   - Implement mid-upload failure rollback
   - Write integration tests for enhanced upload

6. **Phase 6: Testing & Documentation**
   - End-to-end testing with simulated failures
   - Performance testing under load
   - Update API documentation
   - Update deployment documentation
