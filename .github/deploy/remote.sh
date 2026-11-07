#!/usr/bin/env bash
# Remote deploy script executed on the production host over SSH.
# Piped from deploy.yml after inline `KEY=value` exports (env does not pass
# through `ssh bash -s` — piping avoids heredoc-in-YAML breakage 2026-11-07).
set -euo pipefail

: "${APP_DIR:?APP_DIR is required}"
: "${SERVICE:?SERVICE is required}"

if [ -n "${REGISTRY_TOKEN:-}" ]; then
  echo "${REGISTRY_TOKEN}" | docker login ghcr.io -u "${DEPLOY_USER:-}" --password-stdin
fi

cd "${APP_DIR}"

docker compose pull
docker compose run --rm "${SERVICE}" npx prisma migrate deploy
docker compose up -d

if [ -n "${HEALTH_URL:-}" ]; then
  for i in $(seq 1 30); do
    if curl -fsS "${HEALTH_URL}" > /dev/null 2>&1; then
      echo "Health check passed"
      exit 0
    fi
    sleep 3
  done
  echo "::error::Health check failed after deployment"
  docker compose ps
  exit 1
else
  echo "HEALTH_URL not set; skipping healthcheck"
fi
