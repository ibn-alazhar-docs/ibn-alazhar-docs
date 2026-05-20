# Review Standard

> **File:** `reviews/REVIEW_STANDARD.md`
> **Purpose:** Define the standard for all review artifacts produced by this runtime.
> **Scope:** Spec reviews, code reviews, security reviews, RTL audits, brand audits, phase gate reviews, runtime reviews.

---

## Review Artifact Requirements

Every review artifact must include:

### 1. Metadata

| Field | Required | Description |
|-------|----------|-------------|
| Review ID | Yes | Unique identifier (e.g., `review-0001-security-auth`) |
| Date | Yes | When the review was performed |
| Type | Yes | Spec, Security, RTL, Brand, Code, Phase Gate, Runtime |
| Reviewer | Yes | Agent name or human name |
| Target | Yes | What was reviewed (file, PR, spec, etc.) |
| Status | Yes | Pass, Fail, Conditional |

### 2. Scope

A clear statement of what was reviewed and what was not:

```markdown
## Scope

- **Reviewed:** [list of files, specs, or changes reviewed]
- **Not Reviewed:** [list of items explicitly excluded from this review]
- **Assumptions:** [any assumptions made during the review]
```

### 3. Findings

Each finding must include:

| Field | Required | Description |
|-------|----------|-------------|
| ID | Yes | Finding identifier within the review (F-001, F-002, etc.) |
| Category | Yes | Security, RTL, Brand, Style, Spec, Performance, etc. |
| Severity | Yes | Critical, High, Medium, Low, Advisory |
| Location | Yes | File path and line number (if applicable) |
| Description | Yes | What the finding is |
| Evidence | Yes | Why it is a finding (code snippet, spec quote, etc.) |
| Recommendation | Yes | How to fix it |

**Finding format:**

```markdown
### F-001: [Finding Title]

- **Category:** [category]
- **Severity:** [severity]
- **Location:** [file:line]
- **Description:** [what the finding is]
- **Evidence:**
  ```
  [relevant code or content]
  ```
- **Recommendation:** [how to fix]
```

### 4. Summary

A summary table of all findings:

```markdown
## Summary

| Finding | Category | Severity | Status |
|---------|----------|----------|--------|
| F-001 | Security | High | Open |
| F-002 | RTL | Medium | Open |
| F-003 | Brand | Low | Advisory |
```

### 5. Verdict

A clear pass/fail/conditional verdict:

```markdown
## Verdict

- **Status:** Pass | Fail | Conditional
- **Required Findings:** [count] — [list if any]
- **Advisory Findings:** [count] — [list if any]
- **Condition:** [if Conditional, what must be met]
```

### 6. Sign-off

```markdown
## Sign-off

- **Reviewer:** [name/agent]
- **Date:** YYYY-MM-DD
- **Confidence:** High | Medium | Low
```

---

## Review Quality Standards

### S-01: Specificity

Findings must be specific, not vague:

- **Bad:** "The code has security issues."
- **Good:** "Line 42 of `src/app/api/upload/route.ts` accepts file uploads without MIME type validation, allowing arbitrary file types."

### S-02: Evidence

Every finding must include evidence:

- **Bad:** "The color is wrong."
- **Good:** "Line 15 of `src/components/Button.tsx` uses `#10B981` (Emerald) instead of `#16A34A` (Primary Green). Brand rule: `memory/brand/brand-rules.md`."

### S-03: Actionability

Every finding must include a fix recommendation:

- **Bad:** "Fix the RTL issue."
- **Good:** "Replace `margin-left: 8px` with `margin-inline-start: 8px` on line 23 of `src/components/Sidebar.tsx` to support RTL layouts."

### S-04: Completeness

Reviews must cover all checklist items:

- If a checklist item is not applicable: mark as N/A with explanation.
- Do not skip checklist items silently.

### S-05: Independence

Reviews must be independent:

- Security review should not be influenced by brand audit results.
- RTL audit should not be influenced by security review results.
- Each review evaluates its own criteria independently.

### S-06: Reproducibility

Another reviewer should be able to reproduce the findings:

- Include file paths and line numbers.
- Include the exact code or content being reviewed.
- Include the criteria being applied (spec, brand rule, security baseline).

---

## Review Severity Definitions

| Severity | Definition | Action Required |
|----------|------------|-----------------|
| **Critical** | Immediate risk to security, data loss, or system integrity. | Block merge. Fix immediately. |
| **High** | Significant issue that affects core functionality or security. | Block merge. Fix before next review. |
| **Medium** | Important issue that affects quality or correctness. | Fix before merge, or document risk acceptance. |
| **Low** | Minor issue that does not affect functionality. | Fix when convenient, or document as accepted. |
| **Advisory** | Suggestion for improvement, not a defect. | Optional. No action required. |

---

## Review Artifact Storage

All review artifacts are stored in:

- `reviews/` — Runtime review outputs.
- `specs/<NNN>-<name>/review.md` — Spec-specific review notes.
- PR comments — Code review discussion (when GitHub is connected).
- `docs/19_DECISION_LOG.md` — Decisions made during review.

### Naming Convention

```
reviews/review-<NNNN>-<type>-<target>.md
```

Examples:
- `reviews/review-0001-security-auth.md`
- `reviews/review-0002-rtl-dashboard.md`
- `reviews/review-0003-brand-button.md`
- `reviews/review-0004-spec-upload.md`
- `reviews/review-0005-phase-gate-1.md`

---

## Review Template

Use this template for all reviews:

```markdown
# Review: <type> — <target>

> **Review ID:** review-<NNNN>-<type>-<target>
> **Date:** YYYY-MM-DD
> **Reviewer:** <name/agent>
> **Target:** <what was reviewed>

---

## Scope

- **Reviewed:** [...]
- **Not Reviewed:** [...]
- **Assumptions:** [...]

---

## Findings

### F-001: [Title]

- **Category:** [...]
- **Severity:** [...]
- **Location:** [...]
- **Description:** [...]
- **Evidence:** [...]
- **Recommendation:** [...]

---

## Summary

| Finding | Category | Severity | Status |
|---------|----------|----------|--------|
| F-001 | ... | ... | ... |

---

## Verdict

- **Status:** Pass | Fail | Conditional
- **Required Findings:** [count]
- **Advisory Findings:** [count]
- **Condition:** [if applicable]

---

## Sign-off

- **Reviewer:** [...]
- **Date:** YYYY-MM-DD
- **Confidence:** High | Medium | Low
```

---

## Review Anti-Patterns

| Anti-Pattern | Problem | Fix |
|--------------|---------|-----|
| Vague findings | Cannot act on the finding | Be specific with evidence and location |
| Missing evidence | Finding cannot be verified | Include code snippets, spec quotes, or screenshots |
| No recommendation | Reviewer identifies problem but not solution | Always include a fix recommendation |
| Skipped checklist items | Incomplete review | Mark N/A with explanation, do not skip |
| Influenced reviews | One review affects another | Keep reviews independent |
| Over-severity | Marking everything as Critical | Use severity definitions consistently |
| Under-severity | Marking critical issues as Low | Use severity definitions consistently |
| No sign-off | Review has no accountability | Always sign off with name, date, confidence |

---

**Last Updated:** 2026-05-20
**Next Review:** After first production review or Phase 1 gate review
