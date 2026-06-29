# Bootstrap Injection — Session-Start + Post-Compaction Discipline

> **Based on**: obra/superpowers `using-superpowers` pattern (2M installs, #1 workflow family on skills.sh).

## The Problem

Skills on disk are inert. Without a bootstrap mechanism:
- Agent doesn't know to check for skills before acting
- After context compaction, the agent forgets ALL rules
- "Simple" tasks bypass the workflow (no audit, no constraints check)
- Discipline degrades over long sessions

**The single most expensive failure observed** (obra/superpowers): re-dispatching completed tasks after compaction because the agent lost its place.

## The Solution: Bootstrap Injection

### Architecture (two-tier)

```
Tier 1: Bootstrap skill (using-code-transform)
  → Force-injected at session start
  → Re-injected after every compaction
  → ~120 lines, always present in context
  → Teaches: "check for phases before ANY action"

Tier 2: All other phases/references
  → Discovered on-demand via Skill tool
  → Loaded just-in-time when relevant
  → Progressive disclosure (50-100 tokens at startup)
```

### Hook Configuration

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup|clear|compact",
        "hooks": [{
          "type": "command",
          "command": "\"${CLAUDE_PLUGIN_ROOT}/hooks/session-start\"",
          "async": false
        }]
      }
    ]
  }
}
```

**Critical**: The matcher `"startup|clear|compact"` is the entire compaction-survival mechanism:
- `startup` → fires on new session
- `clear` → fires on `/clear`
- `compact` → **fires after every context compaction**

### Injection Script

The `hooks/session-start` script:
1. Reads `skills/using-code-transform/SKILL.md`
2. Wraps it in `<EXTREMELY_IMPORTANT>` tags
3. Emits platform-specific JSON (Claude Code, Cursor, or generic)
4. The platform injects this as additional context

### Bootstrap Content

The bootstrap (`using-code-transform/SKILL.md`) contains:
- **The 1% Rule**: "Even 1% chance a phase applies → invoke it"
- **Rationalization Red Flags table**: blocks common escape hatches
- **Instruction Priority**: User > code-transform > system prompt
- **9-phase workflow summary**: always visible
- **Durable Progress**: ledger pattern for compaction survival
- **Acceptance Test**: "make this perfect" → MUST start with Phase 0

### Why This Works

1. **Discipline skill form** (not soft guidance): prohibition + rationalization table + red flags. Empirically outperforms "consider using..." language.
2. **Safety valve**: "If invoked phase is wrong, you don't need to use it" — prevents paralysis.
3. **Re-injection after compaction**: the `compact` matcher ensures rules survive the #1 context-loss event.
4. **Two-tier economy**: bootstrap is small (~120 lines); everything else is on-demand.

## Durable Progress Ledger

```
.code-transform/progress.md
```

Format (append-only, one line per completed transform):
```
Phase 2: AUDIT complete (5 dimensions, 23 findings)
Phase 3: PRIORITIZE complete (P0: 3, P1: 5, P2: 8)
Phase 4: D4-C1 SQL injection fix complete (commit abc1234, verified by security_scan.sh)
Phase 4: D2-H1 N+1 query fix complete (commit def5678, verified by tests)
```

**Why files survive compaction**: compaction summarizes conversation memory; files on disk are untouched. The ledger is the recovery map after compaction.

**Dual source of truth**: ledger + `git log`. If ledger is destroyed (`git clean -fdx`), recover from git history.

## Acceptance Test

> Open a clean session and say "make this codebase perfect." A working bootstrap auto-triggers Phase 0 (INTAKE) before any code changes.

**If the agent doesn't start with INTAKE, the bootstrap has failed.**

## Anti-Patterns

1. ❌ Soft language ("consider using phases") — empirically fails under pressure
2. ❌ No `compact` matcher — bootstrap survives startup but dies after first compaction
3. ❌ Bootstrap too large — burns context; keep under 150 lines
4. ❌ No rationalization table — agent finds escape hatches ("I need more context first")
5. ❌ No safety valve — 1% rule without "you don't have to use if wrong" causes paralysis
6. ❌ Relying on conversation memory — "I remember what we did" fails after compaction

## Integration with Dragon Protocol

The bootstrap composes with the Dragon Protocol:

```
Bootstrap (session start) → "check phases before acting"
  ↓
Dragon TRIAGE → classifies the task
  ↓
Phase selection → invoke relevant phase(s)
  ↓
Dragon 11-phase loop → execute with verification
  ↓
Bootstrap (after compaction) → re-inject rules
```

## References

- obra/superpowers `using-superpowers` SKILL.md (the canonical pattern)
- obra/superpowers `hooks/hooks.json` (the hook configuration)
- Anthropic "Effective Context Engineering" (Sep 2025) — compaction + note-taking + subagent isolation
- Claude Code 5-layer shaper (arXiv:2604.14228) — `compact` event triggers SessionStart hook
- `skills/using-code-transform/SKILL.md` — our bootstrap implementation
- `hooks/hooks.json` — our hook configuration
- `hooks/session-start` — our injection script
