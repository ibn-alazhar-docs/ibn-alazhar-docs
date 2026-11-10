# E2E fixture PDFs

Minimal committed fixtures for Playwright E2E tests.

- `sample.pdf` — 1-page text PDF used by `pipeline-smoke.test.ts` and as fallback for `comprehensive-journey` / `e2e-scenarios` when the larger Arabic source PDF is not present.

The larger Arabic source PDFs historically downloaded manually are not committed; specs fall back to `sample.pdf` or `test.skip` when no PDF is present.
