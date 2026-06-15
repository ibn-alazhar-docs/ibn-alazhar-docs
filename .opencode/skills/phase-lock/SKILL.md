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

Phase 1D — OCR Burn-in + Real-World Stress Testing

### Phase 1D Allowed

- Real-world Arabic OCR simulation and comparison
- Memory/resource stress testing
- Pipeline throughput benchmarking
- Cleanup quality regression auditing
- Failure taxonomy expansion
- Operational safety review
- Surya OCR provider API updates
- Related documentation

### Phase 1D Blocked

- AI reconstruction or LLM cleanup
- Distributed inference or GPU infrastructure
- Multimodal systems
- New product features outside OCR reliability
- Auth, folders, accounts, or collaboration
- Production deployment without Phase 2 gate

## Rules

1. Work MUST stay within current phase scope
2. Phase N+1 does NOT start until Phase N passes gate review
3. Phase scope changes require documented approval
4. Tasks outside phase scope are REJECTED, not deferred

## Gate Review

See `.opencode/PHASE_GATES.md` for full criteria.
