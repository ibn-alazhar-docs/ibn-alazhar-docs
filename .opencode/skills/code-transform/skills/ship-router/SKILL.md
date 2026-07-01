---
name: ship-router
description: "Deployment router — picks the right shipping strategy (blue/green, canary, rolling, feature flag, immutable) for the project's stack and risk profile, generates the rollback plan, and enforces deploy-time hard rules. Invoked at Phase 8 (ROLLOUT) whenever a build artifact, container, or function needs to reach production."
license: MIT
metadata:
  version: "1.0"
  author: OmniProject AI
  category: devops
---

# Ship Router

> Owns the deploy-vs-release distinction. Deploys move code to infrastructure; releases expose it to users. Routing the wrong strategy is how Saturday-night pages happen — this sub-skill exists to make sure that doesn't.

## When to Use

| Phase                    | Trigger                                                               | Why                                                  |
| ------------------------ | --------------------------------------------------------------------- | ---------------------------------------------------- |
| Phase 2 — AUDIT          | CENSUS shows a deploy target (K8s, Lambda, Vercel, EC2, mobile store) | Pick the right strategy before writing pipeline code |
| Phase 8 — ROLLOUT        | Always                                                                | Routes the deploy, emits the rollback plan           |
| Phase 9 — ACCEPTANCE     | After first canary slice or blue/green flip                           | Smoke-test the new version before declaring done     |
| Phase 13 — RETROSPECTIVE | After any incident triggered post-deploy                              | Was the strategy right? File a rule update if not    |

**Do NOT use this sub-skill for:** local deploys to a developer laptop, ephemeral preview environments (those are CI artifacts, not releases), or database migrations (route those to `migration-runner`, which itself calls `backup-strategy` first).

## What It Does

1. Reads the project's deploy profile from CENSUS (platform, statefulness, traffic shape, blast radius).
2. Routes to one of five strategies based on the decision tree below.
3. Generates the deploy manifest: pipeline steps, traffic-shift config, health checks, rollback trigger thresholds.
4. Generates the **Rollback Plan**: trigger conditions, rollback command, expected duration, who runs it.
5. Enforces deploy-time hard rules (Friday cutoff, CI-only deploys, no deploys during incidents).
6. Hands off to the platform delegate (Terraform / ArgoCD / Vercel CLI / SAM / EAS) for execution.
7. Emits `ROLLOUT_PLAN.md` with strategy, delegate, rollback plan, and post-deploy verification steps.

## Integration Contract

```
INPUT:
  - census_path: path to CENSUS.md (required)
  - artifact: container image tag, function zip, or build dir (required)
  - strategy: auto|blue-green|canary|rolling|feature-flag|immutable (default auto)
  - target_env: staging|prod (default prod)
  - force: bool (default false — set true to override Friday cutoff, requires --reason)

OUTPUT (JSON to stdout):
  {
    "status": "ok|blocked|error",
    "strategy": "blue-green",
    "delegate": "argocd|terraform|vercel|sam|eas|compose",
    "rollback_plan": {
      "trigger_error_rate_pct": 2.0,
      "trigger_latency_p99_ms": 2000,
      "trigger_data_loss": true,
      "command": "argocd app set api --sync-policy none && kubectl rollout undo deploy/api",
      "expected_duration_seconds": 90
    },
    "deploy_manifest": "deploy/manifest.yaml",
    "rollout_plan_path": "ROLLOUT_PLAN.md"
  }

SIDE EFFECTS:
  - Writes ROLLOUT_PLAN.md to project root
  - Writes deploy/manifest.yaml for the chosen delegate
  - May create a feature-flag entry in the flag provider (LaunchDarkly / Unleash / GrowthBook)
```

## CLI

