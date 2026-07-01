---
name: realtime-setup
description: "Real-time communication — WebSocket, SSE, WebRTC, long polling. Picks the transport by direction (server→client, bidirectional, P2P), implements Redis pub/sub for multi-server fanout, sticky sessions via cookie, exponential backoff reconnection on the client, heartbeat ping/pong for dead-connection detection, and backpressure handling. Triggers in Phase 6 EXECUTE when the app needs live updates, and in Phase 2 AUDIT when Dimension 5 finds polling (`setInterval`) that should be a push, or missing reconnect logic."
license: MIT
metadata:
  version: "1.0"
  author: OmniProject AI
  category: infra
---

# Real-Time Setup

> Infra sub-skill for live updates. Picks the transport (SSE for server→client, WebSocket for bidirectional, WebRTC for P2P voice/video, long polling only as legacy fallback), scales horizontally via Redis pub/sub fanout with sticky sessions, handles reconnection with exponential backoff, and runs heartbeats to detect dead connections. Coordinates with `auth-setup` (handshake authentication), `message-queue` (offline message buffering), and `error-monitoring` (connection drop alerting).

## When to Use

| Phase                | Trigger                                                                                                            | Why                                                                                               |
| -------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| Phase 2 — AUDIT      | Dimension 5 finds `setInterval(fetch, 2000)` polling for state that should be pushed                               | Polling wastes bandwidth and adds latency; push is the right pattern for live data                |
| Phase 2 — AUDIT      | Dimension 5 finds a WebSocket with no reconnect logic                                                              | Connection drops are inevitable; without reconnect, the app goes silent                           |
| Phase 2 — AUDIT      | Dimension 4 (Security) finds a WebSocket with no auth on handshake                                                 | Unauthenticated WebSocket = anyone can listen / inject                                            |
| Phase 6 — EXECUTE    | User says "add real-time", "add chat", "add live notifications", "add collaborative editing", "add live dashboard" | This is the executing sub-skill                                                                   |
| Phase 6 — EXECUTE    | Migrating transports (long polling → WebSocket, WebSocket → SSE for one-way)                                       | Full replace of client + server transport layer                                                   |
| Phase 9 — ACCEPTANCE | Open a connection, verify auth, simulate drop + reconnect, verify heartbeat works                                  | Real-time fails silently — must walk the full connect→auth→message→drop→reconnect loop            |
| Phase 11 — ROLLOUT   | Verify sticky session cookie set, Redis pub/sub wired, connection limits documented                                | Multi-server real-time without Redis pub/sub = messages lost when client is on a different server |

**Do NOT use this sub-skill for:** mobile push notifications (use FCM/APNs — async, not real-time), video streaming (use HLS/DASH — different protocol), or batch data sync (use polling or webhook — real-time is overkill). This sub-skill is for **interactive** real-time only.

## What It Does

1. Picks the transport via the Decision Tree.
2. Installs the appropriate library:
   - **WebSocket**: `ws` (Node low-level), `Socket.IO` (Node with reconnect/rooms), `websockets` / `FastAPI WebSocket` (Python), `gorilla/websocket` (Go).
   - **SSE**: built-in `EventSource` (browser); server-side just sets `Content-Type: text/event-stream`.
   - **WebRTC**: `wrtc` (Node), `aiortc` (Python), or browser-native (`RTCPeerConnection`).
   - **Long polling**: any HTTP server; only as legacy fallback.
3. Wires authentication on handshake:
   - **WebSocket**: auth via query param `?token=...` (initial only — then validate per-message if high-security) OR `Sec-WebSocket-Protocol` header.
   - **SSE**: `EventSource` can't set headers, so auth via cookie OR `?token=...` query param.
   - **WebRTC**: auth via the signaling channel (which itself is usually WebSocket).
4. Implements the connection lifecycle:
   - **Connect**: client opens connection, server validates auth, server stores connection in connection map.
   - **Heartbeat**: server sends ping every 30s, client must pong within 60s; no pong = dead, close.
   - **Reconnect**: client uses exponential backoff (1s, 2s, 4s, ..., 30s max) + jitter; on reconnect, re-auth and re-subscribe.
   - **Disconnect**: server removes connection from map; queued messages either delivered on reconnect or buffered in Redis.
5. Implements multi-server fanout via Redis pub/sub:
   - Each server subscribes to channels for its connected users.
   - To broadcast: publish to Redis; each server delivers to its local connections.
   - Without this, a message from server A can't reach a client connected to server B.
6. Implements sticky sessions (for stateful protocols like Socket.IO):
   - Load balancer routes by cookie (`SERVERID` or `__Host-sticky`).
   - Ensures the same client always hits the same server (for in-memory state).
