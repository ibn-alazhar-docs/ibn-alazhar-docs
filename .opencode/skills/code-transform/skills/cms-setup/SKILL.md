---
name: cms-setup
description: "Headless CMS integration — routes between Sanity, Contentful, Strapi, Payload, and Storyblok based on hosting model, editing experience, and query needs; wires publish webhooks → ISR revalidation, preview mode, draft/published states, and image CDN handling. Invoked at Phase 4 (EXECUTE) when CENSUS identifies a content-management surface that needs structured authoring."
license: MIT
metadata:
  version: "1.0"
  author: OmniProject AI
  category: backend
---

# CMS Setup

> Owns the contract between authors and the front-end: where content lives, how it's queried, how previews work, how a publish propagates, and how images get served. A CMS wired without a webhook is a CMS that serves stale content until someone manually rebuilds.

## When to Use

| Phase | Trigger | Why |
|-------|---------|-----|
| Phase 2 — AUDIT | CENSUS shows marketing/blog/docs pages authored by non-developers | Structured content needs a CMS, not hard-coded MDX |
| Phase 4 — EXECUTE | Building the content layer | Pick the CMS, wire schemas, set up webhooks + preview |
| Phase 8 — ROLLOUT | First content publish to prod | Verify webhook → revalidate → CDN cache purge chain |
| Phase 13 — RETROSPECTIVE | After any "stale content" incident | Tighten webhook latency, add fallback revalidation |

**Do NOT use this sub-skill for:** a developer-only docs site (use plain MDX + git), an admin panel backed by your own DB (build a CRUD UI, don't reach for a CMS), or a CMS migration (that's a data-migration project; call `migration-runner` and `backup-strategy` first).

## What It Does

1. Reads the project's content profile from CENSUS: page types, authoring UX needs, hosting model, query patterns.
2. Routes to a CMS via the decision tree below.
3. Defines the content schema in the CMS's native DSL (Sanity GROQ schema, Contentful content types, Strapi/Contentful/Payload schema files, Storyblok components).
4. Wires the **publish webhook** → revalidation endpoint (Next.js ISR, Gatsby rebuild, Astro on-demand) or full rebuild.
5. Wires **preview mode**: draft content served to authenticated authors via a preview token, never cached on the CDN.
6. Defines draft/published state handling: drafts never reach the public site; published content is CDN-cached and invalidated on next publish.
7. Configures image handling: CDN delivery, responsive `srcset`, lazy loading, format negotiation (WebP/AVIF).
8. Emits `CMS_PLAN.md` with provider, schemas, webhook URL, preview URL, and image pipeline.

## Integration Contract

```
INPUT:
  - census_path: path to CENSUS.md (required)
  - framework: next|gatsby|astro|remix|nuxt|sveltekit (default from CENSUS)
  - hosting: self-hosted|managed (default managed)
  - visual_editing: bool (default false — set true for non-technical authors)

OUTPUT (JSON to stdout):
  {
    "status": "ok|warn|error",
    "cms": "sanity|contentful|strapi|payload|storyblok",
    "schema_path": "cms/schema.<ext>",
    "webhook": {
      "url": "https://api.example.com/api/revalidate",
      "secret_env": "CMS_WEBHOOK_SECRET",
      "events": ["publish","unpublish"]
    },
    "preview": {
      "url": "https://example.com/api/preview?secret=$SECRET&slug=/blog/foo",
      "cookie": "preview-token"
    },
    "images": {
      "cdn": "sanity-cdn|cloudinary|imgix|vercel-image",
      "responsive": ["640","768","1024","1280","1920"],
      "formats": ["avif","webp","original"]
    },
    "plan_path": "CMS_PLAN.md"
  }

SIDE EFFECTS:
  - Writes CMS_PLAN.md to project root
  - Writes cms/schema.<ext> with content type definitions
  - Adds /api/revalidate and /api/preview routes to the app
  - Adds CMS_WEBHOOK_SECRET, CMS_PREVIEW_SECRET, CMS_API_TOKEN to .env.example
```

## CLI

```bash
# Plan the CMS integration
python3 scripts/cms_setup.py plan \
  --census CENSUS.md \
  --framework next \
  --visual-editing

# Generate the schema files in the CMS's native format
python3 scripts/cms_setup.py schema \
  --cms sanity \
  --out cms/schema.ts

# Test the publish → revalidate → CDN purge chain end-to-end
python3 scripts/cms_setup.py verify-chain \
  --webhook-url https://api.example.com/api/revalidate \
  --secret $CMS_WEBHOOK_SECRET \
  --public-url https://example.com/blog/test-post

# Test preview mode (draft content visible to author, not to public)
python3 scripts/cms_setup.py verify-preview \
  --preview-url "https://example.com/api/preview?secret=$SECRET&slug=/blog/test" \
  --public-url https://example.com/blog/test
```

