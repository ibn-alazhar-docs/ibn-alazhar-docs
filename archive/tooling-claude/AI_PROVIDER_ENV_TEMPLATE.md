# AI Provider Environment Template

This document defines the local environment file used to switch Claude Code between approved AI provider profiles.

## Local file location

Create this file outside the repository:

```bash
~/.config/ibn-ai-providers/env.zsh

Do not commit real keys.

Template
# Ibn Al-Azhar Docs — AI Provider Profiles
# Keep this file OUTSIDE the repository.
# Never commit real API keys.

export IBN_PROJECT_DIR="/home/abed/Data/03_Professional/Projects/Ibn-Al-Azhar-Docs"

# OpenRouter
export OPENROUTER_API_KEY="PASTE_OPENROUTER_KEY_HERE"

# OpenCode Zen / Z.AI / Anthropic-compatible gateway
export OPENCODE_ZEN_API_KEY="PASTE_OPENCODE_OR_ZEN_KEY_HERE"
export OPENCODE_ZEN_BASE_URL="PASTE_OPENCODE_OR_ZEN_BASE_URL_HERE"
export OPENCODE_ZEN_MODEL="PASTE_MODEL_ID_HERE"

# Local Anthropic-compatible router/proxy
export LOCAL_ANTHROPIC_PROXY_URL="http://127.0.0.1:3456"
Claude Code provider profiles
OpenRouter
export ANTHROPIC_BASE_URL="https://openrouter.ai/api"
export ANTHROPIC_AUTH_TOKEN="$OPENROUTER_API_KEY"
unset ANTHROPIC_API_KEY
claude
Generic Anthropic-compatible gateway
export ANTHROPIC_BASE_URL="$OPENCODE_ZEN_BASE_URL"
export ANTHROPIC_AUTH_TOKEN="$OPENCODE_ZEN_API_KEY"
export ANTHROPIC_MODEL="$OPENCODE_ZEN_MODEL"
unset ANTHROPIC_API_KEY
claude
Local router
export ANTHROPIC_BASE_URL="$LOCAL_ANTHROPIC_PROXY_URL"
export ANTHROPIC_AUTH_TOKEN="local-router"
unset ANTHROPIC_API_KEY
claude
Safety rules
Never commit real API keys.
Never paste real API keys into prompts.
Never store real API keys inside .claude/settings.json.
Use read-only smoke tests before allowing any provider to edit files.
Use trusted providers only for security-sensitive reviews.
```
