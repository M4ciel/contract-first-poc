#!/usr/bin/env bash
# Smoke test of the running environment (`nx run @acme/infra:up`), end to end on MiniStack:
# - catalog and loans in DynamoDB;
# - loans reserve a copy through API Gateway → inventory Lambda → DynamoDB;
# - loan.created.v1 goes EventBridge → SQS → notifications Lambda → reminders table;
# - the booksV2 flag is switched in Flagsmith and the backend follows without a restart.
set -euo pipefail

API="${API_URL:-http://localhost:3000}"
AWS="${AWS_URL:-http://localhost:4566}"
INVENTORY="$AWS/_aws/execute-api/inventory"
# Each run takes one copy; books 3 to 25 start with three copies each.
BOOK_WITH_COPIES="$(printf '00000000-0000-4000-8000-%012d' $((3 + RANDOM % 23)))"
BOOK_WITHOUT_COPIES=00000000-0000-4000-8000-000000000002
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
body="$(mktemp)"
trap 'node "$here/scripts/set-flag.ts" booksV2 off >/dev/null 2>&1 || true; rm -f "$body"' EXIT

failures=0
pass() { echo "✔ $1"; }
fail() {
  echo "✖ $1" >&2
  failures=$((failures + 1))
}
check() { # <description> <expected status> <curl args...>
  local description="$1" expected="$2"
  shift 2
  local status
  status="$(curl -s -o "$body" -w '%{http_code}' "$@")"
  if [ "$status" = "$expected" ]; then pass "$description ($status)"; else fail "$description: expected $expected, got $status: $(cat "$body")"; fi
}
json() { node -e "const v = JSON.parse(require('fs').readFileSync('$body', 'utf8')); console.log($1)"; }
# Polls until <command> succeeds or <seconds> pass.
eventually() { # <seconds> <command...>
  local deadline=$((SECONDS + $1))
  shift
  until "$@"; do
    [ "$SECONDS" -ge "$deadline" ] && return 1
    sleep 1
  done
}
v2_status_is() { [ "$(curl -s -o /dev/null -w '%{http_code}' "$API/v2/books")" = "$1" ]; }
# MiniStack does not check signatures, so a plain DynamoDB JSON request is enough to look inside.
reminder_exists() {
  curl -s "$AWS/" -H 'X-Amz-Target: DynamoDB_20120810.Scan' \
    -H 'Content-Type: application/x-amz-json-1.0' \
    -H 'Authorization: AWS4-HMAC-SHA256 Credential=test/20260101/us-east-1/dynamodb/aws4_request, SignedHeaders=host, Signature=smoke' \
    -d '{"TableName":"acme-notifications-reminders"}' | grep -q "$1"
}

check 'backend is healthy' 200 "$API/v1/health"
check 'the catalog is read from DynamoDB' 200 "$API/v1/books/$BOOK_WITH_COPIES"
check 'inventory reports the stock of a book' 200 "$INVENTORY/v1/inventories/$BOOK_WITH_COPIES"

check 'a loan reserves a copy in the inventory' 201 \
  -X POST "$API/v1/loans" -H 'content-type: application/json' -d "{\"bookId\":\"$BOOK_WITH_COPIES\"}"
loan_id="$(json v.id 2>/dev/null || echo none)"
check 'the loan is stored in DynamoDB' 200 "$API/v1/loans/$loan_id"
if eventually 20 reminder_exists "$loan_id"; then
  pass 'loan.created.v1 reached the notifications Lambda (reminder stored)'
else
  fail 'loan.created.v1 did not produce a reminder within 20 s'
fi

check 'a book without free copies answers 409 book-unavailable' 409 \
  -X POST "$API/v1/loans" -H 'content-type: application/json' -d "{\"bookId\":\"$BOOK_WITHOUT_COPIES\"}"
check 'the inventory rejects unknown fields (strict request)' 400 \
  -X POST "$INVENTORY/v1/reservations" -H 'content-type: application/json' \
  -d "{\"bookId\":\"$BOOK_WITH_COPIES\",\"loanId\":\"$BOOK_WITH_COPIES\",\"extra\":true}"

check 'GET /v2/books is hidden while booksV2 is off' 404 "$API/v2/books"
node "$here/scripts/set-flag.ts" booksV2 on >/dev/null
if eventually 30 v2_status_is 200; then pass 'turning booksV2 on in Flagsmith exposes /v2/books'; else fail '/v2/books still hidden 30 s after turning booksV2 on'; fi
node "$here/scripts/set-flag.ts" booksV2 off >/dev/null
if eventually 30 v2_status_is 404; then pass 'turning booksV2 off hides it again'; else fail '/v2/books still exposed 30 s after turning booksV2 off'; fi

if [ "$failures" -gt 0 ]; then
  echo "✖ $failures smoke check(s) failed." >&2
  exit 1
fi
echo '✔ Environment works end to end.'
