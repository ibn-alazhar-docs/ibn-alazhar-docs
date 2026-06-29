# CONSTRAINTS.md — Hard & Soft Constraints (Non-Negotiable)

> **Read BEFORE every transformation in Phase 4.** Violating hard constraint = rollback + escalation.

## Hard Constraints (MUST NOT Violate)

### HC-1: Public API Compatibility
- **Constraint**: [e.g., "GET /api/v1/users/{id} response shape backward-compatible"]
- **Allowed**: add fields, add endpoints, change internals
- **Forbidden**: remove/rename fields, change types, change status codes
- **Verification**: OpenAPI diff (oasdiff)

### HC-2: Database Schema Safety
- **Constraint**: [e.g., "No destructive migrations without expand/contract"]
- **Allowed**: add nullable columns, add tables, add indexes (CONCURRENTLY)
- **Forbidden**: DROP COLUMN, DROP TABLE, ALTER TYPE without dual-write

### HC-3: Deployment Window
- **Constraint**: [e.g., "Production deploys only Tue-Thu 10:00-14:00 EST"]

### HC-4: Release Deadline
- **Constraint**: [e.g., "Production-stable by 2025-03-10"]

### HC-5: Budget
- **Constraint**: [e.g., "New infra < $500/month additional"]

### HC-6: Compliance
- **Constraint**: [e.g., "PCI-DSS: no card data in logs; SOC2 audit trails"]

### HC-7: Tech Stack Lock-in
- **Constraint**: [e.g., "Python 3.11 until 2026"]

### HC-8: External Integrations
- **Constraint**: [e.g., "Stripe webhook contract fixed"]

### HC-9: Team Availability
- **Constraint**: [e.g., "2 devs; PRs <500 lines"]

### HC-10: Data Integrity
- **Constraint**: [e.g., "No data migration that could lose data"]

## Soft Constraints (Prefer to Respect)
### SC-1: New Dependencies — avoid; justify each addition
### SC-2: Test Framework — stay on pytest
### SC-3: PR Size — <500 lines; one logical change per PR
### SC-4: Naming — follow existing conventions

## Constraint Check Protocol (MANDATORY before every transformation)
```
1. READ CONSTRAINTS.md (this file) in full
2. For the planned transformation, check HC-1 through HC-10
3. If ANY hard constraint violated: STOP, escalate to user
4. If soft constraint violated: proceed, document justification
5. Log constraint check in BLUEPRINT entry
```

## Constraint Override Process
1. Document the violation (which, why, alternatives, mitigations)
2. User sign-off (in writing)
3. Update CONSTRAINTS.md with exception entry
4. Mitigation plan (monitoring, rollback, remediation)
5. Post-implementation review

## Why This Matters
Without constraints: ✗ Optimize wrong things ✗ Break production ✗ Over-engineer ✗ Create tech debt ✗ Team loses trust
With constraints: ✓ Respect business reality ✓ Deployable ✓ Agent pauses when uncertain ✓ Compliance maintained
