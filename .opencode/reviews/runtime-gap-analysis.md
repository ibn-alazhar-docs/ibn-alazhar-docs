# Runtime Gap Analysis

> **Date:** 2026-05-20
> **Type:** Runtime Gap Analysis
> **Scope:** `.opencode/` — All layers

---

## Placeholder Systems

These systems exist as directory structure and empty files but are not yet operational:

### Commands (`commands/`)

| File                 | Purpose                      | Status      |
| -------------------- | ---------------------------- | ----------- |
| `bootstrap.md`       | Bootstrap command definition | Placeholder |
| `load-context.md`    | Context loading command      | Placeholder |
| `prepare-session.md` | Session preparation command  | Placeholder |
| `review-phase.md`    | Phase review command         | Placeholder |
| `runtime-status.md`  | Runtime status check command | Placeholder |
| `spec-sync.md`       | Spec synchronization command | Placeholder |

**Assessment:** These are optional command shortcuts. The runtime works without them. Populate when command-driven workflows are needed.

### MCP Server Configs (`mcp/`)

| File            | Purpose                      | Status      |
| --------------- | ---------------------------- | ----------- |
| `DATABASE.md`   | Database MCP server config   | Placeholder |
| `DOCKER.md`     | Docker MCP server config     | Placeholder |
| `FILESYSTEM.md` | Filesystem MCP server config | Placeholder |
| `GITHUB.md`     | GitHub MCP server config     | Placeholder |
| `PLAYWRIGHT.md` | Playwright MCP server config | Placeholder |
| `SECURITY.md`   | Security MCP server config   | Placeholder |
| `STACK.md`      | MCP stack overview           | Placeholder |

**Assessment:** These are conceptual MCP definitions. The actual MCP tools (filesystem, shell, web, notion, task, skill) are operational via native tool implementations. These files would be populated if external MCP servers are connected.

### Prompt Templates (`prompts/`)

| File                              | Purpose                   | Status      |
| --------------------------------- | ------------------------- | ----------- |
| `execution/spec-execution.md`     | Spec execution prompt     | Placeholder |
| `review/consistency-review.md`    | Consistency review prompt | Placeholder |
| `review/rtl-review.md`            | RTL review prompt         | Placeholder |
| `review/security-review.md`       | Security review prompt    | Placeholder |
| `system/runtime-system-prompt.md` | Runtime system prompt     | Placeholder |

**Assessment:** These are optional prompt templates. The runtime uses inline instructions from agent and skill files instead. Populate if dedicated prompt templates are needed.

### Routing Model Details (`routing/models/`)

| File           | Purpose                         | Status      |
| -------------- | ------------------------------- | ----------- |
| `coding.md`    | Coding model routing details    | Placeholder |
| `reasoning.md` | Reasoning model routing details | Placeholder |
| `reviews.md`   | Review model routing details    | Placeholder |
| `defaults.md`  | Default model configuration     | Placeholder |

**Assessment:** `MODEL_ROUTING.md` contains the complete routing table. These files would provide per-model deep configuration. Not required for current operation.

### Session Storage (`sessions/`)

| File        | Purpose                  | Status      |
| ----------- | ------------------------ | ----------- |
| `README.md` | Session storage overview | Placeholder |

**Assessment:** Correctly empty. Session records are created at runtime. No gap.

### Review Storage (`reviews/`)

| File        | Purpose                 | Status      |
| ----------- | ----------------------- | ----------- |
| `README.md` | Review storage overview | Placeholder |

**Assessment:** Correctly empty. Review outputs are created at runtime. No gap.

### Runtime README (`.opencode/README.md`)

| File        | Purpose                    | Status      |
| ----------- | -------------------------- | ----------- |
| `README.md` | Runtime directory overview | Placeholder |

**Assessment:** Should contain a brief overview of the runtime for humans navigating the directory.

---

## Non-Operational Layers

| Layer           | Operational?       | Gap                  |
| --------------- | ------------------ | -------------------- |
| System Layer    | Yes                | None                 |
| Execution Layer | Yes                | None                 |
| Review Layer    | Yes                | None                 |
| Agent Layer     | Yes                | None                 |
| Skill Layer     | Yes                | None                 |
| Memory Layer    | Yes (needs update) | Status is stale      |
| Routing Layer   | Partially          | Detail files empty   |
| MCP Layer       | Conceptual         | Server configs empty |
| Session Layer   | Ready (unused)     | No sessions run yet  |
| Policy Layer    | Yes                | None                 |
| Commands Layer  | No                 | All empty            |
| Prompts Layer   | No                 | All empty            |
| Review Storage  | Ready (unused)     | No reviews run yet   |

