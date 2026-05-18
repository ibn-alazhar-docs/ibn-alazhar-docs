Local Setup Checklist — Ibn Al-Azhar Docs
Before product implementation
Git working tree is clean.
Node version matches .nvmrc.
pnpm version matches package.json.
pnpm install works.
pnpm format:check works.
pnpm typecheck works or has documented no-source behavior.
Claude Code opens successfully.
Claude Code has no auth conflict.
Spec Kit commands are available.
Impeccable skill is available.
CodeRabbit config exists.
No secrets are staged.
.env.example exists.
Real .env files are ignored.
TestSprite is not activated until API key is ready.
GitHub remote is not required until project email is ready.
Tooling readiness checks

Run:

node -v
pnpm -v
git status --short
pnpm tools:doctor
pnpm format:check
pnpm typecheck
pnpm secrets:scan
Expected result
No staged secrets.
No unexpected untracked files.
No product code created.
Tooling docs are committed.
