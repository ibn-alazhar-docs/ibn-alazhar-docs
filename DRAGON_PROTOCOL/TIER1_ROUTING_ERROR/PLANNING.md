# DRAGON PROTOCOL - TIER1 ROUTING ERROR

## Phase 1: TRIAGE

**Task**: Apply withAuth + handleRouteError to 5 route files with manual try-catch

**Classification**: Easy
**Thinking Budget**: Medium
**Difficulty**: Low - standardized pattern

**Priority**: CRITICAL - Immediate security impact

**Decision**: EXECUTE transformation on 5 files

## Phase 2: PLAN

**Goal**: Extract error handling from 5 route files to use handleRouteError wrapper

**Tasks**:

1. **Document affected files**: List all 5 files
2. **Analyze current patterns**: All use manual try-catch instead of withAuth
3. **Plan extraction**: Remove try-catch, ensure withAuth wrapper
4. **Verification**: Tests + typecheck + lint
5. **Rollback**: Manual revert of each file if tests fail

**Dependencies**:

- Core error layer (`handleRouteError` exists)
- Auth middleware (`withAuth` exists)

## Phase 3: EXPLORE

**Candidate 1**: Apply withAuth + handleRouteError directly to 5 files

**Candidate 2**: Split into two phases - Phase A: auth, Phase B: error

**Candidate 3**: Automate patterns using find-and-replace across ALL routes (45 total)

**Score**: 1 (direct approach) ✓

## Phase 4: DEBATE

**Lens 1 - Correctness**: This ensures consistent error handling across API
**Lens 2 - Simplicity**: Direct file modification, clear impact
**Lens 3 - Performance**: No runtime performance impact

## Phase 5: SYNTHESIZE

**Plan**: Apply withAuth + handleRouteError to 5 files in single batch.

## Phase 6: EXECUTE

**Implementation**:

1. Process 5 files with `extraction-replace` pattern
2. Verify each file compilation and test pass
3. Build deployment package with all 5 files

## Phase 7: VERIFY

**External verifiers**:

- `pnpm typecheck`
- `pnpm test`
- `pnpm lint`
- Manual review of error messages

**Reflexion**: If any errors, retry extraction with different approach

## Phase 8: CRITIQUE

**Constitutional checklist**:

- ✅ All 5 files wrapped with withAuth
- ✅ All 5 files use handleRouteError for error handling
- ✅ All 5 files maintain same API signatures
- ✅ All 5 files preserve error behavior
- ✅ No console.log/warn in modified files

## Phase 9: REFINE

**Self-refinement iterations**:

- Iteration 1: Apply transformation to all 5 files
- Iteration 2: Verify tests pass
- Stop if no improvement needed

## Phase 10: META-CHECK

**Confidence**: 5/5
**Residual risk**: 1/5
**Top residual risk**: Authentication issues across routes

## Phase 11: OUTPUT

**Deliverables**:

- Git commits for each file (or single commit)
- Documentation of changes
- Self-improvement proposal for future automation

---

## Affected Files (5 total)

**CRITICAL - Route files that need transformation:**

1. **auth/register/route.ts** - Has try-catch with manual error handling
2. **conversion/list/route.ts** - Has try-catch with manual error handling
3. **conversion/start/route.ts** - Has try-catch with manual error handling
4. **conversion/[id]/status/route.ts** - Has try-catch with manual error handling
5. **stream/route.ts** - Has try-catch with manual error handling

**Note**: Based on analysis, these 5 files have manual try-catch patterns that should be replaced with withAuth and handleRouteError for consistent error handling across the API.

---

## Target Files With Current Patterns

### 1. auth/register/route.ts

**Current**: `try { ... } catch { error }` with manual error responses
**Should be**: `withAuth(async (request, { session }) => { ... })` with `handleRouteError` wrapper

### 2. conversion/list/route.ts

**Current**: `try { ... } catch { error }` with manual error responses
**Should be**: `withAuth(async (request, { session }) => { ... })` with `handleRouteError` wrapper

### 3. conversion/start/route.ts

**Current**: `try { ... } catch { error }` with manual error responses
**Should be**: `withAuth(async (request, { session }) => { ... })` with `handleRouteError` wrapper

### 4. conversion/[id]/status/route.ts

**Current**: `try { ... } catch { error }` with manual error responses
**Should be**: `withAuth(async (request, { session }) => { ... })` with `handleRouteError` wrapper

### 5. stream/route.ts

**Current**: `try { ... } catch { error }` with manual error responses
**Should be**: `withAuth(async (request, { session }) => { ... })` with `handleRouteError` wrapper

**Why**: All 5 files currently violate the API contract by having raw try-catch instead of the standardized withAuth + handleRouteError pattern.
