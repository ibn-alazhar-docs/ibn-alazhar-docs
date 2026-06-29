---
name: search-engine
description: "Full-text search — Elasticsearch, Meilisearch, Typesense, Algolia, Postgres FTS. Picks the engine by scale and operational budget, indexes denormalized data via bulk API, configures analyzers (language, synonyms, custom), wires facets/aggregations for filters, and provides autocomplete via completion suggester or edge n-gram. Triggers in Phase 6 EXECUTE when the app needs search, and in Phase 2 AUDIT when Dimension 5 finds `LIKE '%...%'` queries, missing indexes on text columns, or N+1 search patterns."
license: MIT
metadata:
  version: "1.0"
  author: OmniProject AI
  category: infra
---

# Search Engine

> Infra sub-skill for anything more sophisticated than `WHERE name = 'foo'`. Picks the engine (Postgres FTS / Meilisearch / Typesense / Algolia / Elasticsearch), defines the index schema with proper analyzers, implements bulk indexing with back-pressure, wires facets/aggregations for filters, and provides autocomplete. The hard rule: search goes through the search engine, never the OLTP database. Coordinates with `db-design` (source-of-truth data), `message-queue` (async reindex on update), and `performance-audit` (relevance tuning).

## When to Use

| Phase | Trigger | Why |
|-------|---------|-----|
| Phase 2 — AUDIT | Dimension 5 (Performance) finds `LIKE '%term%'` queries | Leading wildcard defeats index — full table scan every search |
| Phase 2 — AUDIT | Dimension 5 finds search endpoints with N+1 on related entities | Search should return denormalized docs, not join on every hit |
| Phase 6 — EXECUTE | User says "add search", "add full-text search", "add Algolia", "add Elasticsearch" | This is the executing sub-skill |
| Phase 6 — EXECUTE | Migrating search backends (Elasticsearch → Meilisearch, Algolia → Typesense) | Full reindex + dual-write window |
| Phase 9 — ACCEPTANCE | Run a search query, verify relevance ordering, verify facets accurate, verify autocomplete < 50ms | Search quality is observable — must walk the query→results→facet loop |
| Phase 11 — ROLLOUT | Verify index has correct document count, reindex job scheduled, backup index exists | Drift between DB and search = wrong results to users |

**Do NOT use this sub-skill for:** log search (use Loki / OpenSearch with logstash pipeline — different indexing pattern), vector similarity search (use a vector DB: pgvector, Pinecone, Weaviate, Qdrant — different algorithm), or recommendation (use a recommendation engine — collaborative filtering, not text search).

## What It Does

1. Picks the engine via the Decision Tree.
2. Installs the official client: `@elastic/elasticsearch` / `meilisearch` / `typesense` / `algoliasearch` / `@opensearch-project/opensearch` / Postgres built-in.
3. Defines the index mapping/schema:
   - **Elasticsearch**: explicit mapping (NEVER dynamic — it guesses wrong and is hard to change). `text` fields with analyzer, `keyword` fields for filters, `date` fields, `integer`/`float` for sorting.
   - **Meilisearch / Typesense**: schema with searchable + filterable + sortable attributes.
   - **Algolia**: index settings with `searchableAttributes` (ordered — title > body), `attributesForFaceting`, `customRanking`.
   - **Postgres FTS**: `tsvector` column with GIN index, `tsquery` for search, `ts_rank_cd` for relevance.
4. Indexes **denormalized** data — each document contains everything needed to render a search result (no joins at query time). For an article search: `title, body, author_name, tags, published_at, category_name` — all in one doc.
5. Wires bulk indexing:
   - **Initial backfill**: scroll/paginate source DB, batch 1,000 docs per bulk request.
   - **Incremental updates**: DB trigger or outbox pattern → queue → consumer updates search index. Never synchronously in the request path.
   - **Back-pressure**: if bulk API returns 429, back off exponentially.
6. Configures analyzers:
   - **Language analyzer**: `english`, `french`, `german`, etc. — handles stemming, stop words.
   - **Synonyms**: explicit list (`tv, television` ; `iphone, apple phone`).
   - **Custom**: e.g. edge n-gram for autocomplete (1-gram to 10-gram), phonetic (for misspellings).
7. Wires facets/aggregations:
   - For each filterable attribute (category, brand, price range), configure aggregation.
   - Postgres FTS: separate `COUNT ... GROUP BY` queries.
   - Algolia: `facets` in response automatically.
