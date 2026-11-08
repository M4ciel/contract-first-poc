#!/usr/bin/env bash
# Writes an npmrc that sends every @acme package to <registry> and authenticates there.
#   - NPM_TOKEN set: a token for a real private registry (a CI secret).
#   - otherwise: a disposable Verdaccio; a local user is created (409 when it already exists) and
#     used with basic auth. Example-only credentials.
# Usage: registry-auth.sh <registry-url> <npmrc-path>; then export NPM_CONFIG_USERCONFIG=<npmrc-path>
set -euo pipefail

registry="${1:?registry URL}"
npmrc="${2:?npmrc path}"
registry="${registry%/}"
host="${registry#*://}"

if [ -n "${NPM_TOKEN:-}" ]; then
  auth="//$host/:_authToken=$NPM_TOKEN"
else
  user=acme-release
  password=acme-local-release
  curl -s -o /dev/null -X PUT "$registry/-/user/org.couchdb.user:$user" \
    -H 'content-type: application/json' -d "{\"name\":\"$user\",\"password\":\"$password\"}"
  auth="//$host/:_auth=$(printf '%s:%s' "$user" "$password" | base64 | tr -d '\n')"
fi

printf '@acme:registry=%s/\n%s\n' "$registry" "$auth" >"$npmrc"
echo "npmrc for $registry written to $npmrc"
