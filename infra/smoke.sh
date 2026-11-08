#!/usr/bin/env bash
# Smoke test of the running environment (`nx run @acme/infra:up`): the backend creates loans
# through the real inventory Lambda (API Gateway → Lambda → DynamoDB on MiniStack).
set -euo pipefail

API="${API_URL:-http://localhost:3000}"
INVENTORY="${INVENTORY_URL:-http://localhost:4566/_aws/execute-api/inventory}"
BOOK_WITH_COPIES=7c1e4b52-3f0a-4d8e-9b6a-1f2e3d4c5b6a
BOOK_WITHOUT_COPIES=00000000-0000-4000-8000-000000000002

failures=0
check() { # <description> <expected status> <curl args...>
  local description="$1" expected="$2"
  shift 2
  local status
  status="$(curl -s -o /tmp/smoke-body -w '%{http_code}' "$@")"
  if [ "$status" = "$expected" ]; then
    echo "✔ $description ($status)"
  else
    echo "✖ $description: expected $expected, got $status: $(cat /tmp/smoke-body)" >&2
    failures=$((failures + 1))
  fi
}
loan() { printf '{"bookId":"%s"}' "$1"; }

check 'backend is healthy' 200 "$API/v1/health"
check 'inventory reports the stock of a book' 200 "$INVENTORY/v1/inventories/$BOOK_WITH_COPIES"
check 'a loan reserves a copy in the inventory' 201 \
  -X POST "$API/v1/loans" -H 'content-type: application/json' -d "$(loan "$BOOK_WITH_COPIES")"
check 'a book without free copies answers 409 book-unavailable' 409 \
  -X POST "$API/v1/loans" -H 'content-type: application/json' -d "$(loan "$BOOK_WITHOUT_COPIES")"
check 'the inventory rejects unknown fields (strict request)' 400 \
  -X POST "$INVENTORY/v1/reservations" -H 'content-type: application/json' \
  -d "{\"bookId\":\"$BOOK_WITH_COPIES\",\"loanId\":\"$BOOK_WITH_COPIES\",\"extra\":true}"

if [ "$failures" -gt 0 ]; then
  echo "✖ $failures smoke check(s) failed." >&2
  exit 1
fi
echo '✔ Environment works end to end.'
