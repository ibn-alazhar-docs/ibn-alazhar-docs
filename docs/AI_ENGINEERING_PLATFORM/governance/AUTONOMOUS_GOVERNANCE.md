# Autonomous Governance

> **Purpose:** Define phase gates, approval checkpoints, scope enforcement, and safety boundaries.
> **Scope:** Governance checks, approval workflows, phase awareness, operational safety.

---

## 1. Governance System Overview

The Governance System enforces operational boundaries throughout the pipeline lifecycle. It ensures that autonomous actions stay within defined limits and that human oversight is present at critical checkpoints.

```
┌──────────────────────────────────────────────────────┐
│                 GOVERNANCE SYSTEM                     │
│                                                       │
│  ┌────────────┐ ┌────────────┐ ┌───────────────────┐ │
│  │ Phase Gate │ │ Scope      │ │ Approval          │ │
│  │ Validator  │ │ Enforcer   │ │ Checkpoints       │ │
│  └────────────┘ └────────────┘ └───────────────────┘ │
│                                                       │
│  ┌────────────┐ ┌────────────┐ ┌───────────────────┐ │
│  │ Safety     │ │ Role       │ │ Policy            │ │
│  │ Boundary   │ │ Permission │ │ Enforcer          │ │
│  │ Checker    │ │ Checker    │ │                   │ │
│  └────────────┘ └────────────┘ └───────────────────┘ │
└──────────────────────────────────────────────────────┘
```

---

## 2. Phase Gate System

### 2.1 Phase Gate Definition

A phase gate is a formal review checkpoint between phases. It verifies that the current phase is complete, correct, and ready for the next phase.

### 2.2 Gate Check Types

| Check Type | Description | When Executed |
|---|---|---|
| `deliverable-check` | All deliverables for current phase are complete | Before phase transition |
| `ci-check` | CI passes on main branch | Before phase transition |
| `docs-check` | Documentation is updated | Before phase transition |
| `memory-check` | Runtime memory is updated | Before phase transition |
| `blocking-issue-check` | No blocking issues exist | Before phase transition |
| `human-approval` | Human engineer approves transition | Before phase transition |

### 2.3 Gate Evaluation

```typescript
interface PhaseGateEvaluation {
  phase: string;
  checks: GateCheck[];
  status: 'passed' | 'failed' | 'conditional';
  blockingIssues: string[];
  conditions: string[];
  evaluatedAt: string;
  evaluator: string;
}

interface GateCheck {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  details: string;
}
```

### 2.4 Gate Decision Types

| Decision | Meaning | Next Action |
|---|---|---|
| `PASS` | All checks passed. | Next phase authorized. |
| `FAIL` | Blocking issues exist. | Next phase blocked. Remediation required. |
| `CONDITIONAL` | Non-blocking issues exist. | Next phase authorized with conditions. |

### 2.5 Gate Enforcement

- Phase gates are **mandatory**. No phase transition occurs without a gate review.
- Gate evaluation is performed by the governance role session.
- Gate results are recorded in the decision log.
- Failed gates create remediation tasks automatically.

---

## 3. Scope Enforcement

### 3.1 Scope Rules

| Rule | Description | Enforcement |
|---|---|---|
| Spec-required | No implementation without approved spec | Checked at pipeline creation |
| Phase-bounded | No work outside current phase scope | Checked at pipeline creation and stage transitions |
| MVP-locked | No MVP scope expansion without approval | Checked at pipeline creation |
| File-bounded | No modification of unrelated files | Checked during implementation |
| Policy-compliant | All runtime policies must be followed | Checked at every stage |

### 3.2 Scope Validation

```
Pipeline Creation
  │
  ▼
Scope Validator
  │
  ├── Check: Is spec approved?
  ├── Check: Is spec in current phase scope?
  ├── Check: Is spec within MVP scope?
  ├── Check: Are dependencies satisfied?
  │
  ├── All pass ──► Pipeline proceeds
  │
  └── Any fail ──► Pipeline rejected
```

### 3.3 Scope Violation Handling

| Violation | Action |
|---|---|
| Unapproved spec | Reject pipeline, emit `GOVERNANCE_FAILED` |
| Out-of-phase work | Reject pipeline, suggest correct phase |
| MVP expansion | Reject pipeline, require scope change approval |
| Unrelated file modification | Flag in review, require justification |
| Policy violation | Block operation, escalate to human |

---

## 4. Approval Checkpoints

### 4.1 Checkpoint Definitions

| Checkpoint | When | Required By | Action |
|---|---|---|---|
| `before_implement` | After planning, before implementation | Human engineer | Review plan, approve/reject |
| `before_merge` | After PR creation, before merge | Human engineer | Review PR, approve/reject |

### 4.2 Approval Flow

```
Checkpoint Reached
  │
  ▼
Emit APPROVAL_REQUESTED event
  │
  ▼
Wait for human response (timeout: 24 hours)
  │
  ├── Approved ──► Emit APPROVAL_GRANTED, proceed
  │
  ├── Denied ──► Emit APPROVAL_DENIED, reject pipeline
  │
  └── Timeout ──► Auto-reject, notify human
```

### 4.3 Approval Configuration

```yaml
governance:
  approval_checkpoints:
    - name: before_implement
      required: true
      timeout_hours: 24
      auto_reject_on_timeout: true
    - name: before_merge
      required: true
      timeout_hours: 24
      auto_reject_on_timeout: true
```

---

## 5. Safety Boundaries

### 5.1 Destructive Operation Rules

| Operation | Allowed | Condition |
|---|---|---|
| Delete files | No | Never allowed autonomously |
| Force push | No | Never allowed autonomously |
| Modify config files | No | Requires human approval |
| Modify secrets | No | Never allowed |
| Modify database schema | No | Requires human approval + ADR |
| Deploy to production | No | Requires human approval |
| Merge to main | No | Requires human approval |