8. Wires autocomplete via:
   - **Completion suggester** (Elasticsearch) — fast, in-memory.
   - **Edge n-gram field** (Meilisearch/Typesense) — index-time, fast at query.
   - **Separate autocomplete index** (Algolia) — fewer fields, optimized for speed.
9. Implements relevance tuning:
   - **Title boost** > body boost (title matches are more relevant).
   - **Freshness boost**: recent docs score higher (decayed by age).
   - **Popularity boost**: most-viewed docs score higher.
   - **Custom function score** for compound relevance.
10. Emits a `search_client` for other modules: `search(query, filters, page)`, `autocomplete(prefix)`, `index(doc)`, `delete(doc_id)`.

## Integration Contract

```
INPUT:
  - engine_hint: postgres|meilisearch|typesense|algolia|elasticsearch|opensearch (optional)
  - framework: express|fastify|fastapi|django|next|rails (required)
  - index_name: string (required — e.g. "articles")
  - source_table: string (required — e.g. "articles")
  - schema: list of {field, type, searchable, filterable, sortable, boost}
  - language: string (default "en" — affects analyzer choice)
  - synonyms: list of [term1, term2, ...] (optional)
  - autocomplete: bool (default true)
  - facets: list of field names (optional)

OUTPUT (JSON to stdout):
  {
    "status": "ok|error",
    "engine": "elasticsearch",
    "index_name": "articles",
    "files_created": [
      "src/search/client.{ts,py}",
      "src/search/indexer.{ts,py}",
      "src/search/queries.{ts,py}",
      "src/search/autocomplete.{ts,py}"
    ],
    "env_required": ["ES_URL", "ES_API_KEY"],
    "mapping": {"title": {"type": "text", "analyzer": "english", "boost": 3}, ...},
    "synonyms_count": 42,
    "facets": ["category", "tags", "author_id"],
    "autocomplete_field": "title.suggest",
    "backfill_status": "queued",
    "security_warnings": []
  }

SIDE EFFECTS:
  - Writes search module under src/search/
  - Creates the index with the defined mapping (NEVER dynamic)
  - Queues an initial backfill job (1,000 docs/batch)
  - Wires incremental updates via DB trigger or outbox pattern
  - Adds required env vars to .env.example
```

## CLI

```bash
# Autonomous: pick engine, scaffold client + indexer, create index, queue backfill
python3 scripts/search_agent.py setup \
  --framework fastapi \
  --engine meilisearch \
  --index-name articles \
  --source-table articles \
  --schema schemas/articles.json \
  --language en \
  --autocomplete \
  --facets category,tags,author_id

# Define synonyms
python3 scripts/search_agent.py set-synonyms \
  --index articles \
  --synonyms '[["tv","television"],["iphone","apple phone"]]'

# Run a manual backfill (reindex all from DB)
python3 scripts/search_agent.py backfill \
  --index articles \
  --batch-size 1000 \
  --concurrency 4

# Test a search query
python3 scripts/search_agent.py query \
  --index articles \
  --q "machine learning" \
  --filters 'category=ai,published_at>2024-01-01' \
  --page 1 --per-page 20

# Test autocomplete
python3 scripts/search_agent.py autocomplete \
  --index articles \
  --prefix "mac" \
  --limit 5

# Reindex with new mapping (alias swap pattern)
python3 scripts/search_agent.py reindex \
  --index articles \
  --new-mapping schemas/articles-v2.json \
  --swap-alias

# Audit: grep for LIKE '%...%', missing search index, N+1 search
python3 scripts/search_agent.py audit --path src/
```

## Decision Tree (autonomous)