---

## Planned Future Runtime Systems

These systems are referenced but not yet implemented:

1. **CodeRabbit Integration** — Referenced in `REVIEW_PIPELINE.md` and `WORKFLOW.md`. Requires GitHub App setup.
2. **Playwright MCP** — Referenced in `AI_OPERATING_RULES.md` (Rule 20). Requires UI to exist first.
3. **Context7 Skill** — Referenced in `AI_OPERATING_RULES.md` (Rule 19). External skill, not in `.opencode/skills/`.
4. **Impeccable Skill** — Referenced in `docs/32_IMPECCABLE_DESIGN_WORKFLOW.md`. External skill.
5. **Session Performance Tracking** — Referenced in `MODEL_ROUTING.md`. Requires session data accumulation.
6. **Automated Health Scheduling** — Referenced in `runtime/runtime-health.md`. Requires external scheduler.

---

## Technical Debt

### TD-01: Escalation Table Duplication

**Severity:** Low
**Location:** `runtime/escalation-rules.md`, `AGENT_RULES.md`, `REVIEW_PIPELINE.md`, `EXECUTION_ENGINE.md`
**Description:** Escalation paths are defined in 4 files. They are consistent but maintaining 4 copies creates drift risk.
**Fix:** Make `runtime/escalation-rules.md` the single source of truth. Other files should reference it.

### TD-02: Review Checklist Duplication

**Severity:** Low
**Location:** `REVIEW_PIPELINE.md` + 5 agent files
**Description:** Review checklists appear in both the pipeline and individual agent files.
**Fix:** Agent files should reference `REVIEW_PIPELINE.md` for the authoritative checklist, keeping only agent-specific additions locally.

### TD-03: Memory Status Staleness

**Severity:** Medium
**Location:** `memory/project/current-status.md`
**Description:** In-Progress Work lists items that are now complete.
**Fix:** Update completed work table, clear in-progress items.

### TD-04: Missing Cross-Reference Validation

**Severity:** Low
**Location:** System-wide
**Description:** No automated mechanism to verify that file references are valid.
**Fix:** Add a health check that validates all cross-references.

### TD-05: No Runtime Versioning Strategy

**Severity:** Low
**Location:** `SYSTEM.md`
**Description:** Runtime version is 1.0.0 but there is no changelog or versioning strategy.
**Fix:** Add `CHANGELOG.md` or version tracking to the runtime.

---

## Recommended Priorities

### Priority 1 — Immediate (Before Phase 1 Work)

1. **Update memory status** — Fix `memory/project/current-status.md` to reflect completed work.
2. **Record health check** — Update `runtime/runtime-status.md` with this verification result.
3. **Populate runtime README** — Add `.opencode/README.md` with directory overview.

### Priority 2 — Before Phase 2

4. **Populate routing model details** — Fill `routing/models/*.md` or remove references from `MODEL_ROUTING.md`.
5. **Reduce escalation duplication** — Consolidate escalation tables to single source.
6. **Add runtime ownership** — Define who maintains the runtime layer.

### Priority 3 — When Needed

7. **Populate MCP configs** — When MCP servers are connected.
8. **Populate commands** — When command-driven workflows are needed.
9. **Populate prompts** — When dedicated prompt templates are needed.
10. **Add versioning strategy** — When runtime reaches stable state.

### Priority 4 — Future

11. **Integrate CodeRabbit** — When GitHub App is set up.
12. **Integrate Playwright** — When UI exists.
13. **Automate health scheduling** — When external scheduler is available.
14. **Add performance tracking** — After sufficient session data.

---

## Gap Summary

| Category               | Count                                               | Severity                      |
| ---------------------- | --------------------------------------------------- | ----------------------------- |
| Placeholder systems    | 25 files                                            | Low (optional infrastructure) |
| Non-operational layers | 4 (commands, prompts, MCP details, routing details) | Low-Medium                    |
| Technical debt items   | 5                                                   | Low-Medium                    |
| Missing references     | 2 (fallback.md, escalation.md in routing/models/)   | Medium                        |
| Stale data             | 1 (memory/current-status.md)                        | Medium                        |

**Total gaps: 37** — Most are optional infrastructure scaffolds. Only 3 require immediate attention before Phase 1 work begins.

---

**Analyzed by:** Runtime Intelligence Architect
**Date:** 2026-05-20
**Next analysis:** After Phase 1 gate review
