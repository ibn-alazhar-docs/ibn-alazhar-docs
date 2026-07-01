---
name: live-preview
description: "Start the project's dev server locally and expose a live URL for interactive development feedback. Detects framework (Next.js/Vite/RAILS/FastAPI/Flask/Django), picks the right dev command, waits for the server to be ready, and returns the URL. Triggers before any Phase 6 visual work and before Phase 9 acceptance testing."
license: MIT
metadata:
  version: "1.0"
  author: OmniProject AI
  category: browser-infrastructure
---

# Live Preview

> The browser can't see a page that isn't running. This sub-skill is the bridge between "the code compiles" and "the code is viewable in a browser". Every other browser sub-skill depends on it.

## When to Use

| Trigger                                | Example                                                    |
| -------------------------------------- | ---------------------------------------------------------- |
| Phase 4 — Visual baseline audit        | Need a running app to screenshot                           |
| Phase 6 — Visual Guard after UI change | Need to restart dev server if HMR broke                    |
| Phase 9 — Acceptance testing           | Need app running for flow-simulator                        |
| Phase 11 — Pre-rollout smoke           | Spin up production build locally before deploy             |
| Interactive debugging                  | "Let me see what the agent sees" — exposes URL to the user |

**Do NOT use this for:** production deploys (use `ship-router`), Docker builds (use `containerize`), CI test runs (use `webapp-testing`). This sub-skill is for **local dev servers**, not deployments.

## What It Does

1. Detects the project framework by scanning for marker files:
   - `next.config.*` → Next.js → `npm run dev` (port 3000)
   - `vite.config.*` → Vite → `npm run dev` (port 5173)
   - `package.json` with `"start"` → CRA/Expo → `npm start`
   - `manage.py` → Django → `python manage.py runserver` (port 8000)
   - `app.py` + `flask` import → Flask → `flask run` (port 5000)
   - `main.py` + `fastapi`/`uvicorn` import → FastAPI → `uvicorn main:app --reload` (port 8000)
   - `Gemfile` + `rails` → Rails → `bin/rails server` (port 3000)
   - `mix.exs` + `phoenix` → Phoenix → `mix phx.server` (port 4000)
   - `go.mod` + `main.go` with `http.ListenAndServe` → Go → `go run .` (port 8080)
   - `Cargo.toml` + `actix-web`/`axum` → Rust → `cargo run` (port 8080)
2. Picks a free port (avoids 3000 if already in use — scans up to 3010, then random)
3. Sets required env vars:
   - `PORT` = chosen port
   - `NODE_ENV=development` (for JS frameworks)
   - `PYTHONUNBUFFERED=1` (for Python — ensures logs stream)
   - Reads `.env` and `.env.local` if present (NEVER `.env.production`)
4. Spawns the dev server as a child process with stdio piped to a log file
5. Polls `http://localhost:<port>` every 250ms until it returns 200 (or non-empty 302)
6. Times out after 30s — if server isn't ready, captures the log and emits a diagnostic
7. Returns the URL: `http://localhost:<port>`
8. Holds the server process open until `live-preview stop <port>` is invoked

## Integration Contract

```
INPUT:
  - framework: auto-detected (override via --framework)
  - port: auto-chosen (override via --port)
  - host: localhost (override via --host 0.0.0.0 for LAN testing)
  - env-file: .env (default)
  - build: dev|prod (default dev; prod runs `next build && next start` etc.)

OUTPUT (JSON to stdout):
  {
    "status": "ok|error",
    "framework": "next|vite|flask|fastapi|django|rails|phoenix|go|rust",
    "url": "http://localhost:3001",
    "port": 3001,
    "pid": 12345,
    "log_file": "/tmp/ct-live-preview-<uuid>.log",
    "ready_after_ms": 1842,
    "env_used": ["PORT", "NODE_ENV", "DATABASE_URL"]
  }

SIDE EFFECTS:
  - Long-running child process (the dev server) — MUST be stopped at end of session
  - Log file at /tmp/ct-live-preview-<uuid>.log (NOT in project dir — keep project clean)
```

## CLI