```
Q1: What scale (documents + queries/sec)?
  < 100k docs, < 10 qps, simple text search
    → Postgres FTS (tsvector + GIN index, ts_rank_cd for relevance)
      Zero new infra, ACID guarantees, good enough for most apps
  100k - 10M docs, < 100 qps, need facets/typo tolerance
    → Meilisearch or Typesense (self-hosted)
      Meilisearch: best DX, typo tolerance out of box, great defaults
      Typesense: more configurable, faster filtering, geo search built in
      Both: single binary, easy to run, sub-50ms typical
  > 10M docs, > 100 qps, complex aggregations
    → Elasticsearch (or OpenSearch fork)
      Mature, scalable, complex but powerful
      Use OpenSearch if you need Apache 2.0 license / no Elastic licensing
  Want fully managed, pay per use, no ops
    → Algolia (best DX, expensive at scale, vendor lock-in)
      Recommended for: < 1M docs, want zero ops, budget allows
      Avoid for: > 10M docs (cost prohibitive) or PII-sensitive (data leaves your perimeter)

Q2: Real-time or batch indexing?
  Real-time (< 1s lag)
    → DB trigger or outbox pattern → message queue → consumer updates index
      Never synchronous in request path (latency + partial failure risk)
  Near-real-time (< 1 min lag)
    → Periodic sync job (every 30s) reads changed rows, bulk-indexes
  Batch (daily)
    → Nightly full reindex (simplest, acceptable for non-critical search)

Q3: Language support?
  English only
    → Default analyzer, minimal config
  Multi-language
    → Per-document language field, route to language-specific analyzer
      Elasticsearch: `analyzer: { "lang_en": {...}, "lang_fr": {...} }`
      Algolia: `enableLanguageFeatures: true`
  CJK (Chinese/Japanese/Korean)
    → Needs special analyzer (ICU / kuromoji / smartcn)
      Postgres FTS has poor CJK support — use a dedicated engine

Q4: Autocomplete strategy?
  < 100k docs, want simplicity
    → Prefix search on the main index (Meilisearch/Typesense built-in)
  > 100k docs, need < 30ms
    → Edge n-gram field at index time (Elasticsearch)
      OR completion suggester (Elasticsearch, in-memory FST, very fast)
      OR separate autocomplete index (Algolia, fewer fields, optimized)
  Type-ahead with popularity ranking
    → Pre-computed top-N per prefix, stored as a separate index
      Fastest possible, but needs periodic rebuild

Q5: Relevance tuning needed?
  Default BM25 not good enough
    → Add boosts: title > body, fresh > old, popular > obscure
      Elasticsearch: function_score with decay function on date, field_value_factor for popularity
      Algolia: customRanking field
      Meilisearch: rankingRules (built-in: words, typo, proximity, attribute, exactness)
  Need business rules (sponsored results, etc.)
    → Custom score function that combines BM25 + business weight
      Always document the formula in code comments
```

## Failure Modes & Recovery

| Symptom | Cause | Recovery |
|---------|-------|----------|
| Search returns stale results | Incremental update lagging or queue backed up | Check consumer lag; if > 5 min, scale consumers; consider full reindex if drift is large |
| `mapper_parsing_exception` (Elasticsearch) | Dynamic mapping conflict — field inferred as one type, then another | Use explicit mapping (never dynamic); reindex with new mapping via alias swap |
| Index size explodes | Edge n-gram fields, too many facets, or `_source` not stripped | Reduce n-gram max length; use `doc_values: false` on text fields not used for sorting; remove unused fields from `_source` |
| Autocomplete latency > 100ms | Edge n-gram field too large, or prefix search on full index | Move to completion suggester (in-memory); or pre-compute top-N per prefix |
| Relevance wrong — old docs above new | No freshness signal in scoring | Add `published_at` decay function; test with `explain: true` |
| Synonyms not applied | Synonyms configured at query time but analyzer doesn't see them | Configure synonyms in the analyzer (index-time) OR use `search_synonym` filter (query-time); verify with `_analyze` API |
| Facet counts don't match search | Facet run on different field, or filter applied to one but not other | Verify facet runs on same query+filters as the main search; Algolia does this automatically |
| Bulk index 429 errors | Backfill too fast | Reduce concurrency, add exponential backoff, use `_bulk` endpoint with batches of 1,000 (not 10,000) |
| Postgres FTS slow on 1M+ rows | Missing GIN index, or query uses `LIKE` not `@@` | Add `CREATE INDEX ... USING GIN(to_tsvector(...))`; rewrite query to use `@@` operator |
| Index corruption after crash | Elasticsearch translog not flushed | Force merge + reindex from source; enable periodic translog flush |

## Self-Healing Loop

Every search incident (relevance regression, lag spike, indexing failure, facet mismatch) writes a structured record to `OMNIPROJECT_SELF_IMPROVEMENT.md`:

```
- flow: article_search
  failure_class: stale_results
  trigger: 8% of searches returning deleted articles
  recovery: outbox consumer was silently failing on deleted-row events — added dead-letter queue + alerting
  rule_added: search-engine sub-skill now requires a delete-event consumer with DLQ
```

`meta-auditor` reads these in Phase 13. If the same failure class appears ≥3 times across projects, `self-patch-generator` produces a rule that auto-adds the DLQ consumer.

For relevance regressions specifically: if a query that previously returned doc X in top 3 now returns it outside top 10, Phase 9 acceptance halts — search quality is observable and testable with recorded queries.

