# AGENT_RULES.md — Agent Orchestration Rules

> **Purpose:** Define how agents are organized, activated, and coordinated.
> **Scope:** All agents in `.opencode/agents/core/`.

---

## Agent Roster

| Agent | File | Primary Role |
|-------|------|-------------|
| architect | `agents/core/architect.md` | Architecture, planning, ADRs |
| spec-guardian | `agents/core/spec-guardian.md` | Spec compliance, scope enforcement |
| qa-lead | `agents/core/qa-lead.md` | Testing strategy, test plans |
| security-reviewer | `agents/core/security-reviewer.md` | Security review, threat analysis |
| rtl-auditor | `agents/core/rtl-auditor.md` | RTL and Arabic compliance |
| frontend-polish | `agents/core/frontend-polish.md` | UI quality, brand consistency |
| docs-sync | `agents/core/docs-sync.md` | Documentation synchronization |
| docker-auditor | `agents/core/docker-auditor.md` | Docker and container compliance |

---

## Agent Activation

### Automatic Activation
Agents are automatically activated based on task type:

| Task Type | Activated Agents |
|-----------|-----------------|
| Spec creation | architect, spec-guardian |
| Implementation | architect, spec-guardian |
| Code review | security-reviewer, rtl-auditor (UI), frontend-polish (UI), docker-auditor (infra) |
| UI change | rtl-auditor, frontend-polish |
| Security change | security-reviewer |
| Docker change | docker-auditor |
| Phase gate | architect, spec-guardian, qa-lead |
| Docs update | docs-sync |
| Test plan | qa-lead |

### Manual Activation
Any agent can be manually activated by the user or the orchestrating agent.

### Deactivation
Agents are deactivated when their task is complete.

---

## Agent Coordination

### Orchestration Model
The **architect** agent serves as the primary orchestrator for multi-agent workflows.

### Coordination Rules
1. **Single orchestrator.** One agent coordinates at a time.
2. **Parallel reviews.** Independent reviews run in parallel.
3. **Sequential dependencies.** Dependent reviews run sequentially.
4. **Conflict resolution.** Architect resolves conflicts between agent findings.
5. **Escalation.** Unresolved conflicts escalate to human.

### Review Order
```
1. CI (automated) — always first
2. Security review — parallel with others
3. RTL audit — parallel with others (UI only)
4. Brand audit — parallel with others (UI only)
5. Docker audit — parallel with others (infra only)
6. Spec compliance — parallel with others
7. Human review — last, after all agents
```

---

## Agent Communication

### Communication Channels
- **Session context** — Shared memory within a session.
- **Memory files** — Persistent project memory across sessions.
- **Review outputs** — Written to `reviews/`.
- **Session records** — Written to `sessions/`.

### Communication Rules
1. Agents write findings to review outputs.
2. Agents read memory before acting.
3. Agents update memory when decisions are made.
4. Agents flag conflicts to the orchestrator.
5. Agents do not override each other's findings without justification.

---

## Agent Boundaries

### What Agents Can Do
- Read any file in the repository.
- Write to `.opencode/` files.
- Write to `docs/` files (docs-sync).
- Write to `specs/` files (spec-guardian).
- Write to test files (qa-lead).
- Write to Docker files (docker-auditor).
- Write to CSS/UI files (frontend-polish, rtl-auditor).
- Run bash commands (limited, as defined per agent).
- Activate other agents.
- Escalate to human.

### What Agents Cannot Do
- Write secrets to files.
- Modify production configuration.
- Merge pull requests.
- Deploy to production.
- Override human decisions.
- Delete files without approval.
- Modify unrelated files without justification.
- Claim completion without verification.

---

## Agent Escalation

### Escalation Triggers
| Trigger | Escalates To |
|---------|-------------|
| Agent cannot resolve ambiguity | Human engineer |
| Agent finds security vulnerability | Human engineer + security-reviewer |
| Agent detects scope creep | Human engineer + spec-guardian |
| Agent finds brand violation | Human engineer + frontend-polish |
| Agent finds RTL failure | Human engineer + rtl-auditor |
| Agent finds Docker failure | Human engineer + docker-auditor |
| Agents conflict | Architect → Human engineer |
| Phase gate blocked | Architect → Human engineer |

### Escalation Format
```markdown
## Escalation

- Agent: [agent name]
- Issue: [description]
- Severity: Low | Medium | High | Critical
- Context: [relevant context]
- Recommendation: [agent's recommendation]
- Requires: [what is needed to resolve]
```

---

## Agent Performance

### Quality Indicators
- Accuracy of findings.
- Completeness of reviews.
- Timeliness of responses.
- Consistency across sessions.

### Improvement Loop
1. Track agent findings vs. human review outcomes.
2. Identify patterns of missed issues or false positives.
3. Update agent definitions based on learnings.
4. Update review checklists based on new requirements.

---

## Agent Definition Requirements

Every agent file must include:
- **Role:** What the agent is.
- **Mission:** What the agent achieves.
- **Scope:** What the agent covers.
- **Inputs:** What the agent reads.
- **Outputs:** What the agent produces.
- **Escalation rules:** When and how the agent escalates.
- **Boundaries:** What the agent can and cannot do.
- **Forbidden actions:** What the agent must never do.
- **Workflow participation:** Where the agent fits in the workflow.

See individual agent files in `agents/core/` for details.
