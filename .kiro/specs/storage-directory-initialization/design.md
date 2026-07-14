# Storage Directory Initialization Bugfix Design

## Overview

This bugfix addresses a critical issue where file uploads fail due to the missing `/data` storage directory in Hugging Face Spaces deployment. The container startup script creates subdirectories (`/data/uploads`, `/data/exports`, etc.) but fails to create the root `/data` directory itself when it doesn't exist. This causes the `access()` check in the upload route to fail with `ENOENT` (No such file or directory), resulting in upload rejection with a generic storage error message.

The fix ensures the root storage directory is created early in the container lifecycle before any subdirectories are created, and improves error messaging to distinguish between "directory doesn't exist" and "no write permissions".

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when the `/data` directory does not exist at container startup
- **Property (P)**: The desired behavior - the storage directory should be created automatically before subdirectories, and write permission checks should provide clear error messages
- **Preservation**: Existing S3 storage mode and subdirectory creation behavior must remain unchanged by the fix
- **STORAGE_LOCAL_DIR**: Environment variable defining the root storage path, defaults to `/data`
- **docker-entrypoint.sh**: Container initialization script in `scripts/docker-entrypoint.sh` that sets up services and creates directories
- **ServiceHealthValidator**: Shared validation utility in `packages/shared/src/service-health.ts` that checks storage writability before accepting uploads
- **STORAGE_DRIVER**: Environment variable controlling storage backend ("local" for filesystem, "s3" for MinIO)

## Bug Details

### Bug Condition

The bug manifests when the container starts without a pre-existing `/data` directory (or custom `STORAGE_LOCAL_DIR` path). The entrypoint script attempts to create subdirectories (`mkdir -p "$STORAGE_LOCAL_DIR/uploads"`) before ensuring the parent directory exists with proper permissions, causing either directory creation failure or subsequent write-permission check failures.

**Formal Specification:**
```
FUNCTION isBugCondition(containerState)
  INPUT: containerState of type ContainerStartupState
  OUTPUT: boolean
  
  RETURN containerState.storageDriver == "local"
         AND NOT directoryExists(containerState.STORAGE_LOCAL_DIR)
         AND mkdir_subdirectories_attempted
END FUNCTION
```

### Examples

- **Scenario 1**: Fresh Hugging Face Space deployment with no persistent volume mounted at `/data`
  - **Expected**: Container creates `/data` with write permissions, subdirectories are created successfully, uploads work
  - **Actual**: `mkdir -p /data/uploads` may appear to succeed but `/data` has wrong ownership, or `access(W_OK)` check fails with `ENOENT`

- **Scenario 2**: Container restart after persistent volume is detached/remounted
  - **Expected**: Entrypoint recreates directory structure, uploads resume
  - **Actual**: Upload route returns generic "نظام التخزين غير متاح" without indicating the specific problem

- **Scenario 3**: Custom `STORAGE_LOCAL_DIR=/mnt/custom` where `/mnt/custom` doesn't exist
  - **Expected**: Directory is created with proper permissions
  - **Actual**: Subdirectory creation may fail silently, or write check fails later

- **Edge Case**: `/data` exists but is owned by root with mode 0755, container runs as user 1000
  - **Expected**: Error message distinguishes "directory exists but not writable" from "directory doesn't exist"
  - **Actual**: Generic EACCES error message doesn't help debugging

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- S3 storage mode (`STORAGE_DRIVER=s3`) must continue to work exactly as before, skipping local directory creation
- When `/data` already exists with correct permissions, container startup should proceed without modification
- MinIO server startup logic and bucket creation remain unchanged
- Database and Redis initialization sequences are not affected
- Subdirectory structure (`uploads/`, `exports/`, `ocr-text/`, `tmp/`) remains the same

**Scope:**
All inputs that do NOT involve missing or inaccessible local storage directories should be completely unaffected by this fix. This includes:
- S3/MinIO storage operations when `STORAGE_DRIVER=s3`
- File uploads when storage directory already exists and is writable
- Health check endpoints when storage is healthy
- All non-upload API routes

## Hypothesized Root Cause

Based on the bug description and code analysis, the most likely issues are:

1. **Missing Root Directory Creation**: The entrypoint script (line 121) runs:
   ```bash
   mkdir -p "$STORAGE_LOCAL_DIR/uploads" "$STORAGE_LOCAL_DIR/exports" ...
   ```
   This assumes `$STORAGE_LOCAL_DIR` (default `/data`) already exists. If it doesn't, `mkdir -p` creates it but may use incorrect ownership (e.g., root:root when the app runs as user 1000).

2. **Insufficient Permission Verification**: The script does not verify that the created directory is writable by the application user before proceeding. When `/data` is created with root ownership, subdirectories may be created successfully, but the write check in `upload/route.ts` (line 92) fails later.

