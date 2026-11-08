#!/usr/bin/env bash
# 5. Preview in alpha: change /v2/books freely, publish a preview, latest stays untouched.
# Needs the local Verdaccio: pnpm nx run @acme/infra:up
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
title '5. Preview in alpha'
curl -sf http://localhost:4873/-/ping >/dev/null || { echo 'Start Verdaccio first: pnpm nx run @acme/infra:up' >&2; exit 1; }
start_worktree preview-in-alpha
L=contracts/apis/library

step 'An incompatible change to /v2/books (alpha): authors becomes writers'
replace "$L/components/schemas/BookV2.yaml" 'required: [id, title, authors,' 'required: [id, title, writers,'
replace "$L/components/schemas/BookV2.yaml" '  authors:' '  writers:'
replace "$L/paths/v2-books.yaml" 'authors: [' 'writers: ['
show_diff "$L/components/schemas/BookV2.yaml"
pause

step 'Compatibility'
expect_success 'oasdiff allows it: the operation is alpha' nx run contracts:compat

step 'Publish a preview of it (a changeset says what changed)'
cat >.changeset/demo-books-v2-writers.md <<'CHANGESET'
---
'@acme/api-types': minor
'@acme/api-client': minor
---

Preview: /v2/books returns writers instead of authors (alpha).
CHANGESET
git add -A && git commit --quiet -m 'demo: rename authors to writers in /v2/books (alpha)'
say 'dist-tags before:'
for package in @acme/api-types @acme/api-client; do say "  $package: $(npm dist-tag ls "$package" --registry http://localhost:4873/ 2>/dev/null | tr '\n' ' ')"; done
expect_success 'snapshot published to the preview dist-tag' env PREVIEW_ONLY=1 bash infra/release-local.sh
say 'latest did not move: consumers on latest never see an alpha contract; a team opts in with'
say '  pnpm add @acme/api-client@preview'
