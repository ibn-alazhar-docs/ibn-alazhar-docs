# OmniProject AI — AGENTS.md Mirror

> Autonomous full-cycle project manager. v19.0.0. 82 sub-skills (ALL fully detailed, no stubs). 25 scripts (including validate_skill.py for structural integrity). 35 references. 15 phases. Browser agent. Playwright E2E. Lighthouse. Visual regression CI. Screen-reader testing. Spec-driven. Self-healing. Self-improving. Pre-commit validation. Zero external dependencies.

This file mirrors `SKILL.md` for non-Claude agent runtimes. Same workflow, same sub-skills, same scripts — only the invocation syntax differs.

## Interaction Mode

**Autonomous by default.** Proceed with best-practice defaults. Pause ONLY for irreversible decisions with significant trade-offs. Report after milestones. Final summary when done.

## Entry Point

`python3 scripts/project_analyzer.py .` — runs FIRST. Determines type/size/stack/health/risk/stubs → recommended start.

For browser-driven work, ensure `live-preview` has started the dev server before any Phase 4/6/9 visual work:

```bash
python3 scripts/browser_agent.py serve --dir .
```

## Decision Tree (autonomous)

```
Empty? → Greenfield scaffold (Next.js + FastAPI + Postgres + Docker)
🔴 RED? → git init → characterization tests → audit (NO changes until safe)
Massive? → scope to highest-pain module (ask ONE question)
Undetectable? → assume modernization, document assumption, proceed
Otherwise? → Standard 15-phase flow
```

## 15-Phase Workflow

```
 0: SPEC GENERATION → spec_generator.py (spec.md + plan.md + tasks.md)
 1: DISCOVERY → project_analyzer (scan + stub detection + partial feature detection)
 2: INTAKE → auto-fill with best-practice defaults (no user sign-off needed)
 3: CENSUS → codebase_census + metrics snapshot
 4: AUDIT → 14 dimensions + stub detection + spec-coverage + visual baseline + a11y baseline
 5: PRIORITIZE → stability→spec-compliance→visual perfection→tests→architecture→docs→deploy
 6: EXECUTE & SELF-HEAL → spec-driven transform → verify → if fail: debug+fix → max 3 → revert+escalate
    └── Visual Guard: every UI change → screenshot → visual-diff → fix if broken
 7: VERIFY → metrics_diff + FINAL_REPORT + traceability check
 8: TESTING MASTERY → 27 test types + mutation hardening + BDD from spec
 9: BROWSER-BASED ACCEPTANCE → flow-simulator + a11y audit + responsive sweep (NEW v18.0)
10: OBSERVABILITY → logs + metrics + traces + SLOs
11: ROLLOUT → staged deploy + rollback (with visual testing stage)
12: PACKAGING → Docker images + one-command startup + changelog + visual proof album
13: META-AUDIT → review own performance + visual heuristics
14: SELF-UPGRADE → lessons → permanent improvements (sub-skills + scripts + policies)
```

## Self-Healing Loop

```
After EVERY atomic change:
  → Run tests + lint + type-check
  ├─ ALL GREEN → commit → next
  ├─ FAIL → debug-entry (root cause) → fix → re-verify
  └─ Max 3 → REVERT + escalate
Iron Law: Never leave codebase broken. Unverified = uncommitted.

Visual Guard (after EVERY UI change):
  → capture baseline screenshot
  → implement change
  → launch browser → navigate → wait for idle
  → capture screenshot + a11y audit + console errors
  → visual-diff: if deviation > tolerance → fix → re-capture
  → on success: save new baseline, attach to commit
```

## Extreme Scenarios (autonomous self-correction — 15 total)

