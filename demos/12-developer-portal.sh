#!/usr/bin/env bash
# 12. A developer new to the platform finds an API in the developer portal: who owns it, who uses
# it, how to consume it. The portal is generated from the repository, so it cannot drift from it.
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
title '12. Discover and consume an API through the developer portal'
start_worktree developer-portal

portal=contracts/artifacts/portal
# has <page> <html>: the generated page contains the given HTML.
has() { grep -qF -- "$2" "$portal/$1" && say "$1 → $2"; }

step 'Build the portal from the catalog, the contracts and the packages'
expect_success 'the catalog is consistent' nx run @acme/tools:catalog-check
expect_success 'the portal builds' nx run contracts:portal
say "Open $DEMO_DIR/$portal/index.html, or the published one:"
say 'https://m4ciel.github.io/contract-first-poc/'
pause

step 'Find the API: the home page lists every system, API, component and team'
expect_success 'the Library API is listed' has index.html 'href="api-library-api.html"'
pause

step 'Who owns it and who already uses it'
expect_success 'owned by the lending team' has api-library-api.html \
  '<dt>Owner</dt><dd><a href="index.html#team-team-lending">Lending team</a>'
expect_success 'consumed by the web app and the legacy client' has api-library-api.html \
  '<a href="component-library-web.html">Library web app</a>, <a href="component-legacy-client.html">Legacy client</a>'
say 'Before changing an operation, these are the teams to talk to.'
pause

step 'How to consume it'
expect_success 'the install command' has api-library-api.html 'pnpm add @acme/api-types @acme/api-client'
expect_success 'an interactive reference of every operation' has reference-library-api.html \
  'scalar/api-reference@'
expect_success 'the client package page, with its version, README and changelog' has \
  component-acme-api-client.html '<dt>Version</dt><dd><code>'
say 'Next move: build the screen on the generated mocks before the backend exists (demo 7).'
pause

step 'The portal cannot lie: a descriptor that drifts from the code fails before publishing'
replace apps/web/catalog-info.yaml $'    - component:acme-domain\n' ''
show_diff apps/web/catalog-info.yaml
expect_failure 'the web app still depends on @acme/domain in package.json' \
  nx run @acme/tools:catalog-check
say 'The portal workflow runs this check before building: a wrong portal is never deployed.'
git checkout --quiet -- apps/web/catalog-info.yaml
pause

step 'A hand-over is a one-line change'
replace contracts/apis/library/catalog-info.yaml 'owner: team-lending' 'owner: team-inventory'
show_diff contracts/apis/library/catalog-info.yaml
expect_success 'the catalog is still consistent' nx run @acme/tools:catalog-check
expect_success 'the portal rebuilds' nx run contracts:portal
expect_success 'the API page shows the new owner' has api-library-api.html \
  '<dt>Owner</dt><dd><a href="index.html#team-team-inventory">Inventory team</a>'
say 'Merged to main, the published portal follows within minutes.'
