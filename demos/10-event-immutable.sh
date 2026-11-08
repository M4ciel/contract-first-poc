#!/usr/bin/env bash
# 10. Events are immutable: changing a published event fails; a new shape is a new version.
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
title '10. Events are immutable'
start_worktree event-immutable

step 'Change loan.created.v1 (add a field)'
replace contracts/events/loan.created.v1.json '"required": ["loanId", "bookId", "startedAt", "dueAt"],' '"required": ["loanId", "bookId", "startedAt", "dueAt", "copyId"],'
show_diff contracts/events/loan.created.v1.json
pause

step 'Compatibility against the base commit'
expect_failure 'a published event never changes' nx run contracts:compat
say 'The right path: contracts/events/loan.created.v2.json, published side by side with v1 until'
say 'every consumer moved. Consumers parse with the tolerant schema meanwhile.'