- Test failures after refactor → debug root cause, don't blindly revert
- Undetectable type → assume modernization, document, proceed
- Contradictory configs (npm+yarn) → choose most complete, remove other
- Missing secrets → .env.example, never hardcode
- Massive monolith → extract bounded contexts incrementally
- Zero tests + deadline → smoke tests first, no refactoring before safety net
- Circular deps → introduce interface, never delete
- No Git + full of node_modules → git init → .gitignore → deduplicate → discovery
- CI/CD completely absent → select GitHub Actions, matrix testing, auto-deploy staging
- Hardcoded secrets everywhere → extract ALL to .env, replace with env vars, .gitignore
- Database missing migrations → auto-generate initial migration from models
- Mobile app with no API → generate OpenAPI from frontend hooks, scaffold backend
- Novel language/framework → research-crawler → sub-skill-generator → proceed cautiously
- Multi-repo platform → multi-repo-orchestrator: each service = mini-project, then align contracts
- Risk > threshold → risk-manager: auto-create fallback branch before proceeding

## Sub-Skills (82 — all embedded, zero external deps)

### Workflow (10)

brainstorming, writing-plans, git-worktrees, subagent-dev, debug-entry, tdd, review-gate, verification-gate, finishing-branch, using-code-transform

### Frontend (8)

frontend-bridge, web-design, composition-patterns, react-best-practices, webapp-testing, css-styling, state-management, form-validation

### Backend (10)

db-design, supabase-platform, api-contract, graphql-schema, apollo-server, auth-setup, payment-setup, rate-limiting, api-versioning, webhook-setup

### DevOps (10)

containerize, ci-cd, k8s, iac-terraform, gitops, cost-optimization, monitoring, ship-router, log-aggregation, backup-strategy

### Infra (8)

error-monitoring, env-config, file-storage, email-setup, search-engine, message-queue, realtime-setup, db-seeding

### Quality (4)

dependency-update, performance-profiling, accessibility, doc-generator

### Data (2)

data-migration, cms-setup

### Cross-Cutting (3)

i18n, owasp-security, mobile-router

### Meta (10)

meta-auditor, meta-learning, knowledge-base, self-patch-generator, sub-skill-generator, plan-decomposer, research-crawler, multi-repo-orchestrator, risk-manager, audit-trail

### Spec-Kit (3)

spec-generator, spec-sync, policy-evolution

### Browser/Visual (14 — NEW v18.0)

browser-launcher, flow-simulator, live-preview, responsive-validator, visual-diff, screenshot-capture, accessibility-auditor, playwright-pro, interactive-browser, lighthouse-scanner, breakpoint-detector, screen-reader-test, visual-regression-ci, screenshot-capture

## Browser/Visual Sub-Skill Routing

| Phase | Trigger                        | Sub-skill                                                             |
| ----- | ------------------------------ | --------------------------------------------------------------------- |
| 4     | Visual baseline                | `browser-launcher` + `screenshot-capture` + `visual-diff` (baselines) |
| 4     | Accessibility baseline         | `accessibility-auditor` (axe + Lighthouse)                            |
| 4     | Responsive baseline            | `responsive-validator` (4-viewport sweep)                             |
| 6     | After UI change (Visual Guard) | `screenshot-capture` (current) → `visual-diff` (vs baseline)          |
| 6     | A11y regression check          | `accessibility-auditor` (axe-only, auto-fix on)                       |
| 9     | Acceptance: user flows         | `flow-simulator` (login, checkout, signup, onboarding)                |
| 9     | Acceptance: a11y               | `accessibility-auditor` (axe + Lighthouse, full sim)                  |
| 9     | Acceptance: responsive         | `responsive-validator` (8-viewport + cross-browser)                   |
| 9     | Performance audit              | `lighthouse-scanner`                                                  |
| 9     | Screen-reader validation       | `screen-reader-test`                                                  |
| 9     | Interactive debugging          | `interactive-browser` (persistent js_repl)                            |
| 9     | Breakpoint regression          | `breakpoint-detector`                                                 |
| 11    | Pre-deploy visual smoke        | `responsive-validator` (4-viewport, chromium-only)                    |
| 12    | Visual proof album             | `screenshot-capture` (batch mode) → HTML gallery                      |
| CI    | Visual regression              | `visual-regression-ci` (Playwright + Chromatic)                       |

