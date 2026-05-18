# AI Provider Environment Template

Create this file outside the repository:

`~/.config/ibn-ai-providers/env.zsh`

Do not commit real keys.

```bash
export IBN_PROJECT_DIR="/home/abed/Data/03_Professional/Projects/Ibn-Al-Azhar-Docs"

# OpenRouter
export OPENROUTER_API_KEY="PASTE_OPENROUTER_KEY_HERE"

# OpenCode Zen / Z.AI / Anthropic-compatible gateway
export OPENCODE_ZEN_API_KEY="PASTE_OPENCODE_OR_ZEN_KEY_HERE"
export OPENCODE_ZEN_BASE_URL="PASTE_OPENCODE_OR_ZEN_BASE_URL_HERE"
export OPENCODE_ZEN_MODEL="PASTE_MODEL_ID_HERE"

# Local Anthropic-compatible router/proxy
export LOCAL_ANTHROPIC_PROXY_URL="http://127.0.0.1:3456"
Claude Code profiles

OpenRouter:

export ANTHROPIC_BASE_URL="https://openrouter.ai/api"
export ANTHROPIC_AUTH_TOKEN="$OPENROUTER_API_KEY"
unset ANTHROPIC_API_KEY
claude

Generic Anthropic-compatible gateway:

export ANTHROPIC_BASE_URL="$OPENCODE_ZEN_BASE_URL"
export ANTHROPIC_AUTH_TOKEN="$OPENCODE_ZEN_API_KEY"
export ANTHROPIC_MODEL="$OPENCODE_ZEN_MODEL"
unset ANTHROPIC_API_KEY
claude

Local router:

export ANTHROPIC_BASE_URL="$LOCAL_ANTHROPIC_PROXY_URL"
export ANTHROPIC_AUTH_TOKEN="local-router"
unset ANTHROPIC_API_KEY
claude

```
