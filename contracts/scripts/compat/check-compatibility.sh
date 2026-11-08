#!/usr/bin/env bash
# Contract compatibility check: compares every API bundle of the working tree with the same API at
# the EXACT base commit, using oasdiff `breaking`. Comparing with the current `main` instead would
# give false results whenever `main` moves while a PR is open.
#
# Usage: check-compatibility.sh [base-sha]   (or BASE_SHA=<sha>)
# - CI passes the PR base SHA (`github.event.pull_request.base.sha`) or, on push, `github.event.before`.
# - Locally, without a SHA, the merge-base with `origin/main` (or `main`) is used.
#
# oasdiff reads `x-stability-level`: breaking changes in `draft` and `alpha` operations are allowed,
# `beta` and `stable` are protected, and lowering an operation's level is itself an error.
# Domain events (contracts/events) are immutable: a file that exists at the base commit must be
# byte-for-byte the same; a new shape is a new version (a new file).
#
# One rule is lowered from error to info, in oasdiff-severity.txt (the file format has no
# comments): `response-property-enum-value-added`. A new enum value in a response is an allowed,
# additive change (AGENTS.md, spec 5.9) because every generated response schema maps values it does
# not know to `'unknown'` (scripts/apply-response-enum-fallback.ts). Nothing else is relaxed.
#
# Expects fresh head bundles in contracts/artifacts (the Nx target depends on `bundle`).
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
contracts="$(cd "$here/../.." && pwd)"
root="$(git -C "$contracts" rev-parse --show-toplevel)"
prefix="${contracts#"$root"/}"

base="${1:-${BASE_SHA:-}}"
if [ -z "$base" ]; then
  base="$(git -C "$root" merge-base HEAD origin/main 2>/dev/null || git -C "$root" merge-base HEAD main)"
  echo "No base SHA given: using the merge-base with main ($base)."
fi

# A push that creates a branch reports an all-zero `before`: there is nothing to compare with.
if [[ "$base" =~ ^0+$ ]]; then
  echo "⏭  No base commit (new branch): compatibility check skipped."
  exit 0
fi
if ! git -C "$root" cat-file -e "$base^{commit}" 2>/dev/null; then
  echo "✖ Base commit $base is not available. Fetch it first (actions/checkout fetch-depth: 0)." >&2
  exit 1
fi
if ! git -C "$root" cat-file -e "$base:$prefix/redocly.yaml" 2>/dev/null; then
  echo "⏭  The base commit has no contract yet (first contract commit): compatibility check skipped."
  exit 0
fi

oasdiff="$("$here/install-oasdiff.sh")"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

# Extract only the contract sources of the base commit and bundle them the same way as HEAD.
sources=()
for path in redocly.yaml apis shared events; do
  if git -C "$root" cat-file -e "$base:$prefix/$path" 2>/dev/null; then sources+=("$prefix/$path"); fi
done
git -C "$root" archive "$base" "${sources[@]}" | tar -x -C "$work"
(
  cd "$work/$prefix"
  REDOCLY_TELEMETRY=off REDOCLY_SUPPRESS_UPDATE_NOTICE=true "$root/node_modules/.bin/redocly" bundle >/dev/null
)

short="$(git -C "$root" rev-parse --short "$base")"
status=0
for base_bundle in "$work/$prefix"/artifacts/*.bundle.yaml; do
  api="$(basename "$base_bundle" .bundle.yaml)"
  head_bundle="$contracts/artifacts/$api.bundle.yaml"
  if [ ! -f "$head_bundle" ]; then
    echo "✖ $api: the API exists at $short but not in the working tree. Removing an API is breaking." >&2
    status=1
    continue
  fi
  echo "› $api: $short → working tree"
  if ! "$oasdiff" breaking "$base_bundle" "$head_bundle" \
    --fail-on ERR --color never --allow-external-refs=false --format "${OASDIFF_FORMAT:-text}" \
    --severity-levels "$here/oasdiff-severity.txt"; then
    status=1
  fi
done
for head_bundle in "$contracts"/artifacts/*.bundle.yaml; do
  api="$(basename "$head_bundle" .bundle.yaml)"
  if [ ! -f "$work/$prefix/artifacts/$api.bundle.yaml" ]; then
    echo "› $api: new API since $short, nothing to compare."
  fi
done

if [ -d "$work/$prefix/events" ]; then
  for base_event in "$work/$prefix"/events/*.json; do
    event="$(basename "$base_event")"
    if [ ! -f "$contracts/events/$event" ]; then
      echo "✖ events/$event exists at $short but was removed. Published events are never deleted." >&2
      status=1
    elif ! cmp -s "$base_event" "$contracts/events/$event"; then
      echo "✖ events/$event changed since $short. Events are immutable: add a new version instead." >&2
      diff -u "$base_event" "$contracts/events/$event" >&2 || true
      status=1
    else
      echo "› events/$event: unchanged"
    fi
  done
fi

if [ "$status" -ne 0 ]; then
  echo "✖ Incompatible contract change. Do not weaken this check: move an API change to a new" >&2
  echo "  operation or a new major version (/v2), and an event change to a new event version." >&2
  exit 1
fi
echo "✔ No breaking changes against $short."
