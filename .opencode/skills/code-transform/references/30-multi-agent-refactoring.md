# Multi-Agent Refactoring — MANTRA Pattern

> **Based on**: MANTRA (arXiv:2503.14340) + RefAgent (arXiv:2511.03153). Improves 8.7% → 82.8%.

## Three Pillars

### Pillar 1: Context-Aware RAG

Retrieve structurally related code before refactoring: callers, callees, field usages, test files.

### Pillar 2: Multi-Agent Collaboration

Developer Agent (produces) ↔ Reviewer Agent (critiques) → iterate (max 3).
Reviewer checks: Fowler principles, SOLID, behavior preservation, naming, test coverage, no new smells.

### Pillar 3: Verbal RL Self-Repair

Feed compile/test errors verbatim back to Developer:

```
Attempt 1: Refactor → Compile → FAIL
  Error: "NameError: name 'X' is not defined"
  ↓ verbal feedback
Attempt 2: Developer fixes import → PASS
```

## 4-Role Pipeline (RefAgent, for complex refactors)

1. Context-aware Planner — decides WHAT and ORDER; can replan
2. Refactoring Generator — emits code; uses RAG context
3. Compiler Agent — validates syntax/build
4. Tester Agent — runs tests; reports to Planner

## Decision Tree

```
Single Fowler recipe on one function?
├── YES → Single-agent + RAG + verify
└── NO → Multi-file or >50 lines?
    ├── NO → Single-agent + Reviewer
    └── YES → Full 4-role pipeline
```

## Results

| Approach | Success          |
| -------- | ---------------- |
| RawGPT   | 8.7%             |
| MANTRA   | 82.8%            |
| RefAgent | +64.7% pass rate |

Key insight: 8.7%→82.8% from context + verification, not better model.

## Integration with code-transform

Phase 4 (EXECUTE):

- Simple (<50 lines): single-agent + RAG + verify_behavior.sh
- Complex: RAG → Developer → Reviewer → iterate → compile+test → self-repair → behavior_snapshot.sh

## Anti-Patterns

1. Skipping RAG — guessing without context
2. No Reviewer — Developer alone = lower quality
3. No self-repair — first attempt often fails
4. Too many iterations — max 3; escalate
5. Ignoring test failures

## Composes with Dragon Protocol

Dragon DEBATE → MANTRA Developer/Reviewer → Dragon VERIFY → Dragon REFLEXION (verbal RL)
