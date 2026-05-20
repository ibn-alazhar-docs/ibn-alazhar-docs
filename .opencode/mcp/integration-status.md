# MCP Integration Status

> **File:** `mcp/integration-status.md`
> **Purpose:** Track the operational status of all MCP integrations.
> **Scope:** All MCP servers, their status, connection state, and lifecycle.

---

## Status Definitions

| Status | Meaning | Criteria |
|--------|---------|----------|
| **Operational** | MCP server is connected and verified. | Server responds to health check, tools are callable. |
| **Planned** | MCP server is planned for future integration. | Defined in `mcp/` directory, not yet connected. |
| **Conceptual** | MCP server is defined conceptually but not planned for immediate integration. | Described in `MCP_STACK.md`, no configuration exists. |
| **Disconnected** | MCP server was connected but is currently unavailable. | Was operational, now failing health check. |
| **Verified** | MCP server is operational and has passed integration testing. | Operational + tested in real session. |

---

## Integration Registry

### Native Tools (Always Operational)

These tools are built into the runtime and do not require external MCP servers:

| Tool | Status | Category | Notes |
|------|--------|----------|-------|
| read | Operational | Filesystem | Native tool |
| write | Operational | Filesystem | Native tool |
| edit | Operational | Filesystem | Native tool |
| glob | Operational | Filesystem | Native tool |
| grep | Operational | Filesystem | Native tool |
| bash | Operational | Shell | Native tool |
| webfetch | Operational | Web | Native tool |
| websearch | Operational | Web | Native tool |
| task | Operational | Orchestration | Native tool |
| todowrite | Operational | Orchestration | Native tool |
| question | Operational | Communication | Native tool |
| skill | Operational | Skill | Native tool |
| notion-fetch | Operational | Notion | Native tool |
| notion-create-pages | Operational | Notion | Native tool |
| notion-update-page | Operational | Notion | Native tool |
| notion-search | Operational | Notion | Native tool |

### External MCP Servers (Not Yet Connected)

| Server | Status | Hook | Planned Phase | Notes |
|--------|--------|------|---------------|-------|
| Filesystem MCP | Conceptual | H-01 | TBD | Native tools cover all current needs |
| Shell MCP | Conceptual | H-02 | TBD | Native bash covers all current needs |
| Prisma/PostgreSQL MCP | Conceptual | H-03 | Phase 2+ | Prisma CLI via bash is sufficient for Phase 1 |
| Docker MCP | Conceptual | H-04 | Phase 2+ | Docker CLI via bash is sufficient for Phase 1 |
| Git MCP | Conceptual | H-05 | TBD | Git CLI via bash is sufficient |
| Playwright MCP | Conceptual | H-06 | Phase 2+ | Requires UI to exist first |
| Security MCP | Conceptual | H-07 | Phase 2+ | Manual review is sufficient for Phase 1 |

---

## Integration Lifecycle

### Registration Process

When an MCP server is to be integrated:

1. **Assess need** — Determine if native tools are insufficient.
2. **Select server** — Choose the appropriate MCP server.
3. **Configure** — Create configuration file in `mcp/`.
4. **Connect** — Establish connection to the server.
5. **Test** — Verify all tools are callable.
6. **Update status** — Change status from `Conceptual` to `Planned` to `Operational`.
7. **Verify** — Use the server in a real session.
8. **Mark verified** — Change status to `Verified`.

### Disconnection Process

When an MCP server becomes unavailable:

1. **Detect** — Health check fails or tool call errors.
2. **Fallback** — Switch to native tools or alternative.
3. **Update status** — Change status to `Disconnected`.
4. **Log** — Record the disconnection in session record.
5. **Investigate** — Determine root cause.
6. **Recover** — Reconnect or replace the server.
7. **Re-verify** — Test the server after recovery.
8. **Update status** — Change status back to `Operational` or `Verified`.

### Deprecation Process

When an MCP server is no longer needed:

1. **Assess** — Confirm native tools or other servers cover the functionality.
2. **Migrate** — Update all references to use the replacement.
3. **Disconnect** — Remove the server connection.
4. **Update status** — Change status to `Deprecated`.
5. **Archive** — Move configuration to archive (do not delete).
6. **Document** — Record the deprecation reason.

---

## Future MCP Registration

When a new MCP server is proposed:

1. **Proposal** — Document the server in `mcp/<server-name>.md`:
   - Purpose
   - Tools provided
   - Hook point
   - Permission requirements
   - Fallback plan
2. **Review** — Architect reviews the proposal.
3. **Approve** — Human engineer approves the integration.
4. **Register** — Add to this integration status registry.
5. **Configure** — Create configuration file.
6. **Connect** — Follow the registration process above.

### Proposal Template

```markdown
# MCP Server: <name>

- **Purpose:** [what this server provides]
- **Status:** Proposed
- **Hook:** [H-01 through H-07]
- **Tools:** [list of tools provided]
- **Permissions:** [which agents can use which tools]
- **Fallback:** [what happens if the server is unavailable]
- **Phase:** [when this server is planned for integration]
- **Justification:** [why native tools are insufficient]
```

---

## Health Check

MCP server health is checked:
- **At session start** — During boot sequence (Step 7: Health Checks).
- **Before tool use** — When an agent first uses a tool from a server.
- **Periodically** — If automated health scheduling is enabled.

### Health Check Format

```markdown
## MCP Health Check

- Timestamp: YYYY-MM-DD HH:MM:SS
- Overall: PASS | WARN | FAIL

| Server | Status | Last Checked | Notes |
|--------|--------|--------------|-------|
| Filesystem MCP | Conceptual | — | Not yet connected |
| Docker MCP | Conceptual | — | Not yet connected |
| ... | ... | ... | ... |
```

---

## Current Assessment

| Dimension | Status | Notes |
|-----------|--------|-------|
| Native tools | Operational | All 16 native tools functional |
| External MCP servers | Conceptual | 7 servers defined, none connected |
| Hook points | Defined | 7 hooks defined with interfaces |
| Fallback model | Defined | Native tools cover all current needs |
| Permission model | Defined | Agent-specific permissions for each hook |
| Lifecycle | Defined | Registration, disconnection, deprecation processes |
| Health check | Defined | But not yet automated |

**Assessment:** The runtime has a complete MCP integration architecture. No external MCP servers are connected, but native tools provide all required functionality for Phase 1. External MCP servers will be integrated as needed in future phases.

---

**Last Updated:** 2026-05-20
**Next Review:** When first external MCP server is proposed or connected
