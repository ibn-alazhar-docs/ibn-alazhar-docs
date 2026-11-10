# Decisions

- U17/U18 workers (sweep, no verdict; direct-verified tsc OK both): parity no-op. OCR vs export index.ts differ too much (sweepers+5 stages vs single handler, ports, queue topology) — shared boilerplate is just health-server start + shutdown which are already DRY-ish; extracting a shared bootstrap would be cross-worker new abstraction, not identical-boilerplate dedup. Left as is.

Empty — first entry by the next non-obvious decision.
- U17/U18 workers (sweep, no verdict; direct-verified tsc OK both): parity no-op. Shared boilerplate is just health-server+shutdown pattern; instances differ (ports, queue, sweepers vs handlers) — merging would be behavior-risk, not identical-boilerplate dedup. Left as is.
