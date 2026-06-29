---
name: research-crawler
description: "Investigates novel frameworks, languages, and patterns the skill doesn't already know. Crawls official docs, GitHub READMEs, popular tutorials, and authoritative blog posts. Time-boxed to 30 minutes per session. Outputs a structured research-report.md used by sub-skill-generator and knowledge-base."
license: MIT
metadata:
  version: "1.0"
  author: OmniProject AI
  category: meta
---

# Research Crawler

> Phase 1 / 14 sub-skill. The skill's eyes on the outside world. When the project uses a tech the skill has never seen, this sub-skill fetches, filters, and synthesizes the key facts into a report. Without it, novel tech = guesswork.

## When to Use

| Phase | Trigger | Why |
|-------|---------|-----|
| Phase 1 — DISCOVERY | Project type completely unknown (no sub-skill matches) | Need baseline understanding before any planning |
| Phase 14 — SELF-UPGRADE | `sub-skill-generator` needs domain research before drafting | Drafts without research produce wrong content |
| Phase 6 — EXECUTE | Hit a framework error with no knowledge-base match | Quick targeted research to unblock |
| Phase 13 — META-AUDIT | `meta-learning` routed "outdated knowledge" lesson | Re-research to verify what's still true |
| User explicit request | "Research X before we start" | Direct request |

**Do NOT use this sub-skill for:** tech the skill already knows (use `knowledge-base`), production code changes (use the relevant domain sub-skill), or open-ended exploration without a target (research without a question is just browsing). Always have a specific question.

## What It Does

1. Takes a research question (e.g. "How do I do WebSocket load testing in Node.js?") and a time budget (default 30 min, hard cap 60 min).
2. Identifies candidate sources by priority:
   - Official documentation (highest priority)
   - GitHub README / docs/ folder of the canonical repo
   - Popular tutorials from authoritative sites (MDN, official blogs)
   - Stack Overflow tags with > 1000 questions
   - Blog posts from recognized authors (must be cited by official docs or have > 10k upvotes)
3. Fetches and parses each source (web-reader sub-skill or direct fetch).
4. Extracts: key concepts, common patterns, anti-patterns, gotchas, tooling, version-specific notes.
5. Cross-references ≥ 2 sources per claim (single-source claims are flagged `low_confidence`).
6. Compares to known tech ("X is like Y but with Z difference") — analogies help comprehension.
7. Writes `research-report.md` with structured sections.
8. Returns summary to caller; full report stored at `research/<date>-<topic>.md`.

## Integration Contract

```
INPUT:
  - question: string (required, specific — not "tell me about X")
  - topic: string (short slug, e.g. "ws-load-testing")
  - time_budget_min: int (default 30, max 60)
  - max_sources: int (default 8)
  - known_analogues: optional list (e.g. ["http-load-testing", "socket.io"]) for comparison

OUTPUT (files):
  - research/<YYYY-MM-DD>-<topic>.md     # full report
  - research/<YYYY-MM-DD>-<topic>.sources.json  # source list with URLs + fetch timestamps

OUTPUT (stdout JSON):
  {
    "topic": "ws-load-testing",
    "question": "How do I do WebSocket load testing in Node.js?",
    "sources_consulted": 6,
    "claims_with_2plus_sources": 14,
    "claims_with_1_source": 3,
    "key_patterns": ["Use ws library with custom WebSocket client", "Measure messages/sec, not requests/sec"],
    "key_anti_patterns": ["Don't use HTTP load testers (k6, JMeter) for WS without plugins"],
    "key_tools": ["ws", "artillery", "thundercat"],
    "gotchas": ["WS connections count against Node's max sockets — set maxSockets high", "Reconnection logic must be tested separately"],
    "comparison_to_known": "Similar to HTTP load testing but connections are persistent; throughput = messages/sec not requests/sec",
    "report_path": "research/2024-11-22-ws-load-testing.md",
    "duration_min": 24,
    "confidence": 0.8
  }
```

## Source Priority

| Priority | Source type | Trust level | Example |
|----------|-------------|-------------|---------|
| 1 | Official documentation | High | nextjs.org/docs, react.dev/learn |
| 2 | Canonical repo README + docs/ | High | github.com/vercel/next.js/blob/canary/docs |
| 3 | Authoritative tutorials | Medium-High | MDN Web Docs, Kubernetes official blog |
| 4 | Stack Overflow (high-vote answers) | Medium | score > 1000, accepted answer |
| 5 | Recognized author blog posts | Medium-Low | cited by official docs |
| 6 | Community tutorials | Low | Medium articles, dev.to — only as cross-reference |

Claims sourced only from priority 6 are flagged `low_confidence` and never used as the sole basis for a sub-skill draft.

## Report Structure

`research-report.md` follows this template:

