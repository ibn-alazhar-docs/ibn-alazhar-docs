# MCP Runtime Hooks

> **File:** `mcp/runtime-hooks.md`
> **Purpose:** Define how MCP servers attach to the runtime, what hooks are available, and the attachment model.
> **Scope:** MCP integration architecture, hook points, attachment lifecycle.

---

## MCP Attachment Model

MCP servers are **external tools** that the runtime may use. They are not part of the runtime core. The runtime interacts with MCP servers through defined hook points.

### Core Principle

The runtime operates correctly **without** any MCP servers. MCP servers are optional enhancements that extend runtime capabilities.

```
┌─────────────────────────────────────────┐
│              Runtime Core               │
│  (Boot, Execution, Review, Memory, etc) │
│                                         │
│  ┌───────────┐  ┌───────────┐          │
│  │ Hook: FS  │  │ Hook: DB  │  ...     │
│  └─────┬─────┘  └─────┬─────┘          │
│        │              │                 │
└────────┼──────────────┼─────────────────┘
         │              │
    ┌────▼────┐    ┌────▼────┐
    │ MCP: FS │    │ MCP: DB │
    │ Server  │    │ Server  │
    └─────────┘    └─────────┘
```

---

## Runtime Hook Points

### H-01: Filesystem Hook

**Purpose:** Read, write, search, and manage files.
**Current Status:** Operational (native tools: read, write, edit, glob, grep).
**MCP Extension:** External filesystem MCP server could provide additional capabilities (file watching, diff generation, binary file handling).

**Hook Interface:**
- `read(path)` → content
- `write(path, content)` → success/failure
- `edit(path, search, replace)` → success/failure
- `glob(pattern)` → file list
- `grep(pattern, path)` → matches

### H-02: Shell Hook

**Purpose:** Execute shell commands.
**Current Status:** Operational (native tool: bash).
**MCP Extension:** External shell MCP server could provide sandboxed execution, command history, output streaming.

**Hook Interface:**
- `exec(command, workdir, timeout)` → output + exit code

### H-03: Database Hook

**Purpose:** Query and manage the project database.
**Current Status:** Conceptual (no MCP server connected).
**Planned:** Prisma/PostgreSQL MCP server for schema inspection, query execution, migration management.

**Hook Interface:**
- `query(sql)` → results
- `schema()` → table definitions
- `migrate(direction)` → migration status

### H-04: Docker Hook

**Purpose:** Manage Docker containers and services.
**Current Status:** Conceptual (no MCP server connected).
**Planned:** Docker MCP server for container health, logs, restart, compose management.

**Hook Interface:**
- `containers()` → list + status
- `health(service)` → health status
- `logs(service, lines)` → log output
- `restart(service)` → success/failure

### H-05: Git Hook

**Purpose:** Manage git operations.
**Current Status:** Operational (via bash tool).
**MCP Extension:** External git MCP server could provide diff visualization, branch management, PR operations.

**Hook Interface:**
- `status()` → working tree status
- `diff(target)` → diff output
- `commit(message, files)` → commit hash
- `push(remote, branch)` → success/failure

### H-06: Browser Hook

**Purpose:** Verify UI behavior, RTL, responsiveness.
**Current Status:** Conceptual (no MCP server connected).
**Planned:** Playwright MCP server for browser automation, screenshot comparison, RTL verification.

**Hook Interface:**
- `navigate(url)` → page state
- `screenshot(selector)` → image
- `evaluate(js)` → result
- `checkRtl()` → RTL compliance report

### H-07: Security Hook

**Purpose:** Scan code for security vulnerabilities.
**Current Status:** Conceptual (no MCP server connected).
**Planned:** Security scanning MCP server for dependency audit, secret detection, static analysis.

**Hook Interface:**
- `scan(path)` → vulnerability report
- `secrets(content)` → detected secrets
- `dependencies()` → dependency audit

---

## Hook Permission Model

Each hook has a permission level:

| Hook | Read | Write | Execute | Restricted |
|------|------|-------|---------|------------|
| H-01 Filesystem | All agents | Restricted by file type | N/A | Secrets files |
| H-02 Shell | All agents | N/A | Restricted by agent | Production commands |
| H-03 Database | All agents | With approval | With approval | Schema changes |
| H-04 Docker | All agents | With approval | docker-auditor | Production containers |
| H-05 Git | All agents | With approval | With approval | Force push, branch delete |
| H-06 Browser | All agents | N/A | With approval | Production URLs |
| H-07 Security | All agents | N/A | security-reviewer | Production scans |

---

## Hook Fallback Model

If an MCP server is unavailable, the runtime falls back to native tools:

| Hook | MCP Server | Fallback |
|------|-----------|----------|
| H-01 Filesystem | External FS MCP | Native read/write/edit/glob/grep |
| H-02 Shell | External Shell MCP | Native bash |
| H-03 Database | Prisma/PostgreSQL MCP | Prisma CLI via bash |
| H-04 Docker | Docker MCP | Docker CLI via bash |
| H-05 Git | Git MCP | Git CLI via bash |
| H-06 Browser | Playwright MCP | Manual verification |
| H-07 Security | Security MCP | Manual review + native grep |

---

## Hook Lifecycle

### Registration

1. MCP server is configured in `mcp/` directory.
2. Server status is updated in `mcp/integration-status.md`.
3. Runtime health check verifies server connectivity.
4. Hook is marked as available in session context.

### Attachment

1. Session starts.
2. Boot sequence checks hook availability.
3. Available hooks are loaded into session context.
4. Agents can use hooks according to permission model.

### Detachment

1. MCP server becomes unavailable.
2. Runtime detects hook failure.
3. Runtime falls back to native tools.
4. Session continues in degraded mode (if applicable).
5. Server status is updated to `Disconnected`.

### Re-attachment

1. MCP server becomes available again.
2. Runtime detects hook recovery.
3. Runtime re-enables the hook.
4. Session continues with full capabilities.

---

**Last Updated:** 2026-05-20
**Next Review:** When first MCP server is connected