7. Implements backpressure:
   - If a client's send buffer grows beyond N bytes (default 1MB), pause sending or close the connection.
   - Never let a slow consumer cause OOM on the server.
8. Emits a `realtime_client` for other modules: `broadcast(channel, message)`, `send_to_user(user_id, message)`, `subscribe(channel, handler)`.

## Integration Contract

```
INPUT:
  - transport_hint: sse|websocket|webrtc|long_polling (optional — decision tree decides)
  - framework: express|fastify|fastapi|django|next|rails (required)
  - auth_strategy: query_param|cookie|header (default cookie for SSE, query_param for WS)
  - multi_server: bool (default true — Redis pub/sub needed)
  - sticky_sessions: bool (default true if multi_server)
  - heartbeat_interval_s: int (default 30)
  - heartbeat_timeout_s: int (default 60)
  - max_connections_per_server: int (default 10000)
  - backpressure_bytes: int (default 1048576 — 1MB)
  - offline_buffer: bool (default true — buffer messages in Redis for missed-delivery)

OUTPUT (JSON to stdout):
  {
    "status": "ok|error",
    "transport": "websocket",
    "files_created": [
      "src/realtime/server.{ts,py}",
      "src/realtime/client.ts",
      "src/realtime/auth.{ts,py}",
      "src/realtime/redis_pubsub.{ts,py}",
      "src/realtime/heartbeat.{ts,py}"
    ],
    "env_required": ["REDIS_URL"],
    "auth_strategy": "cookie",
    "sticky_session_cookie": "__Host-sticky",
    "heartbeat": {"interval_s": 30, "timeout_s": 60},
    "backpressure_bytes": 1048576,
    "max_connections_per_server": 10000,
    "offline_buffer": true,
    "security_warnings": []
  }

SIDE EFFECTS:
  - Writes realtime module under src/realtime/
  - Adds Redis subscription on server startup
  - Adds sticky session cookie configuration to load balancer
  - Adds required env vars to .env.example
  - Registers /ws (WebSocket) or /events (SSE) endpoint
```

## CLI

```bash
# Autonomous: pick transport, scaffold server + client + auth + Redis pub/sub
python3 scripts/realtime_agent.py setup \
  --framework fastapi \
  --transport websocket \
  --auth-strategy cookie \
  --multi-server \
  --sticky-sessions

# Add a channel (e.g. "user-42-notifications")
python3 scripts/realtime_agent.py add-channel \
  --name "user-notifications" \
  --auth-required \
  --pattern "user-{user_id}-notifications"

# Broadcast to a channel (server-side)
python3 scripts/realtime_agent.py broadcast \
  --channel "user-42-notifications" \
  --message '{"type":"notification","text":"Hello"}'

# Send to a specific user (looks up via Redis)
python3 scripts/realtime_agent.py send-to-user \
  --user-id 42 \
  --message '{"type":"ping"}'

# Stress test: open N connections, verify they all receive messages
python3 scripts/realtime_agent.py stress-test \
  --connections 1000 \
  --duration-s 60 \
  --message-interval-ms 100

# Verify sticky sessions work (multiple LB hits land on same server)
python3 scripts/realtime_agent.py verify-sticky --url https://example.com/ws

# Audit: grep for setInterval polling, missing reconnect, unauthenticated WS
python3 scripts/realtime_agent.py audit --path src/
```

## Decision Tree (autonomous)