```bash
# Auto-route a deploy based on CENSUS
python3 scripts/ship_router.py plan \
  --census CENSUS.md \
  --artifact ghcr.io/acme/api:1.4.2 \
  --env prod

# Force a specific strategy
python3 scripts/ship_router.py plan \
  --census CENSUS.md \
  --artifact ghcr.io/acme/api:1.4.2 \
  --strategy canary \
  --canary-steps 5,10,25,50,100

# Execute the deploy (calls the delegate)
python3 scripts/ship_router.py deploy \
  --manifest deploy/manifest.yaml \
  --env prod

# Rollback (manual or triggered by monitoring)
python3 scripts/ship_router.py rollback \
  --manifest deploy/manifest.yaml \
  --reason "p99 latency 2.4s, >2x baseline"
```

## Decision Tree (autonomous)

```
Q: Is the service stateless (no in-memory sessions, no local files)?
  YES → Q: Does the platform support blue/green natively (ALB target groups, K8s, Lambda aliases)?
          YES → STRATEGY = blue-green (instant rollback, full traffic swap)
          NO  → STRATEGY = rolling (K8s default)
  NO (stateful: DB-backed, sticky sessions, local cache)
    → Q: Is the change schema-compatible (additive only)?
        YES → STRATEGY = canary (5% → 25% → 50% → 100%, watch metrics)
        NO  → STRATEGY = feature-flag (decouple deploy from release, gate the change)

Q: Is the change flagged as RISKY (migration, new vendor, rewritten hot path)?
  YES → STRATEGY = feature-flag, regardless of statelessness
          (deploy dark → enable for internal → enable for 1% → 100%)

Q: What platform?
  Kubernetes (Deployment/Service)   → rolling default; blue-green via Argo Rollouts
  Lambda                            → immutable (publish new version, shift alias, keep old)
  Vercel / Netlify                  → blue-green (atomic alias swap, instant rollback)
  EC2 / ECS                         → blue-green via target group swap
  Mobile (iOS/Android)              → staged rollout (1% → 10% → 50% → 100% via store)
  Bare metal / Docker Compose       → rolling, one node at a time

Q: Is it Friday after 15:00 in the on-call's timezone?
  YES → BLOCK unless --force with --reason and P0 severity ticket
        (Friday deploys are how Monday morning incidents are born)
  NO  → proceed

Q: Is there an active P0/P1 incident in progress?
  YES → BLOCK — never deploy during an incident unless the deploy IS the fix
  NO  → proceed

Q: Did the build come from CI (not a local machine)?
  NO → BLOCK — local deploys to prod are forbidden
  YES → proceed
```

## Rollback Triggers

| Trigger              | Threshold                                    | Action                                                                    |
| -------------------- | -------------------------------------------- | ------------------------------------------------------------------------- |
| Error rate           | >2x baseline over 5 min                      | Auto-rollback (canary/blue-green) or manual rollback (rolling)            |
| Latency p99          | >2x baseline over 5 min                      | Hold + investigate; rollback if no fix within 10 min                      |
| Data loss            | Any confirmed (missing rows, dropped events) | Immediate rollback; incident commander paged                              |
| Crash rate (mobile)  | >1% in staged rollout                        | Halt rollout in store console; previous version stays live                |
| Failed health checks | >0 on new version for 2 min                  | Auto-rollback before traffic swap completes                               |
| Manual               | On-call decides                              | Always allowed — better to roll back than to "fix forward" under pressure |

## Failure Modes & Recovery

| Symptom                                           | Cause                                       | Recovery                                                                                 |
| ------------------------------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Blue/green swap: new target failing health checks | Bad image, missing env var, schema mismatch | Do NOT swap traffic; auto-rollback target group to old version; route to `debug-entry`   |
| Canary: error rate spikes at 5%                   | New code has a bug affecting real traffic   | Auto-rollback to 0% on old version within 60s; preserve canary logs for postmortem       |
| Canary: error rate flat but p99 latency 3x        | Resource contention, N+1 query              | Hold canary at current %; investigate; either fix-and-redeploy or rollback               |
| Feature flag stuck on after rollback              | Flag not wired to be killed                 | Always implement flag's "off" path first; emergency `kill switch` URL owned by on-call   |
| Lambda alias shift: 50% of invocations failing    | IAM role mismatch on new version            | Rollback alias to previous version (one command); fix IAM, redeploy                      |
| ArgoCD sync looping: manifest drift               | Someone manually kubectl-applied            | `argocd app sync --force` after removing the manual change; lock down prod cluster       |
| Vercel deploy succeeded but page is 500           | Build-time env var missing                  | Instant rollback via `vercel --prod <previous-deploy-url>`; add missing env in dashboard |
| Mobile staged rollout: crash rate >1% in first 1% | Device-specific bug                         | Halt rollout in store console; previous version remains live for new downloads           |

