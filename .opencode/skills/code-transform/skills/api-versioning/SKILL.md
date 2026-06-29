---
name: api-versioning
description: "API versioning strategy selection + implementation — URL path (/v1/), header (X-API-Version), Accept header content negotiation, deprecation headers (Deprecation, Sunset), and end-of-life migration guides. Used in Phase 6 EXECUTE whenever existing API behavior changes; pairs with api-contract which validates the versioned spec."
license: MIT
metadata:
  version: "1.0"
  author: OmniProject AI
  category: backend
---

# API Versioning

> Owns the lifecycle of every breaking API change: picks the strategy, implements the routing, wires the deprecation/sunset headers, and generates the migration guide. Calls into `api-contract` to validate that each version's spec is internally consistent and into `release-notes` to publish the migration guide.

## When to Use

| Phase | Trigger | Why |
|-------|---------|-----|
| Phase 2 — AUDIT | Dim 10 (Full-Stack) finds: API has no version, breaking changes shipped silently, no deprecation headers | Establish baseline versioning discipline |
| Phase 6 — EXECUTE | Any change that alters response shape, status code semantics, or required parameters for an EXISTING endpoint | Must pick: version bump, alias, or in-place deprecation |
| Phase 6 — EXECUTE | User explicitly requests "deprecate endpoint X" or "sunset version 1" | Walk the deprecation timeline |
| Phase 11 — ROLLOUT | Pre-deploy check: every deprecated endpoint still emits correct headers | Catches header regressions before they reach prod |

**Do NOT use this sub-skill for:** designing a brand-new API from scratch with no existing version (use `api-contract`), internal-only refactor with no behavior change (just use normal Phase 6 flow), or gRPC (buf handles breaking detection — only route here if a `deprecated` field annotation is needed). Those cases don't need a versioning decision.

## What It Does

1. **Picks the versioning strategy** based on audience and ecosystem:
   - External / public / mobile clients → URL path versioning (`/v1/`, `/v2/`)
   - Internal microservices → header versioning (`X-API-Version: 2`)
   - B2B / partner APIs with content negotiation needs → Accept header (`Accept: application/vnd.acme.v2+json`)
   - GraphQL → no URL versioning; use `@deprecated` field directives + schema evolution
   - gRPC → no URL versioning; use protobuf field deprecation + `reserved` for removed fields
2. **Implements the routing layer**:
   - URL: versioned router mount (`app.use('/v1', v1Router); app.use('/v2', v2Router)`)
   - Header: middleware that reads `X-API-Version` and routes to the right handler
   - Accept: content negotiation middleware (`accepts()` in Express, `ContentNegotiator` in Go)
3. **Sets deprecation + sunset headers** on the old version:
   - `Deprecation: true` (or `Deprecation: @1735689600` — Unix timestamp of deprecation date)
   - `Sunset: Wed, 11 Nov 2026 23:59:59 GMT` — the removal date
   - `Link: </v2/users>; rel="successor-version"` — points clients to the new endpoint
4. **Generates the migration guide** — for every breaking change, what changed, why, and how a client migrates (1-2-3 steps with curl examples).
5. **Wires telemetry** so you can SEE when the sunset date is safe:
   - Counter per version: `api_requests_total{version="v1"}` 30-day trend
   - Alert when v1 traffic drops below threshold → safe to remove
   - Alert when sunset date is 30 days out and v1 traffic is still high → extend or warn

## Integration Contract

```
INPUT:
  - project_dir: string (required)
  - api_style: auto|rest|graphql|grpc (default auto — detected from code, see api-contract)
  - change_type: breaking|non-breaking|deprecation|sunset (required)
  - target_endpoint: string (e.g. "GET /v1/users/{id}") — required for deprecation/sunset
  - audience: external|internal|b2b (default external)
  - existing_strategy: auto|url|header|accept (default auto — inferred from current code)
  - deprecation_date: ISO date (default today)
  - sunset_date: ISO date (default today + 12 months for external, +3 months for internal)

OUTPUT (JSON to stdout):
  {
    "status": "ok|error",
    "strategy": "url|header|accept|graphql-deprecation|proto-reserved",
    "new_version": "v2" | null,
    "deprecated_endpoints": [
      {
        "endpoint": "GET /v1/users/{id}",
        "deprecation_header": "Deprecation: @1735689600",
        "sunset_header": "Sunset: Wed, 11 Nov 2026 23:59:59 GMT",
        "successor": "GET /v2/users/{id}",
        "migration_steps": ["..."]
      }
    ],
    "files_modified": ["src/routes/v1/users.ts", "src/routes/v2/users.ts", "src/middleware/version.ts"],
    "telemetry_wired": true,
    "migration_guide_path": "docs/MIGRATION-v1-to-v2.md",
    "duration_ms": 2345
  }

SIDE EFFECTS:
  - Creates new version router / handler files (if breaking change)
  - Adds deprecation middleware to existing version
  - Writes docs/MIGRATION-vX-to-vY.md
  - Updates openapi.yaml (delegates to api-contract) with `deprecated: true` flags
  - Updates TRACEABILITY_MATRIX.md with version → endpoint → successor mapping
```

