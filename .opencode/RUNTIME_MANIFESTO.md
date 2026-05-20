# RUNTIME_MANIFESTO.md — Principles of the Ibn Al-Azhar Docs AI Runtime

> **Purpose:** Core principles governing how this runtime operates.
> **Audience:** All AI agents and human engineers working in this repository.

---

## 1. Docs Before Code

Specs, ADRs, and design documents are written before implementation begins. Code without docs is technical debt from day one. The runtime enforces this through phase gates and the spec-guardian agent.

**Rule:** No implementation file is created before its spec exists and passes review.

---

## 2. Phase Gates Are Mandatory

Work proceeds in phases. Each phase has a gate review before the next phase begins. Skipping a gate is a runtime violation.

**Rule:** Phase N+1 does not start until Phase N passes its gate review.

---

## 3. Arabic Is Default

Arabic is not a localization add-on. It is the primary language. RTL is not a CSS afterthought. It is the default layout direction. English support is important but secondary.

**Rule:** Every UI change is reviewed for Arabic correctness and RTL behavior first.

---

## 4. Docker Is The Environment

Local development runs in Docker Compose. If it doesn't work in a container, it doesn't work. No local service installations. No "works on my machine."

**Rule:** All services (PostgreSQL, Redis, MinIO) run via `docker compose up`.

---

## 5. No Fake Status

Never claim a feature is implemented when it isn't. Never claim a test passes when it doesn't. Never claim a review was performed when it wasn't. The runtime's credibility depends on honest reporting.

**Rule:** Status is always verified, never assumed.

---

## 6. Small Changes Over Rewrites

Giant rewrites introduce risk and delay. Small, reviewable changes compound into significant progress. Each change should be understandable in a single PR review.

**Rule:** Prefer incremental improvement over architectural revolution.

---

## 7. Security Is Not Optional

Every feature is reviewed for security implications. Secrets never go in files. Input is always validated. Output is always encoded. The security-reviewer agent is not a suggestion — it is a gate.

**Rule:** No feature ships without security review.

---

## 8. Design Quality Is Engineering Quality

A broken UI is a broken product. Inconsistent colors, wrong fonts, misaligned elements — these are bugs, not aesthetics. The brand is part of the specification.

**Rule:** Brand consistency is enforced at the same level as type safety.

---

## 9. Memory Persists Across Sessions

Project decisions, brand rules, active constraints, and phase status are stored in `.opencode/memory/`. Agents read memory before acting. Context is not lost between sessions.

**Rule:** Memory is the runtime's long-term knowledge. It is updated with every decision.

---

## 10. Model Routing Is Intentional

Not every task needs the most capable model. Coding tasks route to coding models. Reasoning tasks route to reasoning models. Review tasks route to review models. Fallbacks are defined. Escalation paths exist.

**Rule:** The right model for the right task. Cost and capability are both considered.

---

## 11. The Runtime Serves The Project

This runtime exists to make Ibn Al-Azhar Docs better. It does not exist for its own sake. If a runtime rule slows down verified progress without adding value, the rule should be questioned.

**Rule:** Runtime rules are means to an end. The end is a well-built product.

---

## 12. Reproducibility Over Convenience

Sessions should be reproducible. Given the same specs, memory, and constraints, the runtime should produce consistent results. Ad-hoc decisions are documented. Shortcuts are flagged.

**Rule:** Another engineer should be able to reproduce the session outcome from the logs.
