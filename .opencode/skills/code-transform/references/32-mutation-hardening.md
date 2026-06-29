# Mutation Hardening — Test Quality Verification

> **Based on**: Meta ACH (arXiv:2501.12862, FSE 2025) — 73% engineer acceptance.

## The Problem with Coverage
100% line coverage ≠ good tests. Mutation testing reveals truth: mutate code (change + to -), do tests fail?
- Tests fail → mutant "killed" → tests good
- Tests pass → mutant "survived" → tests shallow

## Meta ACH Innovation
Instead of 1000 random mutants, generate few concern-specific "super bug" mutants:
- security: remove validation, weaken auth, expose secrets
- correctness: flip operators, remove edge case handling
- performance: bypass cache, add unnecessary work
- concurrency: remove locks

## Usage
```bash
python3 scripts/mutation_harden.py --target src/auth.py --concern security
python3 scripts/mutation_harden.py --target src/calc.py --concern all
```

## Results
```
Total mutants: 5
Killed: 4
Survived: 1
Mutation score: 80%
⚠️ 1 survived — add tests: remove-zero-check
```
Target: >80% on critical paths.

## Meta ACH 4-Stage Pipeline
1. Concern description (free-text: privacy, security, etc.)
2. "Make a fault" agent generates super bugs with `// MUTANT <START>` / `// MUTANT <END>` delimiters
3. Equivalence detector agent (0.95/0.96 precision/recall with preprocessing)
4. "Make a test to catch fault" agent generates tests that kill mutants

## 4 Guarantees
1. Compiles
2. Passes on original correct code
3. Kills at least one mutant
4. Relevant to concern

## Critical Finding
48.5% of tests would have been discarded by line-coverage criteria alone — mutation testing finds bugs coverage can't.

## Integration
Phase 6 (TESTING MASTERY) — after Step 6.2 and 6.6:
```bash
python3 scripts/mutation_harden.py --target src/auth.py --concern security
python3 scripts/mutation_harden.py --target src/payment.py --concern correctness
```
If mutation score <80%, return to Step 6.2 and strengthen tests.
