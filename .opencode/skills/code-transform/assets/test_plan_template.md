# TEST_PLAN.md — Testing Strategy

## Codebase Profile
- **Source path**: [path]
- **Application type**: [web|api|mobile|library|cli]
- **Languages**: [list]
- **Test shape**: [Pyramid|Trophy|Honeycomb]

## Test Types Required
### Tier 1 — Unit & Property
- [ ] Unit tests — one per behavior; happy + error + edge cases
- [ ] Property-based tests — for pure functions
- [ ] Snapshot tests — sparingly

### Tier 2 — Integration & Contract
- [ ] Integration (testcontainers)
- [ ] Contract (Pact, if microservices)
- [ ] DB migration tests (reversible)
- [ ] Idempotency tests (payments)

### Tier 3 — E2E & Visual
- [ ] E2E (top 5 flows)
- [ ] Visual regression
- [ ] Accessibility (axe-core, WCAG 2.2 AA)

### Tier 4 — Performance & Load
- [ ] Performance (pytest-benchmark)
- [ ] Load (k6)
- [ ] Stress, Soak, Spike

### Tier 5 — Continuous
- [ ] Fuzz (libFuzzer, Atheris)
- [ ] Chaos (Chaos Mesh)
- [ ] Mutation (mutmut, >80% killed)

### Cross-Cutting
- [ ] Smoke (post-deploy)
- [ ] Regression (one per bug)
- [ ] Security (SAST + DAST + SCA)

## Quality Gates
- All tests pass: 100%
- Coverage (changed lines): >80%
- Mutation (critical): >80%
- Flaky tests: 0
- Unit runtime: <10s

## Anti-Patterns
1. ❌ Coverage chasers  2. ❌ Implementation testers  3. ❌ Everything tests
4. ❌ Sleep-based tests  5. ❌ Tests of tests  6. ❌ Assertion-free tests
7. ❌ Commented-out tests  8. ❌ Snapshot for everything  9. ❌ Order-dependent  10. ❌ Real network
