# Runtime: Tool Permissions

> **File:** `runtime/tool-permissions.md`
> **Purpose:** Define the tool permission model for agents and sessions.

---

## Permission Model Overview

Tools are permissions that control what actions agents can take. Permissions are granted based on agent type and file type.

---

## Tool Categories

| Category | Tools | Default Permission |
|----------|-------|-------------------|
| Read | read, glob, grep | All agents |
| Write | write | Restricted by file type |
| Edit | edit | Restricted by file type |
| Execute | bash | Restricted by agent type |
| Communicate | question | All agents |
| Orchestrate | task, todowrite | All agents |
| Skill | skill | All agents |

---

## File Type Permissions

| File Type | Read | Write | Edit | Delete |
|-----------|------|-------|------|--------|
| Source code (.ts, .tsx, .js, .jsx) | All | Implementation agents only | Implementation agents only | Never without approval |
| Tests (.test.ts, .spec.ts) | All | qa-lead, implementation agents | qa-lead, implementation agents | With approval |
| Docs (.md in docs/) | All | docs-sync, architect | docs-sync, architect | With approval |
| Specs (.md in specs/) | All | spec-guardian, architect | spec-guardian, architect | Never |
| Config (.json, .yaml, .yml) | All | With approval | With approval | Never |
| Runtime (.opencode/) | All | All agents | All agents | Never |
| Memory (.opencode/memory/) | All | All agents | All agents | Never |
| Secrets (.env, .env.*) | Never | Never | Never | Never |
| Docker (Dockerfile, docker-compose*) | All | docker-auditor, with approval | docker-auditor, with approval | Never |
| CSS (.css, .tsx with CSS) | All | frontend-polish, rtl-auditor | frontend-polish, rtl-auditor | With approval |

---

## Agent-Specific Permissions

### architect

| Permission | Scope |
|------------|-------|
| Read | All files |
| Write | Docs, ADRs, runtime files |
| Edit | Docs, ADRs, runtime files |
| Execute | Limited (read-only commands) |

### spec-guardian

| Permission | Scope |
|------------|-------|
| Read | All files |
| Write | Specs, runtime files |
| Edit | Specs, runtime files |
| Execute | Limited (read-only commands) |

### security-reviewer

| Permission | Scope |
|------------|-------|
| Read | All files |
| Write | Review outputs, runtime files |
| Edit | Review outputs, runtime files |
| Execute | Security scan commands |

### rtl-auditor

| Permission | Scope |
|------------|-------|
| Read | All UI-related files |
| Write | CSS fixes, review outputs, runtime files |
| Edit | CSS fixes, review outputs, runtime files |
| Execute | Limited (read-only commands) |

### frontend-polish

| Permission | Scope |
|------------|-------|
| Read | All UI-related files |
| Write | UI/CSS fixes, review outputs, runtime files |
| Edit | UI/CSS fixes, review outputs, runtime files |
| Execute | Limited (read-only commands) |

### docker-auditor

| Permission | Scope |
|------------|-------|
| Read | All Docker-related files |
| Write | Docker fixes, review outputs, runtime files |
| Edit | Docker fixes, review outputs, runtime files |
| Execute | Docker commands (compose, health checks, logs) |

### docs-sync

| Permission | Scope |
|------------|-------|
| Read | All files |
| Write | Docs, memory, runtime files |
| Edit | Docs, memory, runtime files |
| Execute | Limited (file comparison commands) |

### qa-lead

| Permission | Scope |
|------------|-------|
| Read | All files |
| Write | Test files, review outputs, runtime files |
| Edit | Test files, review outputs, runtime files |
| Execute | Test commands (vitest, etc.) |

---

## Permission Enforcement

### Enforcement Rules

1. **Read is universal.** All agents can read any file.
2. **Write is restricted.** Only agents with permission can write to specific file types.
3. **Edit is restricted.** Same as write.
4. **Delete is never allowed** without explicit human approval.
5. **Secrets are never accessible.** No agent can read, write, or edit secret files.
6. **Execute is agent-specific.** Only agents with execution permission can run commands.

### Violation Handling

| Violation | Action |
|-----------|--------|
| Agent writes outside scope | Flag violation, revert change |
| Agent reads secrets | Block access, flag to security-reviewer |
| Agent deletes file | Block deletion, flag to human |
| Agent runs unauthorized command | Block execution, flag to human |

---

## Permission Audit

Permissions should be audited:
- When agent definitions change.
- When new file types are introduced.
- When security policies change.
- Periodically (recommended: weekly).
