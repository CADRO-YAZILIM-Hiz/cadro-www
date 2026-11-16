#!/usr/bin/env bash
set -euo pipefail
snippet=/etc/nginx/snippets/cadro-rewrites.conf
candidate=/var/www/html/.nginx-rewrites.conf.candidate
if [ ! -f "$snippet" ]; then
  echo "Active nginx snippet is missing: $snippet" >&2
  exit 1
fi
backup=$(mktemp /etc/nginx/snippets/cadro-rewrites.conf.backup.XXXXXX)
cp -a "$snippet" "$backup"
cp /var/www/html/nginx-rewrites.conf "$candidate"
restore() {
  cp "$backup" "$snippet"
  rm -f "$candidate"
}
trap restore ERR EXIT
cp "$candidate" "$snippet"
nginx -t
systemctl reload nginx
systemctl is-active --quiet nginx
trap - ERR EXIT
rm -f "$candidate"
