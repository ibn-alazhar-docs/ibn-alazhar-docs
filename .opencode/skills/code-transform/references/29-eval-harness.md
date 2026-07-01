# Eval Harness — Measuring Skill Effectiveness

> **Based on**: anthropics/skill-creator pattern.

## Why This Matters

Without eval: "Does this skill help?" = guessing.
With eval: with-skill 100% vs baseline 33% (+200%) = proof.

## Architecture

```
run_eval.py
  For each test case:
    WITH SKILL (parallel) | BASELINE (parallel)
    → Assertion Evaluation
    → benchmark.json
    → generate_review.py → review.html
```

## Test Case Structure

```
evals/cases/fix-sql-injection/
├── case.json (metadata + assertions)
├── src/ (project files — broken state)
└── solution/ (fixed state for simulated eval)
```

### case.json

```json
{
  "name": "fix-sql-injection",
  "difficulty": "easy",
  "category": "security",
  "prompt": "Audit for security issues.",
  "assertions": [
    { "type": "file_not_contains", "file": "src/auth.py", "pattern": "f\"SELECT" },
    { "type": "file_contains", "file": "src/auth.py", "pattern": "?" },
    { "type": "no_secrets" }
  ]
}
```

### Assertion Types

| Type              | Checks                        |
| ----------------- | ----------------------------- |
| file_contains     | File contains pattern         |
| file_not_contains | File does NOT contain pattern |
| tests_pass        | Command exits 0               |
| no_secrets        | Security scan 0 critical/high |

## Running

```bash
python3 scripts/run_eval.py --cases evals/cases --output evals/benchmark.json
python3 scripts/generate_review.py evals/benchmark.json --open
```

## Key Metrics

| Metric                     | Good  |
| -------------------------- | ----- |
| avg_pass_rate (with_skill) | >80%  |
| pass_rate_improvement_pct  | >100% |
| pass_rate_delta            | >50%  |

## Best Practices

1. Run 3+ iterations for statistical significance
2. Diverse cases (all categories)
3. Real-world scenarios
4. Track over time (version-tagged)
5. Fail fast — investigate consistently failing cases
6. Don't game the eval — test outcomes, not implementation