```bash
# Auto-detect framework, start dev server
python3 scripts/browser_agent.py serve --dir .

# Start with explicit framework
python3 scripts/browser_agent.py serve --dir . --framework next

# Start production build (smoke test before deploy)
python3 scripts/browser_agent.py serve --dir . --build prod

# Stop a running server
python3 scripts/browser_agent.py serve-stop --port 3001

# Stop all running dev servers (cleanup hook)
python3 scripts/browser_agent.py serve-stop --all

# Check what's running
python3 scripts/browser_agent.py serve-list
```

## Framework Detection Rules

The detection is **exhaustive before failing** — never ask the user "what framework is this?" if it can be inferred from the codebase.

| Marker file                         | Framework  | Command (dev)                | Command (prod)                     | Default port |
| ----------------------------------- | ---------- | ---------------------------- | ---------------------------------- | ------------ |
| `next.config.{js,mjs,ts}`           | Next.js    | `npm run dev`                | `npm run build && npm start`       | 3000         |
| `vite.config.{js,ts}`               | Vite       | `npm run dev`                | `npm run build && npm run preview` | 5173         |
| `astro.config.{js,mjs,ts}`          | Astro      | `npm run dev`                | `npm run build && npm run preview` | 4321         |
| `package.json` + `"start"` script   | CRA/Expo   | `npm start`                  | `npm run build && npx serve build` | 3000         |
| `manage.py`                         | Django     | `python manage.py runserver` | `gunicorn wsgi`                    | 8000         |
| `app.py` + `from flask`             | Flask      | `flask run --debug`          | `gunicorn app:app`                 | 5000         |
| `main.py` + `from fastapi`          | FastAPI    | `uvicorn main:app --reload`  | `uvicorn main:app`                 | 8000         |
| `Gemfile` + `config/routes.rb`      | Rails      | `bin/rails server`           | `bin/rails server -e production`   | 3000         |
| `mix.exs` + `phoenix` dep           | Phoenix    | `mix phx.server`             | `mix phx.server`                   | 4000         |
| `go.mod` + `net/http`               | Go         | `go run .`                   | `./bin/app`                        | 8080         |
| `Cargo.toml` + `actix_web`          | Rust/Actix | `cargo run`                  | `./target/release/app`             | 8080         |
| `Cargo.toml` + `axum`               | Rust/Axum  | `cargo run`                  | `./target/release/app`             | 8080         |
| `index.html` only (no JS framework) | Static     | `python -m http.server`      | same                               | 8000         |

If multiple markers match (e.g. monorepo with both Next.js frontend and FastAPI backend): start BOTH, return both URLs.

## Ready Detection (smart polling)

