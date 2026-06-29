---
name: knowledge-base
description: "Persistent structured knowledge store across projects. Holds framework patterns, anti-patterns, version-specific quirks, and tool recipes. Queried in Phase 6 (look up known patterns) and written to in Phase 13 (capture new learnings). Entries are versioned, source-cited, and re-verified annually — never deleted, only deprecated."
license: MIT
metadata:
  version: "1.0"
  author: OmniProject AI
  category: meta
---

# Knowledge Base

> The skill's long-term memory. Without it, every project rediscovers the same framework quirks. With it, "How do I do X in Next.js 15?" returns in 50ms what would otherwise take 30 minutes of research-crawler work.

## When to Use

| Phase | Trigger | Why |
|-------|---------|-----|
| Phase 1 — DISCOVERY | Project type detected, look up known patterns | Avoid re-researching known tech |
| Phase 6 — EXECUTE | Before implementing a feature, query for known patterns | Don't repeat others' mistakes |
| Phase 6 — EXECUTE | Hit a framework quirk (weird error, undocumented flag) | Look up quirk entry; if missing, create one after solving |
| Phase 13 — META-AUDIT | New learning captured, write entry with source | Persist it for next project |
| Phase 14 — SELF-UPGRADE | `meta-learning` routed an "outdated knowledge" lesson | Re-verify and supersede stale entry |

**Do NOT use this sub-skill for:** ephemeral project state (use `audit-trail`), lessons pending classification (use `meta-learning` queues), or policy/heuristic changes (use `policy-evolution`). This sub-skill is for *reusable technical knowledge* only.

## What It Does

1. **Stores** structured entries — each entry is one fact: a pattern, anti-pattern, quirk, or recipe.
2. **Queries** by natural language or structured filter ("framework=Next.js, version=15, type=quirk").
3. **Versions** every entry by framework version; multiple versions coexist (older marked `superseded`).
4. **Resolves conflicts** by recency: newest verified entry wins, older kept for audit.
5. **Re-verifies annually** — entries with `last_verified` older than 365 days are flagged `stale` until re-checked.
6. **Cites sources** — every entry must list at least one source (URL, docs section, or "experience: project_id").

## Knowledge Entry Schema

```json
{
  "id": "kb-nextjs-15-app-router-layout",
  "type": "pattern",                    // pattern | anti-pattern | quirk | recipe
  "framework": "next.js",
  "version": "15.x",                    // semver range; "*" if version-agnostic
  "title": "App Router layout.tsx wraps every route in its segment",
  "body": "In Next.js 15 App Router, `app/layout.tsx` is the root layout. It wraps every route. To have route-specific layouts, create `app/<route>/layout.tsx`. Unlike Pages Router `_app.tsx`, layouts preserve state across navigation.",
  "sources": [
    "https://nextjs.org/docs/app/building-your-application/routing/layouts-and-pages",
    "experience: proj-2024-11-payments"
  ],
  "last_verified": "2024-11-15",
  "confidence": 0.9,                    // 0.0-1.0
  "supersedes": "kb-nextjs-14-pages-app",
  "superseded_by": null,
  "status": "active",                   // active | stale | deprecated | superseded
  "tags": ["routing", "app-router", "state"]
}
```

## Integration Contract

```
INPUT (query):
  - query: string (natural language) OR structured filter
  - framework: optional string (e.g. "next.js")
  - version: optional semver range (e.g. "15.x", ">=14")
  - type: optional enum (pattern | anti-pattern | quirk | recipe)
  - limit: int (default 10)

OUTPUT (query):
  {
    "matches": [
      {"id": "kb-...", "title": "...", "body": "...", "confidence": 0.9, "version": "15.x"},
      ...
    ],
    "count": 3,
    "stale_included": false
  }

INPUT (write):
  - entry: object matching schema above (id auto-generated if absent)
  - source_required: bool (default true — refuse to write without source)

OUTPUT (write):
  {
    "id": "kb-...",
    "status": "active",
    "supersedes": "kb-...",     // if applicable
    "path": "knowledge/next.js/15.x/kb-nextjs-15-app-router-layout.md"
  }
```

## Storage Layout

```
knowledge/
  next.js/
    15.x/
      kb-nextjs-15-app-router-layout.md
      kb-nextjs-15-cache-revalidation-quirk.md
    14.x/
      kb-nextjs-14-pages-app.md
  postgres/
    16.x/
      kb-pg-16-jsonb-gin-index.md
  _index.json                          # fast lookup, rebuilt on writes
  _changelog.jsonl                     # append-only audit of writes/supersedes
```

Each entry is a single Markdown file with YAML frontmatter (the schema above as frontmatter, body as content) for human readability + git diffability.

## Query Patterns

