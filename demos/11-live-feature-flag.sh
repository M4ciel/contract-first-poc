#!/usr/bin/env bash
# 11. Feature flag live: booksV2 switched in Flagsmith, the running backend follows, no restart.
# Needs the environment: pnpm nx run @acme/infra:up
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
title '11. Feature flag live'
cd "$ROOT" || exit
curl -sf localhost:3000/v1/health >/dev/null || { echo 'Start the environment first: pnpm nx run @acme/infra:up' >&2; exit 1; }
v2() { curl -s -o /dev/null -w '%{http_code}' localhost:3000/v2/books; }
until_status() { for _ in $(seq 1 30); do [ "$(v2)" = "$1" ] && return 0; sleep 1; done; return 1; }
trap 'node infra/scripts/set-flag.ts booksV2 off >/dev/null 2>&1; finish' EXIT

step 'booksV2 is off: GET /v2/books does not exist for clients'
expect_success 'GET /v2/books → 404' until_status 404
say 'Open http://localhost:8000 (admin@example.test / acme-local-admin) to flip it in the UI,'
say 'or let the demo do it through the same API.'
pause

step 'Turn booksV2 on'
node infra/scripts/set-flag.ts booksV2 on | sed 's/^/    │ /'
expect_success 'GET /v2/books → 200 within seconds, same process' until_status 200
pause

step 'Turn it off again'
node infra/scripts/set-flag.ts booksV2 off | sed 's/^/    │ /'
expect_success 'GET /v2/books → 404' until_status 404