Naive polling of `http://localhost:PORT/` returns 200 too early for SPAs (the HTML shell is served but React hasn't booted). Smart strategy per framework:

| Framework     | "Ready" signal                                                   |
| ------------- | ---------------------------------------------------------------- |
| Next.js       | HTTP 200 on `/` AND `/__nextjs_original-stack-frame` returns 200 |
| Vite          | HTTP 200 on `/` AND `/_vite/ping` returns `{"ready": true}`      |
| Flask/FastAPI | HTTP 200 on `/` OR `/health` (whitelisted routes)                |
| Django        | HTTP 200 on `/` OR `/admin/login/`                               |
| Rails         | HTTP 200 on `/` AND no `Booting` in log                          |
| Go            | TCP port open AND first HTTP request returns anything (even 404) |
| Rust          | TCP port open                                                    |

**Universal fallback**: poll TCP port with `socket.connect_ex`. Once port is open, poll HTTP. Once HTTP returns anything (even 404), the server is "ready" for sub-skills to navigate to specific URLs.

## Failure Modes & Recovery

| Symptom                            | Cause                             | Recovery                                                  |
| ---------------------------------- | --------------------------------- | --------------------------------------------------------- |
| Port already in use                | Previous server didn't shut down  | Kill PID on that port, or pick next free port             |
| `EADDRINUSE` after restart         | Process zombie                    | `kill -9 $(lsof -t -i:3000)` then retry                   |
| Server boots but never returns 200 | App has uncaught error at startup | Tail log, route to `debug-entry`                          |
| `npm run dev` exits immediately    | Missing `node_modules`            | Run `npm install` first (Phase 3 should have caught this) |
| `python: command not found`        | Wrong venv                        | Activate venv before running, or use `python3`            |
| Server runs but on wrong port      | Hardcoded port in app             | Set `PORT` env var explicitly                             |
| Log shows "compiling..." forever   | TypeScript error blocking HMR     | Route to `debug-entry` with the log                       |

## Process Lifecycle

```
live-preview start
  └── spawn child process (dev server)
       ├── PID: 12345
       ├── log: /tmp/ct-live-preview-<uuid>.log
       └── alive until: live-preview stop --port <port>
                                 OR
                                 parent process exits (cleanup hook fires)

Session end (cleanup hook):
  ├── read all PIDs from /tmp/ct-live-preview-*.pid
  ├── kill each (SIGTERM, 3s grace, then SIGKILL)
  └── remove PID files
```

**Hard rule**: every spawned dev server MUST be killed at session end. Leaving orphaned `next dev` processes is a real production-grade bug — they leak memory and ports.

## Multi-Service Orchestration

For full-stack projects (e.g. Next.js + FastAPI + Postgres):

```bash
# Start all services declared in docker-compose.yml (without Docker)
python3 scripts/browser_agent.py serve --dir . --multi-service
```

Reads `docker-compose.yml`'s `services` block, maps each to a host command:

- `web` service → `npm run dev` on port 3000
- `api` service → `uvicorn main:app` on port 8000
- `db` service → skip (assume Postgres is running locally OR start via Docker separately)

Returns JSON with multiple URLs:

```json
{
  "status": "ok",
  "services": [
    { "name": "web", "url": "http://localhost:3000", "pid": 12345 },
    { "name": "api", "url": "http://localhost:8000", "pid": 12346 }
  ]
}
```

## Exposing to the User (Interactive Mode)

When the user wants to see the running app:

```
$ python3 scripts/browser_agent.py serve --dir . --expose
{
  "status": "ok",
  "url": "http://localhost:3000",
  "exposed_url": "https://preview-<bot-id>.space-z.ai/"
}
```

`--expose` tunnels the local port to a public URL using a built-in tunnel client. Useful for:

- User review without local clone
- Mobile device testing (scan QR code of the URL)
- Sharing with stakeholders

**Security**: exposed URLs are time-limited (default 60min), require a token, and are revoked automatically on session end.

## Quality Gates

- [ ] Server process spawned (PID exists)
- [ ] TCP port accepts connection within 30s
- [ ] HTTP GET on `/` returns any response (even 404) within 30s
- [ ] No `error` or `fatal` lines in first 100 log lines (warnings OK)
- [ ] PID file written to `/tmp/ct-live-preview-<uuid>.pid` for cleanup

If any gate fails: status = `error`, capture last 50 log lines, route to `debug-entry`.

## Self-Improvement Hook

Every framework detection that falls back to "unknown" (user had to specify `--framework`) gets logged to `OMNIPROJECT_SELF_IMPROVEMENT.md`:

- What markers were present
- What the user specified
- What new marker file should be added to the detection table

`meta-auditor` collects these and `self-patch-generator` updates the detection rules.

## Tools

- **Framework CLI runners** — npm, yarn, pnpm, python, pip, go, cargo, mix, bundle
- **TCP/HTTP poller** — pure Python stdlib, no external deps
- **PID file manager** — for cleanup tracking
- **Optional: tunnel client** — for `--expose` mode (uses ssh reverse tunnel or ngrok-like service)

## Hard Rules

1. **Never start a prod server for dev work.** Dev mode enables HMR, debug tools, source maps. Prod mode hides bugs.
2. **Never log secrets to the log file.** Filter `process.env` keys that match `*KEY*`, `*SECRET*`, `*TOKEN*`, `*PASSWORD*` before writing logs.
3. **Never leave orphaned processes.** Always pair `serve` with `serve-stop`. The cleanup hook is a safety net, not a primary mechanism.
4. **Never expose a dev server publicly without a token.** Dev servers often have debug endpoints (`/_next/data`, `/__debug__`) that leak source code.
5. **Always use the chosen port in the env var.** Apps that hardcode `:3000` ignore the `PORT` env var — flag this as a Phase 4 finding (Dimension 8: DevOps).
