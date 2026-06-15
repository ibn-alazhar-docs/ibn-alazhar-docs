---
name: spec-driven
description: Spec-driven development workflow
---

## What I Do

Enforce spec-driven development: specs before implementation.

## When to Use Me

- Starting new feature work
- Reviewing implementation
- Checking phase compliance
- Auditing documentation

## Workflow

### 1. Spec Creation

- Create `specs/NNN-feature-name/spec.md`
- Include: overview, user stories, acceptance criteria, API endpoints, security
- Update `specs/INDEX.md`

### 2. Spec Review

- Spec must be reviewed and approved
- Status: `draft` → `review` → `approved`

### 3. Implementation

- Follow spec exactly
- No deviations without spec update
- Code must match spec acceptance criteria

### 4. Changes

- Spec changes require re-review
- Implementation changes need spec update first
- Document all decisions

## Rules

- NO implementation without approved spec
- NO scope creep beyond spec
- NO phase jumping without gate review
- Phase terminology: "Phase" not "Sprint"
