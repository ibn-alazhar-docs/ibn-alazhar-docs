---
name: phase-lock
description: Phase gate enforcement — no phase jumping without review
---

## What I Do

Enforce phase-gated development. No phase transition without gate review.

## When to Use Me

- Starting new work
- Reviewing scope
- Checking if a feature is in scope
- Planning next phase

## Current Phase

Phase 2C-2 — Tags ✅ (Complete)

### Phase 2C-2 Allowed

- repo stabilization
- governance
- docker foundation
- CI baseline
- runtime setup
- auth skeleton
- app shell
- RTL foundation
- design system foundation

### Phase 2C-2 Blocked

- full OCR pipeline changes
- enhanced export features
- sharing and collaboration
- production deployment
- enterprise features

## Rules

1. Work MUST stay within current phase scope
2. Phase N+1 does NOT start until Phase N passes gate review
3. Phase scope changes require documented approval
4. Tasks outside phase scope are REJECTED, not deferred

## Gate Review

See `.opencode/PHASE_GATES.md` for full criteria.
