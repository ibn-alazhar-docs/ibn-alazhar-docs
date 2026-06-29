#!/usr/bin/env python3
"""synthesize_tool.py — Tool synthesis: create reusable recipes from transforms."""
import argparse, json, re, sys
from pathlib import Path
from datetime import datetime

RECIPES_DIR = Path("recipes")
REGISTRY = RECIPES_DIR / "registry.json"

def load_reg():
    if not REGISTRY.exists(): return {"recipes":[]}
    return json.loads(REGISTRY.read_text())

def save_reg(r):
    RECIPES_DIR.mkdir(parents=True, exist_ok=True)
    REGISTRY.write_text(json.dumps(r, indent=2))

def extract_kw(text):
    stop = {"the","a","an","and","or","to","in","on","at","for","of","with","by"}
    words = re.findall(r"\b[a-zA-Z][a-zA-Z0-9_-]+\b", text.lower())
    return list(dict.fromkeys(w for w in words if w not in stop and len(w)>2))[:10]

def create_recipe(name, category, desc=""):
    RECIPES_DIR.mkdir(parents=True, exist_ok=True)
    content = f"# Recipe: {name}\n\n## When to Use\n- Category: {category}\n- Created: {datetime.now().isoformat()}\n\n## Input Pattern\n```\n(input code)\n```\n\n## Output Pattern\n```\n(output code)\n```\n\n## Steps\n1. {desc or 'Identify pattern'}\n2. Apply transformation\n3. Verify with tests\n\n## Metadata\n- Times applied: 1\n- Success rate: 1.0\n"
    rf = RECIPES_DIR / f"{name}.md"
    rf.write_text(content)
    return {"name":name,"category":category,"first_seen":datetime.now().isoformat(),"times_applied":1,"success_rate":1.0,"file":str(rf),"keywords":extract_kw(name+" "+desc)}

def main():
    parser = argparse.ArgumentParser(description="Tool synthesis")
    parser.add_argument("--list",action="store_true"); parser.add_argument("--search")
    parser.add_argument("--create",action="store_true"); parser.add_argument("--name")
    parser.add_argument("--category",default="general"); parser.add_argument("--reflect",action="store_true")
    parser.add_argument("--transform-log")
    args = parser.parse_args()
    reg = load_reg()
    if args.list:
        print(f"Recipes ({len(reg['recipes'])}):")
        for r in reg["recipes"]: print(f"  - {r['name']} ({r['category']}) — {r['times_applied']}x")
        return 0
    if args.search:
        qk = set(extract_kw(args.search)); results = []
        for r in reg["recipes"]:
            if args.search.lower() in r["name"].lower(): results.append((r,1.0)); continue
            overlap = len(qk & set(r.get("keywords",[])))
            if overlap: results.append((r, overlap/max(len(qk),1)))
        results.sort(key=lambda x:-x[1])
        if not results: print(f"No recipes match '{args.search}'"); return 0
        for r,s in results: print(f"  [{s:.0%}] {r['name']}")
        return 0
    if args.create:
        if not args.name: print("ERROR: --name required",file=sys.stderr); return 1
        recipe = create_recipe(args.name, args.category)
        reg["recipes"].append(recipe); save_reg(reg)
        print(f"✓ Created: {recipe['file']}"); return 0
    if args.reflect:
        if not args.transform_log: print("ERROR: --transform-log required",file=sys.stderr); return 1
        log = json.loads(Path(args.transform_log).read_text())
        existing = [r for r in reg["recipes"] if r["name"] == log.get("recipe","")]
        if existing: print(f"Recipe '{log.get('recipe')}' already exists"); return 0
        if args.name:
            recipe = create_recipe(args.name, args.category, log.get("description",""))
            reg["recipes"].append(recipe); save_reg(reg)
            print(f"✓ Created: {recipe['file']}"); return 0
        print(f"Would synthesize: {log.get('recipe','?')}"); return 0
    parser.print_help(); return 0

if __name__ == "__main__": sys.exit(main())
