#!/usr/bin/env bash
set -euo pipefail

echo "[codespaces] bootstrap started"

if [ -f package-lock.json ]; then
  echo "[codespaces] npm ci"
  npm ci || true
elif [ -f package.json ]; then
  echo "[codespaces] npm install"
  npm install || true
fi

if [ -f requirements.txt ]; then
  echo "[codespaces] pip install -r requirements.txt"
  python -m pip install --upgrade pip || true
  pip install -r requirements.txt || true
fi

if [ -f docker-compose.yml ] || [ -f compose.yml ]; then
  echo "[codespaces] docker compose config check"
  docker compose config >/dev/null || true
fi

echo "[codespaces] bootstrap complete"
