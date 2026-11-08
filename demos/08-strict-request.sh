#!/usr/bin/env bash
# 8. Strict request: POST /v1/loans with an extra field gets a 400 Problem Details.
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
title '8. Strict request'
cd "$ROOT" || exit
nx run @acme/api:build >/dev/null
port=3999
INVENTORY_BASE_URL=http://inventory.test PORT=$port node apps/api/dist/main.js >/dev/null 2>&1 &
api=$!
trap 'kill $api 2>/dev/null; finish' EXIT
for _ in $(seq 1 30); do curl -sf "localhost:$port/v1/health" >/dev/null && break; sleep 0.5; done

step 'POST /v1/loans with a field the contract does not have'
payload='{"bookId":"7c1e4b52-3f0a-4d8e-9b6a-1f2e3d4c5b6a","priority":"high"}'
say "$payload"
body="$(mktemp)"
http_status="$(curl -s -o "$body" -w '%{http_code}' "localhost:$port/v1/loans" \
  -H 'content-type: application/json' -d "$payload")"
node -e 'console.log(JSON.stringify(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")),null,2))' "$body" | sed 's/^/    │ /'
rejected() { [ "$http_status" = 400 ] && grep -q '"pointer":"/priority"' "$body"; }
expect_success "rejected with $http_status urn:acme:problem:validation pointing at /priority" rejected
say 'Requests are strict (generated validators reject unknown fields); responses are tolerant.'
