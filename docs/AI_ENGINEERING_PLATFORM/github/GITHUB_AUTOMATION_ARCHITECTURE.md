# GitHub Automation Architecture

> **Purpose:** Define branch generation, commits, PR generation, changelogs, releases, and branch cleanup.
> **Scope:** Git operations, PR automation, release automation, rollback branches.

---

## 1. GitHub Automation Overview

The GitHub Automation component handles all Git and GitHub operations within the AI Engineering Platform. It operates through the SDK's shell execution capabilities and the GitHub API.

```
┌─────────────────────────────────────────────────────┐
│              GITHUB AUTOMATION                       │
│                                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐│
│  │ Branch   │ │ Commit   │ │ PR       │ │ Release ││
│  │ Manager  │ │ Manager  │ │ Manager  │ │ Manager ││
│  └──────────┘ └──────────┘ └──────────┘ └─────────┘│
│                                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐│
│  │ Changelog│ │ Review   │ │ Branch   │ │ Rollback││
│  │ Generator│ │ Requester│ │ Cleaner  │ │ Manager ││
│  └──────────┘ └──────────┘ └──────────┘ └─────────┘│
└─────────────────────────────────────────────────────┘
```

---

## 2. Branch Management

### 2.1 Branch Naming Convention

```
{type}/{spec-id}-{short-description}

Examples:
  feat/001-file-upload-system
  fix/015-rtl-layout-overflow
  chore/022-update-dependencies
  docs/008-api-spec-update
```

| Type | Description |
|---|---|
| `feat` | New feature implementation |
| `fix` | Bug fix |
| `chore` | Maintenance task |
| `docs` | Documentation update |
| `refactor` | Code refactoring |
| `perf` | Performance improvement |

### 2.2 Branch Creation Flow

```
Pipeline: BRANCHING stage
  │
  ▼
1. Fetch latest main branch
  │
  ▼
2. Generate branch name from plan
  │
  ▼
3. Check if branch already exists
  │
  ├── Exists ──► Reuse branch (idempotent)
  │
  └── Not exists ──► Create branch from main
                      │
                      ▼
                 Emit BRANCH_CREATED event
                      │
                      ▼
                 Return branch name and commit SHA
```

### 2.3 Branch Creation Command

```bash
git fetch origin main
git checkout -b {branchName} origin/main
git push -u origin {branchName}
```

---

## 3. Commit Management

### 3.1 Commit Message Convention

Follows Conventional Commits:

```
{type}({scope}): {description}

{body}

{footer}
```

| Component | Description |
|---|---|
| `type` | feat, fix, chore, docs, refactor, perf, test |
| `scope` | Optional, e.g., auth, files, conversions |
| `description` | Short description (max 72 chars) |
| `body` | Optional, detailed description |
| `footer` | Optional, references (e.g., `Refs: spec-001`) |

### 3.2 Commit Flow

```
Implementation Complete
  │
  ▼
1. Stage all changed files
  │
  ▼
2. Generate commit message from CodeChange output
  │
  ▼
3. Create commit
  │
  ▼
4. Push to remote branch
  │
  ▼
5. Emit COMMIT_CREATED event
```

### 3.3 Commit Command

```bash
git add -A
git commit -m "{commitMessage}"
git push origin {branchName}
```

### 3.4 Commit Safety

| Rule | Enforcement |
|---|---|
| No empty commits | Check before commit |
| No secrets in commits | Pre-commit hook / secret scan |
| No force push | Blocked by governance |
| Signed commits | Optional, configured per repo |

---

## 4. Pull Request Management

### 4.1 PR Generation Flow

```
Pipeline: PR_CREATING stage
  │
  ▼
1. Generate PR title and body from PRSummary
  │
  ▼
2. Create PR via GitHub CLI or API
  │
  ▼
3. Add labels from plan
  │
  ▼
4. Request reviewers from config
  │
  ▼
5. Emit PR_GENERATED event
```

### 4.2 PR Title Convention

```
{type}({scope}): {description}

Examples:
  feat(files): add file upload system
  fix(auth): resolve RTL layout overflow
  chore(deps): update dependencies
```

### 4.3 PR Body Template

```markdown
## Summary

{PRSummary.summary}

## Changes

| File | Operation | Description |
|------|-----------|-------------|
{CodeChange.operations table}

## Verification

| Check | Status |
|-------|--------|
{VerificationResults table}

## Reviews

| Review | Status | Findings |
|--------|--------|----------|
{ReviewResults table}

## Related

- Spec: {specId}
- Pipeline: {pipelineId}
- Phase: {phase}
```

### 4.4 PR Creation Command

```bash
gh pr create \
  --base main \
  --head {branchName} \
  --title "{title}" \
  --body "{body}" \
  --label "{labels}" \
  --reviewer "{reviewers}"
```

---

## 5. Changelog Generation

### 5.1 Changelog Entry Generation

Each merged PR generates a changelog entry:

```json
{
  "type": "feature",
  "description": "Add file upload system with PDF and image support",
  "prNumber": 42,
  "author": "ai-engine",
  "breaking": false
}
```

### 5.2 Changelog Aggregation

```
Merged PRs (since last release)
  │
  ▼
1. Extract ChangelogEntry from each PR
  │
  ▼
2. Group by type (feature, fix, chore, etc.)
  │
  ▼
3. Generate markdown changelog
  │
  ▼
4. Update CHANGELOG.md
```

### 5.3 Changelog Format

