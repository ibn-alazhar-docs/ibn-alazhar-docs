---
name: api-contract
description: "API contract management — generates OpenAPI 3.1 / GraphQL SDL / protobuf specs from code, generates TypeScript types from specs, runs contract tests (Schemathesis / Pact), and detects breaking changes via oasdiff. Used in Phase 2 AUDIT (Dim 10 Full-Stack gap) and Phase 6 EXECUTE whenever an endpoint is added, changed, or removed."
license: MIT
metadata:
  version: "1.0"
  author: OmniProject AI
  category: backend
---

# API Contract

> Source-of-truth sub-skill for every HTTP/GraphQL/gRPC boundary in the project. Owns spec generation, type generation, breaking-change detection, and contract test wiring. Other backend sub-skills (`api-versioning`, `auth-setup`, `rate-limiting`, `webhook-setup`) mutate endpoints — this sub-skill validates that the mutation is _contract-safe_ before it ships.

## When to Use

| Phase                   | Trigger                                                                                                   | Why                                                                         |
| ----------------------- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Phase 2 — AUDIT         | Dim 10 (Full-Stack) finds: no OpenAPI/SDL/proto file, frontend and backend types drift, no contract tests | Establish the contract baseline before any code changes                     |
| Phase 6 — EXECUTE       | Any commit that adds/changes/removes an endpoint, request/response shape, status code, or header          | Verify the contract still holds and ship updated types                      |
| Phase 7 — OBSERVABILITY | Adding red-team / fuzz tests                                                                              | Schemathesis needs the spec to generate cases                               |
| Phase 11 — ROLLOUT      | Pre-deploy gate                                                                                           | Re-run `oasdiff` against production spec — block deploy on breaking changes |

**Do NOT use this sub-skill for:** version bump strategy (use `api-versioning`), auth scheme design (use `auth-setup`), or DB schema (use `db-design`). Those sub-skills _call into_ `api-contract` to register their changes — you call them, not this one.

## What It Does

1. **Detects API style** by scanning the codebase:
   - REST (Express/FastAPI/Spring/NestJS/Hono) → OpenAPI 3.1
   - GraphQL (Apollo/GraphQL.js/Yoga/gqlgen) → SDL + `@graphql-codegen`
   - gRPC (grpc-go/tonic/grpc-node) → `.proto` + `buf` + `protoc`
   - Mixed: handle each style independently, emit one spec per style
2. **Generates the spec from code** (spec-first OR code-first, never both):
   - Code-first: introspect route handlers → `openapi.yaml` (via `@asteasolutions/zod-to-openapi`, `tsoa`, `drf-spectacular`, `springdoc-openapi`)
   - Spec-first: hand-author `openapi.yaml`, generate server stubs via `openapi-generator-cli`
3. **Generates TypeScript types** from the spec:
   - REST: `openapi-typescript` → `src/types/api.ts`
   - GraphQL: `@graphql-codegen/client` → `src/types/graphql.ts`
   - gRPC: `protoc --ts_out` → `src/types/grpc.ts`
4. **Detects breaking changes** by diffing the previous spec (from `git HEAD:openapi.yaml`) against the new one using `oasdiff` (REST) / `graphql-inspector` (GraphQL) / `buf breaking` (gRPC).
5. **Wires contract tests** — consumer-driven (Pact) or producer-side (Schemathesis):
   - Schemathesis (Python): stateful fuzzing of the OpenAPI spec
   - Pact (multi-language): consumer pacts verified against provider
6. **Emits a migration guide** when breaking changes are detected — what changed, who breaks, how to migrate.

## Integration Contract

```
INPUT:
  - project_dir: string (required)
  - api_style: auto|rest|graphql|grpc (default auto — detected from code)
  - mode: code-first|spec-first (default code-first; spec-first requires existing openapi.yaml)
  - check_breaking: bool (default true)
  - generate_types: bool (default true)
  - generate_tests: bool (default true)
  - previous_spec_ref: git ref (default "HEAD:openapi.yaml" / "HEAD:schema.graphql" / "HEAD:proto/")

OUTPUT (JSON to stdout):
  {
    "status": "ok|breaking|error",
    "api_style": "rest|graphql|grpc|mixed",
    "spec_path": "openapi.yaml" | "schema.graphql" | "proto/",
    "spec_valid": true|false,
    "types_path": "src/types/api.ts",
    "breaking_changes": [
      {
        "type": "response-property-removed|status-code-removed|required-parameter-added|...",
        "path": "/v1/users/{id}",
        "method": "GET",
        "details": "Removed response property 'email'",
        "severity": "breaking|non-breaking",
        "migration": "..."
      }
    ],
    "contract_tests_path": "tests/contract/",
    "migration_guide_path": "MIGRATION.md",
    "duration_ms": 4321
  }

SIDE EFFECTS:
  - Writes/updates openapi.yaml | schema.graphql | proto/*.proto
  - Writes/updates src/types/api.ts (or equivalent)
  - Writes tests/contract/ directory with Schemathesis or Pact config
  - Writes MIGRATION.md if breaking changes found
  - Updates TRACEABILITY_MATRIX.md with endpoint → spec → test mapping
```

