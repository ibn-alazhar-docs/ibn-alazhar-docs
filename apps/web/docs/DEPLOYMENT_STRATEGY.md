# Deployment Strategy

## Overview

Vercel-first deployment for a fully static Next.js SSG platform. Zero backend services, zero databases, zero runtime servers.

## Target Environment

| Property      | Value                               |
| ------------- | ----------------------------------- |
| **Platform**  | Vercel                              |
| **Framework** | Next.js 16 (SSG — `output: export`) |
| **Domain**    | `ibnalazhar-docs.vercel.app`        |
| **CDN**       | Vercel Edge Network                 |
| **Analytics** | None (Phase 3A)                     |
| **Cost**      | Free (Vercel Hobby tier)            |

## Environment Variables

| Variable          | Required | Purpose            |
| ----------------- | -------- | ------------------ |
| `NEXT_PUBLIC_URL` | Yes      | Canonical base URL |

All content is resolved at build time from local MDX files — no runtime data fetching.

## Preview Deployments

Every PR automatically triggers a Vercel preview deployment:

- **URL**: `{project}-git-{branch}-{user}.vercel.app`
- **Scope**: Full site (all routes) for visual review
- **Cleanup**: Auto-destroyed on PR merge/close
- **Use**: QA review, content validation before production

## Production Deployments

Triggered on push to `main`:

1. CI runs: `lint → typecheck → test → build`
2. Vercel imports build output
3. Edge cache populates
4. Sitemap regenerated automatically via `app/sitemap.ts`

## Rollback Strategy

| Method                                      | Speed    | Complexity |
| ------------------------------------------- | -------- | ---------- |
| Vercel Instant Rollback                     | 30s      | 0-click    |
| Git revert + deploy                         | 5-10 min | Low        |
| Manual `vercel deploy --prod` from previous | 2 min    | Medium     |

Instant Rollback is the primary method — Vercel retains the last 10 production deployments.

## Notes

- No `next start` needed — fully static output
- No `fallback: blocking` or ISR — SSG only
- Each build is fully self-contained; no external service dependencies
