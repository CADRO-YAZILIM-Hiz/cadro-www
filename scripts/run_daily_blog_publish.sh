#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TODAY="$(date +%F)"
LOG_FILE="$ROOT_DIR/scripts/blog-publish.log"

cd "$ROOT_DIR"
for LANG in tr en de ar; do
	python3 scripts/auto_publish_blog_multilang.py --lang "$LANG" --date "$TODAY" >> "$LOG_FILE" 2>&1
done
