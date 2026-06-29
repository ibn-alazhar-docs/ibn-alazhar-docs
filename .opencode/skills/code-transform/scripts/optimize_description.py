#!/usr/bin/env python3
"""optimize_description.py — Optimize SKILL.md description for triggering."""
import argparse, json, re, sys
from pathlib import Path

def parse_frontmatter(p):
    if not p.exists(): return None
    content = p.read_text(encoding="utf-8")
    if not content.startswith("---"): return None
    end = content.find("---",3)
    if end == -1: return None
    result = {}
    for line in content[3:end].strip().split("\n"):
        if ":" in line:
            k,_,v = line.partition(":")
            k = k.strip(); v = v.strip().strip('"').strip("'")
            if k and v: result[k] = v
    return result

def extract_keywords(desc):
    stop = {"the","a","an","and","or","but","in","on","at","to","for","of","with","by","from","is","are","was","were","be","been","have","has","had","do","does","did","will","would","could","should","may","might","must","can","this","that","these","those","i","you","he","she","it","we","they","what","which","who","when","where","why","how","all","both","each","few","more","most","other","some","such","no","nor","not","only","own","same","so","than","too","very","just","don","now","any","if","as","use","using","used"}
    words = re.findall(r"\b[a-zA-Z][a-zA-Z0-9_-]+\b", desc.lower())
    return [w for w in words if w not in stop and len(w)>2]

def predict_trigger(query, keywords):
    ql = query.lower()
    matched = [k for k in keywords if k in ql]
    predicted = len(matched) >= 2
    if not predicted and len(matched) == 1:
        strong = {"perfect","audit","refactor","transform","codebase","architecture","security","testing","observability","rollout"}
        if any(t in matched for t in strong): predicted = True
    return predicted, matched

def main():
    parser = argparse.ArgumentParser(description="Optimize SKILL.md description")
    parser.add_argument("--skill",default="SKILL.md")
    parser.add_argument("--queries",default="evals/trigger_queries_v2.json")
    args = parser.parse_args()
    fm = parse_frontmatter(Path(args.skill))
    if not fm or "description" not in fm: print(f"ERROR: Could not parse",file=sys.stderr); return 1
    desc = fm["description"]
    print("="*60); print("  Description Optimization"); print("="*60)
    print(f"\nCurrent ({len(desc)} chars): {desc[:200]}...\n")
    qp = Path(args.queries)
    if not qp.exists(): print(f"ERROR: {qp} not found",file=sys.stderr); return 1
    queries = json.loads(qp.read_text())
    keywords = extract_keywords(desc)
    tp = fp = fn = tn = 0; failures = []
    for q in queries:
        predicted, matched = predict_trigger(q["query"], keywords)
        should = q["should_trigger"]
        if predicted and should: tp += 1
        elif predicted and not should: fp += 1; failures.append(("FP",q["query"],matched))
        elif not predicted and should: fn += 1; failures.append(("FN",q["query"],matched))
        else: tn += 1
    precision = tp/(tp+fp) if (tp+fp) else 0
    recall = tp/(tp+fn) if (tp+fn) else 0
    f1 = 2*precision*recall/(precision+recall) if (precision+recall) else 0
    acc = (tp+tn)/len(queries) if queries else 0
    print(f"Precision: {precision:.2%}\nRecall:    {recall:.2%}\nF1:        {f1:.2%}\nAccuracy:  {acc:.2%}")
    print(f"TP:{tp} FP:{fp} FN:{fn} TN:{tn}")
    if failures:
        print(f"\nFailures ({len(failures)}):")
        for status, q, m in failures: print(f"  [{status}] \"{q}\"" + (f" matched: {m}" if m else ""))
    return 0

if __name__ == "__main__": sys.exit(main())
