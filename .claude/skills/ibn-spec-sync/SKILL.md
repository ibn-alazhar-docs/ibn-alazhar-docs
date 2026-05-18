---
name: ibn-spec-sync
description: Use this skill before implementing or changing any feature, API, database model, UI flow, or architecture decision.
---

# Ibn Al-Azhar Docs Spec Sync Skill

Ensure implementation matches the documentation source of truth.

## Source of truth order

1. Brand Implementation Guide
2. MVP Scope Lock
3. PRD
4. UX Spec
5. UI Design System
6. Technical Design
7. API Spec
8. Database Schema
9. Security & Privacy
10. QA Plan
11. DevOps
12. ADRs

## Rules

- No code before spec.
- No API without contract.
- No DB change without schema/migration note.
- No UI page without states.
- No architecture change without ADR.
- No MVP expansion without explicit approval.

## Output

Return:
- Relevant docs checked
- Conflicts found
- Decision needed
- Safe next action
