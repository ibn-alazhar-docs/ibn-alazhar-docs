# Review Template

> **Template:** General review document for code, specs, and audits.
> **Usage:** Copy and fill for each review.

---

# Review: [Type] — [Subject]

- **Date:** YYYY-MM-DD
- **Reviewer:** [name/agent]
- **Type:** Code Review | Spec Review | Security Review | RTL Audit | Brand Audit | Docker Audit | Consistency Audit
- **Subject:** [PR #, spec ID, or description]
- **Status:** PASS | FAIL | ADVISORY

---

## Scope

[What is being reviewed and why]

## Findings

### Required Findings

| #   | Finding   | Severity        | File   | Line   | Description   |
| --- | --------- | --------------- | ------ | ------ | ------------- |
| 1   | [finding] | High/Medium/Low | [file] | [line] | [description] |

### Advisory Findings

| #   | Finding   | File   | Line   | Description   |
| --- | --------- | ------ | ------ | ------------- |
| 1   | [finding] | [file] | [line] | [description] |

## Checklist

- [ ] Checklist item 1
- [ ] Checklist item 2
- [ ] Checklist item 3

## Summary

[Overall assessment, key findings, recommendation]

## Recommendation

- **Approve** — No blocking issues.
- **Request Changes** — Blocking issues must be resolved.
- **Comment** — Advisory findings only.

---

**Reviewed by:** [name/agent]
**Date:** YYYY-MM-DD
