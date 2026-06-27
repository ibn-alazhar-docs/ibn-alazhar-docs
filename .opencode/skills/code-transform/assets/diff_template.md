# Diff Template — Output Format for Transformations

> Use this format when emitting transformations. Per AP9 (Whole-File Rewrites), NEVER rewrite a whole file when a diff will do.

## Unified Diff Format (for modifications)

```
--- a/path/to/file.ext
+++ b/path/to/file.ext
@@ -<start>,<count> +<start>,<count> @@
 context line (unchanged)
-removed line (original)
+added line (new)
 context line (unchanged)
```

## New File

```
NEW FILE: path/to/new_file.ext

<full contents of the new file>
```

## File Deletion

```
DELETE: path/to/dead_file.ext
Reason: <why — e.g., "No callers found (verified via git grep)">
```

## File Rename/Move

```
RENAME: old/path/file.ext → new/path/file.ext
Reason: <e.g., "moved to repositories/ layer per separation of concerns">
```

## Rules

1. **One transformation per diff block** — never bundle multiple changes.
2. **Include context lines** (3 before, 3 after) for unambiguous matching.
3. **Never rewrite a whole file** — use diff hunks even for large changes.
4. **State NEW FILE / DELETE / RENAME explicitly** for non-modification operations.
5. **Include commit message** with each diff: `refactor: / fix: / test: / perf: / security: / docs:`
