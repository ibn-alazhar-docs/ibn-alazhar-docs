# Tool Synthesis — Self-Improving Agent Pattern

> **Based on**: Live-SWE-agent (arXiv:2511.13646) — 77.4% SWE-bench Verified.

## The Insight

After each transform, reflect: "Should I create a reusable tool for this?" Over time, accumulate a project-specific refactoring library.

## The Pattern

```
After each transform:
  1. REFLECT: Was this common? Will I see it again?
  2. GENERALIZE: Can I extract a reusable recipe?
  3. SYNTHESIZE: Create a tool/recipe
  4. STORE: Save to recipes/ with metadata
  5. INDEX: Add to registry

Next time:
  1. RETRIEVE: Search recipes/
  2. APPLY: Use stored recipe
  3. REFINE: Update if modified
```

## When to Synthesize

ALL true: seen 2+ times, generalizable, mechanical, clear I/O.
NOT: unique decision, requires business context, too project-specific.

## Recipe Structure (recipes/<name>.md)

```markdown
# Recipe: Parameterize SQL Queries

## When to Use

## Input Pattern

## Output Pattern

## Steps

## Verification

## Metadata (times applied, success rate)
```

## The Compounding Effect

```
Session 1: 5 transforms → 2 recipes
Session 2: 5 transforms → 3 recipes used, 1 new
Session 3: 5 transforms → 4 recipes used, 1 new
Session 4: 5 transforms → 5 recipes used, 0 new (10x faster)
```

## Script

```bash
python3 scripts/synthesize_tool.py --reflect --transform-log logs/transform.json
python3 scripts/synthesize_tool.py --list
python3 scripts/synthesize_tool.py --search "sql injection"
```

## Anti-Patterns

1. Over-synthesizing (recipe for every transform)
2. Under-generalizing (too specific)
3. Not refining (recipe failed but not updated)
4. Not searching (always from scratch)
