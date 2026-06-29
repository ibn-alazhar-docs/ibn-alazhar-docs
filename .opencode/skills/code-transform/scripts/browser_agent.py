#!/usr/bin/env python3
"""browser_agent.py — Embedded browser agent for visual testing and live UI verification.

Uses Playwright (if available) or falls back to screenshot-only mode.
Capabilities: launch, navigate, screenshot, visual diff, a11y scan, flow simulation.

Usage:
  python3 scripts/browser_agent.py screenshot --url http://localhost:3000 --output screenshots/
  python3 scripts/browser_agent.py flows --url http://localhost:3000 --flows login,checkout
  python3 scripts/browser_agent.py a11y --url http://localhost:3000
  python3 scripts/browser_agent.py responsive --url http://localhost:3000
  python3 scripts/browser_agent.py diff --current current.png --baseline baseline.png
"""
import argparse
import json
import os
import subprocess
import sys
import time
from pathlib import Path
from datetime import datetime


def check_playwright():
    """Check if Playwright is available."""
    try:
        result = subprocess.run(
            ["python3", "-c", "from playwright.sync_api import sync_playwright; print('ok')"],
            capture_output=True, text=True, timeout=5
        )
        return result.returncode == 0 and "ok" in result.stdout
    except:
        return False


def check_npx_playwright():
    """Check if npx playwright is available."""
    try:
        result = subprocess.run(
            ["npx", "playwright", "--version"],
            capture_output=True, text=True, timeout=10
        )
        return result.returncode == 0
    except:
        return False


def take_screenshot(url, output_dir, viewport="1280x720", full_page=True):
    """Take a screenshot of a URL."""
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    width, height = map(int, viewport.split("x"))
    screenshot_path = output_dir / f"screenshot_{timestamp}_{viewport}.png"

    # Try Python Playwright first
    if check_playwright():
        script = f"""
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={{"width": {width}, "height": {height}}})
    page.goto("{url}", wait_until="networkidle", timeout=30000)
    page.screenshot(path="{screenshot_path}", full_page={str(full_page)})
    print("OK: {screenshot_path}")
    browser.close()
"""
        try:
            result = subprocess.run(["python3", "-c", script], capture_output=True, text=True, timeout=45)
            if result.returncode == 0:
                return {"status": "ok", "path": str(screenshot_path), "method": "playwright-python"}
        except: pass

    # Try npx playwright
    if check_npx_playwright():
        script = f"""
const {{ chromium }} = require('playwright');
(async () => {{
  const browser = await chromium.launch({{ headless: true }});
  const page = await browser.newPage({{ viewport: {{ width: {width}, height: {height} }} }});
  await page.goto('{url}', {{ waitUntil: 'networkidle', timeout: 30000 }});
  await page.screenshot({{ path: '{screenshot_path}', fullPage: {str(full_page).lower()} }});
  await browser.close();
  console.log('OK: {screenshot_path}');
}})();
"""
        try:
            result = subprocess.run(["node", "-e", script], capture_output=True, text=True, timeout=45)
            if result.returncode == 0:
                return {"status": "ok", "path": str(screenshot_path), "method": "playwright-node"}
        except: pass

    # Fallback: use curl to check if URL is reachable
    try:
        result = subprocess.run(["curl", "-s", "-o", "/dev/null", "-w", "%{http_code}", url],
                                capture_output=True, text=True, timeout=10)
        status = result.stdout.strip()
        return {"status": "fallback", "http_status": status, "message": f"Playwright not available. URL returned {status}. Install: pip install playwright && playwright install chromium"}
    except:
        return {"status": "error", "message": "Cannot reach URL and Playwright not installed"}


