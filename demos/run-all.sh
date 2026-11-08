#!/usr/bin/env bash
# Runs every demo without pauses and reports which ones behaved as expected. Demos 5 and 11 need
# the environment (`pnpm nx run @acme/infra:up`) and are skipped when it is not running.
set -uo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export DEMO_NO_PAUSE=1

environment_up() { curl -sf localhost:3000/v1/health >/dev/null && curl -sf localhost:4873/-/ping >/dev/null; }

results=()
failed=0
for demo in "$here"/[0-9][0-9]-*.sh; do
  name="$(basename "$demo" .sh)"
  args=()
  case "$name" in
    05-* | 11-*) environment_up || { results+=("⏭  $name (environment not running)"); continue; } ;;
    07-*) args=(--check) ;;
  esac
  if bash "$demo" "${args[@]}" >"/tmp/demo-$name.log" 2>&1; then
    results+=("✔ $name")
  else
    results+=("✖ $name (log: /tmp/demo-$name.log)")
    failed=$((failed + 1))
  fi
done

printf '%s\n' "${results[@]}"
exit "$failed"
