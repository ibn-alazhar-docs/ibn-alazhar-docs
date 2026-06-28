# Blueprint Template — Prioritized Transformation Plan

> Copy this for BLUEPRINT.md. Fill in after Phase 2 (PRIORITIZE).

# Code Transform — Blueprint

**Project**: <!-- project name -->
**Date**: <!-- YYYY-MM-DD -->
**Based on**: AUDIT_REPORT.md
**Total findings**: <!-- count -->

## Priority Matrix

| Priority | Severity    | Effort | Action                 |
| -------- | ----------- | ------ | ---------------------- |
| P0       | Critical    | Low    | Fix NOW (this session) |
| P1       | Critical    | High   | Next session           |
| P2       | High        | Low    | Quick win (batch)      |
| P3       | High        | High   | Dedicated session      |
| P4       | Medium      | Low    | When convenient        |
| P5       | Medium/High | High   | Backlog                |

## P0 — Immediate (This Session)

- [ ] **[D4-C1]** `file:line` — <!-- fix description -->
      **Recipe**: <!-- fix: parameterize SQL -->
      **Verification**: <!-- tests + security scan -->
      **Commit**: `security: <!-- message -->`

- [ ] **[D7-C1]** `file:line` — <!-- fix description -->

## P1 — Urgent (Next Session)

- [ ] **[D1-C1]** `file:line` — <!-- fix description -->
      **Recipe**: <!-- refactor: extract layer -->
      **Estimated sessions**: <!-- 2-3 -->

## P2 — Quick Wins (Batch Together)

- [ ] **[D2-H1]** Add missing index on `orders.user_id`
- [ ] **[D5-H1]** Fix N+1 query in user order loading
- [ ] **[D7-H1]** Extract method from 80-line function
- [ ] **[D9-M1]** Add README

## P3 — Strategic (Dedicated Sessions)

- [ ] **[D1-H1]** Split God Service into 4 focused services
      **Sessions**: 3-5
      **Order**: 1. Extract NotificationService → 2. Extract ReportService → 3. Extract PaymentService → 4. Clean up UserService

## P4 — When Convenient

- [ ] **[D8-M1]** Add CI security scanning
- [ ] **[D6-M1]** Replace hardcoded colors with design tokens

## P5 — Backlog

- [ ] **[D3-L1]** Improve test coverage from 45% to 70%
- [ ] **[D10-L1]** Introduce tRPC for end-to-end type safety

## Session Plan

| Session | Items                            | Estimated Time     |
| ------- | -------------------------------- | ------------------ |
| 1       | P0 items + P2 quick wins         | <!-- 2-4 hours --> |
| 2       | P1 items (start)                 | <!-- 4 hours -->   |
| 3       | P1 items (continue) + P3 (start) | <!-- 4 hours -->   |
| 4       | P3 (continue)                    | <!-- 4 hours -->   |
| 5       | P4 items + verify                | <!-- 2 hours -->   |

## Progress Tracking

After each session, update PROGRESS.md (see `assets/progress_template.md`).