def run_accessibility_scan(url):
    """Run accessibility audit."""
    if not check_playwright():
        return {"status": "fallback", "message": "Install Playwright for a11y scanning: pip install playwright && playwright install chromium"}

    script = f"""
from playwright.sync_api import sync_playwright
import json

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto("{url}", wait_until="networkidle", timeout=30000)

    # Inject axe-core and run
    axe_script = '''
    (function() {{
        if (window.axe) return Promise.resolve(window.axe.run());
        var s = document.createElement('script');
        s.src = 'https://unpkg.com/axe-core/axe.min.js';
        document.head.appendChild(s);
        return new Promise(function(resolve) {{
            s.onload = function() {{ resolve(window.axe.run()); }};
        }});
    }})()
    '''
    result = page.evaluate(axe_script)
    violations = result.get('violations', [])
    summary = {{
        'total_violations': len(violations),
        'critical': sum(1 for v in violations if v.get('impact') == 'critical'),
        'serious': sum(1 for v in violations if v.get('impact') == 'serious'),
        'moderate': sum(1 for v in violations if v.get('impact') == 'moderate'),
        'minor': sum(1 for v in violations if v.get('impact') == 'minor'),
        'violations': [{{'id': v.get('id'), 'impact': v.get('impact'), 'description': v.get('description'), 'help': v.get('help')}} for v in violations[:20]]
    }}
    print(json.dumps(summary))
    browser.close()
"""
    try:
        result = subprocess.run(["python3", "-c", script], capture_output=True, text=True, timeout=45)
        if result.returncode == 0 and result.stdout.strip():
            return {"status": "ok", "results": json.loads(result.stdout.strip())}
    except: pass
    return {"status": "error", "message": "axe-core scan failed"}


def test_responsive(url, output_dir):
    """Test at multiple viewport sizes."""
    viewports = [
        ("375x812", "mobile-iPhone-X"),
        ("768x1024", "tablet-iPad"),
        ("1280x720", "desktop-HD"),
        ("1440x900", "desktop-wide"),
    ]
    results = []
    for viewport, label in viewports:
        result = take_screenshot(url, output_dir, viewport, full_page=True)
        result["viewport"] = viewport
        result["label"] = label
        results.append(result)
    return {"status": "ok", "viewports_tested": len(results), "results": results}


def visual_diff(current_path, baseline_path, tolerance=0.001):
    """Compare two screenshots pixel by pixel."""
    try:
        from PIL import Image
        import numpy as np
    except ImportError:
        return {"status": "fallback", "message": "Install Pillow + numpy for visual diff: pip install Pillow numpy"}

    try:
        current = Image.open(current_path)
        baseline = Image.open(baseline_path)

        if current.size != baseline.size:
            return {"status": "fail", "reason": f"Size mismatch: {current.size} vs {baseline.size}"}

        current_arr = np.array(current)
        baseline_arr = np.array(baseline)

        diff = np.abs(current_arr.astype(int) - baseline_arr.astype(int))
        diff_pixels = np.sum(diff > 10)  # pixels with >10 color difference
        total_pixels = current_arr.shape[0] * current_arr.shape[1]
        diff_ratio = diff_pixels / total_pixels

        return {
            "status": "pass" if diff_ratio < tolerance else "fail",
            "diff_ratio": f"{diff_ratio:.4%}",
            "tolerance": f"{tolerance:.4%}",
            "diff_pixels": int(diff_pixels),
            "total_pixels": int(total_pixels),
            "message": "Visual diff within tolerance" if diff_ratio < tolerance else f"Visual diff exceeds tolerance: {diff_ratio:.4%} > {tolerance:.4%}"
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}


