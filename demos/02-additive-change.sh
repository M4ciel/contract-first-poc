#!/usr/bin/env bash
# 2. Additive change: an optional isbn in Book. oasdiff passes and the old client keeps working.
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
title '2. Additive change'
start_worktree additive-change

step 'Add an optional isbn to Book (v1)'
replace contracts/apis/library/components/schemas/Book.yaml '  publishedAt:' $'  isbn:\n    type: string\n    description: ISBN-13, when known.\n  publishedAt:'
show_diff contracts/apis/library/components/schemas/Book.yaml
pause

step 'Compatibility against the base commit'
expect_success 'oasdiff: an optional response field is additive' nx run contracts:compat

step 'Regenerate and run the clients'
expect_success 'the legacy client (frozen 1.0.0) still reads responses of the new contract' \
  nx run @acme/legacy-client:test --skip-nx-cache
expect_success 'the regenerated Book schema has isbn as an optional field' \
  grep -A3 'isbn: zod' contracts/packages/api-types/src/generated/book.zod.ts
expect_success 'the web app still builds and passes its tests' nx run-many -p @acme/web -t test typecheck
