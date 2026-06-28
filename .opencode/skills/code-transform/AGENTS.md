# Code Transform — AGENTS.md Mirror

> Flat format mirror for non-Claude tools (Codex CLI, Cursor, OpenCode, etc.). For full progressive-disclosure version, see SKILL.md.

## Description

Transform ANY application into its best version — architecture, database, UI/UX, testing, security, performance, documentation — even with weak/cheap models and small context windows. Three modes: AUDIT, TRANSFORM, PERFECT.

## ⚠️ The Dragon Protocol (MANDATORY)

The Dragon Protocol is the **ultimate reasoning engine**. It makes ANY model reason like a frontier model. Based on 25+ research papers (DeepSeek-R1, Reflexion, Multi-Agent Debate, Mixture-of-Agents, Tree-of-Thoughts).

### 3 Non-Negotiable Rules
1. **NEVER self-correct without external signal** — every critique needs a test/compiler/agent.
2. **Verification earns the output** — no output until verification passes.
3. **Scale scaffolding to weakness + difficulty** — triage first.

### 11 Phases
TRIAGE → PLAN → EXPLORE (ToT) → DEBATE (3 agents) → SYNTHESIZE → EXECUTE → VERIFY (Reflexion max 3) → CRITIQUE (constitutional) → REFINE → META-CHECK → OUTPUT

### Adaptive Scaffolding
- Easy task + strong model → Plan→Execute→Verify (skip debate/ToT)
- Hard task + weak model → FULL 11 phases, 2 debate rounds, 2 refine, ToT

## Mode Selection
- **AUDIT**: "assess this" → multi-dimensional report, NO code changes
- **TRANSFORM**: "fix this" → apply transformations with safety gates
- **PERFECT**: "make this perfect" → AUDIT → prioritize → TRANSFORM (multi-session)

## The Perfect Workflow
```
PHASE -1: MEMORY LOAD → Read PROGRESS.md + BLUEPRINT.md (resumed sessions)
PHASE 0: CENSUS → Profile codebase
PHASE 1: AUDIT → 10 dimensions (or spawn 8 agents for >10 files)
PHASE 2: PRIORITIZE → P0-P5
PHASE 3: EXECUTE → Named transform → diff → verify → critique → commit
PHASE 4: VERIFY → Re-audit + Self-Improvement Pass
```

## 10 Audit Dimensions
1. Architecture | 2. Database | 3. Testing | 4. Security | 5. Performance
6. UI/UX | 7. Code Quality | 8. DevOps | 9. Documentation | 10. Full-Stack

## Scripts (7)
- `scripts/codebase_census.sh` — profile codebase
- `scripts/detect_smells.py` — detect code smells
- `scripts/cognitive_complexity.py` — cognitive complexity (Python)
- `scripts/layer_violation_detector.py` — check dependency direction
- `scripts/verify_behavior.sh` — type-check + tests + lint
- `scripts/audit_orchestrate.sh` — run all audit scripts
- `scripts/behavior_snapshot.sh` — golden-master behavior diff

## Assets (6)
- `assets/audit_report_template.md` | `assets/blueprint_template.md`
- `assets/progress_template.md` | `assets/final_report_template.md`
- `assets/adr_template.md` | `assets/diff_template.md`

## References (19 files)
01-architecture-audit | 02-database-audit | 03-testing-audit | 04-security-audit
05-performance-audit | 06-uiux-audit | 07-code-quality-audit | 08-devops-audit
09-documentation-audit | 10-fullstack-audit | 11-context-management
12-debugging-methodology | 13-mobile-patterns | 14-transformation-recipes
15-ai-failure-modes | 16-multi-model-guide | 17-deep-thinking-protocol (fallback)
18-agent-orchestration | 19-dragon-protocol (PRIMARY)

## Quick Reference
```
DRAGON → 11 phases before every decision
RULE 1 → Never self-correct without external signal
RULE 2 → Verification earns the output
RULE 3 → Scale scaffolding to weakness + difficulty
```

**Remember**: Think 11 times before acting. Never self-correct without external signal. Verification earns the output. Audit 10 dimensions. Name every transformation. Output diffs. Persist artifacts.

## License
MIT — see LICENSE.txt.
