# Production Runbook

## Overview

Runbook for operating the Ibn Al-Azhar Docs production deployment on Vercel.

## Environment Setup

### Prerequisites

- Node.js 22.x (via `nvm`)
- `pnpm` 10.33.4+
- Vercel account (Hobby tier)
- Access to project on Vercel dashboard

### Local Setup

```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use 22
pnpm install
pnpm build
```

### Vercel Project Configuration

| Setting               | Value          |
| --------------------- | -------------- |
| Framework Preset      | Next.js        |
| Build Command         | `pnpm build`   |
| Output Directory      | `.next`        |
| Install Command       | `pnpm install` |
| Root Directory        | `apps/web`     |
| Node.js Version       | 22.x           |
| Environment Variables | See below      |

### Environment Variables

| Variable          | Where      | Example Value                        |
| ----------------- | ---------- | ------------------------------------ |
| `NEXT_PUBLIC_URL` | Vercel Env | `https://ibnalazhar-docs.vercel.app` |

## Production Checklist

### Pre-Deploy

- [ ] `pnpm lint` passes (0 warnings preferred)
- [ ] `pnpm typecheck` passes (0 errors)
- [ ] `pnpm validate` passes (0 errors)
- [ ] `pnpm test` passes (all tests green)
- [ ] `pnpm build` succeeds (all routes generated)
- [ ] All route count matches expected (58)
- [ ] No console errors on any page
- [ ] Arabic and English versions render correctly
- [ ] RTL layout is correct for Arabic pages
- [ ] LTR layout is correct for English pages
- [ ] Reading progress bar works in Chrome, Firefox, Safari
- [ ] TOC scroll spy works correctly
- [ ] Prev/Next navigation works on all doc pages
- [ ] Breadcrumbs render with correct paths
- [ ] Sitemap includes all locales and routes

### Post-Deploy

- [ ] Visit `/ar` — homepage loads
- [ ] Visit `/en` — English homepage loads
- [ ] Visit `/ar/docs` — library loads
- [ ] Visit `/ar/docs/introduction/doc-001-platform-overview` — doc loads
- [ ] Visit `/sitemap.xml` — returns valid XML
- [ ] Visit `/robots.txt` — returns valid rules
- [ ] Check security headers: `curl -I https://site.vercel.app`
- [ ] Check all internal links resolve (no 404s)
- [ ] Verify OpenGraph with: `opengraph.xyz` or Twitter Card Validator

## Operational Checklist

### Daily

- Nothing — fully static platform requires no runtime monitoring

### Weekly

- [ ] Check Vercel dashboard for build errors
- [ ] Verify sitemap is being crawled (Google Search Console)
- [ ] Review dependency updates (`pnpm outdated`)

### Monthly

- [ ] Run `pnpm audit` — review critical vulnerabilities
- [ ] Run full validation suite
- [ ] Check for broken links manually or via crawler
- [ ] Review Vercel Analytics (if enabled) for traffic patterns

### Quarterly

- [ ] Review and update content
- [ ] Run `pnpm update` for dependency refresh
- [ ] Rebuild and verify all routes still generate
- [ ] Review SEO metadata for new content

## Incident Response

Since the platform is fully static with zero runtime services, the incident surface is minimal:

| Incident               | Response                                        |
| ---------------------- | ----------------------------------------------- |
| Build fails            | Check build logs, fix error, re-deploy          |
| Page 404s              | Verify `generateStaticParams` covers all routes |
| Wrong content          | Fix MDX source, re-deploy                       |
| Vercel outage          | Wait for Vercel recovery (SLA 99.99%)           |
| Security vulnerability | Update dependency, re-deploy                    |

## Rollback Procedure

### Instant Rollback (30s)

1. Go to Vercel Dashboard → Deployments
2. Find last known-good deployment
3. Click "..." → "Promote to Production"

### Git Revert (5-10 min)

```bash
git revert HEAD
git push origin main
# Vercel auto-deploys
```

### Manual Redeploy (2 min)

```bash
vercel --prod
```
