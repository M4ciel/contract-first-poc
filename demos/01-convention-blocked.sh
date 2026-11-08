#!/usr/bin/env bash
# 1. Convention blocked: a route without a version and a snake_case operationId. Redocly fails.
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
title '1. Convention blocked'
start_worktree convention-blocked
L=contracts/apis/library

step 'Add GET /books (no /v1) whose operationId is list_books'
sed 's/operationId: listBooks/operationId: list_books/' "$L/paths/v1-books.yaml" >"$L/paths/books.yaml"
replace "$L/openapi.yaml" '  /v1/books:' $'  /books:\n    $ref: paths/books.yaml\n  /v1/books:'
show_diff "$L/openapi.yaml"
pause

step 'Contract lint'
expect_failure 'Redocly rejects the unversioned path and the snake_case operationId' \
  nx run contracts:contract-lint --skip-nx-cache
say 'The conventions are rules in redocly.yaml (rule/versioned-paths, rule/operation-id-camel-case),'
say 'not a wiki page: they fail the pull request before anyone reviews it.'