### 5.2 Safety Check Flow

```
Operation Requested
  │
  ▼
Safety Boundary Checker
  │
  ├── Is operation destructive?
  │     │
  │     ├── Yes ──► Is human approval present?
  │     │               │
  │     │               ├── Yes ──► Allow
  │     │               │
  │     │               └── No ──► Block, request approval
  │     │
  │     └── No ──► Allow (within role permissions)
```

### 5.3 Safety Violation Handling

| Violation | Action |
|---|---|
| Attempted destructive operation without approval | Block, emit `SAFETY_VIOLATION`, escalate |
| Attempted secret modification | Block, emit `SAFETY_VIOLATION`, alert |
| Attempted production deployment without approval | Block, emit `SAFETY_VIOLATION`, escalate |

---

## 6. Role-Based Permissions

### 6.1 Permission Matrix

| Action | architect | coder | reviewer | verifier | governance | recovery |
|---|---|---|---|---|---|---|
| Read source code | Yes | Yes | Yes | Yes | Yes | Yes |
| Write source code | No | Yes | No | No | No | Yes |
| Write docs | Yes | No | No | No | No | No |
| Execute shell | Limited | Limited | Limited | Limited | No | Limited |
| Git branch | Read | Create | Read | Read | Read | Create |
| Git commit | No | Yes | No | No | No | Yes |
| Git push | No | No | No | No | No | No |
| Git merge | No | No | No | No | No | No |
| Run tests | No | No | No | Yes | No | No |
| Run lint | No | No | Yes | Yes | No | No |
| Approve gate | No | No | No | No | Yes | No |
| Request approval | No | No | No | No | Yes | No |

### 6.2 Permission Enforcement

- Permissions are enforced by the Tool Router.
- Each session has a role-specific permission set.
- Permission violations are logged and blocked.
- Permission sets are defined in configuration, not hardcoded.

---

## 7. Policy Enforcement

### 7.1 Active Policies

| Policy | Description | Source |
|---|---|---|
| `docs-first` | No implementation without reading specs | `.opencode/policies/` |
| `no-fake-completion` | Never claim completion without verification | `.opencode/policies/` |
| `no-unverified-claims` | Never claim something works without testing | `.opencode/policies/` |
| `brand-consistency` | Use brand colors, fonts, RTL | `.opencode/policies/` |
| `security-baseline` | Follow security rules | `.opencode/policies/` |
| `arabic-first` | Arabic is default language | `.opencode/policies/` |
| `rtl-first` | RTL is default direction | `.opencode/policies/` |
| `docker-first` | Local development in Docker | `.opencode/policies/` |
| `no-secrets` | Never store secrets in files | `.opencode/policies/` |
| `phase-scope` | Do not exceed current phase scope | `.opencode/policies/` |

### 7.2 Policy Check Flow

```
Stage Transition
  │
  ▼
Policy Enforcer
  │
  ├── Check all active policies
  │
  ├── All pass ──► Transition allowed
  │
  └── Any fail ──► Transition blocked
                    │
                    ▼
              Emit POLICY_VIOLATION
                    │
                    ▼
              Escalate to human
```

---

## 8. Governance Events

| Event | Payload | Emitted When |
|---|---|---|
| `GOVERNANCE_PASSED` | `{checks}` | All governance checks passed |
| `GOVERNANCE_FAILED` | `{failures}` | One or more checks failed |
| `PHASE_GATE_PASSED` | `{phase, evaluation}` | Phase gate passed |
| `PHASE_GATE_FAILED` | `{phase, blockingIssues}` | Phase gate failed |
| `APPROVAL_REQUESTED` | `{checkpoint, details}` | Human approval requested |
| `APPROVAL_GRANTED` | `{checkpoint, approvedBy}` | Human approved |
| `APPROVAL_DENIED` | `{checkpoint, deniedBy, reason}` | Human denied |
| `SCOPE_VALIDATED` | `{specId, inScope}` | Scope validation passed |
| `SCOPE_VIOLATION` | `{specId, violations}` | Scope violation detected |
| `SAFETY_VIOLATION` | `{operation, reason}` | Safety boundary violated |
| `POLICY_VIOLATION` | `{policy, details}` | Policy violation detected |

---

## 9. Governance Configuration

```yaml
governance:
  phase_gate:
    required: true
    checks:
      - deliverable-check
      - ci-check
      - docs-check
      - memory-check
      - blocking-issue-check
      - human-approval

  scope:
    enforce_phase_boundary: true
    enforce_mvp_lock: true
    enforce_file_boundary: true

  safety:
    block_destructive_operations: true
    require_approval_for:
      - config_changes
      - schema_changes
      - production_deploy
      - merge_to_main

  approval:
    checkpoints:
      - before_implement
      - before_merge
    timeout_hours: 24
    auto_reject_on_timeout: true

  policies:
    enforce_all: true
    violation_action: block_and_escalate
```

---

## 10. Governance Anti-Patterns

| Anti-Pattern | Problem | Prevention |
|---|---|---|
| Skipping phase gates | Incomplete phases proceed | Mandatory gate enforcement |
| No human approval | Fully autonomous without oversight | Required approval checkpoints |
| Overly permissive roles | Security risk | Strict role-based permissions |
| No safety boundaries | Destructive operations possible | Explicit destructive operation rules |
| Policy enforcement gaps | Rules not consistently applied | Check at every stage transition |
| No escalation path | Blocked pipelines stuck | Defined escalation triggers |
| Silent violations | No visibility into issues | All violations emit events |
