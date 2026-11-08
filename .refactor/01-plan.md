# Ordered unit plan (T010)

Foundations first, leaves before parents, pages last. Sub-units are finalized per-unit in Spec Kit (specify/clarify/plan/tasks/analyze) before any worker is dispatched on that unit. Orchestrator owns the shared layer serially.

## Wave order

| Wave | Units | Why now | Parallel? |
|---|---|---|---|
| 1 | U01 tokens, U02 domain/shared types, U15 database seam, U16 shared package | foundations other units import | U01, U15, U16 parallel; U02 after |
| 2 | U11 queue/storage, U12 OCR/IR/text, U13 outputs, U14 pipeline auxiliaries | pipeline leaves no page depends on | U11–U14 parallel (disjoint subdirs) |
| 3 | U03 composition root, U04 core services, U05 data access | core depends on foundations + pipeline seams | U03→U04→U05 mostly serial; U05 parallel with U04 |
| 4 | U06 API handlers (split per area: auth/docs/conversions/share/tags/stream/health/misc) | routes depend on core | sub-units parallel (distinct route dirs) |
| 5 | U09 client state, U10 platform cross-cutting, U17 OCR worker, U18 export worker | client/workers depend on core | parallel (different dirs) |
| 6 | U07 pages & composition, U08 UI components | pages depend on everything above | U07→U08 serial |
| 7 | Phase 4 integration + Phase 5 audit/delivery (ARCHITECTURE.md, FINAL_REPORT.md) | all units done | orchestrator |

Sizes needing sub-splitting before work: U06 (78 routes → per-area sub-units ≤10 files), U07 (64 pages), U08 (71 files), U12 (45 files), U14 (~15 files). Each sub-unit keeps ≤10 files / ~800 lines per rule.

## Dependencies to record in per-unit specs

- Contract freeze + queue driver rule (U11) gate any work touching drivers/supervisord/docs (contradiction found in T008).
- Upload-limit single-source work (U04/U09/U12 cross-cut) needs a shared constant in U16 first.
- Design tokens (U01) must precede U08 primitive merge work; parity screenshots (T011/T021) bracket U07/U08.

## Parallelism matrix (after wave gates)

- Validators/clients (U10) may run beside pipeline leaves (U11–U14) — disjoint dirs, no shared files.
- Worker consumers (U17/U18) may run beside U06 route sub-units.
- T021 tokens and any page work never share a wave (tokens first).

## Checkpoint before implementation starts

Per unit: `specs/<unit>/{spec.md,plan.md,tasks.md}` exists; `analyze` clean; tasks pass G0–G7 on a throwaway branch with the safety net (T011) green.
