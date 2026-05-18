
Secrets Policy — Ibn Al-Azhar Docs
Rule

Never commit real secrets.

Secrets include
Claude / Anthropic tokens
TestSprite API keys
GitHub tokens
Database passwords for non-local environments
Object storage secrets
OAuth secrets
Session/auth secrets
Any private service credential
Allowed in Git
.env.example with placeholder values
Documentation that names environment variables without real values
Local-only dummy credentials for Docker development only when clearly marked
Not allowed in Git
.env
.env.local
.env.development
.env.production
Real API keys
Real tokens
Production credentials
Screenshots containing secrets
Before every commit

Run:

pnpm secrets:scan

Also inspect:

git diff --cached
If a secret is exposed
Revoke or rotate it.
Remove it from files.
Check Git history if it was committed.
Do not reuse the exposed key.
Document the incident if it reached Git history.