| Question | Query |
|----------|-------|
| "How do I do X in framework Y version Z?" | `query: "X", framework: Y, version: Z` |
| "What are the gotchas in framework Y?" | `type: quirk, framework: Y` |
| "What anti-patterns should I avoid?" | `type: anti-pattern, framework: Y, version: Z` |
| "Is there a recipe for auth setup in framework Y?" | `type: recipe, framework: Y, tags: [auth]` |

## Conflict Resolution

When a new entry covers the same topic as an existing one:

1. If the new entry is for a **newer framework version**, the old entry is marked `superseded`, the new entry's `supersedes` field references the old ID. Both kept.
2. If the new entry is for the **same version**, the new entry supersedes only if `confidence` is higher **and** `last_verified` is more recent. Otherwise, the write is rejected with a conflict notice.
3. If the new entry **contradicts** the old one (e.g. "X is the right way" vs "X is wrong"), both are kept but flagged `disputed` until a third source resolves it.

## CLI

```bash
# Query
python3 scripts/kb.py query "how to do server-sent events in next.js 15" \
  --framework next.js --version 15.x

# Write a new entry
python3 scripts/kb.py write \
  --type quirk \
  --framework next.js \
  --version 15.x \
  --title "fetch() in server components is not cached by default in 15" \
  --body "Unlike 14.x, `fetch()` in 15 server components is NOT cached by default. Use `cache: 'force-cache'` explicitly." \
  --sources "https://nextjs.org/docs/15/app/building-your-application/data-fetching/fetching" \
  --confidence 0.85

# Supersede an old entry
python3 scripts/kb.py supersede --old kb-nextjs-14-pages-app --new kb-nextjs-15-app-router-layout

# Re-verify stale entries (annual maintenance)
python3 scripts/kb.py find-stale --older-than 365d
python3 scripts/kb.py verify --id kb-react-18-concurrent --recheck-url "..."
```

## Decision Tree (autonomous)

```
Q: Is the query about a specific framework + version?
  YES → filter by framework AND version range
  NO  → search across all frameworks

Q: Are results found?
  YES → return top N by confidence × recency
  NO  → return empty; Phase 1 may trigger research-crawler to fill the gap

Q (write): Does an entry with the same title/framework/version already exist?
  YES → see Conflict Resolution
  NO  → write new entry

Q (write): Is a source provided?
  YES → write
  NO  → reject with "source_required: true" (default)

Q (annual): Is last_verified > 365 days old?
  YES → mark status=stale, surface in Phase 14 for re-verification
  NO  → leave active
```

## Self-Improvement Hook

Every write appends to `_changelog.jsonl`:

```json
{"ts": "2024-11-22T14:33:00Z", "action": "write", "id": "kb-nextjs-15-...", "source_project": "proj-2024-11-payments"}
```

`meta-auditor` reads this in Phase 13 to see what new knowledge was captured. `meta-learning` reads it to detect "outdated knowledge" lessons (entries that were *not* re-verified in 365+ days).

## Failure Modes & Recovery

| Symptom | Cause | Recovery |
|---------|-------|----------|
| Query returns no matches for known topic | `_index.json` stale | `python3 scripts/kb.py rebuild-index` |
| Entry has `confidence > 0.9` but is wrong | Source was bad | Add contradicting entry as `disputed`, drop confidence to 0.5 |
| Two entries with same ID | Concurrent write | Append `_2` to newer, log warning |
| Stale entries accumulate | No annual review ran | `kb.py find-stale` lists them; batch-verify in Phase 14 |

## Tools

- **Storage:** filesystem under `knowledge/` (Markdown + YAML frontmatter)
- **Index:** `_index.json` rebuilt on write; in-memory for queries
- **Versioning:** git (entries are committed like code)
- **Source verification:** manual URL fetch when re-verifying; never auto-trust

## Permissions

- Filesystem: read/write under `knowledge/`; append to `_changelog.jsonl`; never delete files (deprecate via status flag)
- Network: outbound HTTPS only when re-verifying a source URL (never auto-write from a fetch)
- Processes: none

## Hard Rules

1. **Never delete an entry.** Use `status: deprecated` or `status: superseded` — the audit trail must remain intact.
2. **Always cite a source.** No source → no write. "Experience" is a valid source only with a `project_id`.
3. **Always version.** Every entry has a `version` field; entries without version are rejected (use `"*"` only when truly version-agnostic).
4. **Always re-verify annually.** Entries with `last_verified` older than 365 days are flagged `stale` and excluded from default queries until re-verified.
5. **Never auto-write from a web fetch.** A human (or the orchestrator) reviews and approves every entry; auto-scraped content can be a *candidate* but never directly persisted.
6. **Always supersede, never overwrite.** When replacing an entry, set the old one's `superseded_by` and the new one's `supersedes` — both kept.
7. **Always log to `_changelog.jsonl`.** Every write, supersede, deprecate, or re-verify is appended for audit.
