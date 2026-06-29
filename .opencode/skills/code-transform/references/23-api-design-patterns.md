# API Design Patterns — Build APIs That Don't Suck

> **Based on**: RFC 9457, RFC 8594, RFC 9745, OpenAPI 3.1, AsyncAPI 3.0, Relay spec, gRPC docs, Stripe.

## REST API Design
- Nouns not verbs: /orders not /createOrder
- Plural collections: /users, /users/{id}/orders
- ≤2 levels nesting
- HTTP methods: GET (safe/idempotent), POST, PUT (idempotent), PATCH, DELETE (idempotent)

## Status Codes
200 success | 201 created | 202 accepted (async) | 204 no content
400 bad request | 401 unauthenticated | 403 forbidden | 404 not found
409 conflict | 422 business validation | 429 rate limited | 500 server bug | 502/503/504 upstream

## Error Handling (RFC 9457)
`application/problem+json` with type, title, status, detail, instance + extensions (errors[], trace{}).
Return ALL validation errors at once. Machine-readable codes.

## GraphQL
- Schema-first: define SDL before resolvers
- N+1 solution: DataLoader (batch + cache per request)
- Pagination: Relay Cursor Connections (edges + pageInfo + cursor)
- Mutations: return payload + clientMutationId
- Evolution: continuous, additive. @deprecated with reason.

## gRPC
- When: internal, perf-critical, streaming, polyglot
- 4 method types: unary, server streaming, client streaming, bidirectional
- Always set deadlines; propagate across hops
- 17 status codes: UNAVAILABLE (retry), INVALID_ARGUMENT (don't)

## Pagination
| Method | Complexity | When |
|--------|------------|------|
| Offset/Limit | O(offset+limit) | Small/admin only |
| Cursor | O(limit) | Default for APIs |
| Keyset/Seek | O(log n + limit) | Large tables, ordered |

## API Versioning
- URI (/v1/) — public, many consumers (default)
- Header — internal, many representations
- CalVer — frequent releases
- Additive evolution — non-breaking (preferred)
- Sunset: Deprecation + Sunset headers → monitor usage → retire after grace period

## Rate Limiting
Sliding window counter (default) | Token bucket (bursts) | Leaky bucket (strict)
Distributed: Redis + Lua (atomic). Return 429 + Retry-After.

## Idempotency
`Idempotency-Key` header. Server stores key→response (24-48h TTL).
Different payload with same key → 409 Conflict.

## OpenAPI / AsyncAPI
Schema-first: spec is source of truth. OpenAPI 3.1 (full JSON Schema 2020-12). AsyncAPI 3.0 (event-driven).
Contract testing: Spectral, Schemathesis, Pact.

## Quick Reference
```
Public API → REST + OpenAPI 3.1 + RFC 9457
Internal RPC → gRPC + Protobuf (with deadlines)
Flexible queries → GraphQL + Relay + DataLoader
Event-driven → AsyncAPI 3.0
Pagination → Cursor/keyset
Versioning → Additive; Deprecation + Sunset
Rate limiting → Sliding-window counter in Redis; 429 + Retry-After
Safe retries → Exponential backoff + jitter + Idempotency-Key
Error envelope → application/problem+json (RFC 9457)
```
