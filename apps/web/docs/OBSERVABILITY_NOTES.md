# Observability Notes

## Guiding Principle

"Observability with zero runtime overhead." Since this is a fully static SSG platform, there are no servers to monitor, no endpoints to watch, and no requests to trace.

## Analytics Strategy

### Current: None

No analytics scripts are loaded. Rationale:

- Adds ~20-50KB blocking JS
- Conflicts with privacy expectations for a scholarly platform
- No business case for conversion tracking or user funnels

### Future Lightweight Option: Plausible / Umami

If analytics become desired:

- **Self-hosted Plausible** on a subdomain (e.g., `stats.ibnalazhar-docs.com`)
- **Script size**: ~1KB, no cookies required
- **Data**: page views, referrers, countries — fully anonymous
- **Cost**: ~$9/mo for Cloudflare + Docker, or use Plausible Cloud free trial

### Never

- Google Analytics (heavy, privacy-hostile, blocked by ad-blockers)
- Meta/Facebook pixels
- Heatmaps, session recording
- Third-party tracking of any kind

## Error Monitoring

### Current: None

Since all pages are pre-rendered at build time, runtime errors are exceedingly rare. The error boundary at `app/error.tsx` serves as a graceful fallback.

### When to Add Sentry

Consider Sentry only when:

1. Client-side interactivity is added (search, dynamic features)
2. User accounts are introduced
3. API endpoints exist

Until then, Sentry overhead (~15KB) is not justified.

## Operational Debugging

### Build Logs

Vercel build logs are the primary debugging tool:

- Build output shows `generateStaticParams` results
- Any build error is surfaced immediately in the Vercel dashboard
- `next build --debug` provides detailed timing if needed locally

### Local Debug

```bash
# Full production build locally
NEXT_PUBLIC_URL=http://localhost:3000 pnpm build

# Check bundle sizes
pnpm build && ls -la .next/server/app/**/*.html | wc -l

# Validate all routes exist
pnpm build 2>&1 | grep -E "✓|λ|○"
```

### Health Signals

| Signal               | How to Check                        |
| -------------------- | ----------------------------------- |
| Build succeeds       | `pnpm build` exit code 0            |
| All routes generated | Count `○` (static) routes in output |
| No client JS leaks   | Check `RSC payload` size per page   |
| Sitemap valid        | Visit `/sitemap.xml` in browser     |
| Security headers     | `curl -I https://site.vercel.app`   |

## Monitoring Checklist (Pre-Launch)

- [ ] Build completes with 0 errors
- [ ] All 58 routes render without crash
- [ ] Sitemap includes all routes
- [ ] `/robots.txt` returns correct rules
- [ ] Security headers present on all responses
- [ ] No client JS on static pages (verify per-route)
