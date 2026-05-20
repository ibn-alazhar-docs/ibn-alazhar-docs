# REVIEW_PIPELINE.md — Review and Approval Lifecycle

> **Purpose:** Define all review stages, responsible parties, and pass/fail criteria.
> **Scope:** Spec review, code review, design review, security review, RTL review, phase gate review.

---

## Review Architecture

Reviews are layered. Each layer catches different classes of issues. Layers execute in parallel when possible, sequentially when dependencies exist.

```
Spec Review → Phase Gate → Implementation → CI → CodeRabbit → Security → RTL → Brand → Human → Merge
```

---

## Review Types

### 1. Spec Review

**When:** Before phase gate consideration.
**Who:** Spec-guardian agent + human engineer.
**What:** Feature specification completeness and correctness.

#### Checklist
- [ ] Spec is unambiguous and testable
- [ ] Acceptance criteria are defined (Given/When/Then)
- [ ] UI states defined (empty/loading/error/success)
- [ ] Test plan included
- [ ] References correct ADRs
- [ ] Within phase scope
- [ ] Security implications identified
- [ ] RTL/Arabic considerations noted

**Pass:** All checklist items satisfied.
**Fail:** Returned with specific revision notes.

**Template:** `templates/spec-review-template.md`

---

### 2. Phase Gate Review

**When:** Before implementation begins.
**Who:** Architect agent + human approval.
**What:** Phase scope, dependencies, risk, readiness.

#### Checklist
- [ ] All specs reviewed and approved
- [ ] Phase scope defined and locked
- [ ] Dependencies mapped
- [ ] Success criteria defined
- [ ] Risk assessment complete
- [ ] No blocking issues

**Pass:** Phase gate approved, implementation authorized.
**Fail:** Phase deferred, blocking issues must be resolved.

**Template:** `templates/phase-gate-template.md`

---

### 3. CI Review (Automated)

**When:** On every PR.
**Who:** GitHub Actions.
**What:** Lint, typecheck, test, build.

#### Checks
- ESLint — no errors
- TypeScript — no errors (strict mode)
- Vitest — all tests pass
- Build — succeeds

**Pass:** All checks green.
**Fail:** PR blocked until fixed.

---

### 4. CodeRabbit Review (Automated)

**When:** On every PR (after GitHub App setup).
**Who:** CodeRabbit bot.
**What:** Automated code review for security, style, scope.

#### Categories
- **Required findings:** Security, privacy, data loss, broken build, scope creep, spec mismatch.
- **Advisory findings:** Style suggestions, optional refactoring.

**Pass:** No required findings, or all required findings addressed.
**Fail:** Required findings unresolved.

**Note:** CodeRabbit does not override Arabic-first, RTL-first, Phase 1 scope lock, Docker-first, or Spec Kit source-of-truth.

---

### 5. Security Review

**When:** On every PR with code changes.
**Who:** Security-reviewer agent.
**What:** Security baseline compliance.

#### Checklist
- [ ] No secrets in code or config
- [ ] Input validation present (Zod)
- [ ] Output encoding present
- [ ] Auth checks in place
- [ ] Rate limiting considered
- [ ] SQL injection prevented (Prisma)
- [ ] XSS prevented (CSP, encoding)
- [ ] CSRF prevented (NextAuth.js)
- [ ] File upload validation (MIME, signature, size)
- [ ] Share link security (token entropy, expiry)

**Pass:** No security issues found, or all issues addressed.
**Fail:** Security issues must be fixed before merge.

**Reference:** `docs/08_SECURITY_PRIVACY.md`, `docs/ADR/ADR-010-security-baseline.md`

---

### 6. RTL Audit

**When:** On every PR with UI changes.
**Who:** RTL-auditor agent.
**What:** RTL and Arabic compliance.

#### Checklist
- [ ] Direction is RTL by default
- [ ] Text alignment is right for Arabic
- [ ] Flex/grid layouts use logical properties
- [ ] Icons and chevrons flip correctly
- [ ] Scrollbars and overflow work in RTL
- [ ] Arabic text renders correctly (Cairo font)
- [ ] No LTR assumptions in CSS
- [ ] Responsive behavior correct in RTL

**Pass:** All RTL checks pass.
**Fail:** RTL issues must be fixed before merge.

**Reference:** `docs/ADR/ADR-011-arabic-rtl-first.md`

---

### 7. Brand Audit

**When:** On every PR with UI changes.
**Who:** Frontend-polish agent.
**What:** Brand consistency and design quality.

#### Checklist
- [ ] Primary green is `#16A34A` (not `#10B981`)
- [ ] Heritage gold is `#CA8A04`
- [ ] Text gray is `#1F2937`
- [ ] Cairo font is used for Arabic
- [ ] Design tokens are used (not hardcoded colors)
- [ ] Component styling is consistent
- [ ] Tone is calm academic product
- [ ] Phase 1 scope is respected

**Pass:** Brand consistency verified.
**Fail:** Brand violations must be fixed before merge.

**Reference:** `docs/29_BRAND_IMPLEMENTATION_GUIDE.md`, `memory/brand/brand-rules.md`

---

### 8. Human Review

**When:** After all automated and agent reviews pass.
**Who:** Human engineer with review rights.
**What:** Final approval.

#### Checklist
- [ ] CI passes
- [ ] CodeRabbit required findings addressed
- [ ] Security review passes
- [ ] RTL audit passes
- [ ] Brand audit passes
- [ ] Code follows spec
- [ ] Code is readable and maintainable
- [ ] Tests are adequate

**Pass:** PR approved and merged.
**Fail:** Returned with revision notes.

---

## Review Escalation

| Issue | Escalates To |
|-------|-------------|
| Spec ambiguity | Architect |
| Security concern | Security-reviewer → human |
| Scope creep | Spec-guardian → human |
| Brand violation | Frontend-polish → human |
| RTL failure | RTL-auditor → human |
| Docker failure | Docker-auditor → human |
| Phase gate block | Architect → human |

---

## Review Records

All reviews are recorded in:
- `reviews/` — Review outputs and findings.
- Spec `review.md` — Spec-specific review notes.
- PR comments — Code review discussion.
- `docs/19_DECISION_LOG.md` — Decisions made during review.
