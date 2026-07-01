# AI Failure Modes — 14 LLM-Specific Output Errors

> Read this during Phase 3 (CRITIQUE). These are systematic errors LLMs make that human engineers rarely make. A function can pass all code-smell checks and still ship a hallucinated package or swallow an error.

## The 14 AI Failure Modes

### AFM1. Catch-All Error Swallowing

`try: ... except Exception: pass` — LLMs add this "defensively." Silently hides real errors.
**Fix**: catch specific exceptions. Log or re-raise everything else.

### AFM2. Defensive Guards for Impossible Cases

`if x is None:` when the type system guarantees `x` is non-null. Dead code that misleads.
**Fix**: if the type guarantees it, don't guard. Fix the type if it doesn't.

### AFM3. Package/API Hallucination

`import pyyaml_loader` (doesn't exist). USENIX 2025: 19.6% of LLM-suggested packages are hallucinated.
**Fix**: verify packages exist before importing. Never invent package names.

### AFM4. Mock-Fallback "Declare Success"

Real test fails → LLM swaps in a mock that always passes → "success!" — verified nothing.
**Fix**: mocks isolate the unit under test, not make tests pass. If test only passes with mocks, something is wrong.

### AFM5. Copy-From-Similar Off-By-Ones

Copies a pattern but gets the boundary wrong: `>` instead of `>=`, off-by-one in slice indices.
**Fix**: after copying, verify boundary conditions. Test boundary cases (0, 1, len-1, len, len+1).

### AFM6. Comment Pollution

Comments that restate code (`# Increment i by 1`), stale TODOs, "explain WHAT" comments.
**Fix**: comments explain WHY, not WHAT. Delete WHAT comments. Implement or remove TODOs.

### AFM7. Premature Abstraction

Interface with one implementation, Strategy pattern for 2 branches, "for future flexibility."
**Fix**: YAGNI. Wait for the 3rd occurrence (Rule of 3). Exception: repository interfaces for testability.

### AFM8. Generic Naming

`data`, `result`, `process`, `handle`, `Manager`, `Helper`, `Util`, `info`, `obj`, `thing`.
**Fix**: names state intent. `activeUsers` not `filteredArray`. `parseDate` not `doLoop`.

### AFM9. Dead Code / Half-Implementations

Unused functions, unreachable branches, `pass` / `// not implemented` blocks.
**Fix**: delete dead code. Implement features fully or remove them. No `pass` stubs.

### AFM10. Misleading Error Messages

`raise ValueError("Invalid input")` — doesn't say what was invalid or what was expected.
**Fix**: error messages include: what was invalid, the actual value (repr'd), what was expected.

### AFM11. Inconsistent State Across Layers

Renames `user_id` to `userId` in API but not in repository. Layer mismatch.
**Fix**: after renaming, `git grep` for the old name. Verify all layers consistent.

### AFM12. Phantom Test Coverage

Test imports the function but doesn't assert behavior — just checks "doesn't crash."
**Fix**: every test must have ≥1 assertion that would fail if behavior changed.

### AFM13. Type Assertion Without Validation

`as User` (TS) or `# type: ignore` (Python) to suppress type errors instead of fixing the model.
**Fix**: fix the model. If you must cast, document why the runtime invariant is guaranteed.

### AFM14. Over-Engineering for "Best Practices"

Factory, Singleton, Observer where a simple function would do.
**Fix**: a pattern earns its place with a real second use case or genuine test seam.

---

## The AI-FM Sweep (Phase 3 CRITIQUE)

After every transformation, run this checklist:

```
[ ] AFM1: No broad except: pass or catch (e) {} added
[ ] AFM2: No defensive guards for type-guaranteed states
[ ] AFM3: All imports verified to exist (no hallucinated packages)
[ ] AFM4: No mock-fallbacks that declare success without testing real behavior
[ ] AFM5: All boundary conditions verified (no off-by-ones from copied patterns)
[ ] AFM6: No comments restating code; no stale TODOs
[ ] AFM7: No speculative abstractions (interface with 1 impl + no test mock)
[ ] AFM8: No generic names (data, result, process, Manager, Helper)
[ ] AFM9: No dead code, unused functions, or pass/TODO stubs
[ ] AFM10: All error messages include what/why/expected
[ ] AFM11: All layers use consistent names (verified via git grep)
[ ] AFM12: All tests have real assertions (not just "doesn't crash")
[ ] AFM13: No as casts or # type: ignore without justification
[ ] AFM14: No design patterns without a real second use case
```

For each unchecked box: fix the issue or justify it in the issue log. Only proceed to COMMIT when all 14 are checked or justified.

---

## Summary

- AI failure modes are orthogonal to code smells — a function can be clean and still hallucinate a package.
- Run the 14-point AI-FM sweep after EVERY transformation.
- All 14 must be checked or justified before committing.
- See the `refactor` skill's `references/18-ai-failure-modes.md` for full details with examples.