## Scripts (25)

project_analyzer, codebase_census, metrics_diff, audit_orchestrate, detect_smells, cognitive_complexity, layer_violation_detector, security_scan, dead_code_detector, duplicate_code_detector, traceability_matrix, verify_behavior, behavior_snapshot, mantra_refactor, synthesize_tool, generate_test_suite, mutation_harden, **browser_agent** (NEW v18.0), spec_generator (NEW v17.0), validate_skill (NEW v19.0), rebuild_all

## References (35)

01-10: audit dimensions (architecture, database, testing, security, performance, UI/UX, code quality, DevOps, docs, full-stack)
11-19: methodology (context management, debugging, mobile, recipes, AI failure modes, multi-model, deep thinking, agent orchestration, Dragon protocol)
20-28: specialized (testing mastery, error handling, safe migration, API design, state/caching, observability, domain patterns, session handoff, git workflow)
29-35: advanced (eval harness, multi-agent refactoring, tool synthesis, mutation hardening, bootstrap injection, context engineering, delegates)

## Quick Reference

```
AUTONOMOUS: defaults, pause only for irreversible
SELF-HEAL: every change → verify → if fail: debug → max 3 → revert
VISUAL GUARD: every UI change → screenshot → diff → fix if broken
WORKFLOW: SPEC → DISCOVER → INTAKE → CENSUS → AUDIT → PRIORITIZE → EXECUTE → VERIFY → TEST → BROWSER-ACCEPT → OBSERVE → ROLLOUT → PACKAGE → META-AUDIT → SELF-UPGRADE
DRAGON: 11 phases before every decision (ref 19)
CONSTRAINTS: check HC-1..HC-10 before every transform
TRACEABILITY: every commit references SP-N spec item
RECOVERY: revert → Reflexion max 3 → escalate with failure notes
EVAL: +457% | F1: 100% | MANTRA: 8.7%→82.8% | BOOTSTRAP: 1% rule
SHAPER: 5-layer context compression
SUB-SKILLS: 82 (10 meta + 14 browser/visual + 3 spec-kit + 55 core)
DELIVERY: Docker + one-command startup + changelog + OMNIPROJECT_SELF_IMPROVEMENT.md + visual proof album
SELF-IMPROVE: meta-audit → lesson candidates → self-patch → knowledge base → smarter next time
BROWSER: screenshot + flows + a11y + responsive + visual-diff + playwright-pro + interactive-repl + lighthouse + screen-reader + visual-regression-ci + breakpoint-detection → "you see EVERYTHING"
```

## Sub-Skill Invocation (non-Claude syntax)

In Claude Code, sub-skills are auto-invoked via description matching. For non-Claude runtimes, invoke explicitly:

```bash
# Python-style invocation
subskill invoke browser-launcher --url http://localhost:3000
subskill invoke screenshot-capture --url http://localhost:3000/login --mode full-page
subskill invoke visual-diff --current after.png --baseline before.png
subskill invoke flow-simulator --url http://localhost:3000 --flows login,checkout
subskill invoke accessibility-auditor --url http://localhost:3000 --standard wcag22aa
subskill invoke responsive-validator --url http://localhost:3000 --viewports mobile,desktop

# Or via the unified browser_agent.py CLI
python3 scripts/browser_agent.py launch --url http://localhost:3000
python3 scripts/browser_agent.py screenshot --url http://localhost:3000/login
python3 scripts/browser_agent.py diff --current after.png --baseline before.png
python3 scripts/browser_agent.py flows --url http://localhost:3000 --flows login
python3 scripts/browser_agent.py a11y --url http://localhost:3000
python3 scripts/browser_agent.py responsive --url http://localhost:3000
python3 scripts/browser_agent.py serve --dir .
```

## License

MIT — see LICENSE.txt.
