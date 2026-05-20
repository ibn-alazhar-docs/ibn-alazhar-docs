# Runtime: Escalation Rules

> **File:** `runtime/escalation-rules.md`
> **Purpose:** Define escalation logic for all runtime scenarios.

---

## Escalation Hierarchy

```
Agent → Architect → Human Engineer → Product/Tech Lead
```

---

## Escalation by Category

### Spec Escalation

| Issue | Escalates To | Urgency |
|-------|-------------|---------|
| Spec ambiguity | Architect | Medium |
| Spec incompleteness | Spec-guardian | Medium |
| Spec conflict with another spec | Architect | High |
| Spec requires scope change | Human engineer | High |
| Spec requires MVP change | Product Lead + Tech Lead | Critical |

### Security Escalation

| Issue | Escalates To | Urgency |
|-------|-------------|---------|
| Low severity finding | Security-reviewer → Human | Low |
| Medium severity finding | Security-reviewer → Human | Medium |
| High severity finding | Security-reviewer → Human (block merge) | High |
| Critical vulnerability | Security-reviewer → Human (immediate) | Critical |
| Secret detected | Security-reviewer → Human (rotate immediately) | Critical |

### RTL Escalation

| Issue | Escalates To | Urgency |
|-------|-------------|---------|
| Minor RTL issue | RTL-auditor → Human | Low |
| Arabic rendering issue | RTL-auditor → Human | Medium |
| RTL direction broken | RTL-auditor → Human (block merge) | High |
| Responsive RTL broken | RTL-auditor → Human | High |

### Brand Escalation

| Issue | Escalates To | Urgency |
|-------|-------------|---------|
| Minor styling issue | Frontend-polish → Human | Low |
| Wrong brand color | Frontend-polish → Human (block merge) | Medium |
| Wrong font | Frontend-polish → Human (block merge) | Medium |
| Design quality below standard | Frontend-polish → Human | High |

### Docker Escalation

| Issue | Escalates To | Urgency |
|-------|-------------|---------|
| Minor config issue | Docker-auditor → Human | Low |
| Health check failing | Docker-auditor → Human | Medium |
| Container won't start | Docker-auditor → Human (block) | High |
| Security issue in Docker config | Docker-auditor → Security-reviewer → Human | Critical |

### Phase Gate Escalation

| Issue | Escalates To | Urgency |
|-------|-------------|---------|
| Deliverable incomplete | Architect → Human | Medium |
| Blocking issue found | Architect → Human | High |
| Phase scope dispute | Architect → Product Lead | High |
| Gate review contested | Architect → Product Lead + Tech Lead | Critical |

### Model Escalation

| Issue | Escalates To | Urgency |
|-------|-------------|---------|
| Primary model unavailable | Fallback model | Low |
| All models unavailable | Human (pause non-urgent work) | Medium |
| Model produces incorrect output | Retry with different model | Medium |
| Persistent model failure | Human | High |

### Agent Escalation

| Issue | Escalates To | Urgency |
|-------|-------------|---------|
| Agent conflict with another agent | Architect | Medium |
| Agent cannot resolve ambiguity | Human | Medium |
| Agent finds critical issue | Human | High |
| Agent definition missing | Human (populate agent) | Low |

---

## Escalation Format

All escalations should follow this format:

```markdown
## Escalation

- Category: [spec/security/rtl/brand/docker/phase/model/agent]
- Issue: [description]
- Severity: Low | Medium | High | Critical
- Escalated From: [agent name]
- Escalated To: [recipient]
- Context: [relevant context]
- Recommendation: [escalating agent's recommendation]
- Requires: [what is needed to resolve]
- Timestamp: [when escalated]
```

---

## Escalation Resolution

| Resolution | Action |
|------------|--------|
| Resolved | Document resolution, close escalation |
| Deferred | Document deferral reason, set review date |
| Rejected | Document rejection reason, close escalation |
| Escalated Further | Escalate to next level in hierarchy |
