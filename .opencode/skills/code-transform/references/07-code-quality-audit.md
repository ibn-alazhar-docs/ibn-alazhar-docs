# Code Quality Audit — Smells, Complexity, Naming, Duplication

> Read this during Dimension 7 (Code Quality) of the AUDIT phase. Uses the refactor skill's 30+ smell catalog.

## Audit Checklist

```
[ ] Run scripts/detect_smells.py — how many smells found?
[ ] Run scripts/cognitive_complexity.py — any function >15?
[ ] Are there functions >30 lines?
[ ] Are there files >300 lines?
[ ] Are there magic numbers (unexplained literals)?
[ ] Are names intent-revealing?
[ ] Is there duplicated knowledge (same business rule in multiple places)?
[ ] Are there dead code (unused functions, imports, variables)?
[ ] Are there commented-out code blocks?
[ ] Is nesting >3 levels deep?
```

## Quick Assessment

Run the bundled scripts:
```bash
# Detect smells mechanically
python3 scripts/detect_smells.py . --json > smells.json

# Check cognitive complexity (Python)
python3 scripts/cognitive_complexity.py src/main.py --threshold 15

# Check for layer violations
python3 scripts/layer_violation_detector.py .
```

## Smell Priority

| Severity | Smells | Action |
|----------|--------|--------|
| **Critical** | C1 Mixed Concerns, C2 Hidden Side Effects, C3 Commented Code, C4 Dynamic Dispatch | Fix immediately |
| **High** | H1 Long Method, H2 God Class, H3 Deep Nesting, H4 Magic Numbers, H5 Duplication, H6 Primitive Obsession | Fix this session |
| **Medium** | M1 Unclear Names, M2 Speculative Generality, M5 Mutable State, M6 Boolean Flags | Fix if quick |
| **Low** | L1-L6 (comments, formatting, TODOs) | Log for later |

## Cognitive Complexity Thresholds

| Score | Status | Action |
|-------|--------|--------|
| 1-5 | ✓ Simple | No action |
| 6-10 | ✓ Manageable | No action |
| 11-15 | ⚠ Starting to get hard | Consider extracting |
| 16-20 | ⚠ Hard | Extract soon |
| 21-25 | ✗ Dangerous | Extract now |
| 25+ | ✗ Very dangerous | Extract immediately |

## Improvement Recipes

See the refactor skill's `references/03-refactor-recipes.md` for 27 Fowler recipes. Key ones:

- **R1 Extract Method** — for Long Method (H1)
- **R8 Guard Clauses** — for Deep Nesting (H3)
- **R6 Replace Magic Literal** — for Magic Numbers (H4)
- **R9 Extract Class** — for God Class (H2)
- **R13 Replace Primitive with Object** — for Primitive Obsession (H6)

## Summary

- **Use the scripts**: `detect_smells.py`, `cognitive_complexity.py`, `layer_violation_detector.py`
- **Priority**: Critical smells first, then High, then Medium, then Low
- **Cognitive complexity**: ≤15 is the target (SonarSource Quality Gate)
- **See refactor skill** for the full 30+ smell catalog and 27 recipes
