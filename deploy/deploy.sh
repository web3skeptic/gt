#!/usr/bin/env bash
# Build the app and publish it to https://interslavic.space/gt/ (run on the Mac).
#   DEPLOY_HOST=root@your-server SSH_OPTS='-i ~/.ssh/key' bash deploy/deploy.sh
# Copies dist/ to /var/www/gt on the server and installs the nginx snippet if missing.
set -euo pipefail
HOST="${DEPLOY_HOST:?set DEPLOY_HOST, e.g. root@your-server}"
SSH="ssh ${SSH_OPTS:-}"
SITE="${NGINX_SITE:-/etc/nginx/sites-available/interslavic}"
cd "$(dirname "$0")/.."
npm run build
rsync -az -e "$SSH" --delete dist/ "${HOST}:/var/www/gt/"
rsync -az -e "$SSH" deploy/nginx-gt-couch.conf "${HOST}:/etc/nginx/snippets/gt-couch.conf"
$SSH "${HOST}" "grep -q 'snippets/gt-couch.conf' ${SITE} || sed -i '0,/^\s*location \//s//    include \/etc\/nginx\/snippets\/gt-couch.conf;\n\n    location \//' ${SITE}; nginx -t && systemctl reload nginx"
echo "deployed: https://interslavic.space/gt/"
