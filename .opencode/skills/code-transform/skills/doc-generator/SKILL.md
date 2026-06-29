---
name: doc-generator
description: "Documentation generation — OpenAPI/Swagger UI/Redoc (REST), GraphQL Playground/GraphiQL, TypeDoc (JS/TS), Sphinx (Python), Docusaurus/Jekyll (docs sites). Picks the generator by audience (developers / end users / ops / architects), generates docs from code annotations (docs-as-code), wires CI to verify docs build, and versions docs with the codebase. Triggers in Phase 6 EXECUTE when scaffolding docs, and in Phase 2 AUDIT when Dimension 9 finds missing docs, undocumented APIs, or docs drifted from code."
license: MIT
metadata:
  version: "1.0"
  author: OmniProject AI
  category: quality
---

# Doc Generator

> Quality sub-skill for the "ship docs with the code" loop. Picks the generator by audience and stack (OpenAPI/Swagger/Redoc for REST APIs, GraphQL Playground for GraphQL, TypeDoc for JS/TS libs, Sphinx for Python libs, Docusaurus for docs sites), generates docs from code annotations so they never drift, wires CI to verify docs build on every PR, and versions docs with the codebase (one doc site per major version). Coordinates with `api-contract` (OpenAPI generation from contract), `api-versioning` (per-version docs), and `ci-cd` (docs build + deploy pipeline).

## When to Use

| Phase | Trigger | Why |
|-------|---------|-----|
| Phase 2 — AUDIT | Dimension 9 (Documentation) finds: missing README, undocumented public API, no API reference, no ADRs | "How do I use this?" with no answer = blocked developers and users |
| Phase 2 — AUDIT | Dimension 9 finds docs in wiki/Confluence that drifted from code | Docs outside the repo rot. Docs-as-code is the only sustainable pattern. |
| Phase 6 — EXECUTE | User says "add API docs", "add Swagger", "add a docs site", "generate TypeDoc/Sphinx" | This is the executing sub-skill |
| Phase 6 — EXECUTE | Scaffolding a new library or API — docs are part of the contract | Public API without docs = unusable API |
| Phase 6 — EXECUTE | Migrating docs platforms (GitBook → Docusaurus, wiki → repo) | Full migration with redirects |
| Phase 9 — ACCEPTANCE | Verify docs build in CI, verify API reference matches actual endpoints, verify examples run | Docs that don't build or don't match code are worse than no docs |
| Phase 11 — ROLLOUT | Verify docs site deployed, version selector works, search indexes latest | Stale docs in prod = support burden |

