# Debugging Methodology — Scientific Debugging, RCA, Hypothesis Trees

> Read this when fixing bugs (TRANSFORM mode for bug fixes). Never debug without a hypothesis.

## Table of Contents
1. [Scientific Debugging Method](#scientific-debugging-method)
2. [Root Cause Analysis (5 Whys)](#root-cause-analysis-5-whys)
3. [Bisection Debugging](#bisection-debugging)
4. [Hypothesis Trees for Weak Models](#hypothesis-trees-for-weak-models)

---

## Scientific Debugging Method

### The 5 Steps
1. **Observe the symptom**: what exactly happens? Reproduce reliably.
2. **Form a hypothesis**: what could cause this? Rank by likelihood.
3. **Predict**: if the hypothesis is true, what else would be true?
4. **Test**: check the prediction. Does it confirm or deny the hypothesis?
5. **Conclude**: fix the root cause, not the symptom.

### NEVER Skip the Hypothesis
"Let me try changing this" is NOT debugging — it's guessing. Always have a hypothesis first.

### Example
```
Symptom: User report "order total is wrong sometimes"
Hypothesis 1: Rounding error in tax calculation
  Prediction: if true, the error would be off by ≤1 cent
  Test: check the last 100 orders — the error is off by $50+
  Conclusion: NOT a rounding error. Hypothesis denied.

Hypothesis 2: Bulk discount not applied for some orders
  Prediction: if true, the affected orders would have quantity >100
  Test: check affected orders — all have quantity 101
  Conclusion: Confirmed. Bulk discount check is `> 100`, but quantity 101 should get it.
  Root cause: the condition is `> 100` but should be `>= 100` (off-by-one)
  Fix: change `>` to `>=` in the bulk discount condition
  Process fix: add a test for boundary case (quantity = 100, 101)
```

---

## Root Cause Analysis (5 Whys)

After finding the immediate cause, ask "Why?" 5 times to find the root cause:

```
Bug: bulk discount not applied for quantity 101

Why 1: The condition is `> 100` instead of `>= 100`
Why 2: The developer who wrote it assumed "over 100" meant "> 100"
Why 3: There was no test for the boundary case
Why 4: The testing checklist doesn't include boundary cases for discount tiers
Why 5: There is no testing checklist — tests are written ad hoc

Root cause: No standardized testing checklist for boundary cases.
Fix: 1. Fix the immediate bug (`>` → `>=`)
     2. Add boundary tests (quantity 99, 100, 101)
     3. Create a testing checklist that includes boundary cases for all discount tiers
     4. Apply the checklist to all existing discount logic
```

---

## Bisection Debugging

When a bug appeared but you don't know which commit caused it:

```bash
git bisect start
git bisect bad HEAD          # current commit has the bug
git bisect good v1.0.0       # this version didn't have the bug
# Git checks out the midpoint
# Test: does this commit have the bug?
git bisect good  # or: git bisect bad
# Git narrows down. Repeat until it finds the culprit.
git bisect reset
```

**O(log n) commits** to find the culprit. For 1000 commits, ~10 tests.

---

## Hypothesis Trees for Weak Models

Weak models can't reliably debug open-ended. Use a structured hypothesis tree:

```
Step 1: Present the symptom
"The order total is $50 higher than expected for quantity 101"

Step 2: Generate 3 hypotheses (ranked by likelihood)
H1 (60%): Bulk discount not applied (most likely — quantity 101 is near the 100 threshold)
H2 (25%): Tax calculated on pre-discount amount (possible — would explain higher total)
H3 (15%): Shipping cost wrong (less likely — usually a flat fee)

Step 3: Check each hypothesis with a specific test
H1: Check if the bulk discount (10%) was applied for quantity 101
    → Test: log the discount applied for order #12345
    → Result: discount = 0%. HYPOTHESIS CONFIRMED.

Step 4: Fix the confirmed root cause
The condition `if quantity > 100` should be `if quantity >= 100`

Step 5: Verify the fix
Test: order with quantity 101 now gets 10% discount
Test: order with quantity 100 still gets no discount (boundary preserved)

Step 6: Process fix (prevent the class of bug)
Add boundary tests for all discount tiers (50, 51, 100, 101)
```

---

## Debugging Anti-Patterns

### AP-D1. Shotgun Debugging
Changing random things hoping something works. **Never do this.** Always have a hypothesis.

### AP-D2. Fixing Symptoms
```python
# BAD: catching the exception and returning a default
try:
    total = calculate_total(order)
except:
    total = 0  # ← symptom fixed, bug persists

# GOOD: find and fix the root cause
total = calculate_total(order)  # fix the function so it doesn't throw
```

### AP-D3. Debugging in Production
Adding `print()` statements to production code. **Use structured logging** with adjustable log levels.

### AP-D4. Ignoring Intermittent Failures
"It works on my machine" — the bug is real, you just can't reproduce it yet. Keep investigating.

---

## Summary

- **Scientific method**: observe → hypothesize → predict → test → conclude. Never skip the hypothesis.
- **5 Whys**: ask "why" 5 times to find the root cause, not just the immediate cause.
- **Bisection**: `git bisect` to find the commit that introduced the bug. O(log n) tests.
- **Hypothesis trees for weak models**: generate 3 ranked hypotheses, test each, fix the confirmed one.
- **Fix the process**: after fixing the bug, ask "what in our process allowed this?" Add a test, improve the type system, create a checklist.
- **Bug fixes are `fix:` commits**, never `refactor:`.