## CLI

```bash
# 1. Generate OpenAPI spec from code (code-first)
npx @asteasolutions/zod-to-openapi build --out openapi.yaml
# or for FastAPI (Python):
uv run python -m app.main:app --generate-openapi --out openapi.yaml
# or for NestJS:
npx @nestjs/cli openapi -d src -o openapi.yaml

# 2. Validate + bundle the spec
npx @apidevtools/swagger-cli bundle openapi.yaml --outfile openapi.bundled.yaml --dereference
npx @redocly/cli lint openapi.yaml

# 3. Generate TypeScript types from spec
npx openapi-typescript openapi.yaml -o src/types/api.ts
# GraphQL alternative:
npx @graphql-codegen --config codegen.ts

# 4. Detect breaking changes vs previous spec
git show HEAD:openapi.yaml > /tmp/openapi.base.yaml
oasdiff breaking /tmp/openapi.base.yaml openapi.yaml --format text
oasdiff changelog /tmp/openapi.base.yaml openapi.yaml --format markdown > MIGRATION.md

# GraphQL alternative:
npx @graphql-inspector/cli diff schema.base.graphql schema.graphql

# gRPC alternative:
buf breaking --against '.git#branch=main'

# 5. Run contract tests
# Producer-side (Schemathesis, Python):
uv run schemathesis run openapi.yaml --base-url http://localhost:8000 --checks all
# Consumer-driven (Pact):
npx pact verify --pact-broker-url $PACT_BROKER_URL --pacticipant users-service
```

## Decision Tree (autonomous)

```
Q: What API style is in use?
  Detect by scanning package.json / pyproject.toml / go.mod:
    - "express"|"fastify"|"@nestjs/core"|"fastapi"|"spring-boot-starter-web" → REST
    - "@apollo/server"|"graphql-yoga"|"graphql"|"gqlgen" → GraphQL
    - "grpc"|"@grpc/grpc-js"|"google.golang.org/grpc" → gRPC
    - Multiple → mixed (run pipeline per style)

  REST → Q: Is there an existing openapi.yaml?
    YES → Q: Is it in sync with code (no drift)?
            YES → run oasdiff vs HEAD, run Schemathesis, done
            NO  → regenerate from code, re-bundle, re-lint, re-run oasdiff
    NO  → generate openapi.yaml from route handlers (code-first)
            → if no route metadata exists (plain Express): emit ERROR
              "Cannot introspect bare Express handlers. Add zod schemas or tsoa decorators, OR
               hand-author openapi.yaml and run in spec-first mode."
              → halt Phase 6, route to human

  GraphQL → Q: Is there a schema.graphql file checked in?
    YES → run `graphql-inspector diff` vs HEAD, validate, done
    NO  → run `npx graphql-inspector introspect src/schema.ts --write schema.graphql`, commit

  gRPC → Q: Is there a buf.yaml + proto/ directory?
    YES → run `buf lint`, `buf breaking --against '.git#branch=main'`, done
    NO  → ERROR: "gRPC detected but no buf.yaml. Run `buf mod init` first."
            → halt, route to human
```

## Failure Modes & Recovery

| Symptom                                                          | Cause                                                    | Recovery                                                                                                  |
| ---------------------------------------------------------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `Spec is invalid: Structural error at paths./users/{id}`         | Hand-authored spec has typo / missing `$ref`             | Run `redocly lint`, fix every error before regenerating types — never generate types from an invalid spec |
| `oasdiff: 3 breaking changes detected`                           | Endpoint shape changed without version bump              | Route to `api-versioning` — either bump version or add backwards-compat alias; do NOT auto-merge          |
| `Schemathesis: response does not match schema`                   | Code returns a shape that differs from spec (spec drift) | Regenerate spec from code OR fix code to match spec; never edit the test to silence it                    |
| `openapi-typescript: circular $ref detected`                     | Spec uses recursive `$ref` without proper naming         | Use `@redocly/cli bundle --dereference` first, then generate types                                        |
| `Pact verification failed: missing provider state 'user exists'` | Provider missing a `ProviderState` setup hook            | Add `providerStateHandlers` to the Pact verifier config in `tests/contract/`                              |
| `graphql-inspector: cannot find schema source`                   | Codegen not wired (missing `codegen.ts`)                 | Scaffold `codegen.ts` from template, re-run                                                               |
| No route metadata found (bare Express/FastAPI)                   | Code-first generation impossible without schemas         | Switch to spec-first: hand-author `openapi.yaml`, then generate server stubs via `openapi-generator-cli`  |

