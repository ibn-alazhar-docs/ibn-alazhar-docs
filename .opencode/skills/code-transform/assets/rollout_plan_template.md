# ROLLOUT_PLAN.md — Staged Deployment & Rollback Strategy

## 1. Transformation Identity
- **Name**: [e.g., "Extract OrderRepository"]
- **Commit/PR**: [hash/URL]
- **Risk level**: [Critical/High/Medium/Low]
- **Target deploy**: [YYYY-MM-DD HH:MM TZ]

## 2. Pre-Rollout Checklist
### Code Readiness
- [ ] All tests pass (unit + integration + E2E)
- [ ] Mutation score >70% on changed code
- [ ] Lint + type-check clean
- [ ] Code reviewed and approved

### Infrastructure
- [ ] Feature flag created (if using flag rollout)
- [ ] DB migrations applied to staging (verified reversible)
- [ ] Monitoring dashboards updated
- [ ] Alerts configured for new failure modes
- [ ] Runbook updated

### Team
- [ ] On-call engineer briefed
- [ ] Customer support notified (if user-visible)
- [ ] Rollback drill performed in staging

## 3. Rollout Strategy (pick one)
### Strategy A: Feature Flag (recommended)
```
Stage 0: Deploy flag OFF → soak 1-24h
Stage 1: Internal users → 1-7 days
Stage 2: Canary 1-5% → 24-48h
Stage 3: Ramp 10% → 25% → 50% → 75% → 4-24h per step
Stage 4: 100% → monitor 24-48h → schedule flag removal
```

### Strategy B: Blue-Green
Deploy to "green" → smoke test → route 10% → 50% → 100% → blue stays warm for rollback

### Strategy C: Canary (K8s)
Deploy 1 pod → route 1% → 5% → 25% → 50% → 100%

### Strategy D: Rolling (stateless)
Deploy 25% → 50% → 100%. Cannot use for breaking schema changes.

### Selection
```
Backward-compatible? → YES → Reversible <5 min? → YES → High-risk? → YES → Feature Flag/Shadow
                                                    → NO → Blue-Green/Canary/Rolling
                   → NO → Expand/contract + Feature Flag
```

## 4. Rollback Plan
### Rollback IMMEDIATELY if:
- Error rate >2x baseline for >5 min
- p95 latency >2x baseline for >5 min
- Any data loss or integrity issue
- Security incident
- Customer-visible outage
- Critical flow broken

### Rollback Procedure
**Feature Flag**: Toggle flag OFF (<30 seconds). Monitor 15 min.
**Blue-Green**: Switch LB back to "blue". Green stays for forensics.
**Canary/Rolling**: `kubectl rollout undo deployment/<name>`.

**DB Migrations**: Expand (safe to keep) / Migrate (rollback = stop writing to new) / Contract (CANNOT roll back — restore from backup).

### Rollback Drill (mandatory for high-risk)
Before deploying: apply change in staging → run rollback → verify staging returns to pre-change state. **If rollback fails in staging → DO NOT deploy.**

## 5. Monitoring During Rollout
| Metric | Threshold | Action |
|--------|-----------|--------|
| Error rate (5xx) | >baseline +0.1% | Pause |
| Error rate (5xx) | >2x baseline | Rollback |
| p95 latency | >2x baseline | Rollback |
| Support tickets | >2x normal | Pause |

## 6. Post-Rollout Verification
### T+1 hour: metrics within thresholds, no new alerts, smoke tests pass
### T+24 hours: error rate trending to baseline, no support escalations
### T+7 days: no regressions, feature flag removed (no toggle debt), runbook finalized

## Quick Reference
| Risk | Strategy | Soak | Rollback |
|------|----------|------|----------|
| Critical (payment, auth) | Flag + shadow | 24-48h | Toggle flag |
| High (core flow) | Flag | 12-24h | Toggle flag |
| Medium (internal API) | Canary/blue-green | 4-12h | Traffic switch |
| Low (refactor) | Rolling | 1h | kubectl undo |

**The rule**: If you can't write a rollback plan, you can't ship the change.
