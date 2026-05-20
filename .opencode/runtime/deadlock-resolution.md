# Runtime: Deadlock Resolution

> **File:** `runtime/deadlock-resolution.md`
> **Purpose:** Define deadlock detection and resolution for agent conflicts and circular dependencies.
> **Scope:** Agent deadlocks, review deadlocks, escalation deadlocks, runtime deadlocks.

---

## What Is a Runtime Deadlock?

A runtime deadlock occurs when two or more runtime entities (agents, reviews, processes) are blocked waiting for each other, and no progress can be made without external intervention.

Unlike a traditional code deadlock (thread A waits for thread B, thread B waits for thread A), runtime deadlocks involve:
- Agents blocking each other's work.
- Reviews with conflicting findings.
- Escalations that cannot be resolved at any level.
- Circular dependencies between outputs.

---

## Deadlock Detection

### D-01: Agent Dependency Deadlock

**Pattern:** Agent A needs output from Agent B, and Agent B needs output from Agent A.

**Detection:**
1. Session detects no progress for > 2 iterations.
2. Both agents report "waiting for X" where X is the other agent.
3. Review order cannot be determined because both are prerequisites.

**Example:**
- Security-reviewer needs RTL-auditor to verify CSS changes don't introduce XSS via inline styles.
- RTL-auditor needs security-reviewer to verify that RTL fixes don't break CSP.

### D-02: Review Conflict Deadlock

**Pattern:** Review A passes only if Review B fails, and Review B passes only if Review A fails.

**Detection:**
1. Two reviews produce mutually exclusive findings.
2. Fixing one review's finding causes the other to fail.
3. No single change satisfies both reviews.

**Example:**
- Security review requires removing inline styles (CSP compliance).
- RTL audit requires inline styles for dynamic direction switching.

### D-03: Escalation Deadlock

**Pattern:** Escalation reaches a level where the escalator and the escalatee are the same entity.

**Detection:**
1. Escalation chain loops back to the originator.
2. No higher authority exists to resolve the conflict.
3. The escalation format has no recipient.

**Example:**
- Architect escalates to human, but human delegates back to architect.
- Human delegates to architect, architect escalates back to human.

### D-04: Spec Dependency Deadlock

**Pattern:** Spec A depends on Spec B being implemented, and Spec B depends on Spec A being implemented.

**Detection:**
1. Dependency graph shows a cycle between specs.
2. Neither spec can start because the other is a prerequisite.
3. Phase gate cannot proceed because both specs are blocked.

**Example:**
- Auth spec requires app shell layout for login page placement.
- App shell spec requires auth spec for protected route middleware.

---

## Deadlock Resolution Protocol

### Step 1: Detect

The orchestrating agent (architect) monitors for deadlock patterns:
- No progress for > 2 iterations.
- Circular wait conditions.
- Mutually exclusive findings.
- Escalation loops.

**Detection triggers:**
- Session records no forward progress.
- Agent reports "blocked waiting for X."
- Review outputs contradict irreconcilably.

### Step 2: Classify

Identify the deadlock type:
- **D-01:** Agent dependency deadlock.
- **D-02:** Review conflict deadlock.
- **D-03:** Escalation deadlock.
- **D-04:** Spec dependency deadlock.

### Step 3: Break

Apply the appropriate resolution strategy:

#### For D-01: Agent Dependency Deadlock

**Strategy: Sequential ordering with assumed output.**

1. Architect determines which agent's output is more foundational.
2. That agent proceeds first with a **provisional output**.
3. The second agent works against the provisional output.
4. After both complete, the first agent validates against the second agent's output.
5. If validation fails: iterate once more with updated assumptions.
6. If validation still fails: escalate to human.

**Example resolution:**
- Security-reviewer goes first (security is foundational).
- Security-reviewer produces provisional finding: "inline styles must be removed."
- RTL-auditor works against this: "use CSS classes with logical properties instead."
- Security-reviewer validates: "CSS classes with logical properties are CSP-compliant."
- Deadlock resolved.

#### For D-02: Review Conflict Deadlock

**Strategy: Priority-based resolution.**

1. Apply review priority order: **Security > RTL > Brand > Style**.
2. The higher-priority review's finding takes precedence.
3. The lower-priority review must find an alternative approach.
4. If no alternative exists: escalate to human for exception.

