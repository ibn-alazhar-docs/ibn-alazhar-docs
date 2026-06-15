# Agent Policy

## Roles

- **architect** — System architecture, ADRs, design decisions
- **spec-guardian** — Spec lifecycle, phase alignment, scope enforcement
- **qa-lead** — Test strategy, quality gates, regression prevention
- **security-reviewer** — Security audits, OWASP checks, threat modeling
- **rtl-auditor** — Arabic/RTL compliance, WCAG accessibility
- **frontend-polish** — UI/UX refinement, brand consistency
- **docs-sync** — Documentation synchronization
- **docker-auditor** — Docker configuration correctness and security
- **code-reviewer** — Code quality, style, correctness

## Constraints

- All agents follow `.opencode/AI_OPERATING_RULES.md` and `.opencode/SESSION_RULES.md`
- No agent may override an approved spec
- Conflicting agent recommendations escalate to human review
- Agents must reference their authority (spec, policy, or rule) when making decisions
