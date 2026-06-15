# Review Pipeline

## Review Types

1. **Architecture Review** — Design decisions, ADRs, system boundaries
2. **Code Review** — Correctness, performance, security, style
3. **Security Review** — OWASP Top 10, threat modeling, dependency audit
4. **QA Review** — Test coverage, integration tests, E2E tests
5. **RTL/Accessibility Review** — Arabic RTL, WCAG 2.2 compliance
6. **Frontend Polish Review** — Visual consistency, brand alignment
7. **Spec Review** — Spec correctness, completeness, phase alignment

## Process

1. Author submits PR with spec reference
2. Pipeline runs automated checks (lint, typecheck, test, security scan)
3. Relevant reviewers assigned
4. Feedback addressed iteratively
5. Approval gate passed
6. Merge

## SLA

- Minor changes: 4h review window
- Major features: 24h review window
- Security fixes: Priority, 2h review window