**Example resolution:**
- Security review requires removing inline styles (priority: High).
- RTL audit requires inline styles (priority: Medium).
- Security wins.
- RTL-auditor finds alternative: use CSS classes with `[dir="rtl"]` selectors.
- Deadlock resolved.

#### For D-03: Escalation Deadlock

**Strategy: Human intervention with tiebreaker authority.**

1. Architect identifies the escalation loop.
2. Documents the loop in session record.
3. Escalates to human with explicit deadlock flag.
4. Human makes a tiebreaker decision.
5. Decision is recorded in `docs/19_DECISION_LOG.md`.
6. Deadlock is broken.

**If human is unavailable:**
- Defer the decision.
- Continue with non-blocked work.
- Re-attempt when human is available.

#### For D-04: Spec Dependency Deadlock

**Strategy: Merge or split.**

1. Architect analyzes the dependency cycle.
2. If specs are tightly coupled: **merge into a single spec**.
3. If specs are loosely coupled: **split to remove the circular dependency**.
4. Update spec dependencies.
5. Re-run spec review.
6. Resume phase gate.

**Example resolution:**
- Auth spec and app shell spec have circular dependency.
- Architect merges them into a single spec: "Auth + App Shell Foundation."
- Single spec is reviewed and implemented together.
- Deadlock resolved.

### Step 4: Verify

After resolution:
1. Verify all previously blocked agents can proceed.
2. Verify all reviews can pass.
3. Verify no new deadlocks were introduced.
4. Log the resolution in session record.

### Step 5: Document

Record the deadlock and resolution:

```markdown
## Deadlock Resolution

- Date: YYYY-MM-DD
- Type: [D-01/D-02/D-03/D-04]
- Entities: [list of agents/reviews/specs involved]
- Detection: [how the deadlock was identified]
- Resolution: [strategy applied]
- Outcome: Resolved | Deferred | Escalated
- Follow-up: [any remaining concerns]
```

---

## Deadlock Prevention

### P-01: Review Ordering

Define a fixed review order to prevent dependency deadlocks:

```
1. CI (automated) — always first, no dependencies
2. Security review — no dependencies on other reviews
3. RTL audit — depends on CI, independent of security
4. Brand audit — depends on CI, independent of security and RTL
5. Docker audit — depends on CI, independent of others
6. Spec compliance — depends on all above
7. Human review — depends on all above
```

By ensuring reviews have clear, non-circular dependencies, D-01 and D-02 deadlocks are prevented.

### P-02: Spec Dependency Graph

Maintain a dependency graph for all specs in a phase:

```
Spec A → Spec B → Spec C
Spec D (independent)
```

Before phase gate, verify the graph has no cycles. If a cycle exists, resolve it (merge or split) before locking the phase.

### P-03: Escalation Chain Validation

Before escalating, verify the escalation chain does not loop:
- Track the escalation path.
- If the path revisits a previous entity: flag as deadlock.
- Break the loop by escalating to the next level.

### P-04: Timeout-Based Detection

Set a progress timeout for each workflow stage:
- If no progress for > 2 iterations: flag potential deadlock.
- Architect investigates.
- If deadlock confirmed: apply resolution protocol.

---

## Escalation Conflict Handling

When escalation itself is the source of conflict:

### E-01: Conflicting Escalation Recommendations

**Scenario:** Two agents escalate the same issue with different recommendations.

**Resolution:**
1. Architect reviews both recommendations.
2. Applies priority order: Security > RTL > Brand > Style.
3. Selects the higher-priority recommendation.
4. Documents the selection.
5. If priorities are equal: escalate to human with both options.

### E-02: Escalation Rejected by Recipient

**Scenario:** Agent escalates to human, human rejects and delegates back.

**Resolution:**
1. Human must provide a clear reason for rejection.
2. Agent re-evaluates with the human's feedback.
3. If agent still cannot resolve: escalate again with updated context.
4. If this loops > 2 times: flag as escalation deadlock (D-03).

### E-03: Escalation Ignored

**Scenario:** Escalation is sent but no response is received.

**Resolution:**
1. Wait for a reasonable timeout (session-dependent).
2. If no response: escalate to the next level in the hierarchy.
3. If no higher level exists: defer the blocked work, continue with non-blocked work.
4. Log the ignored escalation.

---

**Last Updated:** 2026-05-20
**Next Review:** After first deadlock event or Phase 1 gate review