```markdown
# Changelog

## [v1.2.0] - 2026-05-20

### Features
- Add file upload system with PDF and image support (#42)
- Implement folder hierarchy management (#45)

### Fixes
- Resolve RTL layout overflow in dashboard (#43)

### Chores
- Update dependencies (#44)
```

---

## 6. Release Management

### 6.1 Release Flow

```
Phase Complete + Gate Pass
  │
  ▼
1. Determine version bump (semver)
  │
  ▼
2. Generate release notes from changelog
  │
  ▼
3. Create Git tag
  │
  ▼
4. Create GitHub release
  │
  ▼
5. Update version files
  │
  ▼
6. Emit RELEASE_CREATED event
```

### 6.2 Version Bump Rules

| Change Type | Bump |
|---|---|
| Breaking change | Major |
| New feature | Minor |
| Bug fix | Patch |
| Chore/docs | Patch |

### 6.3 Release Notes Template

```markdown
# Ibn Al-Azhar Docs v{version}

## What's New

{Features section from changelog}

## Fixes

{Fixes section from changelog}

## Full Changelog

{Link to GitHub compare}
```

---

## 7. Review Request Automation

### 7.1 Reviewer Assignment

```yaml
github:
  reviewers:
    default:
      - human-engineer-1
    by_type:
      security:
        - security-reviewer-human
      rtl:
        - rtl-auditor-human
      brand:
        - frontend-lead-human
```

### 7.2 Review Request Flow

```
PR Created
  │
  ▼
1. Determine review type from labels
  │
  ▼
2. Select reviewers from config
  │
  ▼
3. Request review via GitHub API
  │
  ▼
4. Emit REVIEW_REQUESTED event
```

### 7.3 Review Request Command

```bash
gh pr edit {prNumber} --add-reviewer "{reviewer}"
```

---

## 8. Branch Cleanup

### 8.1 Cleanup Triggers

| Trigger | Action |
|---|---|
| PR merged | Delete source branch |
| PR closed (not merged) | Delete source branch after 7 days |
| Pipeline cancelled | Delete source branch |
| Pipeline failed (after 30 days) | Delete source branch |

### 8.2 Cleanup Flow

```
PR Merged / Pipeline Cancelled
  │
  ▼
1. Identify source branch
  │
  ▼
2. Verify branch is merged or safe to delete
  │
  ▼
3. Delete remote branch
  │
  ▼
4. Emit BRANCH_CLEANED event
```

### 8.3 Cleanup Command

```bash
git push origin --delete {branchName}
```

---

## 9. Rollback Branch Management

### 9.1 Rollback Flow

```
Rollback Triggered
  │
  ▼
1. Identify target commit (last good state)
  │
  ▼
2. Create rollback branch: `rollback/{date}-{reason}`
  │
  ▼
3. Revert changes from problematic commit(s)
  │
  ▼
4. Create rollback PR
  │
  ▼
5. Human approval and merge
  │
  ▼
6. Delete rollback branch
```

### 9.2 Rollback Branch Naming

```
rollback/{YYYY-MM-DD}-{short-reason}

Examples:
  rollback/2026-05-20-broken-build
  rollback/2026-05-20-test-failures
```

---

## 10. GitHub Events

| Event | Payload | Emitted When |
|---|---|---|
| `BRANCH_CREATED` | `{branchName, baseBranch, commitSha}` | Branch created |
| `BRANCH_FAILED` | `{branchName, error}` | Branch creation failed |
| `COMMIT_CREATED` | `{commitSha, message, files}` | Commit created |
| `PR_GENERATED` | `{prNumber, prUrl, title, body}` | PR created |
| `PR_FAILED` | `{error}` | PR creation failed |
| `PR_MERGED` | `{prNumber, mergeCommitSha}` | PR merged |
| `MERGE_FAILED` | `{prNumber, error}` | Merge failed |
| `BRANCH_CLEANED` | `{branchName}` | Branch deleted |
| `RELEASE_CREATED` | `{version, tag, url}` | Release created |
| `REVIEW_REQUESTED` | `{prNumber, reviewers}` | Review requested |
| `CHANGELOG_UPDATED` | `{version, entries}` | Changelog updated |
| `DEGRADED_MODE_ENTERED` | `{mode, reason, impact}` | Entered degraded mode |
| `DEGRADED_MODE_EXITED` | `{mode, duration, recovered}` | Exited degraded mode |
| `DEGRADED_MODE_OPERATION` | `{mode, operation, result}` | Operation in degraded mode |

---

## 11. GitHub Configuration

```yaml
github:
  repository: "ibn-al-azhar-docs/ibn-al-azhar-docs"
  default_branch: "main"
  branch_naming: "{type}/{spec-id}-{short-description}"
  commit_convention: "conventional-commits"
  pr:
    auto_labels: true
    auto_reviewers: true
    template: "pr-template.md"
  release:
    auto_release: false  # Requires human approval
    changelog_file: "CHANGELOG.md"
  cleanup:
    delete_merged_branches: true
    delete_stale_branches_after_days: 30
```

---

## 12. GitHub Anti-Patterns

| Anti-Pattern | Problem | Prevention |
|---|---|---|
| Force push | History rewrite, team confusion | Blocked by governance |
| Direct push to main | Bypasses review | Branch protection rules |
| No PR description | Reviewers lack context | Mandatory PR body template |
| Large PRs | Hard to review | Pipeline limits file changes |
| No labels | Cannot categorize | Auto-labeling from plan |
| Orphaned branches | Repository clutter | Automatic branch cleanup |
| No rollback plan | Cannot undo mistakes | Rollback branch procedure |