3. **Generic Error Classification**: The `ServiceErrorClassifier` (line 93-98 in `service-health.ts`) maps all filesystem errors (`ENOENT`, `EACCES`) to the same generic message:
   ```
   "نظام التخزين غير متاح. يرجى الاتصال بالدعم الفني"
   ```
   This doesn't help operators distinguish between "directory doesn't exist" (configuration issue) and "no write permissions" (permissions issue).

4. **Timing Race Condition**: The entrypoint creates directories asynchronously relative to the Node.js app start. If supervisord starts the web process before directory creation completes, early upload requests fail.

## Correctness Properties

Property 1: Bug Condition - Storage Directory Auto-Creation

_For any_ container startup where `STORAGE_DRIVER=local` and the directory specified by `STORAGE_LOCAL_DIR` does not exist, the fixed entrypoint script SHALL create the root storage directory with write permissions for the application user BEFORE creating any subdirectories, ensuring all subsequent write operations succeed.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation - Existing Directory Behavior

_For any_ container startup where the storage directory already exists with correct permissions, or where `STORAGE_DRIVER=s3`, the fixed code SHALL produce exactly the same behavior as the original code, preserving directory structure, ownership, MinIO startup logic, and S3 operation flow.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `scripts/docker-entrypoint.sh`

**Function**: Storage initialization block (lines 114-122)

**Specific Changes**:
1. **Add Root Directory Creation Guard**: Before creating subdirectories, explicitly create and verify the root storage directory:
   ```bash
   # Create root storage directory with proper ownership
   if [ ! -d "$STORAGE_LOCAL_DIR" ]; then
     mkdir -p "$STORAGE_LOCAL_DIR"
     if [ "$(id -u)" = "0" ]; then
       chown 1000:1000 "$STORAGE_LOCAL_DIR"
     fi
     chmod 755 "$STORAGE_LOCAL_DIR"
   fi
   ```

2. **Add Write Permission Verification**: After directory creation, verify writability before proceeding:
   ```bash
   # Verify write permissions with a test file
   if ! touch "$STORAGE_LOCAL_DIR/.write-test" 2>/dev/null || ! rm "$STORAGE_LOCAL_DIR/.write-test" 2>/dev/null; then
     echo "[entrypoint] ERROR: Storage directory $STORAGE_LOCAL_DIR is not writable"
     exit 1
   fi
   ```

3. **Move Directory Creation Earlier**: Relocate the storage directory creation block to immediately after environment variable exports (after line 29) so it runs before any other service initialization.

4. **Add Logging**: Insert diagnostic output to help operators verify directory creation:
   ```bash
   echo "[entrypoint] local filesystem storage enabled (STORAGE_DRIVER=${STORAGE_DRIVER})"
   echo "[entrypoint] ensuring storage directory exists: $STORAGE_LOCAL_DIR"
   ```

5. **Synchronous Subdirectory Creation**: Ensure subdirectory creation happens synchronously and check exit codes:
   ```bash
   mkdir -p "$STORAGE_LOCAL_DIR/uploads" "$STORAGE_LOCAL_DIR/exports" \
            "$STORAGE_LOCAL_DIR/ocr-text" "$STORAGE_LOCAL_DIR/tmp" || {
     echo "[entrypoint] ERROR: Failed to create storage subdirectories"
     exit 1
   }
   ```

**File**: `packages/shared/src/service-health.ts`

**Function**: `ServiceErrorClassifier.classify()` (lines 93-98)

**Specific Changes**:
1. **Distinguish ENOENT from EACCES**: Add separate error detection for "directory doesn't exist" vs "permission denied":
   ```typescript
   // Storage errors - Directory doesn't exist (ENOENT)
   if (message.includes("enoent") || message.includes("no such file or directory")) {
     return {
       type: ServiceErrorType.STORAGE_UNAVAILABLE,
       message: {
         ar: "مجلد التخزين غير موجود. يرجى التحقق من إعدادات النشر",
         en: "Storage directory does not exist. Please check deployment configuration.",
       },
       httpStatus: 503,
       originalError: err,
     };
   }
   
   // Storage errors - Permission denied (EACCES)
   if (message.includes("eacces") || message.includes("permission denied")) {
     return {
       type: ServiceErrorType.STORAGE_UNAVAILABLE,
       message: {
         ar: "لا توجد صلاحيات كتابة على مجلد التخزين. يرجى الاتصال بالدعم الفني",
         en: "Storage directory is not writable. Please contact technical support.",
       },
       httpStatus: 503,
       originalError: err,
     };
   }
   ```

2. **Add Disk Full Detection**: Detect `ENOSPC` separately to provide actionable guidance:
   ```typescript
   // Storage errors - Disk full (ENOSPC)
   if (message.includes("enospc") || message.includes("no space left")) {
     return {
       type: ServiceErrorType.STORAGE_UNAVAILABLE,
       message: {
         ar: "مساحة التخزين ممتلئة. يرجى حذف بعض الملفات أو زيادة المساحة",
         en: "Storage is full. Please delete files or increase storage capacity.",
       },
       httpStatus: 507, // HTTP 507 Insufficient Storage
       originalError: err,
     };
   }
   ```

