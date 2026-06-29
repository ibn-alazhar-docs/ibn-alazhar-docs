# spec.md — Template

> Copy this for spec.md. Fill in based on project analysis.
> This is the **single source of truth**. Code is its shadow.

## Overview
[1 paragraph: what the system does, who uses it, why it exists]

## User Stories

### US-1: [Story name]
**As a** [role], **I want** [goal], **so that** [benefit].

**Acceptance Criteria:**
- AC-1: Given [context], When [action], Then [result]
- AC-2: Given [context], When [action], Then [result]

**Spec ID:** SP-1

### US-2: [Story name]
**As a** [role], **I want** [goal], **so that** [benefit].

**Acceptance Criteria:**
- AC-1: Given [context], When [action], Then [result]

**Spec ID:** SP-2

## Functional Requirements
- FR-1 (SP-1): [requirement]
- FR-2 (SP-2): [requirement]

## Non-Functional Requirements
- NFR-1: p95 API latency < 200ms
- NFR-2: 99.9% availability
- NFR-3: All endpoints require authentication (except login/register)
- NFR-4: HTTPS only
- NFR-5: Structured JSON logging with trace_id

## Edge Cases
- EC-1: Database unavailable → return 503 with retry-after
- EC-2: Invalid auth token → return 401 with error code
- EC-3: Rate limit exceeded → return 429 with Retry-After
- EC-4: Validation fails → return 422 with field-level errors
- EC-5: External API timeout → return 504 with fallback

## Dependencies
- [list external services, libraries, frameworks]

## Constraints
- [technical, business, compliance constraints]

---
**Total Spec Items:** [N]