## CLI

```bash
# 1. Detect current strategy (run in project root)
node -e "console.log(require('./src/middleware/version'))" 2>/dev/null
grep -rE "app.use\('/v[0-9]" src/         # URL strategy?
grep -rE "X-API-Version" src/              # Header strategy?
grep -rE "application/vnd\." src/          # Accept strategy?

# 2. Scaffold a new URL version (Express)
mkdir -p src/routes/v2
cp -r src/routes/v1/* src/routes/v2/
# Then wire in app.ts:
#   app.use('/v1', v1Router);   // v1 gets deprecation middleware
#   app.use('/v2', v2Router);   // v2 is the new default

# 3. Add deprecation + sunset middleware (Express example)
cat >> src/middleware/deprecation.ts <<'EOF'
export const deprecateV1 = (req, res, next) => {
  res.setHeader('Deprecation', '@1735689600');           // 2025-01-01
  res.setHeader('Sunset', 'Wed, 11 Nov 2026 23:59:59 GMT');
  res.setHeader('Link', '</v2' + req.url + '>; rel="successor-version"');
  next();
};
EOF

# 4. Mark GraphQL fields deprecated
# In schema.ts: add `@deprecated(reason: "Use newUserField. Removed in 2026-11.")` directive

# 5. Mark protobuf fields deprecated
# In .proto: add `[deprecated = true]` on the field, and `reserved` the field number if removing

# 6. Generate migration guide from spec diff
oasdiff changelog openapi.v1.yaml openapi.v2.yaml --format markdown > docs/MIGRATION-v1-to-v2.md

# 7. Verify deprecation headers are emitted (smoke test)
curl -i http://localhost:3000/v1/users/123 | grep -iE 'deprecation|sunset|link'
```

## Decision Tree (autonomous)

```
Q: Is this a breaking change?
  Detect by running api-contract in --check-breaking mode.
  NO  → in-place edit, no version work needed, done
  YES → continue

Q: What is the audience?
  EXTERNAL (public API, mobile clients, third-party integrations)
    → URL versioning is the only strategy that's truly safe (clients can't easily change headers)
    → bump /v1/ → /v2/, keep v1 alive with deprecation headers
  INTERNAL (your own microservices, you control both ends)
    → header versioning (X-API-Version) is fine — you can deploy both sides together
    → no sunset needed, just coordinate the deploy
  B2B (partner APIs, long-lived integrations)
    → Accept header content negotiation
    → deprecation timeline 12 months minimum, sunset email to known partners

Q: Is it REST, GraphQL, or gRPC?
  REST     → apply URL/header/Accept strategy above
  GraphQL  → never URL-version the schema. Add `@deprecated` to fields/types. Major schema
             rewrites get a new persisted query name, not a new endpoint.
  gRPC     → never URL-version. Use `reserved` for removed field numbers, `[deprecated=true]`
             for soft removal. Buf enforces the rest.

Q: Has the sunset date arrived AND is v1 traffic zero?
  Check telemetry counter `api_requests_total{version="v1"}` over last 30 days.
  YES → safe to delete v1 router, do it
  NO  → either extend sunset (announce) or send targeted notice to high-volume v1 callers
        (identify them from logs / API keys)
```

## Deprecation Timeline (enforced)

| Stage | When | Action | Header emitted |
|-------|------|--------|----------------|
| Announce | T+0 | Add `Deprecation` field to OpenAPI spec, blog post / changelog entry, email known consumers | `Deprecation: @<ts>` |
| Window | T+0 to T+6mo (external) / T+1mo (internal) | Both v1 and v2 live; v1 logs every request with a deprecation warning | `Deprecation` + `Sunset` + `Link: rel="successor-version"` |
| Sunset warning | T-30d from sunset | Alert if v1 traffic > 5% of total | Same headers + paged dashboard warning |
| Sunset | T+12mo (external) / T+3mo (internal) | v1 returns `410 Gone` with a JSON body pointing to v2 docs | `Sunset` + `410 Gone` |
| Removal | T+13mo (external) / T+4mo (internal) | v1 router deleted from codebase | (nothing — endpoint gone) |

**Never compress this timeline silently.** If a security vuln forces faster sunset, broadcast a CVE-grade notice to every known consumer first.

## Failure Modes & Recovery