**File**: `apps/web/src/messages/ar.json` (Optional Enhancement)

**Specific Changes**: Add more specific error keys for future use:
```json
"errors": {
  "storageNotFound": "مجلد التخزين غير موجود. يرجى التحقق من إعدادات النشر",
  "storageNotWritable": "لا توجد صلاحيات كتابة على مجلد التخزين",
  "storageFull": "مساحة التخزين ممتلئة"
}
```

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code by simulating missing directories and permission issues, then verify the fix works correctly across all deployment scenarios and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write integration tests that simulate container startup conditions with missing directories and permission issues. Run these tests by manually testing the unfixed entrypoint script in a Docker container to observe failures and understand the root cause.

**Test Cases**:
1. **Missing Root Directory Test**: Start container with no `/data` directory (will fail on unfixed code)
   - Simulate: `docker run` without volume mount
   - Expected failure: Subdirectory creation succeeds but write check fails with `ENOENT` or `EACCES`
   - Confirms hypothesis: Missing root directory creation guard

2. **Root Owned Directory Test**: Pre-create `/data` as root:root with mode 0755 (will fail on unfixed code)
   - Simulate: `mkdir /data && chown root:root /data` before app starts as user 1000
   - Expected failure: Write check fails with `EACCES`
   - Confirms hypothesis: Insufficient permission verification

3. **Custom Storage Path Test**: Set `STORAGE_LOCAL_DIR=/mnt/custom` where `/mnt/custom` doesn't exist (will fail on unfixed code)
   - Simulate: `docker run -e STORAGE_LOCAL_DIR=/mnt/custom`
   - Expected failure: Directory creation fails or write check fails
   - Confirms hypothesis: Path-agnostic creation logic needed

4. **S3 Mode Preservation Test**: Set `STORAGE_DRIVER=s3` with no local directories (should pass on unfixed code)
   - Simulate: `docker run -e STORAGE_DRIVER=s3`
   - Expected behavior: No local directory creation, MinIO starts successfully
   - Confirms preservation requirement: S3 mode unaffected

**Expected Counterexamples**:
- Upload POST requests fail with `{ code: "UPLOAD_STORAGE_UNAVAILABLE", message: "نظام التخزين غير متاح" }`
- Generic error message doesn't indicate whether directory is missing or not writable
- Possible causes: Missing directory creation, wrong ownership, insufficient permission checks

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL containerStartup WHERE isBugCondition(containerStartup) DO
  result := entrypoint_fixed(containerStartup)
  ASSERT directoryExists(STORAGE_LOCAL_DIR)
  ASSERT isWritable(STORAGE_LOCAL_DIR)
  ASSERT subdirectoriesCreated(STORAGE_LOCAL_DIR)
  ASSERT uploadAccepted(testFile)
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL containerStartup WHERE NOT isBugCondition(containerStartup) DO
  ASSERT entrypoint_original(containerStartup) = entrypoint_fixed(containerStartup)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain (existing directories with various permissions, S3 mode, custom paths)
- It catches edge cases that manual unit tests might miss (e.g., symbolic links, NFS mounts, unusual ownership)
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for existing directory scenarios and S3 mode, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Existing Directory Preservation**: Observe that when `/data` exists with correct ownership (1000:1000) on unfixed code, startup succeeds. Write test to verify this continues after fix.
2. **S3 Mode Preservation**: Observe that when `STORAGE_DRIVER=s3`, no local directories are created on unfixed code. Write test to verify this continues after fix.
3. **MinIO Startup Preservation**: Observe that MinIO server starts correctly in S3 mode on unfixed code. Write test to verify bucket creation still works after fix.
4. **Subdirectory Structure Preservation**: Observe that subdirectories (`uploads/`, `exports/`, etc.) are created with correct structure on unfixed code. Write test to verify structure unchanged after fix.

### Unit Tests

- Test entrypoint directory creation logic in isolation with mocked filesystem
- Test edge cases: root directory exists but is read-only, parent directory doesn't exist (`/nonexistent/data`), symbolic links
- Test ServiceErrorClassifier with `ENOENT`, `EACCES`, `ENOSPC` error objects
- Test that write permission check happens before subdirectory creation

### Property-Based Tests

- Generate random storage paths and verify directory creation succeeds when path is writable
- Generate random container startup states (existing/missing directories, various ownerships) and verify preservation of S3 mode behavior
- Test that all non-storage-related services (PostgreSQL, Redis, migrations) continue to start correctly across many scenarios

### Integration Tests

- **Full Container Lifecycle Test**: Start container from scratch, verify `/data` created, upload a file, verify file stored correctly
- **Container Restart Test**: Stop and restart container with persistent volume, verify directory structure preserved, uploads resume
- **Permission Error Reporting Test**: Create `/data` as root:root, start app as user 1000, verify error message clearly indicates permission issue (not generic "storage unavailable")
- **S3 Mode Integration Test**: Start container with `STORAGE_DRIVER=s3`, verify MinIO starts, upload file via S3, verify local filesystem not used