## Quality Gates (enforced before declaring "search ready")

- [ ] No `LIKE '%...%'` queries on text columns in the codebase (grep + AST check)
- [ ] Index has explicit mapping (Elasticsearch `dynamic: strict`, Algolia schema, etc.) — never auto-inferred
- [ ] Documents are denormalized (no joins at query time)
- [ ] Bulk indexing used for backfill (not single-doc inserts)
- [ ] Incremental updates via queue (not synchronous in request path)
- [ ] Autocomplete response < 50ms p95
- [ ] Search response < 200ms p95
- [ ] Facets match search results (same filters applied)
- [ ] Synonyms configured (if applicable)
- [ ] Language analyzer matches content language
- [ ] Title boosted above body
- [ ] Backup index exists (alias swap pattern, or periodic snapshot)
- [ ] Reindex job scheduled (daily for small indexes, weekly for large)
- [ ] Tests cover: basic search, filter combination, facet counts, autocomplete, typo tolerance, deleted docs removed, synonym expansion

If any gate fails: status = `error`, do not proceed to Phase 9. Search bugs manifest as wrong results to users — a release blocker for any search-driven product.

## Tools

- **Postgres FTS** — built-in `tsvector`, `tsquery`, `ts_rank_cd`. Use `GIN` index. Zero new infra. Good for < 100k docs.
- **Meilisearch** (`meilisearch` npm / `meilisearch` pip) — single binary, best DX, typo tolerance built in. Good for 100k-10M docs.
- **Typesense** (`typesense` / `typesense-client`) — like Meilisearch but more configurable. Built-in geo search.
- **Algolia** (`algoliasearch`) — fully managed, best DX, expensive at scale. Good for < 1M docs and want zero ops.
- **Elasticsearch** (`@elastic/elasticsearch` / `elasticsearch`) — industry standard for large scale. Use OpenSearch fork to avoid Elastic license.
- **OpenSearch** (`@opensearch-project/opensearch`) — Apache 2.0 fork of Elasticsearch. API-compatible.
- **Logstash / Vector** — for log search pipelines (different from app search).
- **snapshots / S3** — for index backups. Elasticsearch/OpenSearch support snapshot/restore to S3.

## Permissions

- Filesystem: write to `src/search/`, `.env.example`, migrations directory
- Network: outbound HTTPS to search engine (`localhost:7700` for Meilisearch, `*:9200` for ES, `*-dsn.algolia.net` for Algolia)
- Network: outbound to source DB (for backfill only — never in request path)
- Secrets: read engine credentials from env only; never log query bodies with user PII
- Processes: may invoke `npm install` / `pip install` for official SDKs only; may invoke `curl` against engine API for verification

## Hard Rules

1. **Never use the OLTP database for search.** `LIKE '%term%'` is a full table scan. Search goes through the search engine. The DB is for transactions; the search engine is for retrieval. Crossing them is a performance and relevance bug.
2. **Always reindex on schema change.** Field type changes, new analyzers, new synonyms — all require a full reindex. Use the alias-swap pattern (Elasticsearch) or zero-downtime swap (Algolia) so users never see a partial index.
3. **Always have a backup index.** Snapshot to S3 (Elasticsearch), export (Algolia), or full reindex capability from source DB. An index without backup is a single point of failure for the entire search UX.
4. **Never use dynamic mapping (Elasticsearch).** Always explicit mapping. Dynamic mapping guesses types wrong (e.g. a numeric-looking string becomes a long), and once set, requires reindex to fix.
5. **Always index denormalized data.** Each search document contains everything needed to render a result. Joining at query time defeats the purpose of a search engine. The source DB can be normalized; the search index must not be.
6. **Always make incremental updates idempotent.** The same event processed twice (queue retry) must produce the same index state. Use the DB row's `updated_at` as a version; reject stale updates.
7. **Always use bulk APIs for backfill.** Single-doc inserts are 10-100x slower than bulk. Batch 1,000 docs per bulk request. Add exponential backoff on 429.
8. **Always boost title above body.** Title matches are far more relevant than body matches. Default boost ratio: title=3, body=1. Tune via A/B test if needed, but never default to equal weighting.
9. **Never synchronously update the search index in a request handler.** Update via queue (outbox pattern) — the user-facing request returns immediately; the index catches up async. Synchronous updates couple user latency to search engine health.
10. **Always configure language-appropriate analyzers.** English analyzer on French text = poor stemming + no accents handled. CJK with default analyzer = no tokenization. Match analyzer to content language; route multi-language docs per-language.