```
Q1: Direction of communication?
  Server → Client only (live notifications, dashboards, status updates)
    → SSE (Server-Sent Events)
      Built into browser via EventSource, automatic reconnect, HTTP/2 multiplexes
      Limit: 6 connections per domain on HTTP/1.1 (gone on HTTP/2)
      Limit: text only (no binary) — fine for most cases
  Bidirectional (chat, collaborative editing, multiplayer games)
    → WebSocket
      Full-duplex, binary + text, lower overhead than HTTP for frequent messages
      Limit: no built-in reconnect — you implement it
  Peer-to-peer (voice/video calls, file transfer between browsers)
    → WebRTC
      Direct browser-to-browser (after signaling), low latency for media
      Signaling channel needed (usually WebSocket) to exchange SDP/ICE
      STUN/TURN servers needed for NAT traversal
  Legacy / WebSocket blocked (corporate proxies)
    → Long polling (last resort)
      Client polls with long timeout (e.g. 30s), server holds request until data
      Worst performance, but works through any HTTP proxy

Q2: Single server or multi-server?
  Single server (dev, small scale < 1k connections)
    → In-memory connection map (user_id → connection)
      Simple, no Redis needed, but no horizontal scaling
  Multi-server (production)
    → Redis pub/sub for fanout
      Each server subscribes to channels for its local connections
      To send to user on server B: publish to Redis; server B delivers
      Without this, cross-server messages are lost
    → Alternative: dedicated WebSocket gateway (Pushpin, Centrifugo, Soketi)
      Offloads connection management from app servers

Q3: Sticky sessions needed?
  Yes (Socket.IO with in-memory state, or any stateful protocol)
    → LB routes by cookie (SERVERID, __Host-sticky)
      Ensures same client always hits same server
      Without sticky: connection drops on every LB re-route
  No (stateless protocol, or all state in Redis)
    → No sticky needed; any server can handle any connection
      Better for horizontal scaling — preferred when feasible

Q4: Authentication strategy?
  SSE
    → Cookie (EventSource can't set headers) — auth cookie sent automatically
      OR query param ?token=... (but token in URL is logged by proxies)
  WebSocket
    → Query param ?token=... on handshake (initial only)
      OR Sec-WebSocket-Protocol header (subprotocol as auth)
      For high-security: re-validate token per-message
  WebRTC
    → Auth on signaling channel (which is usually WebSocket)
      Media itself is authenticated via DTLS during connection

Q5: Offline message handling?
  User must receive messages sent while offline (chat, notifications)
    → Buffer in Redis (list per user, capped at 100 messages)
      On reconnect: deliver buffered, then live
    → Alternative: persist to DB, deliver on reconnect
  Messages can be dropped if user offline (live dashboard, ephemeral)
    → No buffer; new connections get fresh state
      Simpler, lower memory, but loses messages during disconnect

Q6: Connection limits?
  Per server
    → Default 10k connections (Node.js / uvicorn)
      Tune via `ulimit -n` and worker config
      Beyond 10k: use multiple servers + Redis pub/sub
  Per client
    → 1-3 connections per user (browser tab limit)
      Reject more than 3 from same user
```

## Failure Modes & Recovery

| Symptom                               | Cause                                       | Recovery                                                                                |
| ------------------------------------- | ------------------------------------------- | --------------------------------------------------------------------------------------- |
| Messages lost when client on server B | No Redis pub/sub fanout                     | Add Redis pub/sub; each server subscribes to channels for its connections               |
| Client goes silent after 30s          | Connection dropped, no reconnect            | Client implements exponential backoff reconnect: 1s, 2s, 4s, ..., 30s max + jitter      |
| Server OOM from slow consumer         | Backpressure not handled                    | Track per-connection send buffer; if > 1MB, pause or close; never block on slow client  |
| Connection drops every 30s            | Heartbeat ping/pong misconfigured           | Server pings every 30s; client must pong within 60s; no pong = dead = close             |
| Sticky session not working            | LB not routing by cookie, or cookie not set | Verify LB config (ALB: stickiness.enabled=true); verify cookie `Set-Cookie` on response |
| Auth bypass on WebSocket              | No validation on handshake                  | Validate token in `Connection: Upgrade` handler; reject before WS upgrade completes     |
| 100% CPU after 5k connections         | Per-connection goroutine/thread overhead    | Use async I/O (uvicorn, Node cluster); tune `uvloop` (Python) / libuv (Node)            |
| Reconnect storm after server restart  | All clients reconnect simultaneously        | Add jitter to backoff (±20%); add random initial delay (0-5s)                           |
| SSE blocked by corporate proxy        | Proxy buffers `text/event-stream`           | Set `X-Accel-Buffering: no` (Nginx); use WebSocket as fallback                          |
| WebRTC fails through NAT              | No TURN server                              | Deploy coturn; configure `iceServers` with TURN credentials                             |

## Self-Healing Loop

Every real-time incident (connection drop spike, reconnect storm, message loss, auth bypass) writes a structured record to `OMNIPROJECT_SELF_IMPROVEMENT.md`:

```
- flow: live_dashboard
  failure_class: message_loss_on_multi_server
  trigger: 15% of dashboard updates lost when user connected to server B
  recovery: Redis pub/sub not wired — added channel subscription per server on startup
  rule_added: realtime-setup sub-skill now requires Redis pub/sub config when multi_server=true
```

`meta-auditor` reads these in Phase 13. If the same failure class appears ≥3 times across projects, `self-patch-generator` produces a rule that auto-adds the Redis pub/sub requirement.

For unauthenticated WebSocket specifically: if the audit finds a WebSocket endpoint with no auth check before upgrade, Phase 11 halts — unauthenticated real-time endpoints are a release blocker (security).

## Quality Gates (enforced before declaring "real-time ready")