```markdown
# Research: <topic>
**Question:** <the specific question>
**Date:** YYYY-MM-DD
**Time spent:** N minutes
**Confidence:** 0.X

## Summary (3-5 sentences)
<Direct answer to the question>

## Key Concepts
- Concept 1: ...
- Concept 2: ...

## Common Patterns
1. Pattern name — when to use, code snippet
2. ...

## Anti-Patterns
1. What not to do and why
2. ...

## Tooling
| Tool | Purpose | Maturity |
|------|---------|----------|
| ws | WebSocket server/client | Stable |
| artillery | Load testing with WS plugin | Stable |

## Gotchas / Version-Specific Notes
- Gotcha 1 (version X.Y): ...

## Comparison to Known Tech
<topic> is similar to <known> but differs in <ways>.

## Sources
1. [Official docs](URL) — fetched 2024-11-22
2. [Repo README](URL) — fetched 2024-11-22
3. [SO tag: X](URL) — fetched 2024-11-22

## Open Questions (low confidence)
- Question that no source clearly answered
```

## CLI

```bash
# Standard research run
python3 scripts/research_crawler.py run \
  --question "How do I do WebSocket load testing in Node.js?" \
  --topic ws-load-testing \
  --time-budget 30

# Quick targeted research (for unblocking during EXECUTE)
python3 scripts/research_crawler.py quick \
  --question "Why does Next.js 15 fetch() not cache by default?" \
  --max-sources 3

# Re-verify an existing research report (annual maintenance)
python3 scripts/research_crawler.py reverify \
  --report research/2024-06-15-graphql-scalars.md

# List all research reports
python3 scripts/research_crawler.py list --since 90d
```

## Decision Tree (autonomous)

```
Q: Is the question specific (not "tell me about X")?
  YES → continue
  NO  → halt, ask caller to reformulate as a specific question

Q: Is there a knowledge-base entry that already answers this?
  YES → return the KB entry, skip research (saves time)
  NO  → continue

Q: Is the time budget ≤ 60 min?
  YES → continue
  NO  → cap at 60 min, log warning

Q: Can you find ≥ 2 priority-1-or-2 sources?
  YES → continue with high confidence
  NO  → continue but flag overall confidence as medium-low

Q: Are claims cross-referenced across ≥ 2 sources?
  YES → mark high confidence
  NO  → mark low confidence, list in "Open Questions"

Q: Has the time budget been exceeded?
  YES → stop fetching new sources; synthesize from what you have
  NO  → continue fetching up to max_sources
```

## Time-Boxing

Hard cap: 60 min per session. Default budget: 30 min.

Time allocation within budget:
- 5 min: source discovery (search, identify candidate URLs)
- 20 min: fetch + parse (parallel where possible)
- 5 min: synthesize + write report

If the budget is exceeded, the crawler stops fetching and synthesizes from what it has — partial research is better than no research, but the report must clearly mark which sections are incomplete.

## Self-Improvement Hook

Every research run appends to `audit-trail.jsonl`:

```json
{"ts": "...", "phase": "1", "action": "research", "topic": "ws-load-testing", "sources": 6, "duration_min": 24, "confidence": 0.8, "report_path": "research/2024-11-22-ws-load-testing.md"}
```

`meta-auditor` checks: if research was done in Phase 1 and the project later hit friction that the research should have caught, the research methodology needs improvement (route to `self-patch-generator`).

`knowledge-base` checks: if a research report's claims are later verified in practice, the report becomes a candidate KB entry (route to `knowledge-base` write queue).

## Failure Modes & Recovery

| Symptom | Cause | Recovery |
|---------|-------|----------|
| No sources found | Niche topic, poor search terms | Broaden the question; try alternative phrasings; if still nothing, defer and ask user |
| All sources are priority 5-6 | Topic is niche or new | Flag low confidence, surface to user before relying on findings |
| Sources contradict each other | Different versions / different contexts | Note both, tag each with version/context, mark "disputed" |
| Fetch fails (404, paywall) | Source moved / gated | Skip source, log it; do not use cached versions older than 90 days without re-verifying |
| Time budget exceeded | Topic too broad | Stop, synthesize partial report, flag incomplete sections |

## Tools

- **web-search** (sibling) — finds candidate sources
- **web-reader** (sibling) — fetches and parses source content
- **knowledge-base** (sibling) — checked first to avoid redundant research
- **No direct browser** — uses web-search + web-reader, not browser-launcher (too heavy for research)

## Permissions

- Filesystem: read `knowledge/` (to check existing entries); write `research/`
- Network: outbound HTTPS only (web-search + web-reader); no raw socket, no DNS rebinding
- Processes: none

## Hard Rules

1. **Never trust a single source.** Every claim in the report must be cross-referenced with ≥ 2 sources, OR explicitly flagged `low_confidence` and listed in "Open Questions."
2. **Always cite sources.** Every claim links to its source URL + fetch timestamp — no uncited claims, no "general knowledge."
3. **Always compare to known tech.** A research report without an analogy to something the skill already knows is harder to act on; always include "Comparison to Known Tech."
4. **Always time-box.** Default 30 min, hard cap 60 min; research without a time budget rabbitholes.
5. **Never use cached sources older than 90 days without re-verifying.** Tech docs change; a 6-month-old cached page may be wrong now.
6. **Always start with the knowledge-base.** If a KB entry answers the question, return it — don't re-research what's already known.
7. **Always have a specific question.** "Tell me about X" is not a research question; "How do I do X in framework Y version Z?" is.
8. **Never ship a report with incomplete sections silently.** If a section is incomplete due to time budget, mark it explicitly — never leave a section looking complete when it isn't.