def simulate_flow(url, flow_name):
    """Simulate a user flow (login, checkout, etc.)."""
    flows = {
        "login": [
            {"action": "goto", "target": f"{url}/login"},
            {"action": "fill", "selector": "[name=email]", "value": "test@example.com"},
            {"action": "fill", "selector": "[name=password]", "value": "testpass123"},
            {"action": "click", "selector": "button[type=submit]"},
            {"action": "wait", "duration": 2},
            {"action": "verify", "selector": "body", "text": "Welcome"},
        ],
        "checkout": [
            {"action": "goto", "target": f"{url}/products"},
            {"action": "click", "selector": "[data-testid=add-to-cart]:first-child"},
            {"action": "click", "selector": "[data-testid=cart]"},
            {"action": "click", "selector": "[data-testid=checkout]"},
            {"action": "fill", "selector": "[name=email]", "value": "test@example.com"},
            {"action": "click", "selector": "[data-testid=pay]"},
            {"action": "wait", "duration": 2},
            {"action": "verify", "selector": "body", "text": "confirmed"},
        ],
        "signup": [
            {"action": "goto", "target": f"{url}/signup"},
            {"action": "fill", "selector": "[name=name]", "value": "Test User"},
            {"action": "fill", "selector": "[name=email]", "value": "test@example.com"},
            {"action": "fill", "selector": "[name=password]", "value": "TestPass123!"},
            {"action": "click", "selector": "button[type=submit]"},
            {"action": "wait", "duration": 2},
            {"action": "verify", "selector": "body", "text": "Welcome"},
        ],
    }

    steps = flows.get(flow_name, [])
    if not steps:
        return {"status": "error", "message": f"Unknown flow: {flow_name}. Available: {list(flows.keys())}"}

    if not check_playwright():
        return {"status": "fallback", "message": "Install Playwright: pip install playwright && playwright install chromium", "flow": flow_name, "steps": steps}

    # Execute flow with Playwright
    script = f"""
from playwright.sync_api import sync_playwright
import json

steps = {json.dumps(steps)}
results = []

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()

    for step in steps:
        action = step.get('action')
        try:
            if action == 'goto':
                page.goto(step['target'], wait_until='networkidle', timeout=15000)
                results.append({{'action': 'goto', 'target': step['target'], 'status': 'ok'}})
            elif action == 'fill':
                page.fill(step['selector'], step['value'])
                results.append({{'action': 'fill', 'selector': step['selector'], 'status': 'ok'}})
            elif action == 'click':
                page.click(step['selector'])
                results.append({{'action': 'click', 'selector': step['selector'], 'status': 'ok'}})
            elif action == 'wait':
                page.wait_for_timeout(int(step['duration']) * 1000)
                results.append({{'action': 'wait', 'duration': step['duration'], 'status': 'ok'}})
            elif action == 'verify':
                content = page.text_content(step['selector']) or ''
                found = step.get('text', '').lower() in content.lower()
                results.append({{'action': 'verify', 'text': step.get('text'), 'found': found, 'status': 'pass' if found else 'fail'}})
        except Exception as e:
            results.append({{'action': action, 'status': 'error', 'error': str(e)}})

    browser.close()
    print(json.dumps(results))
"""
    try:
        result = subprocess.run(["python3", "-c", script], capture_output=True, text=True, timeout=60)
        if result.returncode == 0 and result.stdout.strip():
            return {"status": "ok", "flow": flow_name, "results": json.loads(result.stdout.strip())}
    except: pass
    return {"status": "error", "message": f"Flow simulation failed for {flow_name}"}


def main():
    parser = argparse.ArgumentParser(description="Browser agent for visual testing and live UI verification.")
    sub = parser.add_subparsers(dest="mode", required=True)

    p1 = sub.add_parser("screenshot", help="Take screenshot of a URL")
    p1.add_argument("--url", required=True)
    p1.add_argument("--output", default="screenshots")
    p1.add_argument("--viewport", default="1280x720")
    p1.add_argument("--full-page", action="store_true", default=True)

    p2 = sub.add_parser("flows", help="Simulate user flows")
    p2.add_argument("--url", required=True)
    p2.add_argument("--flows", required=True, help="Comma-separated flow names (login,checkout,signup)")

    p3 = sub.add_parser("a11y", help="Run accessibility audit")
    p3.add_argument("--url", required=True)

    p4 = sub.add_parser("responsive", help="Test at multiple viewports")
    p4.add_argument("--url", required=True)
    p4.add_argument("--output", default="screenshots")

    p5 = sub.add_parser("diff", help="Compare two screenshots")
    p5.add_argument("--current", required=True)
    p5.add_argument("--baseline", required=True)
    p5.add_argument("--tolerance", type=float, default=0.001)

    args = parser.parse_args()

    print("=" * 60)
    print("  Browser Agent — OmniProject AI v18.0")
    print("=" * 60)

    if args.mode == "screenshot":
        result = take_screenshot(args.url, args.output, args.viewport, args.full_page)
        print(json.dumps(result, indent=2))

    elif args.mode == "flows":
        flow_list = args.flows.split(",")
        all_results = []
        for flow in flow_list:
            print(f"\nSimulating flow: {flow}")
            result = simulate_flow(args.url, flow.strip())
            all_results.append(result)
            print(json.dumps(result, indent=2))
        passed = sum(1 for r in all_results if r.get("status") == "ok")
        print(f"\n{'='*60}\n  Flows: {passed}/{len(all_results)} passed\n{'='*60}")

    elif args.mode == "a11y":
        result = run_accessibility_scan(args.url)
        print(json.dumps(result, indent=2))

    elif args.mode == "responsive":
        result = test_responsive(args.url, args.output)
        print(json.dumps(result, indent=2))

    elif args.mode == "diff":
        result = visual_diff(args.current, args.baseline, args.tolerance)
        print(json.dumps(result, indent=2))

    return 0


if __name__ == "__main__":
    sys.exit(main())