| Symptom | Cause | Recovery |
|---------|-------|----------|
| Client reports "your API broke" with no warning | Breaking change shipped without version bump or deprecation header | Roll back the deploy immediately. Re-ship under /v2/ with v1 preserved. Post-mortem: the contract gate failed. |
| `Sunset` header has wrong date format | Used ISO 8601 (`2026-11-11`) instead of RFC 7231 HTTP date | Fix to `Wed, 11 Nov 2026 23:59:59 GMT` — strict parsers reject ISO dates |
| v1 traffic doesn't drop after deprecation | Clients ignore headers / no telemetry / no outreach | Pull the API key logs, identify top callers, email them directly. Do NOT just extend sunset silently — that signals "we don't mean it." |
| Both v1 and v2 return identical responses | Forgot to actually change v2 — just copied v1 and bumped the path | Run `oasdiff changelog openapi.v1.yaml openapi.v2.yaml` — if empty, the version bump was theater, revert it |
| GraphQL `@deprecated` field still in use by clients | Clients haven't migrated; can't delete yet | Use `graphql-inspector` `@deprecated` usage report. Keep field until usage is zero, then remove in next schema publish. |
| Header version middleware crashes on missing header | Required `X-API-Version` but didn't default | Default to the latest stable version (`X-API-Version: 2` if absent), don't 400 — that breaks every existing client |

## Self-Healing Loop

1. **Monitor**: Every request to a deprecated endpoint increments `api_requests_total{version="v1", endpoint="..."}`. The loop runs weekly.
2. **Classify**: Is traffic dropping (on schedule) or flat (stuck)?
3. **Auto-fix (dropping)**: No action — let the sunset date arrive, then auto-open a PR to delete v1 (the loop writes the deletion PR; human merges).
4. **Auto-fix (flat)**: Identify top 10 callers by API key, draft an email from a template, queue it for human approval (never auto-email external clients).
5. **Verify**: After deletion PR merges, run `oasdiff breaking` against the new spec — should report 0 breaking changes (because v1 was already deprecated, removing it isn't a break for v2 consumers).
6. **Record**: Every sunset event writes to `OMNIPROJECT_SELF_IMPROVEMENT.md` with the timeline (announce → sunset → removal), the traffic curve, and any client escalation. `meta-auditor` reads this in Phase 13 to refine timeline defaults.

## Quality Gates (enforced before declaring "versioning OK")

- [ ] Every deprecated endpoint emits `Deprecation`, `Sunset`, and `Link: rel="successor-version"` headers (verified by curl smoke test)
- [ ] `Sunset` date is in RFC 7231 format (`Wed, 11 Nov 2026 23:59:59 GMT`), not ISO 8601
- [ ] `Sunset` date is ≥ 6 months in the future for external APIs, ≥ 1 month for internal
- [ ] OpenAPI spec marks deprecated operations with `deprecated: true` (delegated to `api-contract`)
- [ ] Migration guide `docs/MIGRATION-vX-to-vY.md` exists and has ≥1 curl example per breaking change
- [ ] Telemetry counter `api_requests_total{version="..."}` is wired and visible in the dashboard
- [ ] No `410 Gone` is returned before the sunset date (would be a premature removal)
- [ ] TRACEABILITY_MATRIX.md has one row per versioned endpoint: `version → endpoint → successor → sunset_date`

If any gate fails: status = `error`, do NOT proceed to Phase 11 deploy. Emit the failing gate and the relevant curl/output so the orchestrator can route to `debug-entry`.

## Tools

- **`oasdiff`** — generates the changelog that becomes the migration guide (`oasdiff changelog --format markdown`)
- **`@graphql-inspector/cli`** — `@deprecated` field usage reports + schema diff
- **`buf`** — protobuf `reserved` field enforcement + breaking detection
- **`express-version-routing`** / `fastify-version-routes` — route mounts per version
- **`contentnegotiation`** (Node) / `ContentNegotiator` (Go) — Accept-header middleware
- **Prometheus client** — `api_requests_total{version=...}` counter for sunset telemetry
- **`curl -i`** — the canonical smoke test for deprecation headers (don't trust the unit test, trust the wire)

## Hard Rules

1. **Never break without a version bump.** A breaking change to `/v1/users` without creating `/v2/users` (or equivalent header/accept strategy) is a deployment-blocker. Either bump or make the change backwards-compatible.
2. **Never remove without a sunset period.** Even for internal APIs, minimum 1 month of `Sunset` header + telemetry before the endpoint is deleted. Zero-notice removals are how you brick 3am on-call pages.
3. **Never silently extend a sunset date.** If v1 traffic is still high at T-30d, announce the extension publicly AND email known consumers. Silently extending teaches clients that sunset dates are suggestions.
4. **Never use ISO 8601 in the `Sunset` header.** RFC 7231 (`Wed, 11 Nov 2026 23:59:59 GMT`) is the spec. Strict clients (and the W3C validator) reject ISO dates.
5. **Never version GraphQL by URL.** `/v1/graphql` and `/v2/graphql` is an anti-pattern — GraphQL is designed for schema evolution via `@deprecated`. If you need a hard break, spin up a new persisted query set, not a new endpoint.
6. **Never default a missing version header to the oldest version.** Default to the *latest stable*. Defaulting to the oldest means new clients get the deprecated behavior and never migrate.
7. **Never ship a version bump without a migration guide.** `oasdiff changelog` produces one in 5 seconds — if the PR doesn't touch `docs/MIGRATION-vX-to-vY.md`, it's blocked at review.
