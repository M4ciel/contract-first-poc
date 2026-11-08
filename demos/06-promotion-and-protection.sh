#!/usr/bin/env bash
# 6. Promotion and protection: promote /v2/books to stable, then a breaking change and a downgrade
# both fail.
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
title '6. Promotion and protection'
start_worktree promotion-and-protection
L=contracts/apis/library

step 'Promote /v2/books from alpha to stable'
replace "$L/paths/v2-books.yaml" 'x-stability-level: alpha' 'x-stability-level: stable'
expect_success 'promoting is allowed' nx run contracts:compat
git commit --quiet -am 'demo: promote /v2/books to stable'
BASE_SHA="$(git rev-parse HEAD)"
export BASE_SHA
say "From now on the base is the promoted contract ($(git rev-parse --short HEAD))."
pause

step 'The same change that was fine in alpha: authors becomes writers'
replace "$L/components/schemas/BookV2.yaml" 'required: [id, title, authors,' 'required: [id, title, writers,'
replace "$L/components/schemas/BookV2.yaml" '  authors:' '  writers:'
replace "$L/paths/v2-books.yaml" 'authors: [' 'writers: ['
expect_failure 'oasdiff now protects the operation' nx run contracts:compat
git checkout --quiet -- "$L"
pause

step 'Downgrade to beta to get the freedom back'
replace "$L/paths/v2-books.yaml" 'x-stability-level: stable' 'x-stability-level: beta'
expect_failure 'oasdiff blocks lowering the level (api-stability-decreased)' nx run contracts:compat
say 'Born alpha, promoted after real use, protected forever after.'
