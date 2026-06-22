# MCP_STACK.md — MCP Tool Definitions and Usage

> **Purpose:** Define available MCP tools, their purposes, and usage guidelines.
> **Scope:** All MCP tools available to AI agents in this runtime.

---

## What Is MCP?

Model Context Protocol (MCP) provides standardized tool interfaces that AI models can use to interact with external systems. Each MCP server exposes tools that agents can call.

---

## Available MCP Tools

### 1. Filesystem Tools

| Tool    | Purpose                         | Usage                           |
| ------- | ------------------------------- | ------------------------------- |
| `read`  | Read file or directory contents | Read source code, docs, configs |
| `write` | Write file contents             | Create or update files          |
| `edit`  | Search-and-replace in files     | Modify existing files           |
| `glob`  | Find files by pattern           | Locate files by name pattern    |
| `grep`  | Search file contents            | Find patterns across files      |

**Guidelines:**

- Always read before writing.
- Use `edit` for targeted changes, `write` for full file replacement.
- Use `glob` to discover file locations before reading.
- Use `grep` for content search across multiple files.

---

### 2. Shell Tools

| Tool   | Purpose                | Usage                              |
| ------ | ---------------------- | ---------------------------------- |
| `bash` | Execute shell commands | Run tests, builds, Docker commands |

**Guidelines:**

- Use for git operations, npm scripts, Docker commands.
- Do not use for file reading/writing (use dedicated tools).
- Always explain what the command does before running it.
- Use `workdir` parameter instead of `cd`.

---

### 3. Web Tools

| Tool        | Purpose           | Usage                                  |
| ----------- | ----------------- | -------------------------------------- |
| `webfetch`  | Fetch URL content | Read online docs, API references       |
| `websearch` | Search the web    | Find current information, library docs |

**Guidelines:**

- Use `webfetch` for known URLs (documentation, API specs).
- Use `websearch` for current events or library information.
- Prefer Context7 skill for library documentation.

---

### 4. Notion Tools

| Tool                  | Purpose                    | Usage                         |
| --------------------- | -------------------------- | ----------------------------- |
| `notion-fetch`        | Fetch Notion page/database | Read project docs from Notion |
| `notion-create-pages` | Create Notion pages        | Document decisions, updates   |
| `notion-update-page`  | Update Notion page         | Modify existing docs          |
| `notion-search`       | Search Notion              | Find pages, databases         |

**Guidelines:**

- Use when project docs are stored in Notion.
- Keep Notion docs in sync with repository docs.
- Do not duplicate content — link between Notion and repo.

---

### 5. Task Tools

| Tool        | Purpose            | Usage                                        |
| ----------- | ------------------ | -------------------------------------------- |
| `task`      | Launch sub-agent   | Delegate complex tasks to specialized agents |
| `todowrite` | Manage task list   | Track multi-step work                        |
| `question`  | Ask user questions | Clarify requirements, get decisions          |

**Guidelines:**

- Use `task` to delegate to specialized agents (architect, security-reviewer, etc.).
- Use `todowrite` for tasks with 3+ steps.
- Use `question` when requirements are ambiguous.

---

### 6. Skill Tools

| Tool    | Purpose                | Usage                                 |
| ------- | ---------------------- | ------------------------------------- |
| `skill` | Load specialized skill | Activate domain-specific instructions |

**Available Skills:**

- `context7-mcp` — Library/framework documentation and code examples.
- `frontend-design` — Production-grade frontend interface generation.
- `impeccable` — UI design critique and polish.
- `vercel-react-best-practices` — React/Next.js performance optimization.

**Guidelines:**

- Load skill when task matches skill description.
- Skill provides workflow guidance and best practices.
- Skills complement, not replace, runtime rules.

---

## Tool Permission Model

### By Agent Type

| Agent             | Allowed Tools                          | Restricted Tools                    |
| ----------------- | -------------------------------------- | ----------------------------------- |
| architect         | read, glob, grep, bash, task, question | write (docs only), edit (docs only) |
| spec-guardian     | read, glob, grep, task                 | write, edit (specs only)            |
| security-reviewer | read, glob, grep, bash, task           | write, edit (no production code)    |
| rtl-auditor       | read, glob, grep, task                 | write, edit (CSS/RTL only)          |
| frontend-polish   | read, glob, grep, task                 | write, edit (UI/CSS only)           |
| docker-auditor    | read, glob, grep, bash, task           | write, edit (Docker files only)     |
| docs-sync         | read, glob, grep, write, edit          | bash (limited), task                |
| qa-lead           | read, glob, grep, bash, task           | write (test files only)             |

### By File Type

| File Type               | Read | Write         | Edit          | Delete        |
| ----------------------- | ---- | ------------- | ------------- | ------------- |
| Source code (.ts, .tsx) | Yes  | With approval | With approval | Never         |
| Tests (.test.ts)        | Yes  | Yes           | Yes           | With approval |
| Docs (.md)              | Yes  | Yes           | Yes           | With approval |
| Config (.json, .yaml)   | Yes  | With approval | With approval | Never         |
| Secrets (.env)          | No   | Never         | Never         | Never         |
| Runtime (.opencode/)    | Yes  | Yes           | Yes           | Never         |

---

## Tool Usage Guidelines

1. **Read before write.** Always read a file before modifying it.
2. **Minimal changes.** Change only what is necessary.
3. **Preserve conventions.** Match existing code style and patterns.
4. **No side effects.** Tools should not have unintended side effects.
5. **Log usage.** Record which tools were used and why.
6. **Verify results.** After tool execution, verify the expected outcome.

---

## Tool Error Handling

| Error             | Recovery                                       |
| ----------------- | ---------------------------------------------- |
| File not found    | Check path, use glob to find correct location  |
| Permission denied | Check agent permissions, escalate if needed    |
| Command failed    | Read error output, fix command, retry          |
| Model timeout     | Retry with smaller context, use fallback model |
| Tool unavailable  | Use alternative tool, flag if critical         |