## Self-Healing Loop

1. **Detect drift**: After every Phase 6 commit, run `oasdiff` and `schemathesis run --dry-run`. If drift detected, the loop fires.
2. **Classify drift**: is it (a) code-ahead-of-spec (regenerate spec) or (b) spec-ahead-of-code (fix code)?
3. **Auto-fix (a)**: regenerate spec from code, re-bundle, re-lint. If lint passes, commit spec update alongside the code change.
4. **Auto-fix (b)**: route to `debug-entry` — code has a bug where the response doesn't match the documented contract.
5. **Verify**: re-run contract tests. If green, declare success. If red, escalate to human (do not auto-merge a red contract test).
6. **Record**: every drift event writes to `OMNIPROJECT_SELF_IMPROVEMENT.md` with the route, the schema diff, and the resolution. `meta-auditor` reads this in Phase 13.

## Quality Gates (enforced before declaring "contract OK")

- [ ] `redocly lint` exits 0 (no errors, warnings allowed)
- [ ] `swagger-cli bundle` succeeds (no `$ref` resolution failures)
- [ ] `oasdiff breaking` returns 0 breaking changes OR a major version bump is queued
- [ ] `schemathesis run --checks all` passes ≥95% of generated cases (5% allows for known edge cases documented in the spec)
- [ ] Generated TypeScript types compile with `tsc --noEmit`
- [ ] Every operation in the spec has ≥1 example request and ≥1 example response
- [ ] Every operation has `operationId` (required for clean type generation)
- [ ] TRACEABILITY_MATRIX.md has one row per operation: `endpoint → operationId → spec path → contract test`

If any gate fails: status = `breaking` or `error`, do NOT proceed to Phase 11 deploy. Emit the failing gate + the relevant CLI output so the orchestrator can route to `debug-entry`.

## Tools

- **`@apidevtools/swagger-cli`** — bundle + validate OpenAPI specs (resolves `$ref`s)
- **`@redocly/cli`** — best-in-class OpenAPI linter (`redocly lint`)
- **`openapi-typescript`** — generates TS types from OpenAPI spec (no runtime dep)
- **`oasdiff`** (Go binary or Docker) — breaking-change detection for OpenAPI
- **`@graphql-inspector/cli`** — diff + validate GraphQL schemas
- **`@graphql-codegen/cli`** — generates TS types from SDL
- **`buf`** (Bufbuild) — lint + breaking-change detection + generation for protobuf/gRPC
- **`schemathesis`** (Python) — stateful property-based testing of REST APIs from OpenAPI
- **`pact`** (multi-language) — consumer-driven contract testing
- **`openapi-generator-cli`** — generates server stubs / clients from spec (spec-first mode)

## Hard Rules

1. **Never ship an API change without a spec.** A PR that touches a route handler but doesn't touch `openapi.yaml` / `schema.graphql` / `proto/` is blocked at review — the contract is the source of truth, not the code.
2. **Never break without a major version bump.** If `oasdiff breaking` returns anything, either (a) bump the major version (`/v1/` → `/v2/`) and route through `api-versioning`, or (b) add a backwards-compatible alias. Silent breaking changes are the #1 cause of production outages.
3. **Never generate types from an invalid spec.** `redocly lint` must exit 0 before `openapi-typescript` runs. Invalid spec → invalid types → silent runtime bugs in the frontend.
4. **Never edit contract tests to make them pass.** If Schemathesis finds a response that doesn't match the schema, fix the code or fix the spec — never weaken the test. A green test that lies is worse than a red test that tells the truth.
5. **Every operation needs an `operationId` and at least one example.** Without `operationId`, type generators produce names like `Get1` / `Get2`; without examples, the docs are useless and Pact can't synthesize fixtures.
6. **Never hand-edit generated types.** `src/types/api.ts` is generated from `openapi.yaml`. If you need a custom type, compose it from the generated one (`type UserCard = Pick<components['schemas']['User'], 'id' | 'name'>`), don't fork the file.
7. **Always diff against the previous shipped spec, not the previous commit.** Use `git show <last-tag>:openapi.yaml` as the baseline — comparing against an untagged HEAD means a WIP branch can be silently breaking.