- [ ] No `setInterval(fetch, ...)` polling that should be a push (grep + AST check)
- [ ] Client implements reconnect with exponential backoff + jitter
- [ ] Heartbeat ping/pong configured (interval 30s, timeout 60s)
- [ ] Authentication on handshake (token validated before connection accepted)
- [ ] Multi-server: Redis pub/sub wired for fanout
- [ ] Sticky sessions configured (if stateful protocol)
- [ ] Backpressure handling (per-connection send buffer limit, default 1MB)
- [ ] Per-user connection limit (default 3)
- [ ] Offline message buffer (if app requires delivery guarantee)
- [ ] WebSocket upgrade rejected if auth fails (no anonymous connections)
- [ ] Client messages validated server-side (never trust client input)
- [ ] Connection metrics exported (count, drops, reconnects, message rate)
- [ ] Tests cover: handshake auth success, handshake auth failure, drop + reconnect, heartbeat timeout, backpressure triggered, multi-server fanout, offline buffer delivered on reconnect

If any gate fails: status = `error`, do not proceed to Phase 9. Real-time bugs cause silent message loss and security holes — both are release blockers.

## Tools

- **ws** (Node) — low-level WebSocket. Use directly for custom protocols.
- **Socket.IO** (Node) — high-level: rooms, namespaces, auto-reconnect, fallback to polling. Use for chat / collaborative apps.
- **FastAPI WebSocket** (Python) — built into FastAPI. Pair with `uvicorn` (uvloop for performance).
- **websockets** (Python) — pure-Python WebSocket client/server. Lower-level than FastAPI's wrapper.
- **aiortc** (Python) / **wrtc** (Node) — WebRTC for server-side (rare; usually WebRTC is browser-to-browser).
- **Redis** (`ioredis` / `redis-py`) — pub/sub for multi-server fanout. Critical for horizontal scaling.
- **Centrifugo** / **Soketi** / **Pushpin** — dedicated WebSocket gateways. Offload connection management from app servers.
- **coturn** — open-source TURN/STUN server for WebRTC NAT traversal. Required for WebRTC in restrictive networks.
- **socket.io-redis-adapter** / **centrifugo-adapter** — bridges Socket.IO across servers via Redis.

## Permissions

- Filesystem: write to `src/realtime/`, `.env.example`, frontend client code
- Network: outbound to Redis (`*:6379`), inbound WebSocket upgrade (`*:80`/`*:443`)
- Network: outbound STUN/TURN (`*:3478` UDP/TCP) for WebRTC
- Secrets: read auth tokens from cookies / query params; never log message bodies with PII
- Processes: may spawn WebSocket workers; must reap on shutdown; must respect `ulimit -n` for file descriptors
- DB: may write to `realtime_connections` table for tracking; may use Redis for connection state

## Hard Rules

1. **Always authenticate the handshake.** WebSocket upgrade must validate the token BEFORE accepting the connection. An unauthenticated WebSocket lets anyone listen and inject — a direct security hole.
2. **Always implement client-side reconnect with exponential backoff + jitter.** Connections drop (network blip, server restart, LB re-route). Without reconnect, the app goes silent. Without jitter, reconnect storms after server restart.
3. **Always handle backpressure.** A slow consumer must not cause OOM on the server. Track per-connection send buffer; pause or close when > 1MB. Backpressure is not optional — it's how you survive a slow client or a client that disconnected mid-stream.
4. **Never trust client messages.** Validate every incoming message against a schema (zod / pydantic). A client can send any JSON; treat it as hostile. Reject malformed, oversized, or unexpected messages.
5. **Always use Redis pub/sub for multi-server fanout.** Without it, a message from server A can't reach a client on server B. This is the most common multi-server real-time bug. Wire it on server startup; never assume single-server in production.
6. **Always implement heartbeat ping/pong.** TCP keepalive is too slow (default 2 hours) for real-time. Server pings every 30s; client must pong within 60s. No pong = dead connection = close and free resources. Without this, dead connections accumulate.
7. **Never put auth tokens in URLs that get logged.** SSE EventSource can't set headers, so query param is common — but configure proxies to strip `?token=` from access logs. Better: use a short-lived cookie set by a prior HTTP request.
8. **Always set per-user connection limits.** A single user opening 100 tabs × 10 connections = 1000 server resources. Cap at 3 per user (typical browser tab count). Reject beyond with a clear error.
9. **Always buffer offline messages if delivery matters.** Chat, notifications, and other user-facing messages must survive a brief disconnect. Buffer in Redis (capped list per user); deliver on reconnect. Live dashboards can skip this — fresh state on reconnect is fine.
10. **Never use long polling for new code.** Long polling is a legacy fallback for corporate proxies that block WebSocket. It's inefficient (HTTP overhead per "poll"), fragile (timeout handling), and adds latency. Use SSE or WebSocket; long polling only when explicitly required.
