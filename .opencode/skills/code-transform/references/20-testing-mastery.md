# Testing Mastery — Build Every Type of Test

> **Read this during Phase 6 (TESTING MASTERY).**
> **Golden Rule**: A test's value is measured by the regressions it catches that humans would have missed — not by coverage percentage.

## 27 Test Types

### Tier 1 — Unit & Property (<10ms)
1. Unit Test — single function in isolation
2. Property-Based Test — invariants over 1000s of inputs (Hypothesis/fast-check)
3. Snapshot Test — capture output, compare to baseline (sparingly)

### Tier 2 — Integration & Contract (<1s)
4. Integration Test — multiple units with REAL dependencies (testcontainers)
5. Contract Test — microservices API compatibility (Pact)
6. DB Migration Test — every migration must be reversible
7. Idempotency Test — calling N times = calling once (payments)

### Tier 3 — E2E & Visual (<30s)
8. E2E Test — top 5 user flows; Playwright/Cypress
9. Visual Regression — pixel-diff UI changes
10. Accessibility Test — WCAG 2.2 AA; axe-core

### Tier 4 — Performance & Load (minutes-hours)
11. Performance Test — latency/throughput under load
12. Load Test — peak traffic capacity (k6/Locust)
13. Stress Test — find breaking point
14. Soak Test — multi-hour; catch leaks
15. Spike Test — sudden 10x traffic

### Tier 5 — Continuous (indefinite)
16. Fuzz Test — random/malformed inputs (libFuzzer/Atheris)
17. Chaos Engineering — inject failures (Chaos Mesh)

### Cross-Cutting
18. Smoke Test — post-deploy; 5-10 critical checks
19. Sanity Test — post-build; --version checks
20. Regression Test — one per bug fixed
21. BDD/Acceptance — Given/When/Then; Cucumber
22. Security Test — SAST+DAST+SCA
23. Mutation Test — mutate code, verify tests catch it
24. Golden Master — capture legacy behavior; refactors must match
25. Concurrency/Race — go test -race, loom
26. Resilience Test — circuit breakers, retries, timeouts
27. A/B Test — statistical comparison in production

## Test Shape Decision
- UI-heavy → Trophy (integration + static typing)
- Distributed → Honeycomb (integration-heavy)
- Otherwise → Pyramid (unit-heavy, 70/20/10)

## Fakes over Mocks
```python
# BAD: Mock — breaks on refactor
mock_repo.save.assert_called_once()  # breaks if save() renamed

# GOOD: Fake — tests behavior
repo = FakeUserRepo()
service.create("Alice")
assert repo.find(1) is not None  # behavior, not interaction
```

## 13-Step Workflow
```
6.0  TEST AUDIT → generate_test_suite.py audit
6.1  TEST STRATEGY → generate TEST_PLAN.md
6.2  UNIT TESTS → scaffold + implement; one test per BEHAVIOR; FAKES over MOCKS
6.3  INTEGRATION → testcontainers; real DB; per-test rollback
6.4  CONTRACT → (if microservices) Pact
6.5  E2E → top 5 flows; Playwright
6.6  PROPERTY → Hypothesis/fast-check; 1000+ cases
6.7  MUTATION → mutmut/Stryker; kill surviving mutants; >80% critical
6.8  REGRESSION → one per bug fixed in last 6 months
6.9  SPECIALIZED → perf/fuzz/a11y/visual/security/concurrency
6.10 SMOKE → 5-10 critical endpoint checks
6.11 CI/CD → wire into pipeline with quality gates
6.12 VERIFY → full suite green; mutation >70%
```

## Quality Gates
| Gate | Threshold |
|------|-----------|
| Tests pass | 100% |
| Coverage (changed lines) | >80% |
| Mutation (critical) | >80% |
| Flaky tests | 0 |
| Unit test runtime | <10s total |

## Anti-Patterns
1. Coverage chasers — testing getters for 100%
2. Implementation testers — mocking internals
3. Everything tests — 200 lines, 50 assertions
4. Sleep-based tests — flaky
5. Tests of tests — asserting fixtures
6. Assertion-free tests — "doesn't crash" isn't a test
7. Commented-out tests — delete them
8. Snapshot tests for everything
9. Order-dependent tests
10. Real network in unit tests