## Decision Tree (autonomous)

```
Q: Who authors content?
  Non-technical marketers/editors (need visual editing)
    → Q: Want real-time collaboration (multiple editors on one doc)?
        YES → CMS = Sanity (real-time, GROQ, live preview, free for most)
        NO  → CMS = Storyblok (visual editor + component-based, good DX)

  Technical authors (developers + occasional PM)
    → Q: Self-hosted or managed?
        Managed, enterprise-grade, structured content focus
          → CMS = Contentful ( pricey but mature, strong content modeling)
        Self-hosted, Node stack, full control
          → Q: Want a database-first or code-first schema?
              Code-first (TypeScript schemas) → CMS = Payload (MongoDB or Postgres)
              Database-first (admin UI built) → CMS = Strapi (auto-generated admin)

Q: Framework?
  Next.js (App Router) → all five work; Sanity and Payload have first-class SDKs
  Astro / Gatsby       → all five work; prefer Sanity (GROQ) or Contentful (GraphQL)
  Remix / Nuxt         → all five work; Payload and Strapi pair well with full-stack

Q: Query pattern?
  Need GraphQL          → Contentful, Payload, Strapi all expose GraphQL
  Need GROQ (powerful)  → Sanity only
  Need REST only        → Strapi, Payload
  Want a typed SDK      → Sanity (@sanity/client + codegen), Payload (auto-typed)

Q: Hosting model?
  CMS-managed (SaaS)    → Sanity, Contentful, Storyblok (no infra to run)
  Self-hosted           → Strapi, Payload (you run the CMS server + DB)

Q: Image pipeline?
  Sanity → use Sanity Image CDN (built-in, free)
  Contentful → use Contentful Images API (built-in)
  Strapi → pair with Cloudinary or imgix (Strapi doesn't ship a CDN)
  Payload → pair with Cloudinary, imgix, or Vercel Image
  Storyblok → use Storyblok's image service (built-in)

Q: Is the publish webhook wired?
  NO → FAIL — content will be stale until manual rebuild; wire the webhook
  YES → continue

Q: Is preview mode configured with a secret?
  NO → FAIL — drafts either leak to public (no preview) or aren't visible (no preview)
  YES → continue

Q: Is CMS HTML sanitized before render?
  NO → FAIL — XSS via rich-text content is the #1 CMS vulnerability
  YES → ok (DOMPurify on web; server-side sanitize for SSR)
```

## Failure Modes & Recovery

| Symptom | Cause | Recovery |
|---------|-------|----------|
| Published content doesn't appear on site | Webhook didn't fire or revalidate failed | Check webhook delivery logs in CMS dashboard; re-fire manually; add a fallback cron job that revalidates every 15 min |
| Draft content visible to public | Preview cookie leaked via CDN cache | Set `Cache-Control: private, no-store` on preview responses; verify CDN bypasses cache when preview cookie present |
| Stale content after webhook fires | CDN edge cache not purged | Send a cache-busting header on revalidate; or use Next.js `revalidatePath` / `revalidateTag` |
| Image optimization slow / expensive | Origin serving full-size images, no CDN | Route images through the CMS image service or Cloudinary; never serve raw uploads from origin |
| XSS via rich-text field | CMS HTML rendered without sanitization | Install `DOMPurify` (client) or `sanitize-html` (server); never `dangerouslySetInnerHTML` raw CMS content |
| Author can't preview draft | Preview secret mismatched or expired | Rotate secret; verify the `/api/preview` route reads the same env var as the CMS webhook config |
| CMS rate limit on rebuild | Webhook fires per field save, not per publish | Debounce: ignore revalidate calls within 5s of each other; or configure CMS to fire only on `publish` events |
| Schema drift between CMS and code | Editor added a field; code doesn't read it | Generate types from CMS schema (Sanity codegen, Contentful CLI); fail CI on type mismatch |
| Payload/Strapi self-hosted CMS goes down | Process crashed or DB unreachable | Health-check the CMS in uptime monitor; route fail traffic to a static fallback; never block reads on the CMS (use CDN-cached responses) |

