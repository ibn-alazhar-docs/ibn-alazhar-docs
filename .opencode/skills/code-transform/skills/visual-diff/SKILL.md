---
name: visual-diff
description: "Compare two screenshots pixel-by-pixel and quantify the visual difference. Detects layout shifts, color changes, missing/added elements, and font regressions. Triggers in Phase 6 (visual guard after every UI change), Phase 9 (acceptance baseline), and Phase 13 (visual heuristic learning)."
license: MIT
metadata:
  version: "1.0"
  author: OmniProject AI
  category: browser-acceptance
---

# Visual Diff

> "I changed one button color" should not silently shift the entire layout by 4px. This sub-skill catches visual regressions that text-based tests miss.

## When to Use

| Trigger                     | Example                                                      |
| --------------------------- | ------------------------------------------------------------ |
| Phase 6 — Visual Guard      | "I refactored the LoginForm" → diff before/after             |
| Phase 9 — Acceptance        | Compare against design spec / Figma reference                |
| Phase 11 — Pre-deploy       | Diff staging vs production screenshots                       |
| Phase 13 — Self-improvement | "Were visual diffs too noisy this run? Tighten sensitivity." |
| Bug report                  | "Looks broken on Chrome" → diff Chrome vs Firefox render     |

**Do NOT use this for:** taking screenshots (use `screenshot-capture`), a11y audits (use `accessibility-auditor`), responsive sweeps (use `responsive-validator`). This sub-skill compares **two existing images** — it does not capture them.

## What It Does

1. Takes two images: `current` (after change) and `baseline` (before change, or design reference)
2. Resizes both to identical dimensions (if different — preserve aspect ratio, pad with white)
3. Computes pixel-level diff using one of:
   - **Pixelmatch** (default) — fast, per-pixel comparison with anti-aliasing awareness
   - **SSIM** (structural similarity) — slower but better for catching layout shifts vs color tweaks
   - **Hash-based** (pHash) — fastest, for "is this image totally different" checks
4. Produces three outputs:
   - **Diff image** — red where pixels differ, transparent where they match
   - **Diff percentage** — what fraction of pixels changed
   - **Diff regions** — bounding boxes of changed areas, with sizes
5. Applies configurable tolerance:
   - Pixel tolerance (default 0.1% — i.e. 1 in 1000 pixels can differ)
   - Color tolerance (default ΔE < 2.0 in Lab color space — invisible to humans)
   - Region tolerance (ignore changes smaller than 10×10 px — often anti-aliasing artifacts)
6. Returns verdict: PASS (within tolerance), WARN (close to threshold), FAIL (regression)

## Integration Contract

```
INPUT:
  - current: path to PNG (required)
  - baseline: path to PNG (required) — OR --baseline-dir for auto-discovery
  - tolerance: float (default 0.001 = 0.1% pixel diff)
  - color-tolerance: float (default 2.0 = Lab ΔE)
  - min-region-size: int (default 100 = 10×10 px — ignore smaller diffs)
  - algorithm: pixelmatch|ssim|phash (default pixelmatch)
  - ignore-regions: optional JSON of [{x,y,w,h}] to mask out (e.g. ads, timestamps)
  - output-dir: where to write diff image (default /screenshots/diffs/)

OUTPUT (JSON to stdout):
  {
    "status": "pass|warn|fail",
    "diff_percentage": 0.0003,
    "pixel_threshold": 0.001,
    "verdict": "pass",
    "diff_image": "/screenshots/diffs/login-form-2026-06-29T00-12.png",
    "diff_regions": [
      {"x": 245, "y": 412, "w": 18, "h": 8, "pixels_changed": 124, "cause": "text_anti_aliasing"}
    ],
    "summary": "0.03% pixels changed (below 0.1% threshold) — likely anti-aliasing",
    "algorithm": "pixelmatch",
    "duration_ms": 412
  }
```

## Diff Algorithms (when to use which)

