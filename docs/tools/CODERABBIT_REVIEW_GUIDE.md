# CodeRabbit Review Guide — Ibn Al-Azhar Docs

## Purpose

CodeRabbit is used as an automated pull request reviewer for Ibn Al-Azhar Docs.

It must review changes as a senior reviewer, not as a generic linter.

## Project identity

- Product: Ibn Al-Azhar Docs — ابن الأزهر دوكس
- Audience: Azhar students, teachers, and educational teams
- Direction: Arabic-first, RTL-first, Docker-first, spec-driven
- Brand: calm, academic, trustworthy, heritage-modern

## Core rules

1. No code before spec.
2. Phase terminology only. Do not use Sprint terminology.
3. Phase 1 is foundation-only.
4. Do not expand MVP scope.
5. Arabic-first and RTL-first are mandatory.
6. Docker-first local development is mandatory.
7. Conversion and export are separate concepts.
8. Prototype hosting and production hosting are separate concepts.
9. Do not claim free-forever hosting.
10. Do not store secrets in files.
11. Architecture changes require ADR updates.
12. API changes require API contract/spec updates.
13. DB changes require Prisma schema and migration notes.
14. UI pages require loading, empty, error, and success states.
15. Every user-facing flow must consider mobile, accessibility, and RTL.

## Review priorities

### P0 — Blockers

- Secrets committed.
- Auth/session security issue.
- File privacy issue.
- Unsafe upload handling.
- Destructive data operation without safeguards.
- Architecture change without ADR.
- DB change without migration notes.
- Scope creep into non-Phase-1 work.
- English-first UI in Arabic-first surfaces.
- LTR-only layout assumptions.

### P1 — Must fix before merge

- Missing tests for meaningful behavior.
- Missing error/loading/empty states.
- Missing env documentation.
- Broken Docker-first local workflow.
- Inconsistent brand tokens.
- Accessibility issues in core flows.
- TypeScript strictness violations.

### P2 — Should fix

- Duplicate docs.
- Weak naming.
- Overly complex abstractions.
- Inconsistent copy.
- Minor visual polish issues.
- Non-critical performance concerns.

## Frontend review checklist

- RTL layout is natural.
- Arabic copy is native and clear.
- Cairo font is used.
- Primary actions use #16A34A.
- Gold #CA8A04 is restrained.
- Text uses #1F2937 or accessible dark equivalents.
- Focus states are visible.
- Components are keyboard-friendly.
- Mobile layout works.
- Loading/empty/error/success states exist.
- No fake analytics cards.
- No generic AI SaaS gradients.
- No random glassmorphism.

## Backend review checklist

- Auth boundaries are explicit.
- File ownership is enforced.
- Upload validation exists.
- Size limits exist.
- Logs do not expose document contents.
- Jobs are idempotent where needed.
- Retries and failure states are defined.
- Conversion and export remain separate.

## Documentation review checklist

- No contradictions with CLAUDE.md.
- No contradictions with Spec Kit constitution.
- Phase 1 remains foundation-only.
- Hosting claims are realistic.
- Free-first does not mean free-forever.
- All decisions are traceable.
- ADRs exist for major architecture choices.

## Expected review style

- Be specific.
- Cite file paths and exact issues.
- Prefer actionable fixes.
- Do not nitpick style if not harmful.
- Do not suggest broad rewrites unless necessary.
- Separate blockers from suggestions.