**Do NOT use this sub-skill for:** inline code comments (those are written by developers directly, not generated), architectural decision records written from scratch (use `writing-plans` for ADR templates — though this sub-skill links them), or user-facing marketing copy (that's content, not docs).

## What It Does

1. Picks the doc generator via the Decision Tree.
2. Scaffolds the docs structure: `docs/` directory in repo, with subdirs for `api/`, `guides/`, `adr/`, `runbooks/`.
3. Configures the generator:
   - **OpenAPI/Swagger UI**: spec at `docs/openapi.yaml` (or generated from code annotations via `@asteasolutions/zod-to-openapi` / `drf-spectacular` / `FastAPI` built-in). Swagger UI served at `/docs`. Redoc at `/redoc` (better for read-only).
   - **GraphQL**: schema SDL at `schema.graphql`; GraphQL Playground at `/graphql` (interactive); GraphiQL alternative.
   - **TypeDoc** (JS/TS): `typedoc.json` config; generates HTML API reference from TSDoc comments; output to `docs/api/`.
   - **Sphinx** (Python): `conf.py`; generates HTML/LaTeX from RST or Markdown via `myst-parser`; output to `docs/_build/`.
   - **Docusaurus** (docs site): React-based, MDX files, versioned docs, search (Algolia), i18n. Output to `build/`.
   - **Jekyll** (legacy docs site): Ruby, Liquid templates, GitHub Pages native. Only if user requires Jekyll.
4. Wires docs-as-code: docs live in the same repo as the code, reviewed in the same PR. No external wiki, no Confluence.
5. Generates API docs from code annotations:
   - **FastAPI**: docstrings + Pydantic models → automatic OpenAPI. `@app.get("/users", response_model=User)` is enough.
   - **Express + zod-to-openapi**: define zod schemas, register paths, generate `openapi.json` at build time.
   - **Django REST + drf-spectacular**: `@extend_schema` decorator → OpenAPI.
   - **GraphQL**: schema-first SDL or code-first (Nexus/Strawberry) → both generate docs.
6. Wires CI to verify docs build:
   - On every PR: build docs, fail CI if build errors.
   - Lint Markdown (markdownlint), check links (lychee / markdown-link-check), spell-check (cspell).
   - For API docs: verify OpenAPI spec is valid (redocly lint), verify examples in spec match actual responses.
7. Versions docs with the codebase:
   - Docusaurus: `docusaurus docs:version 1.0` snapshots current docs as `version-1.0/`.
   - URL pattern: `docs.example.com/v1.0/...`, `docs.example.com/v2.0/...`, with `latest` redirect.
   - API docs: per-major-version spec; deprecation noted in spec.
8. Includes examples that actually run:
   - Code blocks tagged with language; CI extracts and runs them (doctest for Python, `tsdoc-example` runner for TS).
   - No examples that "almost work" — every example must execute.
9. Adds the four audience-specific doc types:
   - **API reference** (developers): generated from code; exhaustive; for looking up specific endpoints.
   - **User guide** (end users): narrative; task-oriented; for learning how to use the product.
   - **Runbook** (ops): step-by-step incident response; for on-call.
   - **ADRs** (architects): architecture decision records; why decisions were made; in `docs/adr/`.
10. Adds CHANGELOG per release (Keep a Changelog format); auto-generated from conventional commits via `semantic-release` or `changesets`.

## Integration Contract

```
INPUT:
  - audience: developers|end_users|ops|architects (multi-select)
  - stack: rest|graphql|js_lib|python_lib|docs_site (required)
  - framework: express|fastify|fastapi|django|next|rails (required if stack=rest|graphql)
  - site_generator: docusaurus|jekyll|mkdocs (default docusaurus)
  - versioned: bool (default true)
  - ci_verify: bool (default true — docs build on every PR)
  - search: bool (default true — Algolia DocSearch for Docusaurus)

OUTPUT (JSON to stdout):
  {
    "status": "ok|error",
    "generator": "docusaurus + redocly + typedoc",
    "files_created": [
      "docs/",
      "docs/api/openapi.yaml",
      "docs/guides/",
      "docs/adr/0001-record-architecture-decisions.md",
      "docs/runbooks/",
      "docusaurus.config.js",
      "sidebars.js",
      "typedoc.json",
      ".github/workflows/docs.yml"
    ],
    "ci_checks_added": [
      "Build docs (Docusaurus)",
      "Lint OpenAPI spec (redocly lint)",
      "Check Markdown links (lychee)",
      "Spell-check (cspell)",
      "Run examples (doctest)"
    ],
    "versioned": true,
    "current_version": "1.0",
    "deploy_url": "https://docs.example.com",
    "security_warnings": []
  }

SIDE EFFECTS:
  - Writes docs/ directory with full structure
  - Adds CI workflow (.github/workflows/docs.yml) that builds + deploys docs
  - Adds redocly, typedoc, docusaurus to devDependencies
  - Configures Algolia DocSearch (if search=true; requires application)
  - Adds CHANGELOG.md (Keep a Changelog format)
  - Does NOT modify existing source code (only adds docstrings if requested)
```

## CLI

```bash
# Autonomous: pick generator, scaffold docs structure + CI
python3 scripts/doc_generator_agent.py setup \
  --audience developers,end_users --stack rest --framework fastapi \
  --site-generator docusaurus --versioned --ci-verify

# Generate OpenAPI spec from FastAPI code; validate with redocly
python3 scripts/doc_generator_agent.py gen-openapi --framework fastapi --entry "app:app" --output docs/api/openapi.yaml
redocly lint docs/api/openapi.yaml

# Generate TypeDoc reference; build Docusaurus site
typedoc --options typedoc.json
cd docs-site && npm run build
docusaurus docs:version 1.0  # snapshot a new versioned doc set

# Check Markdown links; run examples (doctest); preview CHANGELOG
lychee --no-progress "docs/**/*.md"
python3 -m doctest docs/guides/quickstart.md -v
npx semantic-release --dry-run

# Audit: grep for undocumented public APIs, missing docs/, broken links
python3 scripts/doc_generator_agent.py audit --path src/
```

## Decision Tree (autonomous)

```
Q1: What kind of docs?
  REST API reference
    → OpenAPI 3.1 spec + Swagger UI (interactive) + Redoc (read-only)
      Generate spec from code annotations (FastAPI built-in, drf-spectacular, zod-to-openapi)
      Serve Swagger at /docs (dev), Redoc at /redoc (prod-friendly read view)
      NEVER hand-write OpenAPI YAML if you can generate from code — drifts immediately
  GraphQL API
    → GraphQL Playground (interactive) at /graphql
      Schema-first: write SDL in schema.graphql
      Code-first: use Nexus (TS) or Strawberry (Python) — generates SDL
      GraphiQL is the alternative (browser-based explorer)
  JavaScript / TypeScript library
    → TypeDoc (TSDoc comments → HTML reference)
      Output to docs/api/
      Pair with Docusaurus for the guides + landing
  Python library
    → Sphinx (RST or Markdown via myst-parser)
      Output to docs/_build/html
      Pair with Read the Docs for hosting (free for OSS)
  Docs site (guides, tutorials, landing)
    → Docusaurus (React/MDX, versioned, search, i18n) — default
      Jekyll (Ruby, GitHub Pages native) — legacy, only if user requires
      MkDocs (Python, Markdown-only, simpler) — for small sites

Q2: Generate from code or hand-write?
  API reference
    → ALWAYS generate from code annotations
      FastAPI: docstrings + Pydantic models → automatic OpenAPI
      Express: zod-to-openapi or swagger-jsdoc from JSDoc
      Django: drf-spectacular @extend_schema decorator
      Hand-written specs drift from code within a week
  Guides / tutorials
    → Hand-write (in MDX or Markdown)
      These are narrative; generators can't write them
  ADRs
    → Hand-write from template (writing-plans sub-skill has the template)
  Runbooks
    → Hand-write, but extract command snippets from code where possible
      (e.g. deployment commands from CI config)

Q3: Versioning strategy?
  One major version, docs updated in place → only for v1 / pre-1.0 apps
  Multiple major versions → Docusaurus `docs:version X.Y`; URL: docs.example.com/v1.0/...
  Bleeding-edge + stable → two Docusaurus versions: "next" (main) and "stable" (latest tag)

Q4: CI verification?
  Build docs on every PR (fail on errors); lint Markdown (markdownlint);
  check links (lychee); validate OpenAPI (redocly lint);
  spell-check (cspell); run examples (doctest for Python, ts-node for TS)

Q5: Hosting?
  Docusaurus → Vercel/Netlify (free for OSS) or GitHub Pages
  Sphinx → Read the Docs (free for OSS) or GitHub Pages
  API docs (Swagger/Redoc) → serve alongside API at /docs; never host separately

Q6: Search?
  Docusaurus → Algolia DocSearch (free for OSS, paid for commercial)
  Sphinx → built-in lunr.js search; API reference → find-in-page or Algolia if huge
```

## Failure Modes & Recovery

| Symptom | Cause | Recovery |
|---------|-------|----------|
| Docs build fails in CI | Broken Markdown, invalid OpenAPI, missing import | Run `docusaurus build` locally; fix errors; CI catches drift before deploy |
| OpenAPI spec out of sync with code | Hand-written spec, not generated | Switch to code-annotation generation (FastAPI built-in, zod-to-openapi); regenerate on every build |
| Broken links in docs | Renamed file, deleted endpoint, external URL moved | Run `lychee docs/**/*.md` in CI; fix or redirect |
| Examples don't run | Copy-paste from old version, API changed | Add doctest/example-runner to CI; examples MUST execute |
| Docs site shows old version | Build not triggered, or cache stale | Verify CI deploys on `main` push; clear CDN cache; verify `latest` redirect |
| Search returns stale results | Algolia crawl not run | Trigger DocSearch crawl via Algolia dashboard; or switch to local lunr.js search |
| Version selector missing versions | Docusaurus `versions.json` not updated | Run `docusaurus docs:version X.Y` on release; commit the snapshot |
| TypeDoc output empty | TSDoc comments missing from source | Add TSDoc to all exported functions/classes; CI fails if public API undocumented |
| CHANGELOG empty | Conventional commits not used | Adopt conventional commits; `semantic-release` generates CHANGELOG automatically |
| ADRs scattered | No `docs/adr/` directory, no template | Create `docs/adr/` with template (from `writing-plans`); number ADRs sequentially |

## Self-Healing Loop

Every docs incident (broken build, drifted spec, broken link, stale version) writes a structured record to `OMNIPROJECT_SELF_IMPROVEMENT.md`:

```
- flow: docs_build
  failure_class: openapi_spec_drift
  trigger: API added endpoint /v2/users but OpenAPI spec still showed only /v1/users
  recovery: switched from hand-written YAML to FastAPI auto-generation; spec now always matches code
  rule_added: doc-generator sub-skill now requires API docs generated from code, never hand-written
```

`meta-auditor` reads these in Phase 13. If the same failure class appears ≥3 times across projects, `self-patch-generator` produces a rule that blocks hand-written OpenAPI specs.

For missing public-API docs specifically: if the audit finds a public/exported function without a docstring/TSDoc, Phase 9 halts — undocumented public API is a release blocker.

## Quality Gates (enforced before declaring "docs ready")

- [ ] `docs/` directory exists with `api/`, `guides/`, `adr/`, `runbooks/` subdirs
- [ ] README.md exists with: project description, install, quickstart, link to full docs
- [ ] API reference generated from code (FastAPI built-in / zod-to-openapi / drf-spectacular) — never hand-written
- [ ] OpenAPI spec passes `redocly lint` (no errors)
- [ ] Swagger UI (or Redoc) served at `/docs` in dev
- [ ] All public API endpoints documented (request, response, errors, examples)
- [ ] All examples in docs execute (doctest for Python, example-runner for TS)
- [ ] All Markdown links resolve (lychee in CI)
- [ ] Markdown lints clean (markdownlint in CI)
- [ ] Spell-check passes (cspell in CI)
- [ ] Docs build in CI on every PR (fail PR on build errors)
- [ ] Docs deployed on merge to main (Vercel/Netlify/GitHub Pages)
- [ ] Versioned docs (Docusaurus `docs:version` on major release; per-major URL)
- [ ] CHANGELOG.md maintained (Keep a Changelog format; auto-gen from conventional commits)
- [ ] At least one ADR in `docs/adr/` (record architecture decisions)
- [ ] Search works (Algolia DocSearch or built-in)
- [ ] Tests cover: docs build passes, OpenAPI valid, examples run, no broken links

If any gate fails: status = `error`, do not proceed to Phase 9. Missing or wrong docs are a release blocker for public APIs.

## Tools

- **OpenAPI 3.1** + **Swagger UI** (dev interactive) + **Redoc** (prod read-only) — REST API spec standard.
- **redocly** (`@redocly/cli`) — best-in-class OpenAPI linter. `redocly lint openapi.yaml`.
- **@asteasolutions/zod-to-openapi** — OpenAPI from zod (TS). **drf-spectacular** — for Django REST. **FastAPI** — built-in OpenAPI from Pydantic + docstrings.
- **GraphQL Playground** / **GraphiQL** — interactive GraphQL explorers at `/graphql`. **Nexus** (TS) / **Strawberry** (Python) — code-first GraphQL.
- **TypeDoc** — TSDoc → HTML reference for JS/TS libs. Pair with Docusaurus.
- **Sphinx** + **myst-parser** (Markdown support) — Python doc tool. Pair with **Read the Docs** (free OSS hosting).
- **Docusaurus** — React/MDX docs site. Versioned, search, i18n. Default. **MkDocs Material** — simpler Python alternative. **Jekyll** — legacy, GitHub Pages native.
- **lychee** (Rust link checker) / **markdownlint** / **cspell** — CI linters.
- **semantic-release** / **changesets** — auto-generate CHANGELOG from conventional commits.
- **Algolia DocSearch** — free search for OSS docs sites.

## Permissions

- Filesystem: write to `docs/`, `docusaurus.config.js`, `sidebars.js`, `typedoc.json`, `conf.py`, `CHANGELOG.md`, `.github/workflows/docs.yml`
- Filesystem: write to `src/` ONLY to add docstrings/TSDoc (never modifies logic)
- Network: outbound to npm/PyPI for generator installs; outbound to Algolia for DocSearch indexing
- Processes: may invoke `typedoc`, `sphinx-build`, `docusaurus build`, `redocly lint`, `lychee`, `markdownlint`, `cspell`; must reap them
- CI: adds docs build + deploy workflow; may add Read the Docs webhook
- Secrets: Algolia API key (for DocSearch) via env var; never committed

## Hard Rules

1. **Never ship a public API without docs.** Every endpoint, request, response, and error must be documented. Undocumented public API = unusable API = blocked users. CI fails if any public endpoint lacks docs.
2. **Never let docs drift from code.** Generate API docs from code annotations (FastAPI built-in, zod-to-openapi, drf-spectacular). Hand-written specs drift within a week. CI verifies spec matches code on every PR.
3. **Always include runnable examples.** Every code block in docs must execute. Use doctest (Python) or example-runner (TS) in CI. Examples that "almost work" erode trust faster than no examples.
4. **Always version docs with the codebase.** One docs site per major version (Docusaurus `docs:version X.Y`). URL pattern: `docs.example.com/v1.0/...`. Users on v1 need v1 docs, not the latest.
5. **Always build docs in CI.** Fail PR on broken Markdown, invalid OpenAPI, missing imports, broken links. Docs that don't build are worse than no docs — they mislead.
6. **Always keep docs in the same repo as code.** Docs-as-code: reviewed in the same PR, deployed from the same CI. External wikis and Confluence rot because they're disconnected from the code review process.
7. **Always have a README.** Project description, install instructions, quickstart, link to full docs. README is the front door — a missing or empty README is a release blocker.
8. **Always maintain a CHANGELOG.** Keep a Changelog format. Auto-generate from conventional commits via semantic-release or changesets. Users need to know what changed between versions.
9. **Always record architecture decisions (ADRs).** `docs/adr/` with numbered files (0001-record-architecture-decisions.md, 0002-use-postgres-not-mongo.md). Future maintainers need to know WHY, not just WHAT.
10. **Always check links in CI.** `lychee` or `markdown-link-check` on every PR. Broken links (internal renames, external URL moves) erode trust. CI catches them before users do.