| Algorithm                        | Best for                                                        | Speed            | Sensitivity                                 |
| -------------------------------- | --------------------------------------------------------------- | ---------------- | ------------------------------------------- |
| **Pixelmatch** (default)         | Most cases — fast, catches everything                           | ~50ms per image  | High (per-pixel)                            |
| **SSIM**                         | Layout shifts where pixel diff is misleading (e.g. text reflow) | ~200ms per image | Medium (structural)                         |
| **pHash**                        | "Did the page totally change?" triage                           | ~10ms per image  | Low (perceptual hash)                       |
| **Combined** (Pixelmatch + SSIM) | Production acceptance                                           | ~250ms per image | Highest (catches both pixel and structural) |

Default to Pixelmatch. Switch to SSIM when:

- Pixel diff is > 5% but the page looks identical to a human (likely anti-aliasing or font rendering)
- You're testing a redesign where you expect color changes but want to catch layout shifts

## Tolerance Tuning

The hardest part of visual diffing is setting tolerance — too strict, every run fails on anti-aliasing noise; too loose, real bugs slip through.

| Tolerance knob         | Default      | When to tighten                            | When to loosen                                  |
| ---------------------- | ------------ | ------------------------------------------ | ----------------------------------------------- |
| `tolerance` (pixel %)  | 0.001 (0.1%) | After 3+ false positives in a row → 0.0005 | If legit changes are flagged → 0.005            |
| `color-tolerance` (ΔE) | 2.0          | For dark-mode testing → 1.0                | For non-color-critical apps → 5.0               |
| `min-region-size`      | 100 px²      | For icon-sized UI → 25 px²                 | For dashboard with many small widgets → 400 px² |

**Auto-tune mode** (set `--auto-tune`): the validator learns from past runs. If a baseline+current pair gets 5+ "false positive" reports from the user/meta-auditor, it bumps tolerance for that specific route automatically. Logged in `OMNIPROJECT_SELF_IMPROVEMENT.md`.

## CLI

```bash
# Basic diff
python3 scripts/browser_agent.py diff \
  --current /screenshots/login-after.png \
  --baseline /screenshots/login-before.png

# Auto-discover baseline by URL+viewport
python3 scripts/browser_agent.py diff \
  --current /screenshots/login-2026-06-29.png \
  --baseline-dir /screenshots/baselines/ \
  --route /login \
  --viewport 1280x720

# Strict mode (for production acceptance)
python3 scripts/browser_agent.py diff \
  --current current.png --baseline baseline.png \
  --tolerance 0.0001 --color-tolerance 1.0

# Mask out dynamic regions (timestamps, ads, avatars)
python3 scripts/browser_agent.py diff \
  --current current.png --baseline baseline.png \
  --ignore-regions '[{"x":0,"y":0,"w":200,"h":50},{"x":800,"y":600,"w":120,"h":120}]'

# Use SSIM for layout-shift detection
python3 scripts/browser_agent.py diff \
  --current current.png --baseline baseline.png \
  --algorithm ssim

# Auto-tune mode (learns from history)
python3 scripts/browser_agent.py diff \
  --current current.png --baseline baseline.png \
  --auto-tune
```

## Baseline Management

Baselines live in `/screenshots/baselines/<route>/<viewport>.png`. Naming convention:

```
screenshots/baselines/
  login/
    375x812.png
    768x1024.png
    1280x720.png
    1440x900.png
  dashboard/
    375x812.png
    ...
```

Operations:

```bash
# Capture baseline (Phase 4 or first Phase 6 run)
python3 scripts/browser_agent.py baseline --route /login --viewports mobile,desktop

# Update baseline after intentional redesign
python3 scripts/browser_agent.py baseline-update --route /login --current /screenshots/login-new.png

# Delete stale baselines (after route removal)
python3 scripts/browser_agent.py baseline-remove --route /old-page
```

**Hard rule**: baseline updates require a commit message starting with `design:` (e.g. `design(login): new button color`). This prevents accidental baseline drift.

## Common Diff Patterns & Their Meanings