## Self-Healing Loop

Every plan, verify-chain, and verify-preview run writes a structured record to `OMNIPROJECT_SELF_IMPROVEMENT.md`:
- CMS chosen, webhook latency (publish → revalidate → CDN purge), preview success/failure, schema-drift detections.

`meta-auditor` reads this in Phase 13. Patterns it acts on:
- Webhook latency >30s consistently → `self-patch-generator` adds a fallback cron revalidator (defense in depth).
- Schema drift appearing across projects → add `cms codegen` step to CI that fails on type mismatch.
- XSS reports via CMS content → switch default rich-text renderer to sanitized output; never `dangerouslySetInnerHTML`.

## Quality Gates

- [ ] `CMS_PLAN.md` exists with provider, schemas, webhook, preview, and image pipeline.
- [ ] Publish webhook fires on `publish` and `unpublish` events; revalidate endpoint returns 200 within 5s.
- [ ] Preview mode requires a secret; draft responses have `Cache-Control: private, no-store`.
- [ ] Public site never serves draft content (verified by `verify-preview` end-to-end test).
- [ ] All CMS HTML is sanitized before render (DOMPurify / sanitize-html; CI grep for `dangerouslySetInnerHTML` without sanitizer).
- [ ] Schema is versioned in code (TypeScript schema files, content type exports) and CI fails on drift between code and CMS.
- [ ] Images are served via CDN with responsive `srcset` and lazy loading; never raw uploads from origin.
- [ ] CMS API token and webhook secret are in env vars (never in repo); `.env.example` lists them with placeholders.
- [ ] Self-hosted CMS (Strapi/Payload) has a health check endpoint and an uptime monitor.

## Tools

- **Sanity** — managed, real-time, GROQ query language, code-first schemas in TypeScript; great DX for JS-heavy teams.
- **Contentful** — managed, enterprise, structured content focus, GraphQL + REST; pricey but mature.
- **Strapi** — self-hosted, Node, auto-generated admin UI, REST + GraphQL; database-first.
- **Payload** — self-hosted, Node, code-first TypeScript schemas, MongoDB or Postgres; great for full-stack TS teams.
- **Storyblok** — managed, visual editor (component-based), good for non-technical authors; headless.
- **Next.js ISR / `revalidatePath` / `revalidateTag`** — on-demand revalidation from webhook.
- **Gatsby Cloud / Astro Studio** — webhook-triggered rebuilds for static sites.
- **DOMPurify / sanitize-html / rehype-sanitize** — HTML sanitization; mandatory before rendering CMS rich text.
- **Cloudinary / imgix / Vercel Image** — image CDN for self-hosted CMSes that don't ship one.
- **Sanity Codegen / Contentful CLI / Payload type generation** — sync CMS schema to TypeScript types; fail CI on drift.

## Hard Rules

1. **Never trust CMS content.** All HTML from rich-text fields must be sanitized (DOMPurify, sanitize-html) before render. Never `dangerouslySetInnerHTML` raw CMS content — that's how XSS ships to prod via a marketing intern's blog post.
2. **Always validate the schema in code.** The CMS schema lives in TypeScript (or equivalent); CI generates types from the CMS and fails on drift. An author adding a field shouldn't silently break the front-end.
3. **Always have preview mode before publishing.** Authors must see drafts before they go live. A CMS without preview is a CMS that publishes typos to prod.
4. **Always wire the publish webhook.** Without it, content is stale until the next deploy. The webhook → revalidate → CDN purge chain is the contract between authoring and delivery.
5. **Never serve draft content to the public.** Preview responses carry `Cache-Control: private, no-store` and a signed cookie; CDN must bypass cache when the cookie is present. A leak here is a confidentiality bug.
6. **Never serve images from origin.** Images go through the CMS image service (Sanity, Contentful, Storyblok) or a paired CDN (Cloudinary, imgix, Vercel Image). Responsive `srcset`, lazy loading, and format negotiation (AVIF/WebP) are defaults, not optimizations.
7. **Never hardcode CMS tokens.** API tokens, webhook secrets, and preview secrets live in env vars; `.env.example` documents them with placeholders. CI fails the build if a real token is committed (scanned by `gitleaks`).
8. **Self-hosted CMSes need a fallback.** If Strapi or Payload goes down, the public site must still serve CDN-cached content, not 500. The CMS is a build-time dependency, not a runtime one — once content is on the CDN, the CMS being down is a publishing outage, not a site outage.
