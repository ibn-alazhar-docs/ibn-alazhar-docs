# DevOps Audit — CI/CD, IaC, Deployment, Observability

> Read this during Dimension 8 (DevOps) of the AUDIT phase.

## Audit Checklist

```
[ ] Is there a CI pipeline (GitHub Actions, GitLab CI, Jenkins)?
[ ] Does CI run: lint → build → test → security scan?
[ ] Is there a CD pipeline (auto-deploy on merge to main)?
[ ] Is deployment zero-downtime (blue-green, canary, rolling)?
[ ] Is infrastructure defined as code (Terraform, Pulumi, CloudFormation)?
[ ] Are there health checks (liveness, readiness)?
[ ] Is there structured logging (JSON with trace_id)?
[ ] Are there metrics (Prometheus, Datadog)?
[ ] Is there tracing (OpenTelemetry, Jaeger)?
[ ] Are secrets in a secret manager (not in code/env files)?
[ ] Are there feature flags for risky deployments?
[ ] Is there automatic rollback on failure?
```

## CI/CD Pipeline Quality

### Good Pipeline Stages
```yaml
# .github/workflows/ci.yml
jobs:
  lint:        # fast, runs first
  test:        # parallel with lint
  build:       # needs lint + test
  security:    # scan for vulnerabilities
  e2e:         # only on staging deploy
```

### Check for Missing Steps
```
[ ] Lint (eslint, ruff, golangci-lint)
[ ] Type check (tsc --noEmit, mypy)
[ ] Unit tests
[ ] Integration tests
[ ] Build (compile, bundle)
[ ] Security scan (Semgrep, Snyk, Dependabot)
[ ] Bundle size check (frontend)
[ ] Preview deployment (staging)
```

## IaC Quality

### Terraform Checks
```
[ ] Are resources in modules (not monolithic main.tf)?
[ ] Are variables used (not hardcoded AMIs, instance types)?
[ ] Is state remote and locked (S3 + DynamoDB)?
[ ] Is `terraform plan` run in CI before apply?
[ ] Are resources tagged (Environment, Owner, Project)?
```

## Deployment Safety

### Zero-Downtime Strategies
- **Blue-Green**: two environments, switch traffic
- **Canary**: deploy to 1% → 10% → 50% → 100%, monitor
- **Rolling**: replace instances one at a time
- **Feature flags**: deploy code dark, enable gradually

### Rollback Plan
```
[ ] Can you rollback in <5 minutes?
[ ] Is rollback tested (not just documented)?
[ ] Are database migrations reversible?
[ ] Are feature flags used for instant rollback?
```

## Observability

### The Three Pillars
1. **Logging**: structured JSON, with trace_id, search-able
2. **Metrics**: counters, histograms, gauges (Prometheus format)
3. **Tracing**: distributed tracing across services (OpenTelemetry)

### Structured Logging
```python
# BAD: unstructured
logger.info(f"User {user_id} placed order {order_id}")

# GOOD: structured
logger.info("order_placed", extra={
    "user_id": user_id,
    "order_id": order_id,
    "trace_id": trace_id,
})
```

## Summary

- **CI**: lint + type-check + test + build + security scan. All on every PR.
- **CD**: zero-downtime deployment (blue-green, canary, rolling). Auto-rollback on failure.
- **IaC**: Terraform/Pulumi for all infrastructure. No clickops. Remote state.
- **Observability**: structured logging + metrics + distributed tracing.
- **Secrets**: never in code. Use secret manager. Scan with gitleaks.
- **DevOps improvements are `ci:`, `chore:`, or `ops:` commits**.