| Pattern in diff image                           | Likely cause                 | Action                                                |
| ----------------------------------------------- | ---------------------------- | ----------------------------------------------------- |
| Single small region, text-shaped                | Text content changed         | Check if intentional (data) or regression (hardcoded) |
| Full-width stripe at top/bottom                 | Header/footer height changed | Likely a CSS regression — check padding               |
| Scattered single pixels                         | Anti-aliasing noise          | Below threshold — ignore                              |
| Large region, color-only                        | Theme color changed          | Check if intentional (dark mode toggle?)              |
| Shifted region (same shape, different position) | Layout shift                 | Real regression — find the CSS change                 |
| Missing element region (transparent in current) | Element not rendered         | Critical — check console errors                       |
| Added element region (transparent in baseline)  | New element appeared         | Check if intentional feature                          |

## Failure Modes & Recovery

| Symptom                                                | Cause                                   | Recovery                                                |
| ------------------------------------------------------ | --------------------------------------- | ------------------------------------------------------- |
| 100% diff (every pixel changed)                        | Images are different sizes after resize | Check viewport consistency — same viewport for both?    |
| Diff image is all red but page looks identical         | Anti-aliasing or sub-pixel rendering    | Switch to SSIM, or increase color-tolerance             |
| Diff image shows nothing but `diff_percentage` is high | Ignore regions covering the changes     | Re-examine ignore-regions — too aggressive?             |
| Baseline not found                                     | First run on this route                 | Auto-capture baseline, mark as "new" (not a regression) |
| `FileNotFoundError` on current.png                     | Screenshot capture failed               | Route to `screenshot-capture` first                     |

## Self-Healing Loop

When diff FAILS:

1. Identify diff regions (bounding boxes)
2. For each region, classify the cause (text change? color change? layout shift? missing element?)
3. If text change → check if data-driven (acceptable) or hardcoded (regression)
4. If layout shift → find the offending CSS rule, route to `frontend-bridge`
5. If missing element → check console errors, route to `debug-entry`
6. If color change → check if intentional (commit message has `design:`) or accidental
7. After fix: re-capture current, re-diff, repeat until PASS
8. Max 3 self-heal attempts, then escalate to user

## Quality Gates

- [ ] Diff image generated (visual evidence)
- [ ] Diff percentage below threshold
- [ ] No critical regions (missing elements) detected
- [ ] Baseline exists for this route+viewport (or marked as "new route")
- [ ] Diff regions classified (each has a `cause`)

## Phase 6 Visual Guard (the main use case)

After every UI commit in Phase 6:

```
1. Identify routes affected by the change (via git diff)
2. For each route + viewport pair:
   a. Capture current screenshot (via screenshot-capture)
   b. Run visual-diff against baseline
   c. If PASS: continue
   d. If WARN: log, continue (low-priority)
   e. If FAIL: halt commit, run self-heal loop
3. If all routes PASS: commit (include diff images in commit body)
4. If intentional redesign: update baseline, commit with `design:` prefix
```

This is the **Visual Guard** mentioned in SKILL.md Phase 6. Without `visual-diff`, "I changed the button" can silently break the layout — text-based tests don't catch this.

## Tools

- **Pixelmatch** (Python `pixelmatch` package) — default algorithm
- **Pillow** — for image loading, resizing, diff image generation
- **scikit-image** (optional) — for SSIM
- **imagehash** (optional) — for pHash

All deps are pure Python, installable via `pip install pixelmatch pillow`. SSIM/imagehash only needed for those specific algorithms.

## Hard Rules

1. **Never diff images of different sizes without resizing.** Will produce 100% false positive.
2. **Never ignore the diff image.** A 0.05% diff in the wrong place (e.g. header height) is a real bug.
3. **Never update baselines without a `design:` commit.** Accidental baseline drift hides real regressions.
4. **Never trust a single diff algorithm for production.** Run combined (Pixelmatch + SSIM) for Phase 9 acceptance.
5. **Always log diff regions with causes.** "0.5% diff" is unactionable; "header height changed by 4px" is actionable.