## Self-Healing Loop

Every deploy, rollback, and post-deploy verification writes a structured record to `OMNIPROJECT_SELF_IMPROVEMENT.md`:

- Strategy chosen, delegate used, deploy duration, whether rollback fired, root cause if rolled back.

`meta-auditor` reads this in Phase 13. Patterns it acts on:

- Same rollback reason ≥3 times across projects → `self-patch-generator` adds a pre-deploy gate (e.g., "always run `knip` before Vercel deploys to catch missing env vars").
- Strategy consistently overridden to canary for services CENSUS flagged stateless → update CENSUS classifier (stateless heuristic too aggressive).
- Canary rollbacks clustered around schema-changing deploys → route all schema changes through `feature-flag` by default.

## Quality Gates

- [ ] `ROLLOUT_PLAN.md` exists with strategy, delegate, rollback triggers, and rollback command.
- [ ] Rollback triggers are concrete: error rate >2x baseline, p99 latency >2x baseline, any data loss, or explicit manual trigger.
- [ ] Health checks pass on the new version before any traffic is shifted.
- [ ] Canary slices have a dwell time ≥5 minutes between shifts (don't go 5% → 100% in 30 seconds).
- [ ] Feature flags have an "off" path tested in CI before the flag is shipped.
- [ ] No deploy happens during an active P0/P1 incident unless the deploy is the fix.
- [ ] No deploy happens Friday 15:00–23:59 on-call timezone without `--force --reason` and a P0 ticket.
- [ ] Deploy originates from CI, not a local machine — verify the artifact's provenance before shipping.
- [ ] Post-deploy smoke test runs against prod URL within 5 minutes of the deploy completing.

## Tools

- **ArgoCD / Flux** — GitOps for Kubernetes; rolling and blue-green via Argo Rollouts.
- **Argo Rollouts** — blue/green and canary primitives for K8s.
- **AWS CodeDeploy** — blue/green and canary for ECS/EC2/Lambda.
- **Lambda aliases + weighted routing** — immutable Lambda deploys.
- **Vercel / Netlify CLI** — atomic alias swap (blue-green) for Jamstack.
- **LaunchDarkly / Unleash / GrowthBook / Statsig** — feature flag providers.
- **Terraform / OpenTofu** — infrastructure-as-code deploys (apply, not replace).
- **Helm / Kustomize** — K8s manifest templating.
- **EAS Submit / fastlane** — mobile staged rollouts to TestFlight / Play Store.
- **Datadog / Grafana / Prometheus** — deploy markers and rollback-trigger metric sources.

## Hard Rules

1. **Always have a written rollback plan before deploying.** No rollback plan = no deploy. The plan includes the trigger conditions, the command, and the expected duration.
2. **Never deploy on Friday after 15:00 on-call timezone.** Friday-afternoon deploys are the leading cause of weekend incidents. Override only with `--force --reason` and a P0 ticket.
3. **Never deploy from a local machine to production.** All prod deploys originate from CI with a signed artifact. Local deploys are for dev and staging only.
4. **Never deploy during an active incident.** The exception is when the deploy IS the fix — and even then, only with incident commander approval.
5. **Rollback is the default response to a failed deploy.** Do not "fix forward" in production; rollback to the last known-good version, fix in CI, redeploy.
6. **Feature flags must have a tested "off" path.** Shipping a flag without testing what happens when it's off is shipping a bug to prod with a button.
7. **Canary dwell time is non-negotiable.** Each traffic slice must observe real traffic for at least 5 minutes before the next shift. Rushing canaries defeats their purpose.
8. **Deploys are observable.** Every deploy emits a deploy marker in monitoring (Datadog / Grafana) so the on-call can correlate metric changes with deploys.
