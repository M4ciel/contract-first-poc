#!/usr/bin/env bash
# 4. Breaking change blocked: rename author to writer in /v1. oasdiff fails.
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
title '4. Breaking change blocked'
start_worktree breaking-change-blocked
L=contracts/apis/library

step 'Rename author to writer in Book (v1), examples included'
replace "$L/components/schemas/Book.yaml" 'required: [id, title, author,' 'required: [id, title, writer,'
replace "$L/components/schemas/Book.yaml" '  author:' '  writer:'
for file in "$L"/paths/v1-*.yaml; do sed -i -E 's/^(\s+)author:/\1writer:/' "$file"; done
show_diff "$L/components/schemas/Book.yaml"
pause

step 'Compatibility against the base commit'
expect_failure 'oasdiff blocks it: /v1 is stable' nx run contracts:compat
say 'The right paths:'
say '  - additive: keep author, add writer as an optional field, mark author deprecated;'
say '  - incompatible: a new operation or a new major version (/v2), born alpha.'
say 'Never weaken the check (AGENTS.md).'
